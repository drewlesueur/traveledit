// write an extremely efficient interpreted programming
// language on go
// 
// stack based (concatenative)
// 
// the stack looks like this []int64
// 
// there a are built in functions like
// 
// addInt64
// addFloat64
// 
// they cast the values on the stack to the right type
// then perform the operation, pushing the result on the stack
// 
// don't add custom function or variables yet
// just suffix stack operations using built in functions
// 
// a string is represented by an unsafe.pointer 
// 
// no type information is stored at runtime
// 
// the tokens are just words/numbers separated by spaces
// comments start with "#" and go to the end of a line
// strings start with "%% " and go to the end of a line
// Floats have ".", integers don't
// 
// 
// the source code gets tokenized to a []Token
// 
// where Token is
// type Token struct {
//     Type bool
//     Value int64
// }
// 
// type of false means value, push the value on to the stack
// type of true means "call", call the function at index Value
// 
// So the builtin functions will be a slice of functions
// []func()
// 0 is addInt
// 1 is addFloat
// etc.
// 
// during the tokenization phase, just have a map of func names to their indexes

// ...
// Below is a straight re‐write of your little VM in Go using method 3 (“one big switch on a tiny struct”).  We pack each instruction into:
// 
//    type Instr struct {
//      op  byte   // one of our 5 op-codes
//      arg int64  // literal payload for PUSH, ignored otherwise
//    }
// 
// The VM’s hot loop is a single slice‐index + switch, so Go will tend to emit a jump table and inline each case.

// 
// add a label syntax
// for example with "label:"
// and a goto that pops an int and goes there
// (uses will have to be replaced with ints)
// also add a "gotoIf", which pops a condition and a place to go.
// Note that all labels are only known at compile time
// at runtime, they are just indexes
// 
// remember, goto will notnbe a special syntax
// it just pops an int like Ops
// 
// Below is one way to extend your VM with labels, a “goto” and a “gotoIf”.  The basic idea is:
// 
// 1.  In Tokenize you do two passes over the source:
//     - First pass to collect all labels (`foo:`) and remember at which instruction‐index they live.
//     - Second pass to actually emit instructions: you handle built‐ins, integer and float literals exactly as before, but you also handle bare label‐references (e.g. the token “foo” in e.g. “foo goto”) by emitting an OP_PUSH whose argument is the label’s instruction index.
// 
// 2.  You add two new opcodes:
//     - OP_GOTO     – pops one int (the target address) and jumps there unconditionally
//     - OP_GOTO_IF  – pops one int (the condition) and one int (the target); if condition!=0 you jump
// 
// 3.  In the VM’s Run loop you implement them by adjusting the instruction pointer.
// 
// Here’s a self‐contained version.  I’ve also included a tiny example in main showing an unconditional loop and a conditional jump.
// 
// ```go


        // # a simple counter loop from 0 to 3
        // 0                       # start with i=0
        // start:
        //     # dup say                 # print i, but keep a copy
        //     # %% loop!                
        //     # sayString
        //     1 addInt64              # i = i + 1
        //     dup                     # make two copies of i
        //     1000000 gt                    # pop (3, i), push (i>3?1:0)
        //     endIf                   # push the address of endIf
        //     gotoIf                  # if top=0 goto endIf, else fall‐through
        //     start goto              # unconditional loop back
        // endIf:
        // say                     # final print of i
package main

import (
    "fmt"
    "math"
    "strconv"
    "strings"
    "time"
)

type Instr struct {
    op  byte
    arg int64
}

// opcode definitions
const (
    OP_PUSH byte = iota
    OP_ADD_INT
    OP_ADD_FLOAT
    OP_SAY_INT
    OP_SAY_FLOAT
    OP_SAY_STRING
    OP_GOTO
    OP_GOTO_IF
    OP_DUP
    OP_GT
    OP_GTE
    OP_LOAD_VAR
    OP_STORE_VAR
    OP_I2F
)

type VM struct {
    code       []Instr
    stack      []int64
    stringPool []string
    vars       []int64
}

func NewVM() *VM {
    return &VM{
        code:       nil,
        stack:      make([]int64, 0, 256),
        stringPool: make([]string, 0, 64),
        vars:       nil,
    }
}

func (vm *VM) Tokenize(src string) {
    nameToOp := map[string]byte{
        "addInt64":  OP_ADD_INT,
        "addFloat64": OP_ADD_FLOAT,
        "say":       OP_SAY_INT,
        "sayFloat":  OP_SAY_FLOAT,
        "sayString": OP_SAY_STRING,
        "goto":      OP_GOTO,
        "gotoIf":    OP_GOTO_IF,
        "dup":       OP_DUP,
        "gt":        OP_GT,
        "gte":        OP_GTE,
        "iToF":        OP_I2F,
    }

    // first pass: split lines, record labels
    lines := [][]string{}
    labels := make(map[string]int)
    instrCount := 0

    for _, raw := range strings.Split(src, "\n") {
        if i := strings.Index(raw, "#"); i >= 0 {
            raw = raw[:i]
        }
        if i := strings.Index(raw, "//"); i >= 0 {
            raw = raw[:i]
        }
        raw = strings.TrimSpace(raw)
        if raw == "" {
            continue
        }
        // string literal
        if strings.HasPrefix(raw, "%% ") {
            lines = append(lines, []string{raw})
            instrCount++
            continue
        }
        toks := strings.Fields(raw)
        kept := []string{}
        for _, tok := range toks {
            if strings.HasSuffix(tok, ":") {
                name := tok[:len(tok)-1]
                labels[name] = instrCount
                continue
            }
            kept = append(kept, tok)
            instrCount++
        }
        if len(kept) > 0 {
            lines = append(lines, kept)
        }
    }

    // second pass: emit code, handle variables
    prog := []Instr{}
    varMap := make(map[string]int)

    for _, toks := range lines {
        // string literal
        if len(toks) == 1 && strings.HasPrefix(toks[0], "%% ") {
            lit := toks[0][3:]
            idx := int64(len(vm.stringPool))
            vm.stringPool = append(vm.stringPool, lit)
            prog = append(prog, Instr{op: OP_PUSH, arg: idx})
            continue
        }
        for _, tok := range toks {
            // store into variable?
            if strings.HasPrefix(tok, ":") {
                name := tok[1:]
                idx, ok := varMap[name]
                if !ok {
                    idx = len(varMap)
                    varMap[name] = idx
                }
                prog = append(prog, Instr{op: OP_STORE_VAR, arg: int64(idx)})
                continue
            }
            // load from variable?
            if idx, ok := varMap[tok]; ok {
                prog = append(prog, Instr{op: OP_LOAD_VAR, arg: int64(idx)})
                continue
            }
            // builtin op?
            if op, ok := nameToOp[tok]; ok {
                prog = append(prog, Instr{op: op})
                continue
            }
            // label reference?
            if tgt, ok := labels[tok]; ok {
                prog = append(prog, Instr{op: OP_PUSH, arg: int64(tgt)})
                continue
            }
            // float literal?
            if strings.Contains(tok, ".") {
                v, err := strconv.ParseFloat(tok, 64)
                if err != nil {
                    panic("bad float literal: " + tok)
                }
                bits := math.Float64bits(v)
                prog = append(prog, Instr{op: OP_PUSH, arg: int64(bits)})
                continue
            }
            // int literal
            v, err := strconv.ParseInt(tok, 10, 64)
            if err != nil {
                panic("bad int literal: " + tok)
            }
            prog = append(prog, Instr{op: OP_PUSH, arg: v})
        }
    }

    vm.code = prog
    // allocate vars slice now that we know how many
    vm.vars = make([]int64, len(varMap))
}

func (vm *VM) Run() {
    ip := 0
    for ip < len(vm.code) {
        instr := vm.code[ip]
        switch instr.op {
        case OP_PUSH:
            vm.stack = append(vm.stack, instr.arg)
            ip++

        case OP_ADD_INT:
            n := len(vm.stack)
            b, a := vm.stack[n-1], vm.stack[n-2]
            vm.stack = vm.stack[:n-2]
            vm.stack = append(vm.stack, a+b)
            ip++

        case OP_ADD_FLOAT:
            n := len(vm.stack)
            bb, aa := vm.stack[n-1], vm.stack[n-2]
            vm.stack = vm.stack[:n-2]
            fa := math.Float64frombits(uint64(aa))
            fb := math.Float64frombits(uint64(bb))
            fr := fa + fb
            vm.stack = append(vm.stack, int64(math.Float64bits(fr)))
            ip++
        case OP_I2F:
            // pop int64
            n := len(vm.stack)
            i := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
    
            // convert to float64, then to IEEE-754 bits
            f := float64(i)
            bits := math.Float64bits(f)
    
            // push the bits back on the stack as an int64
            vm.stack = append(vm.stack, int64(bits))
            ip++
        case OP_SAY_INT:
            n := len(vm.stack)
            v := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
            fmt.Println(v)
            ip++

        case OP_SAY_FLOAT:
            n := len(vm.stack)
            vb := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
            // fmt.Println(math.Float64frombits(uint64(vb)))
            fmt.Println(strconv.FormatFloat(math.Float64frombits(uint64(vb)), 'f', -1, 64))
            ip++

        case OP_SAY_STRING:
            n := len(vm.stack)
            idx := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
            fmt.Println(vm.stringPool[idx])
            ip++

        case OP_GOTO:
            n := len(vm.stack)
            tgt := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
            ip = int(tgt)

        case OP_GOTO_IF:
            n := len(vm.stack)
            tgt := vm.stack[n-1]
            cond := vm.stack[n-2]
            vm.stack = vm.stack[:n-2]
            if cond != 0 {
                ip = int(tgt)
            } else {
                ip++
            }

        case OP_DUP:
            n := len(vm.stack)
            vm.stack = append(vm.stack, vm.stack[n-1])
            ip++

        case OP_GT:
            n := len(vm.stack)
            b, a := vm.stack[n-1], vm.stack[n-2]
            vm.stack = vm.stack[:n-2]
            var res int64
            if a > b {
                res = 1
            }
            vm.stack = append(vm.stack, res)
            ip++
        case OP_GTE:
            n := len(vm.stack)
            b, a := vm.stack[n-1], vm.stack[n-2]
            vm.stack = vm.stack[:n-2]
            var res int64
            if a >= b {
                res = 1
            }
            vm.stack = append(vm.stack, res)
            ip++

        case OP_STORE_VAR:
            n := len(vm.stack)
            v := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
            vm.vars[instr.arg] = v
            ip++

        case OP_LOAD_VAR:
            vm.stack = append(vm.stack, vm.vars[instr.arg])
            ip++

        default:
            panic(fmt.Sprintf("unknown opcode %d at %d", instr.op, ip))
        }
    }
}
    // i - 1
    // - 0.1
    // # + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2
    // + val
    // as .val
    
// if a is b, or c is d
// a b is yay1 then
// c d is yay1 then
// nay1 goto
// yay1:
//     %% it works
//     say
// nay1:
// 
// a is b && c == d
// a b is yay1 then
// nay1 goto
// yay1: c d us yay2 then
// nay1 goto
// yay2:
// 
// nay1:


func main() {
    src := `
        0 :i                 # initialize i = 0
        0.0 :b
        9000000 :loops
    theLoop:
        # i say
        i 1 addInt64 :i
        i -1 addInt64 # dup say
        iToF -0.1 addFloat64
        b addFloat64 :b
        i loops gte endIf gotoIf
        theLoop goto
    endIf:
        i say                # final print
        b sayFloat

    `

    start := time.Now()
    vm := NewVM()
    vm.Tokenize(src)
    mid := time.Now()
    vm.Run()
    end := time.Now()

    fmt.Println("tokenize:", mid.Sub(start))
    fmt.Println("run:     ", end.Sub(mid))
}
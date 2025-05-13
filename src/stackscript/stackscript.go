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
package main

import (
    "fmt"
    "math"
    "strconv"
    "strings"
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
)

type VM struct {
    code       []Instr
    stack      []int64
    stringPool []string
}

func NewVM() *VM {
    return &VM{
        code:       nil,
        stack:      make([]int64, 0, 256),
        stringPool: make([]string, 0, 64),
    }
}

// Tokenize builds the instruction array from source code.
// It supports:
//   label:          define a label at this instruction index
//   goto            pops an int and unconditionally jumps there
//   gotoIf          pops cond, pops target, if cond!=0 jumps there
// and of course all your old pushes, addInt64, addFloat64, say, sayFloat, sayString.
func (vm *VM) Tokenize(src string) {
    // map from word to opcode
    nameToOp := map[string]byte{
        "addInt64":   OP_ADD_INT,
        "addFloat64": OP_ADD_FLOAT,
        "say":        OP_SAY_INT,
        "sayFloat":   OP_SAY_FLOAT,
        "sayString":  OP_SAY_STRING,
        "goto":       OP_GOTO,
        "gotoIf":     OP_GOTO_IF,
        "dup":        OP_DUP,
        "gt":         OP_GT,
    }

    // first pass: split into lines/tokens, record label positions
    var lines [][]string
    labels := make(map[string]int) // label -> instr index

    instrCount := 0
    for _, raw := range strings.Split(src, "\n") {
        // strip comments
        if i := strings.Index(raw, "#"); i >= 0 {
            raw = raw[:i]
        }
        raw = strings.TrimSpace(raw)
        if raw == "" {
            continue
        }

        // string‐literal line
        if strings.HasPrefix(raw, "%% ") {
            // that is exactly one Instr
            lines = append(lines, []string{raw})
            instrCount++
            continue
        }

        // otherwise split into words
        toks := strings.Fields(raw)
        var kept []string
        for _, tok := range toks {
            if strings.HasSuffix(tok, ":") {
                // label definition
                name := tok[:len(tok)-1]
                labels[name] = instrCount
                continue
            }
            kept = append(kept, tok)
            instrCount++ // every token becomes exactly one Instr
        }
        if len(kept) > 0 {
            lines = append(lines, kept)
        }
    }

    // second pass: actually emit code
    var prog []Instr
    for _, toks := range lines {
        // string literal syntax: entire line is one literal
        if len(toks) == 1 && strings.HasPrefix(toks[0], "%% ") {
            lit := toks[0][3:]
            idx := int64(len(vm.stringPool))
            vm.stringPool = append(vm.stringPool, lit)
            prog = append(prog, Instr{op: OP_PUSH, arg: idx})
            continue
        }
        // normal tokens
        for _, tok := range toks {
            if op, isBuiltin := nameToOp[tok]; isBuiltin {
                prog = append(prog, Instr{op: op})
                continue
            }
            // label reference?
            if target, isLabel := labels[tok]; isLabel {
                prog = append(prog, Instr{op: OP_PUSH, arg: int64(target)})
                continue
            }
            // float?
            if strings.Contains(tok, ".") {
                v, err := strconv.ParseFloat(tok, 64)
                if err != nil {
                    panic("bad float literal: " + tok)
                }
                bits := math.Float64bits(v)
                prog = append(prog, Instr{op: OP_PUSH, arg: int64(bits)})
                continue
            }
            // int
            v, err := strconv.ParseInt(tok, 10, 64)
            if err != nil {
                panic("bad int literal: " + tok)
            }
            prog = append(prog, Instr{op: OP_PUSH, arg: v})
        }
    }
    vm.code = prog
}


// Run executes the program.
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
            f := math.Float64frombits(uint64(vb))
            fmt.Println(f)
            ip++

        case OP_SAY_STRING:
            n := len(vm.stack)
            idx := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
            if idx < 0 || int(idx) >= len(vm.stringPool) {
                panic(fmt.Sprintf("string pool idx out of range: %d", idx))
            }
            fmt.Println(vm.stringPool[idx])
            ip++

        case OP_GOTO:
            // pop target, jump unconditionally
            n := len(vm.stack)
            target := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
            if target < 0 || int(target) >= len(vm.code) {
                panic(fmt.Sprintf("goto target out of range: %d", target))
            }
            ip = int(target)

        case OP_GOTO_IF:
            // pop target, pop cond. if cond!=0 jump.
            n := len(vm.stack)
            target := vm.stack[n-1]
            cond   := vm.stack[n-2]
            vm.stack = vm.stack[:n-2]
            if cond != 0 {
                if target < 0 || int(target) >= len(vm.code) {
                    panic(fmt.Sprintf("gotoIf target out of range: %d", target))
                }
                ip = int(target)
            } else {
                ip++
            }
        case OP_DUP:
            // duplicate the top of stack
            n := len(vm.stack)
            if n < 1 {
                panic("dup on empty stack")
            }
            vm.stack = append(vm.stack, vm.stack[n-1])
            ip++
        case OP_GT:
            // pop b, pop a, push (a>b?1:0)
            n := len(vm.stack)
            if n < 2 {
                panic("gt requires two operands")
            }
            b, a := vm.stack[n-1], vm.stack[n-2]
            vm.stack = vm.stack[:n-2]
            var res int64
            if a > b {
                res = 1
            }
            vm.stack = append(vm.stack, res)
            ip++
        default:
            panic(fmt.Sprintf("unknown opcode %d at %d", instr.op, ip))
        }
    }
}

func main() {
    src := `
        # a simple counter loop from 0 to 3
        0                       # start with i=0
        start:
            dup say                 # print i, but keep a copy
            %% loop!                
            sayString
            1 addInt64              # i = i + 1
            dup                     # make two copies of i
            3 gt                    # pop (3, i), push (i>3?1:0)
            endIf                   # push the address of endIf
            gotoIf                  # if top=0 goto endIf, else fall‐through
            start goto              # unconditional loop back
        endIf:
        say                     # final print of i
    `

    vm := NewVM()
    vm.Tokenize(src)
    vm.Run()
}


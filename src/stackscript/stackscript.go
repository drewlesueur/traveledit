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

package main

import (
    "fmt"
    "math"
    "strconv"
    "strings"
)

type Instr struct {
    op  byte  // which opcode
    arg int64 // literal payload (or pool index for strings)
}

// opcode definitions
const (
    OP_PUSH byte = iota
    OP_ADD_INT
    OP_ADD_FLOAT
    OP_SAY_INT
    OP_SAY_FLOAT
    OP_SAY_STRING
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
func (vm *VM) Tokenize(src string) {
    // map from word to opcode
    nameToOp := map[string]byte{
        "addInt64":   OP_ADD_INT,
        "addFloat64": OP_ADD_FLOAT,
        "say":        OP_SAY_INT,
        "sayFloat":   OP_SAY_FLOAT,
        "sayString":  OP_SAY_STRING,
    }

    var prog []Instr

    for _, line := range strings.Split(src, "\n") {
        // strip comments
        if i := strings.Index(line, "#"); i >= 0 {
            line = line[:i]
        }
        line = strings.TrimSpace(line)
        if line == "" {
            continue
        }

        // string literal syntax: %% rest of line
        if strings.HasPrefix(line, "%% ") {
            lit := line[3:]
            // intern into the string pool
            idx := int64(len(vm.stringPool))
            vm.stringPool = append(vm.stringPool, lit)
            prog = append(prog, Instr{op: OP_PUSH, arg: idx})
            continue
        }

        // otherwise split tokens
        for _, tok := range strings.Fields(line) {
            if op, isBuiltin := nameToOp[tok]; isBuiltin {
                prog = append(prog, Instr{op: op})
            } else if strings.Contains(tok, ".") {
                // float literal
                if v, err := strconv.ParseFloat(tok, 64); err == nil {
                    bits := math.Float64bits(v)
                    prog = append(prog, Instr{op: OP_PUSH, arg: int64(bits)})
                } else {
                    panic("bad float literal: " + tok)
                }
            } else {
                // integer literal
                if v, err := strconv.ParseInt(tok, 10, 64); err == nil {
                    prog = append(prog, Instr{op: OP_PUSH, arg: v})
                } else {
                    panic("bad int literal: " + tok)
                }
            }
        }
    }

    vm.code = prog
}

// Run executes the program.
func (vm *VM) Run() {
    for ip := 0; ip < len(vm.code); ip++ {
        instr := vm.code[ip]
        switch instr.op {
        case OP_PUSH:
            vm.stack = append(vm.stack, instr.arg)


        case OP_ADD_INT:
            n := len(vm.stack)
            b, a := vm.stack[n-1], vm.stack[n-2]
            vm.stack = vm.stack[:n-2]
            vm.stack = append(vm.stack, a+b)

        case OP_ADD_FLOAT:
            n := len(vm.stack)
            bb, aa := vm.stack[n-1], vm.stack[n-2]
            vm.stack = vm.stack[:n-2]
            fa := math.Float64frombits(uint64(aa))
            fb := math.Float64frombits(uint64(bb))
            fr := fa + fb
            vm.stack = append(vm.stack, int64(math.Float64bits(fr)))

        case OP_SAY_INT:
            n := len(vm.stack)
            v := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
            fmt.Println(v)

        case OP_SAY_FLOAT:
            n := len(vm.stack)
            vb := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
            f := math.Float64frombits(uint64(vb))
            fmt.Println(f)

        case OP_SAY_STRING:
            n := len(vm.stack)
            idx := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
            // safe lookup
            if idx < 0 || int(idx) >= len(vm.stringPool) {
                panic(fmt.Sprintf("string pool index out of range: %d", idx))
            }
            fmt.Println(vm.stringPool[idx])
        }
    }
}

func main() {
    src := `
      # integer addition
      1 2 addInt64 say

      # float addition
      3.5 4.56 addFloat64 sayFloat

      # a safe string literal
      %% hello, world!
      sayString
    `

    vm := NewVM()
    vm.Tokenize(src)
    vm.Run()
}
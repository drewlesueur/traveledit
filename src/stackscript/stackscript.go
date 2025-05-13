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


package main
import (
    "fmt"
    "math"
    "strconv"
    "strings"
    "unsafe"
)
type Token struct {
    Type  bool
    Value int64
}
type VM struct {
    code     []Token
    ip       int
    stack    []int64
    builtins []func()
}
func NewVM() *VM {
    vm := &VM{}
    vm.builtins = []func(){
        func() {
            n := len(vm.stack)
            b := vm.stack[n-1]
            a := vm.stack[n-2]
            vm.stack = vm.stack[:n-2]
            vm.stack = append(vm.stack, a+b)
        },
        func() {
            n := len(vm.stack)
            bb := vm.stack[n-1]
            aa := vm.stack[n-2]
            vm.stack = vm.stack[:n-2]
            fa := math.Float64frombits(uint64(aa))
            fb := math.Float64frombits(uint64(bb))
            fr := fa + fb
            vm.stack = append(vm.stack, int64(math.Float64bits(fr)))
        },
        func() {
            n := len(vm.stack)
            v := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
            fmt.Println(v)
        },
        func() {
            n := len(vm.stack)
            v := vm.stack[n-1]
            vm.stack = vm.stack[:n-1]
            f := math.Float64frombits(uint64(v))
            fmt.Println(f)
        },
    }
    return vm
}
func (vm *VM) Tokenize(src string) {
    nameToIndex := map[string]int{
        "addInt64":   0,
        "addFloat64": 1,
        "say":        2,
        "sayFloat":        3,
    }
    var tokens []Token
    for _, line := range strings.Split(src, "\n") {
        if idx := strings.Index(line, "#"); idx >= 0 {
            line = line[:idx]
        }
        line = strings.TrimSpace(line)
        if line == "" {
            continue
        }
        if strings.HasPrefix(line, "%% ") {
            s := line[3:]
            p := unsafe.Pointer(&s)
            tokens = append(tokens, Token{false, int64(uintptr(p))})
            continue
        }
        for _, f := range strings.Fields(line) {
            if i, ok := nameToIndex[f]; ok {
                tokens = append(tokens, Token{true, int64(i)})
            } else if strings.Contains(f, ".") {
                v, _ := strconv.ParseFloat(f, 64)
                bits := math.Float64bits(v)
                tokens = append(tokens, Token{false, int64(bits)})
            } else {
                v, _ := strconv.ParseInt(f, 10, 64)
                tokens = append(tokens, Token{false, v})
            }
        }
    }
    vm.code = tokens
}
func (vm *VM) Run() {
    for vm.ip < len(vm.code) {
        t := vm.code[vm.ip]
        vm.ip++
        if !t.Type {
            vm.stack = append(vm.stack, t.Value)
        } else {
            vm.builtins[t.Value]()
        }
    }
}
func main() {
    src := `
    1 2 addInt64 say
    3.5 4.56 addFloat64 sayFloat
    `
    vm := NewVM()
    vm.Tokenize(src)
    vm.Run()
}


Do you see a faster way to do this?
should I have the Value of the tokens for functions just be a raw function pointer?

Here are a few ideas for squeezing out more speed out of your little Forth-style VM.  You can mix and match them, but in practice the single biggest win in a Go interpreter is usually (a) removing indirection whenever you can and (b) giving the compiler a chance to inline the hot paths.

1) Collapse your `Token` down to one word (uint64)  
   Instead of  
     ```
     type Token struct {
       Type  bool
       Value int64
     }
     ```  
   you can pack “is this a call” into the top bit of the `int64` itself.  For example, reserve bit 63 as your “call‐flag” and bits 0–62 as either a literal or a builtin index:

     ```go
     const callMask = uint64(1) << 63
     const idxMask  = ^callMask

     // a literal n       => token = uint64(n)
     // a call idx        => token = callMask | uint64(idx)
     ```

   Now your fetch loop becomes just one 64-bit memory load and one branch:

     ```go
     for ip := 0; ip < len(vm.code); ip++ {
       ins := vm.code[ip]
       if ins & callMask == 0 {
         // literal
         vm.stack = append(vm.stack, int64(ins))
       } else {
         // builtin
         idx := ins & idxMask
         vm.builtins[idx]()
       }
     }
     ```

   You’ve eliminated the extra `bool` load, a second field lookup, and your tokens are now a single cache-friendly word.

2) Store the function pointer directly in the token  
   If you don’t mind paying 8 or 16 bytes per token, you can dispense with `vm.builtins` entirely and put the function pointer right into the token:

     ```go
     type Instr struct {
       fn  func(*VM)
       arg int64       // only used for literals
     }
     ```

   During tokenization:

   - for a literal `42` → `Instr{ fn: vm.opPush,    arg: 42 }`
   - for a call  `addInt64` → `Instr{ fn: vm.opAddInt, arg: 0  }`

   Then your run loop is simply:

     ```go
     for ip := range vm.code {
       inst := &vm.code[ip]
       inst.fn(vm, inst.arg)
     }
     ```

   You’ve eliminated the small slice lookup `vm.builtins[idx]`, though you do pay the cost of a call through a function pointer.  In Go those calls do not get inlined, so you haven’t actually gotten rid of all indirect calls—but you have removed one layer of indirection.

3) The _really_ fastest way in Go is usually an in‐process jump‐table  
   Write your token as a tiny struct:

     ```go
     type Instr struct {
       op  byte   // enum of your four ops + PUSH
       arg int64  // only for PUSH
     }

     const (
       OP_PUSH      = iota  // 0
       OP_ADD_INT64         // 1
       OP_ADD_FLOAT64       // 2
       OP_SAY_INT           // 3
       OP_SAY_FLOAT         // 4
     )
     ```

   And then in your `Run()` do one big `switch` over the opcode:

     ```go
     func (vm *VM) Run() {
       for ip := 0; ip < len(vm.code); ip++ {
         instr := vm.code[ip]
         switch instr.op {
         case OP_PUSH:
           vm.stack = append(vm.stack, instr.arg)

         case OP_ADD_INT64:
           n := len(vm.stack)
           b, a := vm.stack[n-1], vm.stack[n-2]
           vm.stack = vm.stack[:n-2]
           vm.stack = append(vm.stack, a+b)

         case OP_ADD_FLOAT64:
           n := len(vm.stack)
           bb, aa := vm.stack[n-1], vm.stack[n-2]
           vm.stack = vm.stack[:n-2]
           fa := math.Float64frombits(uint64(aa))
           fb := math.Float64frombits(uint64(bb))
           vm.stack = append(vm.stack, int64(math.Float64bits(fa+fb)))

         case OP_SAY_INT:
           v := vm.stack[len(vm.stack)-1]
           vm.stack = vm.stack[:len(vm.stack)-1]
           fmt.Println(v)

         case OP_SAY_FLOAT:
           v := vm.stack[len(vm.stack)-1]
           vm.stack = vm.stack[:len(vm.stack)-1]
           fmt.Println(math.Float64frombits(uint64(v)))
         }
       }
     }
     ```

   Go will compile that `switch` over a dense range of `byte` to a single jump table, and each case body can be inlined by the compiler.  You have zero indirect‐slice lookups, zero dynamic function calls, and very few branches.

Which approach is “best”?  
- If your primitive set is small and fixed, the big `switch` (method 3) is almost always the fastest in Go.  
- If you want a tiny code‐generator that spits out a closure per instruction, approach 2 is more flexible but a bit slower because Go can’t inline those closures.  
- Approach 1 is a minimal tweak to your current design—8 bytes per token, a single branch and a direct slice lookup—that will give you a decent bump without changing your whole VM.

So in short: yes, you _can_ store raw function pointers in your tokens, but if ultimate speed is your goal you’re better off moving to a switch‐jitted dispatch or a single 64-bit packed token with a jump‐table under the hood.






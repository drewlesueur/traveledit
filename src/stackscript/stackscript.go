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

// i: 0
// loops: 900

// i + 3 + 4

i: 0
b: 0.0
loops: 9000
theLoop:
    i: i + 1
    i - 1, toFloat
    minusF 0.1
    ad 
endIf:

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

/*
Does the way I handle strings here mean I have to do manual memory management?

No – you’re not leaking memory the way you would in C.  In Go every one of your strings in the stringPool is just a Go string (and the slice backing stringPool is just a Go slice of string).  All of that is garbage‐collected for you.  

The only “memory management” you ever have to think about in pure Go is:  

  • If you continually append new literals to your stringPool in a long‐running VM, you will keep growing that slice indefinitely, and the GC won’t be able to reclaim the old entries until you drop them (e.g. by slicing stringPool down or setting it to nil).  
  • Other than that, you never have to call free or worry about dangling pointers—Go’s runtime will reclaim both the slice and all the strings in it once nothing references them anymore.  

In short, you don’t need any manual memory management. Just be aware that if you keep adding to stringPool in a loop, you will keep consuming heap until you explicitly shrink or replace that slice.

what if I wanted to implement maps and slices in a similar way?
I'd have a pool of maps and a pool of slices etc
when I was done with one, I'd have to free that slot
and then reuse it when I wanted another.

You don’t ever “free” Go memory the way you do in C.  Everything you allocate in Go (strings, slices, maps, structs, whatever) lives on the heap (or stack, depending on escape analysis) and is torn down by the garbage collector once it is no longer reachable.  

What you *can* do for performance is build your own pools of objects (maps, slices, even big buffers) so that you re-use the same underlying memory instead of constantly letting the GC churn through millions of tiny allocations.  But note:

  1. “Freeing” in this context just means “remove my reference to it (or clear it) so that I can hand that slot back into my pool.”  
     ‑ You do *not* literally deallocate memory, you only drop your references.  
     ‑ The GC still owns the real job of freeing the backing store when nothing (even your pool) holds on to it.  

  2. You must *clear* pooled objects before you re-use them (or before you let them sit idle in your pool), otherwise you’ll hold on to old data and you’ll leak whatever the old data pointed at.  
     ‑ For slices you typically do:  
         s = s[:0]  
         // if s held pointers to big objects, you might do for i := range s { s[i] = zero }  
     ‑ For maps you do:  
         for k := range m { delete(m, k) }  

  3. There are two common pooling patterns in Go:  
     a) sync.Pool – a GC‐friendly cache of temporary objects.  
        • You call pool.Get(), which either grabs an existing object or calls your New() function to make one.  
        • When you’re done, you pool.Put(obj).  
        • The GC is still free to drop your pooled objects at any time if it needs the memory.  
     b) Your own handle‐based pools – especially popular when you want integer handles in your VM.  
        • Keep a slice (e.g. []map[string]Value or [][]Value) and a free-list of integer indices.  
        • Alloc(): pop an index off free-list (or append a new slot), zero it, return the index.  
        • Free(idx): clear the slot (nil the map or s[:0] the slice), push idx back on your free-list.  
        • Again, you never “free” the memory to Go – you just remove references or reuse them.  

In all of these designs the *only* memory management you are doing is bookkeeping of which slots are in use, clearing out the old contents, and making them available for re-use.  The Go runtime’s garbage collector remains responsible for the actual allocation and reclamation of the backing memory.
*/



/*
NOTE THIS MADE my 9 million loop go from approx 430ms to 480ms
so maybe the build in slice operations aren't so bad, or maybe something else is off
------


give me a diff for this code
so that we do not do slice operations on the stack
bit we just keep track of the current index.
so "slicing" would just be decrementing an index etc

Here’s a unified‐diff that converts the stack from “append/slice”-style to an explicit stack‐pointer (sp) backed by a pre­allocated slice.  In short:

  • Add an `sp` field to `VM`  
  • Allocate `stack = make([]int64, 256)` in NewVM  
  • Replace every `append` / `stack = stack[:…]` bunch with  
       sp–based push / pop  

---- begin diff ----
```diff
diff --git a/main.go b/main.go
index 1234567..89abcde 100644
--- a/main.go
+++ b/main.go
@@ -15,7 +15,9 @@ type VM struct {
     code       []Instr
-    stack      []int64
+    stack      []int64 // pre‐allocated scratch area
+    sp         int     // stack pointer (next free slot)
     stringPool []string
     vars       []int64
 }
@@ func NewVM() *VM {
-       stack:      make([]int64, 0, 256),
+       stack:      make([]int64, 256), // fixed capacity
+       sp:         0,                  // start at 0
        stringPool: make([]string, 0, 64),
        vars:       nil,
    }
@@ func (vm *VM) Run() {
-   ip := 0
+   ip := 0
    for ip < len(vm.code) {
        instr := vm.code[ip]
        switch instr.op {
        case OP_PUSH:
-           vm.stack = append(vm.stack, instr.arg)
+           vm.stack[vm.sp] = instr.arg
+           vm.sp++
            ip++
@@ case OP_ADD_INT:
-           n := len(vm.stack)
-           b, a := vm.stack[n-1], vm.stack[n-2]
-           vm.stack = vm.stack[:n-2]
-           vm.stack = append(vm.stack, a+b)
+           // pop two
+           b := vm.stack[vm.sp-1]
+           a := vm.stack[vm.sp-2]
+           vm.sp -= 2
+           // push result
+           vm.stack[vm.sp] = a + b
+           vm.sp++
            ip++
@@ case OP_ADD_FLOAT:
-           n := len(vm.stack)
-           bb, aa := vm.stack[n-1], vm.stack[n-2]
-           vm.stack = vm.stack[:n-2]
-           fa := math.Float64frombits(uint64(aa))
-           fb := math.Float64frombits(uint64(bb))
-           fr := fa + fb
-           vm.stack = append(vm.stack, int64(math.Float64bits(fr)))
+           bb := vm.stack[vm.sp-1]
+           aa := vm.stack[vm.sp-2]
+           vm.sp -= 2
+           fa := math.Float64frombits(uint64(aa))
+           fb := math.Float64frombits(uint64(bb))
+           fr := fa + fb
+           vm.stack[vm.sp] = int64(math.Float64bits(fr))
+           vm.sp++
            ip++
@@ case OP_I2F:
-           n := len(vm.stack)
-           i := vm.stack[n-1]
-           vm.stack = vm.stack[:n-1]
-           f := float64(i)
-           bits := math.Float64bits(f)
-           vm.stack = append(vm.stack, int64(bits))
+           // pop int
+           i := vm.stack[vm.sp-1]
+           vm.sp--
+           // convert & push
+           f := float64(i)
+           vm.stack[vm.sp] = int64(math.Float64bits(f))
+           vm.sp++
            ip++
@@ case OP_SAY_INT:
-           n := len(vm.stack)
-           v := vm.stack[n-1]
-           vm.stack = vm.stack[:n-1]
+           v := vm.stack[vm.sp-1]
+           vm.sp--
            fmt.Println(v)
            ip++
@@ case OP_SAY_FLOAT:
-           n := len(vm.stack)
-           vb := vm.stack[n-1]
-           vm.stack = vm.stack[:n-1]
+           vb := vm.stack[vm.sp-1]
+           vm.sp--
            fmt.Println(strconv.FormatFloat(math.Float64frombits(uint64(vb)), 'f', -1, 64))
            ip++
@@ case OP_SAY_STRING:
-           n := len(vm.stack)
-           idx := vm.stack[n-1]
-           vm.stack = vm.stack[:n-1]
+           idx := vm.stack[vm.sp-1]
+           vm.sp--
            fmt.Println(vm.stringPool[idx])
            ip++
@@ case OP_GOTO:
-           n := len(vm.stack)
-           tgt := vm.stack[n-1]
-           vm.stack = vm.stack[:n-1]
+           tgt := vm.stack[vm.sp-1]
+           vm.sp--
            ip = int(tgt)
@@ case OP_GOTO_IF:
-           n := len(vm.stack)
-           tgt := vm.stack[n-1]
-           cond := vm.stack[n-2]
-           vm.stack = vm.stack[:n-2]
+           tgt  := vm.stack[vm.sp-1]
+           cond := vm.stack[vm.sp-2]
+           vm.sp -= 2
            if cond != 0 {
                ip = int(tgt)
            } else {
                ip++
@@ case OP_DUP:
-           n := len(vm.stack)
-           vm.stack = append(vm.stack, vm.stack[n-1])
+           top := vm.stack[vm.sp-1]
+           vm.stack[vm.sp] = top
+           vm.sp++
            ip++
@@ case OP_GT:
-           n := len(vm.stack)
-           b, a := vm.stack[n-1], vm.stack[n-2]
-           vm.stack = vm.stack[:n-2]
-           var res int64
-           if a > b {
-               res = 1
-           }
-           vm.stack = append(vm.stack, res)
+           b := vm.stack[vm.sp-1]
+           a := vm.stack[vm.sp-2]
+           vm.sp -= 2
+           var res int64
+           if a > b {
+               res = 1
+           }
+           vm.stack[vm.sp] = res
+           vm.sp++
            ip++
@@ case OP_GTE:
-           n := len(vm.stack)
-           b, a := vm.stack[n-1], vm.stack[n-2]
-           vm.stack = vm.stack[:n-2]
-           var res int64
-           if a >= b {
-               res = 1
-           }
-           vm.stack = append(vm.stack, res)
+           b := vm.stack[vm.sp-1]
+           a := vm.stack[vm.sp-2]
+           vm.sp -= 2
+           var res int64
+           if a >= b {
+               res = 1
+           }
+           vm.stack[vm.sp] = res
+           vm.sp++
            ip++
@@ case OP_STORE_VAR:
-           n := len(vm.stack)
-           v := vm.stack[n-1]
-           vm.stack = vm.stack[:n-1]
+           v := vm.stack[vm.sp-1]
+           vm.sp--
            vm.vars[instr.arg] = v
            ip++
@@ case OP_LOAD_VAR:
-           vm.stack = append(vm.stack, vm.vars[instr.arg])
+           vm.stack[vm.sp] = vm.vars[instr.arg]
+           vm.sp++
            ip++
```
---- end diff ----

Explanation of the key changes:

1.  We added `sp int` to `VM` to track the next‐free slot.
2.  We preallocate `stack := make([]int64, 256)` so addresses `0…255` are valid.
3.  A “push” becomes:
       stack[sp] = value  
       sp++
4.  A “pop” becomes:
       sp--  
       value = stack[sp]
5.  We replaced *all* `append` and slice‐truncation calls with the above push/pop pattern.

This way there are no runtime allocations or slice reslices on the critical path—just index


*/
package chompscript

import (
    "fmt"
    "sync"
	"container/heap"
	"time"
    "unicode"
)
// add operator precedence
// laxy. eval
// x is 3 and y is 4
// define arity at compile time a:2

type Func struct {
    Builtin: func(*World) *World
    Arity int
    Precedence int
    Associativity bool // Always left to right
    Name string // optional
    CodeFile *CodeFile
    Index int
    World: *World
}

// make Go enum values using iota
// the values I want are
// Null, Value, Container, Func
type RecordType int
const (
	NullType RecordType = iota
	ValueType
	ContainerType
	FuncType
)
type Record struct {
    FullPath []string
    ArrayPart  []*Record
    LookupPart map[string]*Record
    ValuePart  string
    KeysPart   []string
    Type RecordType
    FuncPart *Func
}

// make Methods on Record to push and pop values to ArrayPart
// eg: r.Push(&Record{ValuePart: "1"})
// eg: r.Pop()
// Use Go idioms
func (r *Record) Push(rec *Record) {
    r.ArrayPart = append(r.ArrayPart, rec)
}
func (r *Record) Pop() *Record {
    if len(r.ArrayPart) == 0 {
        return nil
    }
    lastIndex := len(r.ArrayPart) - 1
    lastRecord := r.ArrayPart[lastIndex]
    r.ArrayPart = r.ArrayPart[:lastIndex]
    return lastRecord
}

type CodeFile struct {
    FullPath string
    Code string
    // applies to parens brackets curlies and terms even!
    EndsCache map[int]int
}


type World struct {
    CodeFile *CodeFile
    Index int
    FuncStartIndex int
    Stack *Record
    State *Record
    FuncStack: []*Func
    Func *Func
    RunAt time.Time
    LexicalParent *World
    RuntimeParent *World
}

// type WorldHeap []*World
// flesh this out to conform to Go's container/heap
// the value to compare is the RunAt (time.Time)
type WorldHeap []*World
func (wh WorldHeap) Len() int {
	return len(wh)
}
func (wh WorldHeap) Less(i, j int) bool {
	return wh[i].RunAt.Before(wh[j].RunAt)
}
func (wh WorldHeap) Swap(i, j int) {
	wh[i], wh[j] = wh[j], wh[i]
}
func (wh *WorldHeap) Push(x interface{}) {
	*wh = append(*wh, x.(*World))
}
func (wh *WorldHeap) Pop() interface{} {
	old := *wh
	n := len(old)
	item := old[n-1]
	*wh = old[0 : n-1]
	return item
}

type Machine struct {
    Mu sync.Mutex
    IdCounter int
    Files map[string]*CodeFile
    Stack *Record
    State *Record
    World *World
    NextWorlds []*Worlds
    TimedWorlds *WorldHeap
    // also need some sort of parallelism and message passing
}


func NewMachine() *Machine {
    wh := &WorldHeap{}
    heap.Init(wh)

    stack := &Record{}
    state := &Record{}
    nextWorlds := []*World{}
    w := &World{
        Stack: stack,
        State: state,
        FuncStack: &Func{},
    }
    m := &Machine{
        Files: map[string]*CodeFile{},
        World: w,
        Stack: stack,
        State: state,
        NextWorlds: nextWorlds,
        TimedWorlds: wh,
    }
}

func (m *Machine) AddCodeString(fullPath string, code string) {
    m.Lock()
    defer m.Unlock()
    codeFile := &CodeFile{
        // FullPath: "_eval_" + strconv.Itoa(m.IdCounter),
        FullPath: fullPath,
        Code: code,
        EndsCache: map[int]int{},
    }
    m.Files[fullPath] = codeFile
    m.NextWorlds = append(m.NextWorlds, &World{
        CodeFile: codeFile,
        Stack: m.World.Stack,
        State: m.World.State,
        FuncStack: m.World.FuncStack,
    })
}
func (m *Machine) AddCode(fullPath string) error {
    m.Lock()
    defer m.Unlock()

    code, err := io.ReadFile(fullPath)
    if err != nil {
        return err
    }
    m.AddCodeString(fullPath, code)
    return nil
}

// TODO: have it return a bool when done?
func (m *Machine) RunNext(fullPath string, code string) {
    m.Lock()
    defer m.Unlock()

    // ??
    if m.World == nil {
        return
    }

    // TODO: nextWorlds

    // first check if funcs can be called
    if m.World.Func != nil {
        if len(m.World.Stack) >= m.World.Arity {
            // we're ready to call the function!
            m.CallFunc(m.World.Func, m.World)
        }
    }
    m.Chomp()
}




/*
greet: { :name
    "hello" swap cc say
}

if x is 3 and y is 4 and b is 2 {
    
}

a 


if {x is 3} and {y is 4} {
    
}

foo[] // acces
{}[] // acces
()[] // acces
[][] // access


2{} // arity ?
(){} // arguments
[]{} ?? captured closure??
{}{} // func list?

cond {}{
    
}{ }{
    
}

yo() // call func
{}() // callnfunc
[]() // ??





greet: (name age){
    say cc "hello " name
    say "hello " cc name
    say ("hello " cc name)
    say "hello " cc name
}
greet: name|age{
    say "hello" cc name
    say cc "hello" name
    say: hello cc name
}
greet[name age]: { 
    say cc "hello" name
}
greet: [name age]{
    say cc "hello" name
}
// y[10]

// name.age


*/

func (m *Machine) Chomp(w *World) {
    // this reads next token and adds it to the stack!
    t, index := ReadNextToken(w.Index, w.CodeFile.Code)
    w.Index = index
    if t != nil {
        if t.IsString {
            w.Stack.Push(&Record{
                ValuePart: t.Value,
            })
        } else if strings.ContainsAny(t.value, "{") {
            f := &Func{
                Arity: 0,
                Name: "anonymous",
                CodeFile: w.CodeFile,
                Index : w.Index,
                World: w,
            }
            r := &Record{
                RecordType: FuncType,
                FuncPart: f,
            }
            // not going to call right away so it doesn't go in w.Func
            w.Stack.Push(r)
        } else if strings.ContainsAny(t.value, "[") {
            newWorld := &World{
                LexicalParent: f.World,
                RuntimeParent: w,
                Stack: w.Stack,
                State: &Record{},
                CodeFile: f.CodeFile,
                Index: f.Index,
                FuncStartIndex: f.Index, // so we can call repeat
            }
        } else if strings.ContainsAny(t.value, "(") {

        } else {

        }
    }
}
func (m *Machine) CallFunc(f *Func, w *World) {
    if f.Builtin != nil {
        m.World = f.Builtin(w)
        if len(m.World.FuncStack) > 0 {
            // pop
            m.World.Func = m.World.FuncStack[len(m.World.FuncStack)-1]
            m.World.FuncStack = m.World.FuncStack[:len(m.World.FuncStack)-1]
        } else {
            m.World.Func = nil
        }
        return
    }
    
    newWorld := &World{
        LexicalParent: f.World,
        RuntimeParent: w,
        Stack: w.Stack,
        State: &Record{},
        CodeFile: f.CodeFile,
        Index: f.Index,
        FuncStartIndex: f.Index, // so we can call repeat
    }
    m.World = newWorld
}

type Token {
    Value string
    IsString bool
}

// Implement this, a token is the obvious one
// any alphanumeric is a token (non-string)
// "-" symbol if not separated by space is not its own token
// any if these by itself is a token []{}()
// then any group of symbols is a token
// a string like "hello world" is a token (IsString true)
// Also strings can be separated by «»
// there is no escaping in strings.
// The return values of the function is token and the new index
func ReadNextToken(index int, code string) (*Token, int) {
    if index >= len(code) {
        return nil, len(code)
    }

    var start int
    for start = index; start < len(code) && unicode.IsSpace(rune(code[start])); start++ {
    }

    if start >= len(code) {
        return nil, len(code)
    }

    ch := code[start]

    if ch == '"' || ch == '«' {
        var endChar byte
        if ch == '"' {
            endChar = '"'
        } else {
            endChar = '»'
        }
        end := start + 1
        for end < len(code) && code[end] != endChar {
            end++
        }
        if end < len(code) { // to include the closing quote
            end++
        }
        return &Token{Value: code[start:end], IsString: true}, end
    }

    if ch == '[' || ch == ']' || ch == '{' || ch == '}' || ch == '(' || ch == ')' {
        return &Token{Value: string(ch), IsString: false}, start + 1
    }

    if unicode.IsLetter(rune(ch)) || unicode.IsDigit(rune(ch)) {
        end := start + 1
        for end < len(code) && (unicode.IsLetter(rune(code[end])) || unicode.IsDigit(rune(code[end])) || code[end] == '-') {
            end++
        }
        return &Token{Value: code[start:end], IsString: false}, end
    }

    end := start + 1
    for end < len(code) && !unicode.IsSpace(rune(code[end])) && 
        !unicode.IsLetter(rune(code[end])) && !unicode.IsDigit(rune(code[end])) && 
        code[end] != '"' && code[end] != '«' && 
        code[end] != '[' && code[end] != ']' &&
        code[end] != '{' && code[end] != '}' &&
        code[end] != '(' && code[end] != ')' {
        if code[end] == '-' && (end+1 < len(code) && (unicode.IsLetter(rune(code[end+1])) || unicode.IsDigit(rune(code[end+1])))) {
            break
        }
        end++
    }
    
    return &Token{Value: code[start:end], IsString: false}, end
}




// a: 10
var code = `
    1 + 2

if {x is 3} {

}

cond [
    { x is 1 } {

    }
    { x is 2 } {

    }
]


`


    // var world = {
    //     state: state || {},
    //     stack: stack || [],
    //     // stack: PretendArray(),
    //     tokens: tokens,
    //     i: 0,
    //     parent: null,
    //     indent: 0,
    //     runId: 0,
    //     name: "main",
    //     // cachedLookupWorld: {},
    //     log: [], // for convenience
    //     onEnds: [],
    //     waitingWorlds: [],
    // }
    // world.global = world
    // world.asyncTop = world

    // goroutine
    // var asyncWorld = {
    //     parent: fWorld,
    //     state: {},
    //     // stack: [], // brand new stack
    //     stack: [...world.stack], // copied stack
    //     tokens: fTokens,
    //     i: 0,
    //     dynParent: null, // so it stops
    //     asyncParent: world,
    //     runId: ++thumbscript4.runId,
    //     indent: world.indent + 1,
    //     // cachedLookupWorld: {},
    //     global: world.global,
    //     done: false,
    //     onEnds: [],
    //     waitingWorlds: [],
    //     foofoo: "banana",
    // }

    // calling a function
    // world = {
    //     parent: fWorld,
    //     state: {},
    //     stack: oldWorld.stack,
    //     tokens: fTokens,
    //     i: 0,
    //     dynParent: oldWorld,
    //     runId: ++thumbscript4.runId,
    //     indent: oldWorld.indent + 1,
    //     // cachedLookupWorld: {},
    //     global: oldWorld.global,
    //     asyncTop: oldWorld.asyncTop,
    //     onEnds: [],
    //     waitingWorlds: [],
    // }
    //
    // if (f.dynamic) {
    //     world.parent = oldWorld
    //     // world.cachedLookupWorld = {}
    // }


    // squareType
    // newWorld = {
    //     parent: world,
    //     state: {},
    //     stack: [],
    //     tokens: token.valueArr,
    //     i: 0,
    //     dynParent: world,
    //     indent: world.indent + 1,
    //     runId: ++thumbscript4.runId,
    //     // cachedLookupWorld: {},
    //     global: world.global,
    //     asyncTop: world.asyncTop,
    //     onEnds: [function(world) {
    //         if (Object.keys(world.state).length) {
    //             world.dynParent.stack.push(world.state)
    //         } else {
    //             world.dynParent.stack.push(world.stack)
    //         }
    //     }],
    //     waitingWorlds: [],
    // }
    // break outer
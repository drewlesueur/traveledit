package chompscript

import (
    // "fmt"
    "sync"
	"container/heap"
	"time"
    // "unicode"
	"unicode/utf16"
	"os"
	"strings"
)
// add operator precedence
// laxy. eval
// x is 3 and y is 4
// define arity at compile time a:2



type Func struct {
    Builtin func(*World) *World
    Arity int
    Precedence int
    Associativity bool // Always left to right
    Name string // optional
    CodeFile *CodeFile
    Index int
    World *World
}

// make Go enum values using iota
// the values I want are
// Null, Value, Container, Func
type RecordType int
const (
	NullType RecordType = iota
	StringType
	FloatType
	IntegerType
	ContainerType
	FuncType
)

type Record struct {
    FullPath []string
    ArrayPart  []*Record
    LookupPart map[string]*Record
    StringPart string
    FloatPart float64
    IntegerPart int
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
    Code []uint16
    // applies to parens brackets curlies and terms even!
    ExprCache map[int]int
    
    // TODO: start using TokenCache
    TokenCache map[int]*Token
}


type WorldType int
const (
	NormalType WorldType = iota
	ParenType
	BracketType
)

type ChompType int
const (
    RunType ChompType = iota
    FindEndType
    FindLabelType
)


type World struct {
    // AsyncTop?
    CodeFile *CodeFile
    Index int
    BlockStartIndex int
    Stack *Record
    State *Record
    FuncStack []*Func
    Func *Func
    ExprStartIndexStack []int
    ExprStartIndex []int
    RunAt time.Time
    LexicalParent *World
    RuntimeParent *World
    WorldType WorldType
    ChompType ChompType
    NestCount int
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
    sync.Mutex
    IdCounter int
    Files map[string]*CodeFile
    Stack *Record
    State *Record
    World *World
    NextWorlds []*World
    TimedWorlds *WorldHeap
    // also need some sort of parallelism and message passing
}


func (m *Machine) PushWorld(w *World) {
    m.NextWorlds = append(m.NextWorlds, w)
}
func (m *Machine) PopWorld() *World {
    if len(m.NextWorlds) == 0 {
        return nil
    }
    lastIndex := len(m.NextWorlds) - 1
    lastWorld := m.NextWorlds[lastIndex]
    m.NextWorlds = m.NextWorlds[:lastIndex]
    return lastWorld
}

func NewMachine() *Machine {
    wh := &WorldHeap{}
    heap.Init(wh)

    stack := &Record{}
    state := &Record{}
    w := &World{
        Stack: stack,
        State: state,
    }
    m := &Machine{
        Files: map[string]*CodeFile{},
        World: w,
        Stack: stack,
        State: state,
        TimedWorlds: wh,
    }
    return m
}

func (m *Machine) AddCodeString(fullPath string, code string) {
    m.Lock()
    defer m.Unlock()
    
    codeFile := &CodeFile{
        // FullPath: "_eval_" + strconv.Itoa(m.IdCounter),
        FullPath: fullPath,
        Code: utf8ToUtf16(code),
        ExprCache: map[int]int{},
    }
    m.Files[fullPath] = codeFile
    m.NextWorlds = append(m.NextWorlds, &World{
        CodeFile: codeFile,
        Stack: m.World.Stack,
        State: m.World.State,
    })
}
func (m *Machine) AddCode(fullPath string) error {
    m.Lock()
    defer m.Unlock()

    code, err := os.ReadFile(fullPath)
    if err != nil {
        return err
    }
    m.AddCodeString(fullPath, string(code))
    return nil
}

// TODO: have it return a bool when done?
func (m *Machine) RunNext(fullPath string, code string) {
    m.Lock()
    defer m.Unlock()

    // ??
    if m.World == nil {
        w := m.PopWorld()
        if w == nil {
            return
        }
        m.World = w
    }

    // TODO: nextWorlds

    // first check if funcs can be called
    if m.World.Func != nil {
        if len(m.World.Stack.ArrayPart) >= m.World.Func.Arity {
            // we're ready to call the function!
            // wait a minute let's check the next value
            nextToken := m.Peek()
            _ = nextToken
            
            m.CallFunc(m.World.Func, m.World)
            return
        }
    }
    m.Chomp()
}

// 1 + 2 * 3 ^ 4 * 3
func (m *Machine) Peek() *Token {
    w := m.World
    t, _ := ReadNextToken(w.Index, w.CodeFile.Code)
    return t
}




func (m *Machine) Chomp() {
    w := m.World
    // this reads next token and adds it to the stack!
    t, index := ReadNextToken(w.Index, w.CodeFile.Code)
    w.Index = index
    if t == nil {
        oldWorld := w
        m.World = w.RuntimeParent
        if oldWorld.WorldType == ParenType {
            // for _, r := range oldWorld.State
        }
        return
    }
    
    if t.TokenType == TokenTypeString {
        w.Stack.Push(&Record{
            StringPart: t.Value,
        })
    } else if strings.ContainsAny(t.Value, "{") {
        f := &Func{
            Arity: 0,
            Name: "anonymous",
            CodeFile: w.CodeFile,
            Index : w.Index,
            World: w,
        }
        r := &Record{
            Type: FuncType,
            FuncPart: f,
        }
        // not going to call right away so it doesn't go in w.Func
        w.Stack.Push(r)
        w.ChompType = FindEndType
        // TODO: figure this out
        // w.EndSymbol == "{"
    } else if strings.ContainsAny(t.Value, "[") {
        newWorld := &World{
            LexicalParent: w,
            RuntimeParent: w,
            Stack: w.Stack,
            State: &Record{},
            CodeFile: w.CodeFile,
            Index: w.Index,
            BlockStartIndex: w.Index, // so we can call repeat
        }
        _ = newWorld
    } else if strings.ContainsAny(t.Value, "(") {

    } else {
        v := w.Lookup(t.Value)
        _ = v
    }
}
func (w *World) Lookup(v string) Record {
    return Record{}
}

func (m *Machine) CallFunc(f *Func, w *World) {
    if f.Builtin != nil {
        m.World = f.Builtin(w)
        if len(m.World.FuncStack) > 0 {
            // pop
            m.World.Func = m.World.FuncStack[len(m.World.FuncStack)-1]
            m.World.FuncStack = m.World.FuncStack[:len(m.World.FuncStack)-1]
        } else {
            m.World.FuncStack = nil
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
        BlockStartIndex: f.Index, // so we can call repeat
    }
    m.World = newWorld
}



type TokenType int
const (
	TokenTypeVar TokenType = iota
	TokenTypeNumber
	TokenTypeString
	TokenTypeBrace
	// TokenTypeNumber // ?
)
type Token struct {
    Value string
    TokenType TokenType
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

// TODO: use TokenCache

// update this code so the "." is not its own token
// if it's in a number like 1.25, token value is "1.25"
// also -1.25 token value is "-1.25"
// but if it's a variable like foo.bar then that's 3 tokens
// 


// isSpace checks if a given character is a whitespace character.
func isSpace(c uint16) bool {
	return c == uint16(' ') || c == uint16('\n') || c == uint16('\t') || c == uint16('\r')
}
func isOpeniningBrace(c uint16) bool {
	return c == uint16('(') || c == uint16('[') || c == uint16('{')
}
func isClosingBrace(c uint16) bool {
	return c == uint16(')') || c == uint16(']') || c == uint16('}')
}

// isLetter checks if a given character is an uppercase or lowercase letter or an underscore.
func isLetter(c uint16) bool {
	return (c >= uint16('A') && c <= uint16('Z')) || (c >= uint16('a') && c <= uint16('z')) || c == uint16('_')
}

func isDigit(c uint16) bool {
	return c >= uint16('0') && c <= uint16('9')
}
func isMinus(c uint16) bool {
	return c == uint16('-')
}
func isForwardSlash(c uint16) bool {
	return c == uint16('/')
}
func isDot(c uint16) bool {
	return c == uint16('.')
}
func isUnderscore(c uint16) bool {
	return c == uint16('_')
}
func isRegularQuote(c uint16) bool {
	return c == uint16('"')
}
func isStartQuote(c uint16) bool {
	return c == uint16('«')
}
func isCloseQuote(c uint16) bool {
	return c == uint16('»')
}
func isNewLine(c uint16) bool {
	return c == uint16('\n') || c == uint16('\r')
}



func ReadNextToken(index int, code []uint16) (*Token, int) {
    if index >= len(code) {
        return nil, len(code)
    }
    start := -1
    state := ""
    for i := index; i < len(code); i++ {
        c := code[i]
        var nextC, prevC uint16
        if i < len(code) - 1 {
            nextC = code[i + 1]
        }
        _ = nextC
        if i > 0 {
            prevC = code[i - 1]
        }
        _ = prevC
        if state == "" {
            if isSpace(c) {
            } else if isLetter(c) {
                start = i
                state = "name"
            } else if isMinus(c) {
                state = "minus"
            } else if isForwardSlash(c) {
                if isForwardSlash(nextC) {
                    state = "comment"
                } else {
                    start = i
                    state = "non_letter_name"
                }
            } else if isDigit(c) {
                state = "number"
                start = i
            } else if isRegularQuote(c) {
                state = "quote"
                start = i + 1
            } else if isStartQuote(c) {
                state = "fancy_quote"
                start = i + 1
            } else  {
                start = i
                state = "non_letter_name"
            }
        } else if state == "non_letter_name" {
            // 4 + -3 * 10
           
            
        } else if state == "name" {
            if isLetter(c) || isDigit(c) {

            } else {
                return &Token{
                    Value: utf16ToUtf8(code[start:i]),
                    TokenType: TokenTypeVar,
                }, i
            }
        } else if state == "minus" {
            if isLetter(c) {
                return &Token{
                    Value: "neg",
                    TokenType: TokenTypeVar,
                }, i
            } else if isSpace(c) {
                return &Token{
                    Value: "-",
                    TokenType: TokenTypeVar,
                }, i
            } else if isDigit(c) {
                state = "number"
                start = i - 1
            }
        } else if state == "forward_slash" {
            if isForwardSlash(c) {
                state = "comment"
            } else {
                state = "number"
                start = i - 1
            }
        } else if state == "comment" {
            if isNewLine(c) {
                state = ""
            }
        } else if state == "number" {
            if isDigit(c) || isDot(c) || isLetter(c) {
            } else {
                v := utf16ToUtf8(code[start:i])
                t := &Token{
                    Value: v,
                    TokenType: TokenTypeNumber,
                }
                // if
                return t, i
            }
        } else if state == "quote" {
            if isRegularQuote(c) {
                return &Token{
                    Value: utf16ToUtf8(code[start:i]),
                    TokenType: TokenTypeString,
                }, i+1
            }
        } else if state == "fancy_quote" {
            if isCloseQuote(c) {
                return &Token{
                    Value: utf16ToUtf8(code[start:i]),
                    TokenType: TokenTypeString,
                }, i+1
            }
        }
    }
    return nil, len(code)
}

func utf8ToUtf16(s string) []uint16 {
	// Decode the UTF-8 string into runes
	runes := []rune(s)
	// Encode the runes into UTF-16
	utf16Encoded := utf16.Encode(runes)
	return utf16Encoded
}

func utf16ToUtf8(u []uint16) string {
	runes := utf16.Decode(u)
	return string(runes)
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
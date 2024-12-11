package main

import (
    "fmt"
    "os"
    "strings"
    "time"
)

type File struct {
    FullPath string
    Code string
    // TODO: start using TokenCache
    // TokenCache map[int]*Token
}
type World struct {
    Stack *Record
    State *Record
    LexicalParent *World
    RuntimeParent *World
    FileIndex int
    CodeIndex int
    Files []*File
    FirstToken *Token
    StringCache map[string]*Record
}

func main() {
    if len(os.Args) < 2 {
        fmt.Println("Please provide a filename")
        return
    }

    data, err := os.ReadFile(os.Args[1])
    if err != nil {
        fmt.Println("Error reading file:", err)
        return
    }
    world := &World{
        Stack: &Record{},
        State: &Record{},
        LexicalParent: nil,
        RuntimeParent: nil,
        FileIndex: 0,
        CodeIndex: 0,
        Files: []*File{
            {
                FullPath: os.Args[1],
                Code: string(data),
            },
        },
        FirstToken: nil,
        StringCache: map[string]*Record{},
    }
    Run(world)
    return
}

func Run(w *World) {
    var token *Token
    for {
        code := w.Files[w.FileIndex].Code
        token, w.CodeIndex = getNextToken(code, w.CodeIndex)

        fmt.Println(w.CodeIndex, token)
        if token != nil {
            if w.FirstToken == nil {
                w.FirstToken = token
            }
            if token.TokenType == TokenTypeNewline {
                w = w.ExecCurrentFunc()
            } else if token.TokenType == TokenTypeVar {
                w.PlopValueAt(token.Value)
            } else if token.TokenType == TokenTypeString {
                w.PlopValue(token.Value)
            }
        }
        time.Sleep(10 * time.Millisecond)
        if w == nil {
            return
        }
        if token == nil || w.CodeIndex >= len(code) {
            w.CodeIndex = 0
            w.FileIndex++
            if (w.FileIndex >= len(w.Files)) {
                break
            }
        }
    }
}

func (w *World) ExecCurrentFunc() *World {
    firstToken := w.FirstToken
    w.FirstToken = nil
    theFunc := w.Lookup(firstToken.Value)
    if theFunc.Type == NullType {
        fmt.Println("null func!")
        return w
    }
    
    if theFunc.Type != FuncType {
        fmt.Println("Not a function", theFunc)
        return w
    }
    
    if theFunc.FuncPart.Builtin != nil {
        return theFunc.Builtin(world)
    }
    newWorld := &World{
        Stack: w.Stack,
        State: &Record{},
        LexicalParent: theFunc.World,
        RuntimeParent: w,
        FileIndex: f.FileIndex,
        CodeIndex: f.CodeIndex,
        Files: w.Files,
        FirstToken: nil,
        StringCache: w.StringCache,
    }
    return newWorld
}

type TokenType int
const (
	TokenTypeVar TokenType = iota
	TokenTypeString
	TokenTypeNewline
	TokenTypeLeftCurly
	TokenTypeRightCurly
	TokenTypeLeftBracket
	TokenTypeRightBracket
	TokenTypeLeftParens
	TokenTypeRightParens
)
type Token struct {
    Value string
    TokenType TokenType
}

func (t *Token) String() string {
    if t.TokenType == TokenTypeVar {
        return t.Value
    }
    
    if t.TokenType == TokenTypeString {
        return `"` + t.Value + `"`
    }
    
    if t.TokenType == TokenTypeNewline {
        return "<newline>"
    }
    
    return ""
}

func getNextToken(contents string, i int) (*Token, int) {
    // TODO: cache this
    startToken := -1
    for i := i; i < len(contents); i++{
        if startToken == -1 {
            // TODO: maybe just a tokenTypeSymbol?
            if contents[i] == '{' {
                t := &Token{
                    TokenType: TokenTypeLeftCurly,
                }
                return t, i+1
            } else if contents[i] == '}' {
                t := &Token{
                    TokenType: TokenTypeRightCurly,
                }
                return t, i+1
            } else if contents[i] == '[' {
                t := &Token{
                    TokenType: TokenTypeLeftBracket,
                }
                return t, i+1
            } else if contents[i] == ']' {
                t := &Token{
                    TokenType: TokenTypeRightBracket,
                }
                return t, i+1
            } else if contents[i] == '(' {
                t := &Token{
                    TokenType: TokenTypeLeftParens,
                }
                return t, i+1
            } else if contents[i] == ')' {
                t := &Token{
                    TokenType: TokenTypeRightParens,
                }
                return t, i+1
            } else if contents[i] == '\n' || contents[i] == ',' {
                t := &Token{
                    TokenType: TokenTypeNewline,
                }
                for i = i+1; i < len(contents); i++ {
                    if contents[i] != '\n' && contents[i] != ',' {
                    // if contents[i] != '\n' {
                        break
                    }
                }
                return t, i
            } else if contents[i] == '"' {
                end := strings.Index(contents[i+1:], `"`)
                if end == -1 {
                    end = len(contents) - (i+1)
                }
                realEnd := i+1+end
                t := &Token{
                    TokenType: TokenTypeString,
                    Value: contents[i+1:realEnd],
                }
                return t, realEnd+1
            } else if contents[i] == '<' {
                end := strings.Index(contents[i+1:], `>`)
                if end == -1 {
                    end = len(contents) - (i+1)
                }
                realEnd := i+1+end
                t := &Token{
                    TokenType: TokenTypeString,
                    Value: contents[i+1:realEnd],
                }
                return t, realEnd+1
            } else if contents[i] == '$' {
                end := strings.Index(contents[i+1:], "\n")
                if end == -1 {
                    end = len(contents) - (i+1)
                }
                realEnd := i+1+end
                t := &Token{
                    TokenType: TokenTypeString,
                    Value: contents[i+2:realEnd],
                }
                if realEnd == len(contents) {
                    return t, realEnd+1
                }
                return t, realEnd
            } else if contents[i] == '#' {
                end := strings.Index(contents[i+1:], "\n")
                if end == -1 {
                    end = len(contents) - (i+1)
                }
                realEnd := i+1+end
                i = realEnd+1
            } else if contents[i] == ' ' || contents[i]  == '\t' || contents[i]  == '\r' {
            } else {
                startToken = i
            }
        } else if startToken != -1 {
            if contents[i] == ' ' || contents[i]  == '\t' || contents[i]  == '\n' || contents[i]  == '\r' || contents[i]  == ',' || contents[i]  == '{' || contents[i]  == '}' || contents[i]  == '[' || contents[i]  == ']' || contents[i]  == '(' || contents[i]  == ')' {
                t := &Token{
                    TokenType: TokenTypeVar,
                    Value: contents[startToken:i],
                }
                if contents[i] == '\n' || contents[i] == ',' || contents[i]  == '{' || contents[i]  == '}' || contents[i]  == '[' || contents[i]  == ']' || contents[i]  == '(' || contents[i]  == ')' {
                    return t, i
                }
                return t, i+1
            } else if i == len(contents) - 1 {
                t := &Token{
                    TokenType: TokenTypeVar,
                    Value: contents[startToken:i+1],
                }
                return t, i+1
            }
        }
    }
    return nil, i+1
}

type Func struct {
    Builtin func(*World) *World
    World *World // world where it was defined
    FileIndex int
    CodeIndex int
}

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
    ArrayPart  []*Record
    LookupPart map[string]*Record
    StringPart string
    FloatPart float64
    IntegerPart int
    KeysPart   []string
    Type RecordType
    FuncPart *Func
}

func NewRecord(theType RecordType) *Record {
    return &Record{
        ArrayPart:  []*Record{},
        LookupPart: make(map[string]*Record),
        StringPart: "",
        FloatPart:  0.0,
        IntegerPart: 0,
        KeysPart:   []string{},
        Type:       theType,
    }
}
var NullRecord = NewRecord(NullType)

func (r *Record) Get(key string) *Record {
    return r.LookupPart[key]
}

func (r *Record) Has(key string) bool {
    _, exists := r.LookupPart[key]
    return exists
}

func (r *Record) Set(key string, value *Record) {
    r.LookupPart[key] = value
}
func (w *World) Lookup(v string) *Record {
    for ww := w; ww != nil; ww = ww.LexicalParent {
        if ww.State.Has(v) {
            return ww.State.Get(v)
        }
    }
    return NullRecord
}
func (w *World) PlopValueAt(v string) {
    for ww := w; ww != nil; ww = ww.LexicalParent {
        if ww.State.Has(v) {
            w.Stack.Push(ww.State.Get(v))
            return
        }
    }
    w.Stack.Push(NullRecord)
}
func (w *World) PlopValue(v string) {
    r := w.StringCache[v]
    if r == nil {
        r = &Record{
            Value: v,
        }
        w.StringCache[v] = r
    }
    w.Stack.Push(r)
}

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
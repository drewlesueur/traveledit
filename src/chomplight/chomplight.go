package main

import (
    "fmt"
    "os"
    "strings"
    "time"
)

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
    contents := string(data)
    i := 0
    var token *Token
    for {
        token, i = getNextToken(contents, i)
        if token == nil {
            break
        }
        fmt.Println(i, token)
        time.Sleep(10 * time.Millisecond)
        
        if i >= len(contents) {
            break
        }
    }
}
type TokenType int
const (
	TokenTypeVar TokenType = iota
	TokenTypeString
	TokenTypeNewline
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
            if contents[i] == '\n' {
                t := &Token{
                    TokenType: TokenTypeNewline,
                    Value: "",
                }
                for i = i+1; i < len(contents); i++ {
                    if contents[i] != '\n' {
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
            } else if contents[i] == '«' {
                end := strings.Index(contents[i+1:], `»`)
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
            if contents[i] == ' ' || contents[i]  == '\t' || contents[i]  == '\n' || contents[i]  == '\r' {
                t := &Token{
                    TokenType: TokenTypeVar,
                    Value: contents[startToken:i],
                }
                if contents[i] == '\n' {
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
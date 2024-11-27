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
        time.Sleep(200 * time.Millisecond)
        
        if i >= len(contents) {
            break
        }
    }
    
    // lines = strings.Split(contents, "\n")
    // for i, line := range lines {
    //     line := strings.TrimLeft(line)
    //     parts := strings.Split(line, " ")
    //     cleanParts := []string{}
    //     var currentPart []string
    //     for _, part := range parts {
    //         if strings.HasPrefix(part, `"`) && !strings.HasSuffix(part, `"`) {
    //             currentPart 
    //         }
    //     }
    // }
}
type TokenType int
const (
	TokenTypeVar TokenType = iota
	// TokenTypeNumber
	TokenTypeString
)
type Token struct {
    Value string
    TokenType TokenType
}

func (t *Token) String() string {
    if t.TokenType == TokenTypeVar {
        return t.Value
    }
    
    return `"` + t.Value + `"`
}

func getNextToken(contents string, i int) (*Token, int) {
    // TODO: cache
    startToken := -1
    for i := i; i < len(contents); i++{
        if startToken == -1 {
            if contents[i] == '"' {
                end := strings.Index(contents[i+1:], `"`)
                if end == -1 {
                    end = len(contents) - (i+1)
                }
                t := &Token{
                    TokenType: TokenTypeString,
                    Value: contents[i+1:i+1+end],
                }
                return t, i+1+end+1
            } else if contents[i] == '«' {
                end := strings.Index(contents[i+1:], `»`)
                if end == -1 {
                    end = len(contents) - (i+1)
                }
                t := &Token{
                    TokenType: TokenTypeString,
                    Value: contents[i+1:i+1+end],
                }
                return t, i+1+end+1
            } else if contents[i] == '$' {
                end := strings.Index(contents[i+1:], `\n`)
                if end == -1 {
                    end = len(contents) - (i+1)
                }
                fmt.Println("end is ", end)
                t := &Token{
                    TokenType: TokenTypeString,
                    Value: contents[i+2:i+1+end],
                }
                return t, i+1+end+1
            } else if contents[i] == '#' {
                end := strings.Index(contents[i+1:], `\n`)
                if end == -1 {
                    end = len(contents)
                }
                i = end+1
            } else if contents[i] == ' ' || contents[i]  == '\t' || contents[i]  == '\n' || contents[i]  == '\r' {
            } else {
                startToken = i
            }
        } else if startToken != -1 {
            if contents[i] == ' ' || contents[i]  == '\t' || contents[i]  == '\n' || contents[i]  == '\r' {
                t := &Token{
                    TokenType: TokenTypeVar,
                    Value: contents[startToken:i],
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
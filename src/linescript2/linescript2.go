package main

import (
    "fmt"
    "os"
    "strings"
    // "os/exec"
	"strconv"
	// "encoding/json"
)

func main() {
    if len(os.Args) < 2 {
        fmt.Println("Please provide a file name.")
        return
    }

    fileName := os.Args[1]
    data, err := os.ReadFile(fileName)
    if err != nil {
        fmt.Println("Error reading file:", err)
        return
    }
    // fmt.Println(string(data))
    code := string(data)

    token := ""
    // stateCreation
    state := map[string]any{
        "__fileName": fileName,
        "__i": 0,
        "__code": code,
        "__vals": &[]any{},
        "__argCount": 0,
        "__currFuncToken": "",
    }

    for j := 0; j < 1000; j++ {
        // token, state["__i"] = nextToken(getCode(state), state["__i"].(int))
        token = nextToken(state)
        if token == "" {
            break
        }
        // fmt.Printf("# token: %q\n", token)
        // fmt.Printf("i: %d\n", i)
        // continue
        
        switch token {
        case "\n":
            state = callFunc(state)
            continue
        }

        if state["__currFuncToken"].(string) == "" {
            state["__currFuncToken"] = token
        } else {
            state["__argCount"] = state["__argCount"].(int) + 1
            push(state["__vals"], getToken(state, token))
        }
    }
}

func getToken(state map[string]any, field string) any {
    // TODO: parse out dot
    if field[0] == '\'' {
        return field[1:]
    }

    if field[0] == '#' {
        // for numbers
        f, err := strconv.ParseFloat(field[1:], 64)
        if err != nil {
            panic(err)
        }
        return f
    }
    if field == "$__STATE" {
        return state
    }

    name := field[1:]
    // todo: custom lexical see original linescript
    return state[name]
}




func push(slice any, value any) {
	if s, ok := slice.(*[]any); ok {
		*s = append(*s, value)
	}
}

func setField(m any, key any, value any) {
	if mmap, ok := m.(map[string]any); ok {
		mmap[key.(string)] = value
	}
}

func pop(slice any) any {
	if s, ok := slice.(*[]any); ok && len(*s) > 0 {
		val := (*s)[len(*s)-1]
		*s = (*s)[:len(*s)-1]
		return val
	}
	return nil
}

func shift(slice any) any {
	if s, ok := slice.(*[]any); ok && len(*s) > 0 {
		val := (*s)[0]
		*s = (*s)[1:]
		return val
	}
	return nil
}

func unshift(slice any, value any) {
	if s, ok := slice.(*[]any); ok {
		*s = append([]any{value}, *s...)
	}
}

func splice(slice any, start int, deleteCount int, elements ...any) []any {
	if s, ok := slice.(*[]any); ok {
		if start < 0 {
			start = len(*s) + start
		}
		if start < 0 {
			start = 0
		}
		if start > len(*s) {
			start = len(*s)
		}
		if deleteCount < 0 {
			deleteCount = 0
		}
		if start+deleteCount > len(*s) {
			deleteCount = len(*s) - start
		}
		removed := (*s)[start : start+deleteCount]
		*s = append(append((*s)[:start], elements...), (*s)[start+deleteCount:]...)
		return removed
	}
	return nil
}

func length(slice any) int {
	if s, ok := slice.(*[]any); ok {
		return len(*s)
	}
	return 0
}

func is(a, b any) any {
    return a == b
}
func say(a any) {
    fmt.Println(a)
}
func keys(a any) any {
    ret := []any{}
    for k := range a.(map[string]any) {
        ret = append(ret, k)
    }
    fmt.Println("debug:", ret)
    return &ret
}
func setProp(a, b, c any) {
    a.(map[string]any)[b.(string)] = c
}
func getProp(a, b any) any {
    fmt.Println("Getting prop", b.(string))
    return a.(map[string]any)[b.(string)]
}

func makeNoop() func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        return state
    }
}
func makeBuiltin_1_0(f func(any)) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        a := pop(state["__vals"])
        f(a)
        return state
    }
}
func makeBuiltin_3_0(f func(any, any, any)) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        c := pop(state["__vals"])
        b := pop(state["__vals"])
        a := pop(state["__vals"])
        f(a, b, c)
        return state
    }
}
func makeBuiltin_1_1(f func(any) any) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        a := pop(state["__vals"])
        push(state["__vals"], f(a))
        return state
    }
}
func makeBuiltin_2_1(f func(any, any) any) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        b := pop(state["__vals"])
        a := pop(state["__vals"])
        push(state["__vals"], f(a, b))
        return state
    }
}
func makeBuiltin_3_1(f func(any, any, any) any) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        c := pop(state["__vals"])
        b := pop(state["__vals"])
        a := pop(state["__vals"])
        push(state["__vals"], f(a, b, c))
        return state
    }
}

var builtins = map[string]func(state map[string]any) map[string]any {
    "is": makeBuiltin_2_1(is),
    "say": makeBuiltin_1_0(say),
    "put": makeNoop(),
    "setProp": makeBuiltin_3_0(setProp),
    "getProp": makeBuiltin_2_1(getProp),
    "keys": makeBuiltin_1_1(keys),
    // "debug1": func(state map[string]any) map[string]any {
    //     fmt.Println("debugging", state["sayHi"])
    //     return state
    // },
    "here": func(state map[string]any) map[string]any {
        push(state["__vals"], map[string]any{
            "__fileName": state["__fileName"],
            "__i": state["__i"],
            "__code": state["__code"],
            "__lexicalParent": state["__lexicalParent"],
        })
        return state
    },
}

func callFunc(state map[string]any) map[string]any {
    fNameToken := state["__currFuncToken"].(string)
    if (fNameToken == "") {
        return state
    }
    fName := fNameToken[1:]
    if f, ok := builtins[fName]; ok {
        newState := f(state)
        state["__currFuncToken"] = ""
        state["__argCount"] = 0
        return newState
    }
    
    internalFunc, ok := getToken(state, fNameToken).(map[string]any)
    if ok {
        // stateCreation
        newState := map[string]any{
            "__fileName": internalFunc["__fileName"],
            "__i": internalFunc["__i"],
            "__code": internalFunc["__code"],
            "__vals": state["__vals"],
            "__currFuncToken": "",
            "__lexicalParent": internalFunc["__lexicalParent"],
            "__callingParent": state,
        }
        state["__currFuncToken"] = ""
        state["__argCount"] = 0
        return newState
    } else {
        fmt.Println("Func not found:", fName)
        state["__currFuncToken"] = ""
        state["__argCount"] = 0
    }
    return state
}

func nextToken(state map[string]any) (string) {
    var token string
    token, state["__i"] = nextTokenRaw(state["__code"].(string), state["__i"].(int))
    return token
}

func nextTokenRaw(code string, i int) (string, int) {
    if i > len(code) {
        return "", -1
    }
    state := "out" // "string", "in"
    start := -1
    for i = i; i < len(code); i++ {
        b := code[i]
        switch state {
        case "out":
            switch b {
            case '{', '}', '(', ')', '[', ']':
                return string(b), i+1
            case ',', '\n':
                return "\n", i+1
            case ' ', '\t', '\r':
                continue
            case '"', '\'':
                expectedQuoteEnd := string(code[i])
                end := strings.Index(code[i+1:], expectedQuoteEnd)
                return "'" + code[i+1:i+1+end], i+1+end+1
            case '#':
                // comments
                end := strings.Index(code[i+1:], "\n")
                if end == -1 {
                    return "", -1
                }
                i = i+1+end
            default:
                state = "in"
                start = i
            }
        case "in":
            switch b {
            case '{', '}', '(', ')', '[', ']':
                return makeToken(code[start:i]), i
            case ',', '\n':
                return makeToken(code[start:i]), i
            case ' ', '\t', '\r':
                return makeToken(code[start:i]), i+1
            case '"', '\'':
                expectedQuoteEnd := string(code[i]) + code[start:i-1]
                endIndex := strings.Index(code[i+1:], code[start:i])
                token := code[i+1:i+1+endIndex-1]
                return "'" + token, i + 1 + endIndex + len(expectedQuoteEnd)
            default:
            }
        }
    }
    if state == "in" {
        return makeToken(code[start:i]), i+1
    }
    return "", -1
}

// 'a string
// $var_name
// #300
func makeToken(val string) string {
    if isNumeric(val) {
        return "#" + val
    }
    return "$" + val
}
func isNumeric(s string) bool {
	_, err := strconv.ParseFloat(s, 64)
	return err == nil
}

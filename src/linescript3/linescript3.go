package main

import (
    "fmt"
    "os"
    "strings"
    // "os/exec"
	"strconv"
	"encoding/json"
	"math"
)

func main() {
    // because of initialozation cycle issue
	// ./linescript3.go:374:5: initialization cycle for builtins
	// 	./linescript3.go:374:5: builtins refers to
	// 	./linescript3.go:440:6: callFunc refers to
	// 	./linescript3.go:374:5: builtins
    builtins["callFunc"] = callFunc

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
    code := string(data)
    state := makeState(fileName, code)
    eval(state)
}

func eval(state map[string]any) map[string]any {
    token := ""

    for j := 0; j < 1000; j++ {
        if state == nil {
            return nil
        }
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

        if immediateCode, ok := state["__call_immediates"].(map[string]any)[token].(string); ok {
            evalState := makeState("__internal", immediateCode)
            evalState["s"] = state
            evalState = eval(evalState)
            state = evalState["s"].(map[string]any)
        }

        if state["__currFuncToken"].(string) == "" {
            state["__currFuncToken"] = token
        } else {
            state["__argCount"] = state["__argCount"].(int) + 1
            push(state["__vals"], evalToken(state, token))
        }
    }
    return state
}

func evalToken(state map[string]any, field string) any {
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

    if field[0] == 'i' {
        // for integers
        i, err := strconv.Atoi(field[1:])
        if err != nil {
            panic(err)
        }
        return i
    }

    if field == "$__STATE" {
        return state
    }

    varName := field[1:]
    funcCode := state["__globals"].(map[string]any)["__getVar"]
    switch funcCode := funcCode.(type) {
    case string:
        evalState := makeState("__internal", funcCode)
        evalState["s"] = state
        evalState["varName"] = varName
        evalState = eval(evalState)
        return evalState["s"].(map[string]any)
    }
    return state
}




func push(slice any, value any) {
	if s, ok := slice.(*[]any); ok {
		*s = append(*s, value)
	}
}

func pushm(slice any, values any) {
	if s, ok := slice.(*[]any); ok {
		if v, ok := values.(*[]any); ok {
			*s = append(*s, *v...)
		}
	}
}


func at(slice any, index any) any {
	if s, ok := slice.(*[]any); ok {
		return (*s)[index.(int)]
	}
	return nil
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

func splice(slice any, start any, deleteCount any, elements any) any {
	if s, ok := slice.(*[]any); ok {
		start := start.(int)
		deleteCount := deleteCount.(int)
		elements := elements.([]any)
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


func slice(s any, start any, end any) any {
	startInt := start.(int)
	endInt := end.(int)

	switch s := s.(type) {
	case *[]any:
		if startInt < 0 {
			startInt = len(*s) + startInt
		}
		if startInt < 0 {
			startInt = 0
		}
		if startInt > len(*s) {
			startInt = len(*s)
		}
		if endInt < 0 {
			endInt = len(*s) + endInt
		}
		if endInt > len(*s) {
			endInt = len(*s)
		}
		if startInt > endInt {
			return nil
		}
		return (*s)[startInt:endInt]
	case string:
		if startInt < 0 {
			startInt = len(s) + startInt
		}
		if startInt < 0 {
			startInt = 0
		}
		if startInt > len(s) {
			startInt = len(s)
		}
		if endInt < 0 {
			endInt = len(s) + endInt
		}
		if endInt > len(s) {
			endInt = len(s)
		}
		if startInt > endInt {
			return ""
		}
		return s[startInt:endInt]
	}
	return nil
}

func sliceFrom(slice any, start any) any {
	startInt := start.(int)

	switch s := slice.(type) {
	case *[]any:
		if startInt < 0 {
			startInt = len(*s) + startInt
		}
		if startInt < 0 {
			startInt = 0
		}
		if startInt > len(*s) {
			startInt = len(*s)
		}
		return (*s)[startInt:]
	case string:
		if startInt < 0 {
			startInt = len(s) + startInt
		}
		if startInt < 0 {
			startInt = 0
		}
		if startInt > len(s) {
			startInt = len(s)
		}
		return s[startInt:]
	}
	return nil
}

func length(slice any) any {
	switch s := slice.(type) {
	case *[]any:
		return len(*s)
	case string:
		return len(s)
	}
	return 0
}
func indexOf(a any, b any) any {
	if a, ok := a.(string); ok {
	    return strings.Index(a, b.(string))
	}
	return -1
}
func lastIndexOf(a any, b any) any {
	if a, ok := a.(string); ok {
	    return strings.LastIndex(a, b.(string))
	}
	return -1
}

func plus(a, b any) any {
    switch a := a.(type) {
    case int:
        return a + b.(int)
    case float64:
        return a + b.(float64)
    }
    return nil
}
func minus(a, b any) any {
    switch a := a.(type) {
    case int:
        return a - b.(int)
    case float64:
        return a - b.(float64)
    }
    return nil
}

func times(a, b any) any {
    switch a := a.(type) {
    case int:
        return a * b.(int)
    case float64:
        return a * b.(float64)
    }
    return nil
}

func divide(a, b any) any {
    switch a := a.(type) {
    case int:
        return a / b.(int)
    case float64:
        return a / b.(float64)
    }
    return nil
}

func mod(a, b any) any {
    switch a := a.(type) {
    case int:
        return a % b.(int)
    case float64:
        // this right?
        return a - float64(int(a/b.(float64)))*b.(float64)
    }
    return nil
}

// double check this chatgpt code
func exponent(a, b any) any {
    switch a := a.(type) {
    case int:
        result := 1
        base := a
        exp := b.(int)
        for exp > 0 {
            if exp%2 == 1 {
                result *= base
            }
            base *= base
            exp /= 2
        }
        return result
    case float64:
        return math.Pow(a, b.(float64))
    }
    return nil
}

func is(a, b any) any {
    return a == b
}

func cc(a, b any) any {
	if aArr, ok1 := a.(*[]any); ok1 {
		if bArr, ok2 := b.(*[]any); ok2 {
			result := append([]any{}, (*aArr)...)
			result = append(result, (*bArr)...)
			return &result
		}
	}
	return a.(string) + b.(string)
}

func toString(a any) any {
    switch a := a.(type) {
    case int:
        return strconv.Itoa(a)
    case float64:
        return strconv.FormatFloat(a, 'f', -1, 64)
    }
    return nil
}

func say(val any) {
    switch val := val.(type) {
    case string:
        fmt.Printf("%v\n", val)
    case map[string]any:
        jsonData, err := json.MarshalIndent(val, "", "    ")
        if err != nil {
            panic(err)
        } else {
            fmt.Println(string(jsonData))
        }
    case *[]any:
        jsonData, err := json.MarshalIndent(val, "", "    ")
        if err != nil {
            panic(err)
        } else {
            fmt.Println(string(jsonData))
        }
    case float64:
        fmt.Printf("%v\n", val)
    case int:
        fmt.Printf("%v\n", val)
    case bool:
        fmt.Printf("%t\n", val)
    case nil:
        fmt.Println("<nil>")
    default:
        fmt.Printf("the type is %T\n", val)
    }
}

func keys(a any) any {
    ret := []any{}
    for k := range a.(map[string]any) {
        ret = append(ret, k)
    }
    return &ret
}
func setProp(a, b, c any) {
    a.(map[string]any)[b.(string)] = c
}
func getProp(a, b any) any {
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
func makeBuiltin_2_0(f func(any, any)) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        b := pop(state["__vals"])
        a := pop(state["__vals"])
        f(a, b)
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
func makeBuiltin_4_1(f func(any, any, any, any) any) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        d := pop(state["__vals"])
        c := pop(state["__vals"])
        b := pop(state["__vals"])
        a := pop(state["__vals"])
        push(state["__vals"], f(a, b, c, d))
        return state
    }
}

var builtins = map[string]func(state map[string]any) map[string]any {
    "+": makeBuiltin_2_1(plus),
    "-": makeBuiltin_2_1(minus),
    "*": makeBuiltin_2_1(times),
    "/": makeBuiltin_2_1(divide),
    "^": makeBuiltin_2_1(exponent),
    "%": makeBuiltin_2_1(mod),
    "cc": makeBuiltin_2_1(cc),
    "toString": makeBuiltin_1_1(toString),
    "is": makeBuiltin_2_1(is),
    "say": makeBuiltin_1_0(say),
    "put": makeNoop(),
    "push": makeBuiltin_2_0(push),
    "pushm": makeBuiltin_2_0(pushm),
    "pop": makeBuiltin_1_1(pop),
    "unshift": makeBuiltin_2_0(unshift),
    "shift": makeBuiltin_1_1(shift),
    "at": makeBuiltin_2_1(at),
    "sliceFrom": makeBuiltin_2_1(sliceFrom),
    "slice": makeBuiltin_3_1(slice),
    "splice": makeBuiltin_4_1(splice),
    "length": makeBuiltin_1_1(length),
    "setProp": makeBuiltin_3_0(setProp),
    "getProp": makeBuiltin_2_1(getProp),
    "keys": makeBuiltin_1_1(keys),
    "exit": func(state map[string]any) map[string]any {
        return nil
    },
    "makeObject": func(state map[string]any) map[string]any {
        push(state["__vals"], map[string]any{})
        return state
    },
    "makeArray": func(state map[string]any) map[string]any {
        push(state["__vals"], &[]any{})
        return state
    },
    "debugS": func(state map[string]any) map[string]any {
        fmt.Println("debugging s", state["s"].(map[string]any)["__vals"])
        return state
    },
    "debug": func(state map[string]any) map[string]any {
        vals := *state["__vals"].(*[]any)
        fmt.Println("debugging", vals[len(vals)-1])
        return state
    },
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

func makeState(fileName, code string) map[string]any {
    // stateCreation
    return map[string]any{
        "__fileName": fileName,
        "__i": 0,
        "__code": code,
        "__vals": &[]any{},
        "__globals": map[string]any{},
        "__call_immediates": map[string]any{},
        "__argCount": 0,
        "__currFuncToken": "",
    }
}

func callFunc(state map[string]any) map[string]any {
    fNameToken := state["__currFuncToken"].(string)
    if (fNameToken == "") {
        return state
    }
    fName := fNameToken[1:]

    // phase 1: builtin
    if f, ok := builtins[fName]; ok {
        newState := f(state)
        state["__currFuncToken"] = ""
        state["__argCount"] = 0
        return newState
    }

    // phase 2: special case string function
    funcCode := state["__globals"].(map[string]any)[fName]
    switch funcCode := funcCode.(type) {
    case string:
        evalState := makeState("__internal", funcCode)
        evalState["__globals"] = state["__globals"]
        evalState["__call_immediates"] = state["__call_immediates"]
        evalState["s"] = state
        evalState = eval(evalState)
        state["__currFuncToken"] = ""
        state["__argCount"] = 0
        return evalState["s"].(map[string]any)
    case map[string]any:
        callFuncString, ok := state["__globals"].(map[string]any)["__callFunc"].(string)
        if ok {
            evalState := makeState("__internal", callFuncString)
            evalState["s"] = state
            evalState = eval(evalState)
            state["__currFuncToken"] = ""
            state["__argCount"] = 0
            return evalState["s"].(map[string]any)
        }
    }
    fmt.Println("-cannot find func", fName)
    state["__currFuncToken"] = ""
    state["__argCount"] = 0
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
// #300.23
// i300
func makeToken(val string) string {
    if isNumeric(val) {
        if strings.Contains(val, ".") {
            return "#" + val
        }
        return "i" + val
    }
    return "$" + val
}

func isNumeric(s string) bool {
	_, err := strconv.ParseFloat(s, 64)
	return err == nil
}

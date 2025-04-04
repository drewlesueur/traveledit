package main

import (
    "fmt"
    "os"
    "strings"
    "os/exec"
	"strconv"
	"encoding/json"
)


func popVal(state map[string]any) any {
    // first pop from args
    if length(state["__args"]) > 0 {
        return pop(state["__args"])
    }
    // then pop from stack
    return pop(state["__valStack"])
}



func get(state map[string]any, field string) any {
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

    name := field[1:]
    var ok bool
    for {
        vars := state["__vars"].(map[string]any)
        if val, ok := vars[name]; ok {
            return val
        }
        state, ok = state["__lexicalParent"].(map[string]any)
        if !ok {
            return nil
        }
    }
    return nil
    // return state["__vars"].(map[string]any)[name]
}


func isNumeric(s string) bool {
	_, err := strconv.ParseFloat(s, 64)
	return err == nil
}

func getPrevIndent(state map[string]any) string {
    // TODO: add caching
    return getPrevIndentRaw(getCode(state), state["__i"].(int) - 2)
}


func push(slice any, value any) {
	if s, ok := slice.(*[]any); ok {
		*s = append(*s, value)
	}
}

func setField(m any, key string, value any) {
	if mmap, ok := m.(map[string]any); ok {
		mmap[key] = value
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

func getPrevIndentRaw(code string, i int) string {
    lastNonSpace := i
    loopy:
    for i = i; i >= 0; i-- {
        chr := code[i]
        switch chr {
        case '\n':
            i++
            break loopy
        case ' ', '\t':
        default:
            lastNonSpace = i
        }
    }
    return code[i:lastNonSpace]
}

func findNext(state map[string]any, things []string) int {
    // TODO: add caching
    code := getCode(state)
    i := state["__i"].(int)
    toSearch := code[i:]

    closestIndex := -1
    minDiff := len(toSearch)

    for j, thing := range things {
        index := strings.Index(toSearch, thing)
        if index != -1 && index < minDiff {
            minDiff = index
            closestIndex = j
        }
    }
    return minDiff + i + len(things[closestIndex])
}
    
    
var tokenFuncs = map[string]func(state map[string]any) map[string]any {
    "(": func(state map[string]any) map[string]any {
        // stateCreation
        newState := map[string]any{
            "__files": state["__files"],
            "__fileIndex": state["__fileIndex"],
            "__valStack": state["__valStack"],
            "__endStack": &[]any{},
            "__vars": map[string]any{},
            "__args": &[]any{},
            "__i": state["__i"],
            "__currFuncToken": "",
            "__mode": "normal",
            "__lexicalParent": state,
            "__callingParent": state,
        }
        return newState
    },
    ")": func(state map[string]any) map[string]any {
        state = callFunc(state)
        parentState := state["__lexicalParent"].(map[string]any)
        if parentState["__currFuncToken"].(string) == "" {
            for _, val := range *(state["__valStack"].(*[]any)) {
                push(parentState["__valStack"], val)
            }
        } else {
            for _, val := range *(state["__valStack"].(*[]any)) {
                push(parentState["__args"], val)
            }
        }
        parentState["__i"] = state["__i"]
        return parentState
    },
    "[": func(state map[string]any) map[string]any {
        // stateCreation
        newState := map[string]any{
            "__files": state["__files"],
            "__fileIndex": state["__fileIndex"],
            "__valStack": &[]any{},
            "__endStack": &[]any{},
            "__vars": map[string]any{},
            "__args": &[]any{},
            "__i": state["__i"],
            "__currFuncToken": "",
            "__mode": "array",
            "__lexicalParent": state,
            "__callingParent": state,
        }
        return newState
    },
    "]": func(state map[string]any) map[string]any {
        parentState := state["__lexicalParent"].(map[string]any)
        if parentState["__currFuncToken"].(string) == "" {
            push(parentState["__valStack"], state["__valStack"])
        } else {
            push(parentState["__args"], state["__valStack"])
        }
        parentState["__i"] = state["__i"]
        return parentState
    },
}

var endFuncs = map[string]func(map[string]any, map[string]any) map[string]any {
    "if": func(endInfo map[string]any, state map[string]any) map[string]any {
        return state
    },
    "loopN": func(endInfo map[string]any, state map[string]any) map[string]any {
        varName := endInfo["varName"].(string)
        loops := endInfo["loops"].(int)
        if state["__vars"].(map[string]any)[varName].(int) >= loops {
            // lol
        } else {
            state["__i"] = endInfo["__i"]
        }
        return state
    },
}
var builtins = map[string]func(state map[string]any) map[string]any {
    "+": func(state map[string]any) map[string]any {
        b := popVal(state).(float64)
        a := popVal(state).(float64)
        push(state["__valStack"], a + b)
        return state
    },
    "if": func(state map[string]any) map[string]any {
        cond := popVal(state)
        // state["__endStack"] = append(state["__endStack"].([]any), map[string]any{
        //     "type": "if",
        // })
        push(state["__endStack"], map[string]any{
            "type": "if",
        })
        if cond.(bool) == true {
            // lol
        } else {
            indent := getPrevIndent(state)
            // fmt.Printf("wanting to find: %q\n", indent + "end")
            i := findNext(state, []string{"\n" + indent + "end", "\n" + indent + "else"})
            state["__i"] = i
        }
        return state
    },
    "else": func(state map[string]any) map[string]any {
        indent := getPrevIndent(state)
        // fmt.Printf("wanting to find: %q\n", indent + "end")
        i := findNext(state, []string{"\n" + indent + "end"})
        state["__i"] = i
        return state
    },
    // "loopN": 
    "end": func(state map[string]any) map[string]any {
        if length(state["__endStack"]) == 0 {
            return state["__callingParent"].(map[string]any)
        }

        // endInfo := endStack[len(endStack)-1].(map[string]any)
        // state["__endStack"] = endStack[:len(endStack)-1]
        endInfo := pop(state["__endStack"]).(map[string]any)
        endFunc, ok := endFuncs[endInfo["type"].(string)]
        if ok {
            return endFunc(endInfo, state)
        }

        return state
    },
    "return": func(state map[string]any) map[string]any {
        // will be different for if
        parentState := state["__callingParent"].(map[string]any)
        for _, val := range *(state["__args"].(*[]any)) {
            push(parentState["__valStack"], val)
        }
        return parentState
    },
    "label": func(state map[string]any) map[string]any {
        varName := popVal(state).(string)
        val := map[string]any{
            "__fileIndex": state["__fileIndex"],
            "__i": state["__i"],
        }
        setField(state["__vars"], varName, val)
        return state
    },
    "is": func(state map[string]any) map[string]any {
        b := popVal(state)
        a := popVal(state)
        push(state["__valStack"], a == b)
        return state
    },
    "put": func(state map[string]any) map[string]any {
        a := popVal(state)
        push(state["__valStack"], a)
        return state
    },
    "cc": func(state map[string]any) map[string]any {
        b := popVal(state).(string)
        a := popVal(state).(string)
        push(state["__valStack"], a + b)
        return state
    },
    "def": func(state map[string]any) map[string]any {
        funcName := shift(state["__args"]).(string)
        state["__vars"].(map[string]any)[funcName] = map[string]any{
            "__fileIndex": state["__fileIndex"],
            "__i": state["__i"],
            "__params": state["__args"],
            "__lexicalParent": state,
        }
        // todo you could keep track of indent better
        indent := getPrevIndent(state)
        // fmt.Printf("wanting to find: %q\n", indent + "end")
        i := findNext(state, []string{"\n" + indent + "end"})
        state["__i"] = i

        // fmt.Printf("found: %q\n", getCode(state)[i:])
        return state
    },
    "func": func(state map[string]any) map[string]any {
        f := map[string]any{
            "__fileIndex": state["__fileIndex"],
            "__i": state["__i"],
            "__params": state["__args"],
            "__lexicalParent": state,
        }
        // todo you could keep track of indent better
        indent := getPrevIndent(state)
        // fmt.Printf("wanting to find: %q\n", indent + "end")
        i := findNext(state, []string{"\n" + indent + "end"})
        state["__i"] = i
        push(state["__valStack"], f)
        return state
    },
    "say": func(state map[string]any) map[string]any {
        val := popVal(state)
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

        return state
    },
    "let": func(state map[string]any) map[string]any {
        val := popVal(state)
        varName := popVal(state).(string)
        setField(state["__vars"], varName, val)
        // state["__vars"].(map[string]any)[varName] = val
        return state
    },
    "execBashCombined": func(state map[string]any) map[string]any {
        val := popVal(state).(string)
        // fmt.Printf("%v\n", val)

        cmd := exec.Command("sh", "-c", val)
        cmdOutput, err := cmd.CombinedOutput()
        if err != nil {
            panic(err)
        }
        push(state["__valStack"], string(cmdOutput))
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
        state["__args"] = &[]any{}
        state["__currFuncToken"] = ""
        return newState
    }
    
    internalFunc, ok := get(state, fNameToken).(map[string]any)
    if ok {
        // stateCreation
        args := *(state["__args"].(*[]any))
        params := *(internalFunc["__params"].(*[]any))
        
        
        state["__args"] = &[]any{}
        state["__currFuncToken"] = ""
        newState := map[string]any{
            "__files": state["__files"],
            "__fileIndex": internalFunc["__fileIndex"],
            "__valStack": &[]any{},
            "__endStack": &[]any{},
            "__vars": map[string]any{},
            "__args": &[]any{},
            "__i": internalFunc["__i"],
            "__currFuncToken": "",
            "__mode": "normal",
            "__lexicalParent": internalFunc["__lexicalParent"],
            "__callingParent": state,
        }
        vars := newState["__vars"].(map[string]any)
        for argI, arg := range args {
            vars[params[argI].(string)] = arg
        }
        fmt.Println("+wow new state")
        return newState
    } else {
        fmt.Println("Func not found:", fName)
        state["__args"] = &[]any{}
        state["__currFuncToken"] = ""
    }
    return state
}

func getCode(state map[string]any) string {
    return (*(state["__files"].(*[]any)))[state["__fileIndex"].(int)].(map[string]any)["code"].(string)
}

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
        "__files": &[]any{
            map[string]any{
                "fullPath": fileName,
                "code": code,
            },
        },
        "__fileIndex": 0,
        "__valStack": &[]any{},
        "__endStack": &[]any{},
        "__args": &[]any{},
        "__vars": map[string]any{},
        "__i": 0,
        "__currFuncToken": "",
        "__mode": "normal", // object, array
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
        case "[", "]", "(", ")", "{", "}":
            state = tokenFuncs[token](state)
            continue
        }
        if state["__mode"].(string) == "normal" {
            switch token {
            case "\n":
                state = callFunc(state)
                continue
            }

            if state["__currFuncToken"].(string) == "" {
                state["__currFuncToken"] = token
            } else {
                push(state["__args"], get(state, token))
            }
        } else if state["__mode"].(string) == "array" {
            switch token {
            case "\n":
                continue
            }
            push(state["__valStack"], get(state, token))
        } else if state["__mode"].(string) == "object" {
            switch token {
            case "\n":
                continue
            }
            if key, ok := state["__currKey"].(string); ok {
                state["__vars"].(map[string]any)[key] = get(state, token)
                delete(state["__vars"].(map[string]any), "__currKey")
            } else {
                state["__currKey"] = get(state, token)
            }
        }
    }
}

func nextToken(state map[string]any) (string) {
    var token string
    token, state["__i"] = nextTokenRaw(getCode(state), state["__i"].(int))
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
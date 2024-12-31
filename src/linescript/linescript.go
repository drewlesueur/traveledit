package main

import (
    "fmt"
    "os"
    "strings"
    "os/exec"
	"strconv"
	"encoding/json"
)

func popVal_(state map[string]any) any {
    // first shift from args
    if len(state["__args"].([]any)) > 0 {
        return get(state, shiftArgs(state).(string))
    }
    // then popfrom stack
    valStack := state["__valStack"].([]any)
    poppedValue := valStack[len(valStack)-1]
    state["__valStack"] = valStack[:len(valStack)-1]

    return poppedValue
}

func popVal(state map[string]any) any {
    // first shift from args
    if len(state["__args"].([]any)) > 0 {
        return shiftArgs(state)
    }
    // then popfrom stack
    valStack := state["__valStack"].([]any)
    poppedValue := valStack[len(valStack)-1]
    state["__valStack"] = valStack[:len(valStack)-1]

    return poppedValue
}

func pushVal(state map[string]any, v any) {
    state["__valStack"] = append(state["__valStack"].([]any), v)
}

func pushArgs(state map[string]any, v any) {
    state["__args"] = append(state["__args"].([]any), v)
}

func shiftArgs(state map[string]any) any {
    args := state["__args"].([]any)
    if len(args) == 0 {
        return nil
    }
    firstElement := args[0]
    state["__args"] = args[1:]
    return firstElement
}

func get(state map[string]any, field string) any {
    // TODO: parse out dot
    if field[0] == '\'' {
        return field[1:]
    }

    if field[0] == '#' {
        // for numbers
        return field[1:]
    }

    name := field[1:]
    return state["__vars"].(map[string]any)[name]
}

func isNumeric(s string) bool {
	_, err := strconv.ParseFloat(s, 64)
	return err == nil
}

func getPrevIndent(code string, i int) string {
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

var builtins = map[string]func(state map[string]any) map[string]any {
    // "(": func(state map[string]any) map[string]any {
    //     val := popVal(state).(string)
    //     fmt.Printf("%v\n", val)
    //     return state
    // },
    "end": func(state map[string]any) map[string]any {
        // will be different for if
        return state["__callingParent"].(map[string]any)
    },
    "def": func(state map[string]any) map[string]any {
        funcName := popVal(state).(string)
        state["__vars"].(map[string]any)[funcName] = map[string]any{
            "__fileIndex": state["__fileIndex"],
            "__i": state["__i"],
            "__params": state["__args"],
            "__lexicalParent": state,
        }
        // todo you could keep track of indent better
        indent := getPrevIndent(getCode(state), state["__i"].(int) - 2)
        // fmt.Printf("wanting to find: %q\n", indent + "end")
        i := findNext(state, []string{"\n" + indent + "end"})
        state["__i"] = i

        // fmt.Printf("found: %q\n", getCode(state)[i:])

        return state
    },
    "[": func(state map[string]any) map[string]any {
        // stateCreation
        newState := map[string]any{
            "__files": state["__files"],
            "__fileIndex": state["__fileIndex"],
            "__valStack": []any{},
            "__vars": map[string]any{},
            "__args": []any{},
            "__i": state["__i"],
            "__currFuncName": "",
            "__mode": "array",
            "__lexicalParent": state,
            "__callingParent": state,
        }
        return newState
    },
    "]": func(state map[string]any) map[string]any {
        parentState := state["__lexicalParent"].(map[string]any)
        if parentState["__currFuncName"].(string) == "" {
            pushVal(parentState, state["__valStack"])
        } else {
            pushArgs(parentState, state["__valStack"])
        }
        return parentState
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
        case []any:
            jsonData, err := json.MarshalIndent(val, "", "    ")
            if err != nil {
                panic(err)
            } else {
                fmt.Println(string(jsonData))
            }
        case nil:
            fmt.Println("<nil>")
        default:
            fmt.Println("the type is %T", val)
        }


        return state
    },
    "let": func(state map[string]any) map[string]any {
        varName := popVal(state).(string)
        val := popVal(state)
        state["__vars"].(map[string]any)[varName] = val
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
        pushVal(state, string(cmdOutput))
        return state
    },
}

func callFunc(state map[string]any) map[string]any {
    fNameToken := state["__currFuncName"].(string)
    if (fNameToken == "") {
        return state
    }
    fName := fNameToken[1:]
    if f, ok := builtins[fName]; ok {
        newState := f(state)
        state["__args"] = []any{}
        state["__currFuncName"] = ""
        return newState
    }
    
    internalFunc, ok := get(state, fNameToken).(map[string]any)
    if ok {
        // stateCreation
        args := state["__args"].([]any)
        params := internalFunc["__params"].([]any)
        
        
        state["__args"] = []any{}
        state["__currFuncName"] = ""
        newState := map[string]any{
            "__files": state["__files"],
            "__fileIndex": internalFunc["__fileIndex"],
            "__valStack": []any{},
            "__vars": map[string]any{},
            "__args": []any{},
            "__i": internalFunc["__i"],
            "__currFuncName": "",
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
        state["__args"] = []any{}
        state["__currFuncName"] = ""
    }
    return state
}

func getCode(state map[string]any) string {
    return state["__files"].([]any)[state["__fileIndex"].(int)].(map[string]any)["code"].(string)
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
        "__files": []any{
            map[string]any{
                "fullPath": fileName,
                "code": code,
            },
        },
        "__fileIndex": 0,
        "__valStack": []any{},
        "__args": []any{},
        "__vars": map[string]any{},
        "__i": 0,
        "__currFuncName": "",
        "__mode": "normal", // object, array
    }

    for j := 0; j < 1000; j++ {
        // token, state["__i"] = nextToken(getCode(state), state["__i"].(int))
        token = nextToken(state)
        if token == "" {
            break
        }
        fmt.Printf("# token: %q\n", token)
        // fmt.Printf("i: %d\n", i)
        // continue

        if state["__mode"].(string) == "normal" {
            if token == "\n" {
                state = callFunc(state)
                continue
            }
            if state["__currFuncName"].(string) == "" {
                state["__currFuncName"] = token
            } else {
                // state["__valStack"] = append(state["__valStack"].([]any), token)
                // pushArgs(state, get(state, token))
                pushArgs(state, get(state, token))
            }
        } else if state["__mode"].(string) == "array" {
            if token == "\n" {
                continue
            }
            pushVal(state, get(state, token))
        } else if state["__mode"].(string) == "object" {
            if token == "\n" {
                continue
            }
            // state[get(state, token)] = (state, )
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
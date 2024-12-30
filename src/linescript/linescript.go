package main

import (
    "fmt"
    "os"
    "strings"
    "os/exec"
	"strconv"
)

func popVal(state map[string]any) any {
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
func popValRaw(state map[string]any) any {
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
    return state[name]
}

func isNumeric(s string) bool {
	_, err := strconv.ParseFloat(s, 64)
	return err == nil
}


var builtins = map[string]func(state map[string]any) map[string]any {
    "(": func(state map[string]any) map[string]any {
        val := popVal(state).(string)
        fmt.Printf("%v\n", val)
        return state
    },
    "say": func(state map[string]any) map[string]any {
        val := popVal(state).(string)
        fmt.Printf("%v\n", val)
        return state
    },
    "let": func(state map[string]any) map[string]any {
        varName := popValRaw(state).(string)[1:]
        val := popVal(state)
        state[varName] = val
        fmt.Printf("setting %s to %v\n", varName, val)
        return state
    },
    "execBashCombined": func(state map[string]any) map[string]any {
        val := popVal(state).(string)
        fmt.Printf("%v\n", val)

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
    fName := state["__currFuncName"].(string)
    if (fName == "") {
        return state
    }
    fName = fName[1:]
    if f, ok := builtins[fName]; ok {
        newState := f(state)
        state["__inCall"] = false
        state["__args"] = []any{}
        state["__currFuncName"] = ""
        return newState
    }
    return state
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

    i := 0
    token := ""
    state := map[string]any{
        "__valStack": []any{},
        "__args": []any{},
        // "__vars": map[string]any{},
        "__i": 0,
        "__inCall": false,
        "__currFuncName": "",
    }

    for j := 0; j < 1000; j++ {
        token, i = nextToken(code, i)
        state["__i"] = i
        if token == "" {
            break
        }
        fmt.Printf("# token: %q\n", token)
        // fmt.Printf("i: %d\n", i)
        // continue
        if token == "\n" {
            callFunc(state)
            continue
        }
        if !state["__inCall"].(bool) {
            state["__inCall"] = true
            state["__currFuncName"] = token
        } else {
            // state["__valStack"] = append(state["__valStack"].([]any), token)
            // pushArgs(state, get(state, token))
            pushArgs(state, token)
        }
    }
}

func nextToken(code string, i int) (string, int) {
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
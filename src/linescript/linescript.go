package main

import (
    "fmt"
    "os"
    "strings"
    "os/exec"
)

func popVal(state map[string]any) any {
    valStack := state["__valStack"].([]any)
    poppedValue := valStack[len(valStack)-1]
    state["__valStack"] = valStack[:len(valStack)-1]
    argCount := state["__argCount"].(int)
    if argCount > 0 {
        // args are prefixed so se can use incr and set etc
        state["__argCount"] = argCount - 1
        return get(state, poppedValue.(string))
    }
    return poppedValue
}
func popValRaw(state map[string]any) any {
    valStack := state["__valStack"].([]any)
    poppedValue := valStack[len(valStack)-1]
    state["__valStack"] = valStack[:len(valStack)-1]
    argCount := state["__argCount"].(int)
    if argCount > 0 {
        // args are prefixed so se can use incr and set etc
        state["__argCount"] = argCount - 1
    }
    return poppedValue
}

func pushVal(state map[string]any, v any) {
    state["__valStack"] = append(state["__valStack"].([]any), v)
}

func get(state map[string]any, field string) any {
    // TODO: parse out dot
    if field[0] == '\'' {
        return field[1:]
    }
    return state[field[1:]]
}

var builtins = map[string]func(state map[string]any) map[string]any {
    "say": func(state map[string]any) map[string]any {
        val := popVal(state).(string)
        fmt.Printf("%v\n", val)
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
    fName := state["__currFuncName"].(string)[1:]
    if f, ok := builtins[fName]; ok {
        newState := f(state)
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
        // "__vars": map[string]any{},
        "__i": 0,
        "__inCall": false,
        "__argCount": 0,
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
            if (state["__currFuncName"].(string) == "") {
                continue
            }
            oldState := state
            callFunc(state)
            oldState["__inCall"] = false
            oldState["__argCount"] = 0
            oldState["__currFuncName"] = ""
            continue
        }
        if !state["__inCall"].(bool) {
            state["__inCall"] = true
            state["__currFuncName"] = token
        } else {
            // state["__valStack"] = append(state["__valStack"].([]any), token)
            pushVal(state, token)
            state["__argCount"] = state["__argCount"].(int) + 1
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
                return "$" + code[start:i], i
            case ',', '\n':
                return "$" + code[start:i], i
            case ' ', '\t', '\r':
                return "$" + code[start:i], i+1
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
        return "$" + code[start:i], i+1
    }
    return "", -1
}
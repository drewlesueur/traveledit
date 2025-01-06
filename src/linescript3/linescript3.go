package main

import (
    "fmt"
    "os"
    // "os/exec"
	"strconv"
	"strings"
	"time"
	"runtime/pprof"
)

func main() {
	// Create a file to save the CPU profile
	cpuProfile, err := os.Create("cpu.prof")
	if err != nil {
		panic(err)
	}
	defer cpuProfile.Close()

	// Start CPU profiling
	if err := pprof.StartCPUProfile(cpuProfile); err != nil {
		panic(err)
	}
	defer pprof.StopCPUProfile() // Stop CPU profiling when the program ends

    // because of initialozation cycle issue
	// ./linescript3.go:374:5: initialization cycle for builtins
	// 	./linescript3.go:374:5: builtins refers to
	// 	./linescript3.go:440:6: callFunc refers to
	// 	./linescript3.go:374:5: builtins
    start := time.Now()
    val := 0
    // for i := 0; i<1_000_000; i++ {
    for i := 0; i<10_000; i++ {
        val += i % 30
    }
    fmt.Println(time.Since(start))
    fmt.Println("val is", val)
    
    builtins["callFuncAccessible"] = makeBuiltin_1_1(callFuncAccessible)
    
    optimized()

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

    // for j := 0; j < 10000; j++ {
    for {
        if state == nil {
            return nil
        }
        token = nextToken(state)
        if token == "" {
            break
        }

        switch token {
        case "\n":
            state = callFunc(state)
            continue
        }

        if immediateCode, ok := state["__call_immediates"].(map[string]any)[token].(string); ok {
            evalState := makeState("__internal", immediateCode)
            evalState["__stateChangers"] = state["__stateChangers"]
            evalState["__globals"] = state["__globals"]
            evalState["__call_immediates"] = state["__call_immediates"]
            evalState["s"] = state
            evalState = eval(evalState)
            state, ok = evalState["s"].(map[string]any)
            if !ok {
                return nil
            }
            continue
        }

        if state["__currFuncToken"].(string) == "" {
            state["__currFuncToken"] = token
            state["__funcTokenSpot"] = length(state["__vals"]).(int) - 1
        } else {
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
    if field == "$true" {
        return true
    }
    if field == "$false" {
        return false
    }
    if field == "$null" {
        return nil
    }

    varName := field[1:]
    push(state["__vals"], varName)
    oldCurrFuncToken := state["__currFuncToken"]
    oldFuncTokenSpot := state["__funcTokenSpot"]
    state["__currFuncToken"] = "$__getVar"
    callFunc(state) // you could implement __call_immediates this way?
    state["__currFuncToken"] = oldCurrFuncToken
    state["__funcTokenSpot"] = oldFuncTokenSpot
    item := pop(state["__vals"])
    return item
    // TODO, it pops, only to put it back on again, short circuit that
}

func makeState(fileName, code string) map[string]any {
    // stateCreation
    return map[string]any{
        "__fileName": fileName,
        "__i": 0,
        "__code": code,
        // "__cache": codeCache[code],
        "__vals": &[]any{},
        "__stateChangers": map[string]any{},
        "__globals": map[string]any{},
        "__call_immediates": map[string]any{},
        "__currFuncToken": "",
        "__funcTokenStack": &[]any{},
        "__funcTokenSpot": -1,
        "__funcTokenSpotStack": &[]any{},
    }
}

var codeCache = map[string]map[int]struct {
    token string
    newI  int
}{ }

func callFunc(state map[string]any) map[string]any {
    var fName string
    fNameToken := state["__currFuncToken"].(string)
    if (fNameToken == "") {
        return state
    }
    fName = fNameToken[1:]

    // phase 1: builtin
    if f, ok := builtins[fName]; ok {
        newState := f(state)
        state["__currFuncToken"] = ""
        state["__funcTokenSpot"] = -1
        return newState
    }

    // phase 2: special case string function
    funcCode := state["__stateChangers"].(map[string]any)[fName]
    switch funcCode := funcCode.(type) {
    case string:
        // this maybe helped a small bit
        // evalState := map[string]any{
        //     "__fileName": "__internal",
        //     "__i": 0,
        //     "__code": funcCode,
        //     "__vals": &[]any{},
        //     "__stateChangers": state["__stateChangers"],
        //     "__globals": state["__globals"],
        //     "__call_immediates": state["__call_immediates"],
        //     "__currFuncToken": "",
        //     "__funcTokenStack": &[]any{},
        //     "__funcTokenSpot": -1,
        //     "__funcTokenSpotStack": &[]any{},
        // }
        evalState := makeState("__internal", funcCode)
        evalState["__stateChangers"] = state["__stateChangers"]
        evalState["__globals"] = state["__globals"]
        evalState["__call_immediates"] = state["__call_immediates"]
        
        evalState["s"] = state
        evalState = eval(evalState)
        state["__currFuncToken"] = ""
        state["__funcTokenSpot"] = -1
        return evalState["s"].(map[string]any)
    case map[string]any:
        callFuncString, ok := state["__stateChangers"].(map[string]any)["__callFunc"].(string)
        if ok {
            evalState := makeState("__internal", callFuncString)
            evalState["__stateChangers"] = state["__stateChangers"]
            evalState["__globals"] = state["__globals"]
            evalState["__call_immediates"] = state["__call_immediates"]
            evalState["s"] = state
            evalState = eval(evalState)
            state["__currFuncToken"] = ""
            state["__funcTokenSpot"] = -1
            return evalState["s"].(map[string]any)
        }
    }

    funcCode = state["__globals"].(map[string]any)[fName]
    switch funcCode := funcCode.(type) {
    case string:

        // need this for "as" to work
        oldCode := state["__code"]
        // oldCache := state["__cache"]
        oldI := state["__i"]
        oldFileName := state["__fileName"]
        state["__code"] = funcCode
        // state["__cache"] = codeCache[funcCode]
        state["__i"] = 0
        state["__fileName"] = "__internal"
        state["__currFuncToken"] = ""
        eval(state)
        state["__funcTokenSpot"] = -1
        state["__code"] = oldCode
        // state["__cache"] = oldCache
        state["__i"] = oldI
        state["__fileName"] = oldFileName
        return state
    }
    fmt.Println("-cannot find func", fName)
    state["__currFuncToken"] = ""
    state["__funcTokenSpot"] = -1
    return state
}

func nextToken(state map[string]any) (string) {
    var token string
    token, state["__i"] = nextTokenRaw(state["__code"].(string), state["__i"].(int))
    return token
}

// add caching by setting cache on state
// cache the token and new __i at given __i

func nextToken__(state map[string]any) string {
    if cache, ok := state["__cache"].(map[int]struct {
        token string
        newI  int
    }); ok {
        if cachedResult, found := cache[state["__i"].(int)]; found {
            state["__i"] = cachedResult.newI
            return cachedResult.token
        }
    } else {
        theCache := make(map[int]struct {
            token string
            newI  int
        })
        state["__cache"] = theCache
        codeCache[state["__code"].(string)] = theCache
    }

    token, newI := nextTokenRaw(state["__code"].(string), state["__i"].(int))
    
    state["__cache"].(map[int]struct {
        token string
        newI  int
    })[state["__i"].(int)] = struct {
        token string
        newI  int
    }{token, newI}

    state["__i"] = newI
    return token
}

// assignment to entry in nil map





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
                expectedQuoteEnd := string(code[i]) + code[start:i]
                endIndex := strings.Index(code[i+1:], expectedQuoteEnd)
                token := code[i+1:i+1+endIndex]
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

// func isNumeric(s string) bool {
// 	_, err := strconv.ParseFloat(s, 64)
// 	return err == nil
// }


func isNumeric(s string) bool {
	return len(s) > 0 && ((s[0] >= '0' && s[0] <= '9') || s[0] == '-')
}

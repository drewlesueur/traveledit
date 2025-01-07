package main

import (
	"fmt"
	"os"
	"runtime/pprof"
	"strconv"
	"strings"
	"time"
)

type Func struct {
	FileName      string
	I             int
	Code          string
	CachedTokens  []*TokenCacheValue
	Params        []string
	LexicalParent *State
}
type State struct {
	FileName     string
	I            int
	Code         string
	CachedTokens []*TokenCacheValue
	Mode         string
	ModeStack    []string
	GoUpCache    []*int
	Vals         *[]any
	ValsStack    []*[]any
	EndStack     []func(*State) *State
	Vars         map[string]any
	// VarsStack          []map[string]any
	CurrFuncToken      string
	FuncTokenStack     []string
	FuncTokenSpot      int
	FuncTokenSpotStack []int
	LexicalParent      *State
	CallingParent      *State
	IntA               int
	Key                string
	KeyStack           []string
}

func makeState(fileName, code string) *State {
	// TODO: you may be ok initing some as nil
	return &State{
		FileName: fileName,
		I:        0,
		Code:     code,
		// CachedTokens : []*TokenCacheValue{},
		Mode:         "normal",
		ModeStack:    []string{},
		CachedTokens: nil,
		GoUpCache:    nil,
		Vals:         &[]any{},
		ValsStack:    []*[]any{},
		EndStack:     []func(*State) *State{},
		Vars:         map[string]any{},
		// VarsStack:          []map[string]any{},
		CurrFuncToken:      "",
		FuncTokenStack:     []string{},
		FuncTokenSpot:      -1,
		FuncTokenSpotStack: []int{},
		IntA:               0,
		Key:                "",
	}
}

func main() {
	_ = pprof.StartCPUProfile
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

	initBuiltins()

	start := time.Now()
	val := float64(0)
	for i := 0; i < 100_000; i++ {
		val = float64(i) - 0.1 + val
	}
	fmt.Println(time.Since(start))
	fmt.Println("val is", val)

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

func eval(state *State) *State {
	var token any

	// for j := 0; j < 10000; j++ {
	for {
		if state == nil {
			return nil
		}
		token = nextToken(state)

		switch token := token.(type) {
		case string:
			if token == "" {
				break
			}

			if strings.Index("()[]{}", token) != -1 {
				state = builtins[token](state)
				continue
			}
			switch state.Mode {
			case "normal":
				if token == "\n" {
					state = callFunc(state)
					continue
				}
				if state.CurrFuncToken == "" {
					state.CurrFuncToken = token
					state.FuncTokenSpot = len(*state.Vals) - 1
				} else {
					push(state.Vals, evalToken(state, token))
				}
			case "array", "object":
				if token == "\n" {
					continue
				}
				push(state.Vals, evalToken(state, token))
			}
		default:
			push(state.Vals, token)
		}
	}
	return state
}
func evalToken(state *State, field string) any {
	// TODO: parse out dot
	raw := field[1:]
	if field[0] == '\'' {
		return raw
	}
	return getVar(state, raw)
}
func getVar(state *State, varName string) any {
	// if varName == "IntA" {
	//     return state.IntA
	// }
	if v, ok := state.Vars[varName]; ok {
		return v
	}
	if state.LexicalParent != nil {
		return getVar(state.LexicalParent, varName)
	}
	return nil
}
func callFunc(state *State) *State {
	var fName string
	fNameToken := state.CurrFuncToken
	if fNameToken == "" {
		return state
	}
	fName = fNameToken[1:]

	// phase 1: builtin
	if f, ok := builtins[fName]; ok {
		newState := f(state)
		state.CurrFuncToken = ""
		state.FuncTokenSpot = -1
		return newState
	}

	state.CurrFuncToken = ""
	state.FuncTokenSpot = -1

	if theFunc, ok := getVar(state, fName).(*Func); ok {
		newState := makeState(theFunc.FileName, theFunc.Code)
		newState.CachedTokens = theFunc.CachedTokens
		newState.I = theFunc.I
		newState.Vals = state.Vals
		newState.CallingParent = state
		newState.LexicalParent = theFunc.LexicalParent
		for i := len(theFunc.Params) - 1; i >= 0; i-- {
			param := theFunc.Params[i]
			newState.Vars[param] = pop(state.Vals)
		}
		return newState
	}

	fmt.Println("-cannot find func", fName)
	state.CurrFuncToken = ""
	state.FuncTokenSpot = -1
	return state
}

type TokenCacheValue struct {
	I     int
	Token any
}

func nextToken(state *State) any {
	code := state.Code
	i := state.I
	if len(state.CachedTokens) == 0 {
		state.CachedTokens = make([]*TokenCacheValue, len(code)+1)
	}
	if cached := state.CachedTokens[i]; cached != nil {
		state.I = cached.I
		return cached.Token
	}
	// fmt.Println("cache miss")
	token, newI := nextTokenRaw(code, i)
	state.I = newI
	state.CachedTokens[i] = &TokenCacheValue{I: newI, Token: token}
	return token
}

const stateOut = 0
const stateIn = 1

func nextTokenRaw(code string, i int) (any, int) {
	if i > len(code) {
		return "", -1
	}
	state := stateOut
	start := -1
	for i = i; i < len(code); i++ {
		b := code[i]
		switch state {
		case stateOut:
			switch b {
			case '{', '}', '(', ')', '[', ']':
				return string(b), i + 1
			case ',', '\n':
				return "\n", i + 1
			case ' ', '\t', '\r':
				continue
			case '"', '\'':
				expectedQuoteEnd := string(code[i])
				end := strings.Index(code[i+1:], expectedQuoteEnd)
				return "'" + code[i+1:i+1+end], i + 1 + end + 1
			case '#':
				// comments
				end := strings.Index(code[i+1:], "\n")
				if end == -1 {
					return "", -1
				}
				i = i + 1 + end
			default:
				state = stateIn
				start = i
			}
		case stateIn:
			switch b {
			case '{', '}', '(', ')', '[', ']':
				return makeToken(code[start:i]), i
			case ',', '\n':
				return makeToken(code[start:i]), i
			case ' ', '\t', '\r':
				return makeToken(code[start:i]), i + 1
			case '"', '\'':
				expectedQuoteEnd := string(code[i]) + code[start:i]
				endIndex := strings.Index(code[i+1:], expectedQuoteEnd)
				token := code[i+1 : i+1+endIndex]
				return "'" + token, i + 1 + endIndex + len(expectedQuoteEnd)
			default:
			}
		}
	}
	if state == stateIn {
		return makeToken(code[start:i]), i + 1
	}
	return "", -1
}

// 'a string
// $var_name
// #300.23
// i300
func makeToken(val string) any {
	if isNumeric(val) {
		if strings.Contains(val, ".") {
			f, err := strconv.ParseFloat(val, 64)
			if err != nil {
				panic(err)
			}
			return f
		}
		i, err := strconv.Atoi(val)
		if err != nil {
			panic(err)
		}
		return i
	}
	switch val {
	case "true":
		return true
	case "false":
		return false
	case "null":
		return nil
	}
	return "$" + val
}

// func isNumeric(s string) bool {
// 	_, err := strconv.ParseFloat(s, 64)
// 	return err == nil
// }

func isNumeric(s string) bool {
	return len(s) > 0 && ((s[0] >= '0' && s[0] <= '9') || (s[0] == '-' && len(s) > 1))
}

func getPrevIndent(state *State) string {
	// TODO: add caching
	code := state.Code
	i := state.I
	lastNonSpace := i
loopy:
	for i = i-2; i >= 0; i-- {
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

func findNext(state *State, things []string) int {
	// TODO: add caching
	toSearch := state.Code[state.I:]

	closestIndex := -1
	minDiff := len(toSearch)

	for j, thing := range things {
		index := strings.Index(toSearch, thing)
		if index != -1 && index < minDiff {
			minDiff = index
			closestIndex = j
		}
	}
	return minDiff + state.I + len(things[closestIndex])
}

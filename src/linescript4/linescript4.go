// <code>
package main

import (
	"fmt"
	"os"
	"runtime/pprof"
	"strconv"
	"strings"
	"time"

	"encoding/json"
	"math"
	"os/exec"
)

type FindMatchingResult struct {
	Match string
	I     int
}
type Func struct {
	FileName string
	I        int
	EndI     int
	// Note: the code and the cache should be bundled? (check perf)
	Code         string
	CachedTokens []*TokenCacheValue // these aren't pointers, could be problem?
	// TODO check these caches, or combine them ?
	// in a function are they correctly copied?
	GoUpCache         []*int
	FindMatchingCache []*FindMatchingResult
	Params            []string
	LexicalParent     *State
	Builtin           func(state *State) *State
	Name              string

	// oneliner serves 2 things
	// one after def: func: loop: each: if:
	// and the other the state in the function
	// very closely related?
	OneLiner bool
}

// deprecated
type RunImmediate func(state *State) *State

type RunImmediate2 struct {
	Name string
	Func func(state *State) *State
}

type State struct {
	FileName     string
	I            int
	Code         string
	CachedTokens []*TokenCacheValue
	Mode         string
	OneLiner     bool
	ModeStack    []string
	// todo: caches need to be pointers???
	GoUpCache          []*int
	FindMatchingCache  []*FindMatchingResult
	Vals               *[]any
	ValsStack          []*[]any
	EndStack           []func(*State) *State
	Vars               map[string]any
	CurrFuncToken      func(*State) *State
	FuncTokenStack     []func(*State) *State
	FuncTokenSpot      int // position of the first "argument" in vals, even tho it can grab from earlier
	FuncTokenSpotStack []int
	LexicalParent      *State
	CallingParent      *State
	IntA               int
	Key                string
	KeyStack           []string
}

func makeState(fileName, code string) *State {
	return &State{
		FileName:  fileName,
		I:         0,
		Code:      code,
		Mode:      "normal",
		ModeStack: nil,

		CachedTokens:       nil,
		GoUpCache:          nil,
		FindMatchingCache:  nil,
		Vals:               &[]any{},
		ValsStack:          nil,
		EndStack:           nil,
		Vars:               map[string]any{},
		CurrFuncToken:      nil,
		FuncTokenStack:     nil,
		FuncTokenSpot:      -1,
		FuncTokenSpotStack: nil,
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

	_ = time.Now()
	// start := time.Now()
	// val := float64(0)
	// for i := 0; i < 100_000; i++ {
	// 	val = float64(i) - 0.1 + val
	// }
	// fmt.Println(time.Since(start))
	// fmt.Println("val is", val)

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
	// fmt.Println(code)
	// TODO: init caches here?
	state := makeState(fileName, code)
	eval(state)
}

func eval(state *State) *State {
	// for j := 0; j < 10000; j++ {
	for {
		if state == nil {
			return nil
		}
		// if state.I == -1 {
		// 	state = runImmediates["\n"](state)
		// 	state = state.CallingParent
		// 	continue
		// }
		token, name := nextToken(state)
		// #cyan
		// fmt.Printf("#cyan token: %T %q (%d/%d)\n", token, name, state.I, len(state.Code) - 1)
		_ = name
		switch token := token.(type){
		case immediateToken:
    		state = token(state)
		case builtinFuncToken:
			state.CurrFuncToken = token
			state.FuncTokenSpot = len(*state.Vals)
		// case string:
		// 	push(state.Vals, token)
		// case int:
		// 	push(state.Vals, token)
		// case float64:
		// 	push(state.Vals, token)
		// case bool:
		// 	push(state.Vals, token)
		case *Func:
			state.CurrFuncToken = nil
			state.FuncTokenSpot = -1
  
			newState := makeState(token.FileName, token.Code)
			newState.CachedTokens = token.CachedTokens
			newState.GoUpCache = token.GoUpCache
			newState.FindMatchingCache = token.FindMatchingCache
			newState.I = token.I
			newState.Vals = state.Vals
			newState.CallingParent = state
			newState.LexicalParent = token.LexicalParent
			newState.OneLiner = token.OneLiner
			for i := len(token.Params) - 1; i >= 0; i-- {
				param := token.Params[i]
				newState.Vars[param] = pop(state.Vals)
			}
			// nt, _ := nextTokenRaw(newState, newState.Code, newState.I)
			// fmt.Println("#yellow peek", toString(nt))
			// fmt.Println("#yellow currentstate one liner", state.OneLiner)
			state = newState
		case builtinToken:
			push(state.Vals, token)
		case getVarToken:
			evaled := getVar(state, string(token))
			push(state.Vals, evaled)
		case getVarFuncToken:
			evaledFunc := getVar(state, string(token)).(func(*State) *State)
			state.CurrFuncToken = evaledFunc
			state.FuncTokenSpot = len(*state.Vals)
		case exitToken:
		    // fmt.Println("exiting:", token)
		    state = state.CallingParent
		default:
		    // wow, adding the string, int, float, bool cases
		    // made the 1 million item loop in example2.js go from 24xms to 32xms
		    // I tried interfaces with a ProcessMethod and that was also slow
		    // see jump_alt and jump_table branches
			push(state.Vals, token)
		    // fmt.Printf("oops type %T\n", token)
		    // panic("fail")
		}
	}
	return state
}
func getVar(state *State, varName string) any {
	if v, ok := state.Vars[varName]; ok {
		return v
	}
	if state.LexicalParent != nil {
		return getVar(state.LexicalParent, varName)
	}
	return nil
}

func findParent(state *State, varName string) *State {
	if _, ok := state.Vars[varName]; ok {
		return state
	}
	if state.LexicalParent != nil {
		return findParent(state.LexicalParent, varName)
	}
	return nil
}

func clearFuncToken(state *State) {
	state.CurrFuncToken = nil
	state.FuncTokenSpot = -1
}

func callFunc(state *State) *State {
	if state.CurrFuncToken == nil {
		return state
	}
	newState := state.CurrFuncToken(state)
	return newState
}

type TokenCacheValue struct {
	I     int
	Token any
	Name string
}

func nextToken(state *State) (any, string) {
	code := state.Code
	i := state.I
	if len(state.CachedTokens) == 0 {
		state.CachedTokens = make([]*TokenCacheValue, len(code)+1)
	}
	if cached := state.CachedTokens[i]; cached != nil {
		state.I = cached.I
		return cached.Token, cached.Name
	}
	// fmt.Println("cache miss")
	token, name, newI := nextTokenRaw(state, code, i)
	state.I = newI
	state.CachedTokens[i] = &TokenCacheValue{I: newI, Token: token, Name: name}
	return token, name
}

const stateOut = 0
const stateIn = 1

func nextTokenRaw(state *State, code string, i int) (any, string, int) {
	// TODO: count subsequent newlines as a single newline.
	if i >= len(code) {
		return exitToken("past end?"), "<past end>", -1
	}
	parseState := stateOut
	start := -1
	for i = i; i < len(code); i++ {
		b := code[i]
		switch parseState {
		case stateOut:
			switch b {
			// leave off the : here so if it's a word starting with :, that can be a string
			case '{', '}', '(', ')', '[', ']', ',', '\n', '|':
				str := string(b)
				return makeToken(state, str), str, i + 1
			case ' ', '\t', '\r':
				continue
			case '"', '\'':
				expectedQuoteEnd := string(code[i])
				end := strings.Index(code[i+1:], expectedQuoteEnd)
				str := code[i+1 : i+1+end]
				return str, str, i + 1 + end + 1
			case '#':
				// comments
				end := strings.Index(code[i+1:], "\n")
				if end == -1 {
					return exitToken("end in comment"), "end in comment", -1
				}
				i = i + end
			default:
				parseState = stateIn
				start = i
			}
		case stateIn:
			switch b {
			case '{', '}', '(', ')', '[', ']', ',', '\n', '|', ':':
				str := code[start:i]
				return makeToken(state, str), str, i
			case ' ', '\t', '\r':
				str := code[start:i]
				return makeToken(state, str), str, i + 1
			case '"', '\'':
				str := code[start:i]
				expectedQuoteEnd := string(code[i]) + str
				endIndex := strings.Index(code[i+1:], expectedQuoteEnd)
				token := code[i+1 : i+1+endIndex]
				return token, token, i + 1 + endIndex + len(expectedQuoteEnd)
			default:
			}
		}
	}
	if parseState == stateIn {
		str := code[start:i]
		// return makeToken(state, str), str, i + 1
		return makeToken(state, str), str, i
	}
	return exitToken("got to end?"), "got to end?", -1
}



type getVarFuncToken string
type getVarToken string
type exitToken string
type builtinToken func(*State) *State
type builtinFuncToken func(*State) *State
type immediateToken func(*State) *State

// TODO: files must end in newline!
type Skip string

func makeToken(state *State, val string) any {
	// immediates go first, because it could be an immediate and builtin
	if f, ok := runImmediates[val]; ok {
		if state.Mode == "normal" {
			return immediateToken(f)
		}
	}
	if b, ok := builtins[val]; ok {
		// wow we can switch on the mode at compile time?!
		// the first run is compile time, interesting
		switch state.Mode {
		case "normal":
			if state.CurrFuncToken == nil {
				return builtinFuncToken(b)
			} else {
				return builtinToken(b)
			}
		case "array", "object":
			return builtinToken(b)
		}
	}
	// string shortcut
	if val[0] == ':' {
		if len(val) == 1 {
			// panic("skipping!!")
			// return Skip("")
			// is this hit?
			return val
		}
		theString := val[1:]
		return theString
	}
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
	case "newline":
		return "\n"
	case "null":
		return nil
	}
	
	if state.CurrFuncToken != nil {
		// if state.CurrFuncToken.Name == "let" && (len(*state.Vals) - state.FuncTokenSpot == 0) {
		// 	return stringToken(s)
		// }
		// if state.CurrFuncToken.Name == "local" && (len(*state.Vals) - state.FuncTokenSpot == 0) {
		// 	return stringToken(s)
		// }
		// if state.CurrFuncToken.Name == "def" {
		// 	return stringToken(s)
		// }
		// if state.CurrFuncToken.Name == "func" {
		// 	return stringToken(s)
		// }
		// if state.CurrFuncToken.Name == "each" && (len(*state.Vals) - state.FuncTokenSpot > 0) {
		// 	return stringToken(s)
		// }
		// if state.CurrFuncToken.Name == "loop" && (len(*state.Vals) - state.FuncTokenSpot > 0) {
		// 	return stringToken(s)
		// }
	}

	switch state.Mode {
	case "normal":
		if state.CurrFuncToken == nil {
			evaled := getVar(state, val)
			// once a func, always a func
			// but have to eval twice the first round?!
			// TODO: fix the double eval
			if _, ok := evaled.(func(*State) *State); ok {
			    return getVarFuncToken(val)
			} else {
		    	return getVarToken(val)
			}
		} else {
	    	return getVarToken(val)
		}
	case "array", "object":
    	return getVarToken(val)
	}
	panic("no slash?")
	return nil
}

type VarName string

// func isNumeric(s string) bool {
// 	_, err := strconv.ParseFloat(s, 64)
// 	return err == nil
// }

func isNumeric(s string) bool {
	return len(s) > 0 && ((s[0] >= '0' && s[0] <= '9') || (s[0] == '-' && len(s) > 1))
}

func getPrevIndent(state *State) string {
	code := state.Code
	i := state.I
	lastNonSpace := i
	i = i - 1
loopy:
	for i = i - 2; i >= 0; i-- {
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

func findBeforeEndLine(state *State) int {
	// line or parens or alternate line enders (, |)
	// reusing this helpful cache
	initFindMatchingCache(state)
	if c := state.FindMatchingCache[state.I]; c != nil {
		return c.I
	}
	parenCount := 0
	var i int
	for i = state.I; i < len(state.Code); i++ {
		chr := state.Code[i]
		if chr == '(' {
			parenCount++
			continue
		}
		if chr == ')' {
			parenCount--
			if parenCount < 0 {
				// i--
				break
			}
			continue
		}
		if chr == '\n' || chr == ',' || chr == '|' {
			if parenCount == 0 {
				// i--
				break
			}
			continue
		}
	}
	ret := &FindMatchingResult{
		I:     i,
		Match: "",
	}
	state.FindMatchingCache[state.I] = ret
	return ret.I
}
func findBeforeEndLineOnlyLine(state *State) int {
	// reusing this helpful cache
	initFindMatchingCache(state)
	if c := state.FindMatchingCache[state.I]; c != nil {
		return c.I
	}
	parenCount := 0
	var i int
	for i = state.I; i < len(state.Code); i++ {
		chr := state.Code[i]
		if chr == '(' {
			parenCount++
			continue
		}
		if chr == ')' {
			parenCount--
			if parenCount < 0 {
				// i--
				break
			}
			continue
		}
		if chr == '\n' {
			if parenCount == 0 {
				// i--
				break
			}
			continue
		}
	}
	ret := &FindMatchingResult{
		I:     i,
		Match: "",
	}
	state.FindMatchingCache[state.I] = ret
	return ret.I
}

func findAfterEndLine(state *State) int {
	i := findBeforeEndLine(state)
	return i + 1
}
func findAfterEndLineOnlyLine(state *State) int {
	i := findBeforeEndLineOnlyLine(state)
	return i + 1
}

func findMatchingAfter(state *State, things []string) *FindMatchingResult {
	initFindMatchingCache(state)
	if c := state.FindMatchingCache[state.I]; c != nil {
		return c
	}
	indent := getPrevIndent(state)
	toSearch := state.Code[state.I:]

	closestIndex := -1
	minDiff := len(toSearch)

	for j, thing := range things {
		toFind := "\n" + indent + thing // + 1 + len(indent)
		index := strings.Index(toSearch, toFind)
		if index != -1 && index < minDiff {
			minDiff = index
			closestIndex = j
		}
	}
	ret := &FindMatchingResult{
		I:     minDiff + state.I + len(things[closestIndex]) + 1 + len(indent),
		Match: things[closestIndex],
	}
	state.FindMatchingCache[state.I] = ret
	return ret
}

func findMatchingBefore(state *State, things []string) int {
	r := findMatchingAfter(state, things)
	return r.I - len(r.Match)
}

func initGoUpCache(state *State) {
	if len(state.GoUpCache) == 0 {
		state.GoUpCache = make([]*int, len(state.Code)+1)
	}
}
func initFindMatchingCache(state *State) {
	if len(state.FindMatchingCache) == 0 {
		state.FindMatchingCache = make([]*FindMatchingResult, len(state.Code)+1)
	}
}

var builtins map[string]func(state *State) *State
var runImmediates map[string]func(state *State) *State


func initBuiltins() {
	runImmediates = map[string]func(state *State) *State{
		"__vals": func(state *State) *State {
			push(state.Vals, state.Vals)
			return state
		},
		"it": func(state *State) *State {
			items := splice(state.Vals, state.FuncTokenSpot-1, 1, nil).(*[]any)
			state.FuncTokenSpot--
			item := (*items)[0]
			push(state.Vals, item)
			return state
		},
		"and": func(state *State) *State {
			// lazy eval lol
			v := peek(state.Vals)
			if !toBool(v).(bool) {
				i := findBeforeEndLine(state)
				// fmt.Println("found:", state.Code[i:i+20])
				state.I = i
			} else {
				pop(state.Vals)
			}
			return state
		},
		"or": func(state *State) *State {
			// lazy eval lol
			v := peek(state.Vals)
			if toBool(v).(bool) {
				i := findBeforeEndLine(state)
				state.I = i
			} else {
				pop(state.Vals)
			}
			return state
		},
		"\n": func(state *State) *State {
			// if state.Mode == "normal" {
				if state.CurrFuncToken != nil {
					// fmt.Println("calling", state.Vals) // _red
					// fmt.Println("calling", toString(state.CurrFuncToken)) // _red
				}
				oldState := state
				state = callFunc(state)

				// oldState == state check becauze the moment you change state when calling function, you don't want it to end right away
				if oldState == state && oldState.OneLiner {
					state = doEnd(state)
				}

				// if state != nil && state.CurrFuncToken != nil {
				// 	// fmt.Println("done calling", state.Vals) // _red
				// 	// fmt.Println("done calling") // _red
				// }
			// }
			return state
		},
		":": func(state *State) *State {
			// if state.Mode == "normal" {
				state.OneLiner = true
				state = callFunc(state)
				// state.OneLiner = false
			// }
			return state
		},
		",": func(state *State) *State {
			// if state.Mode == "normal" {
				state = callFunc(state)
			// }
			return state
		},
		"|": func(state *State) *State {
			// if state.Mode == "normal" {
				state = callFunc(state)
			// }
			return state
		},
		"(": func(state *State) *State {
			state.ModeStack = append(state.ModeStack, state.Mode)
			state.Mode = "normal"

			state.FuncTokenStack = append(state.FuncTokenStack, state.CurrFuncToken)
			state.CurrFuncToken = nil
			state.FuncTokenSpotStack = append(state.FuncTokenSpotStack, state.FuncTokenSpot)
			state.FuncTokenSpot = -1

			return state
		},
		")": func(state *State) *State {
			// we could get in here cuz of: (func: 200)
			if len(state.ModeStack) == 0 {
				if state.OneLiner {
					say("yay got here")
					state = doEnd(state)
					return state
				}
			}
			state.Mode = state.ModeStack[len(state.ModeStack)-1]
			state.ModeStack = state.ModeStack[:len(state.ModeStack)-1]

			oldState := state
			state = callFunc(state)

			oldState.CurrFuncToken = oldState.FuncTokenStack[len(oldState.FuncTokenStack)-1]
			oldState.FuncTokenStack = oldState.FuncTokenStack[:len(oldState.FuncTokenStack)-1]
			oldState.FuncTokenSpot = oldState.FuncTokenSpotStack[len(oldState.FuncTokenSpotStack)-1]
			oldState.FuncTokenSpotStack = oldState.FuncTokenSpotStack[:len(oldState.FuncTokenSpotStack)-1]

			return state
		},
		"[": func(state *State) *State {
			state.ModeStack = append(state.ModeStack, state.Mode)
			state.Mode = "array"

			state.FuncTokenStack = append(state.FuncTokenStack, state.CurrFuncToken)
			state.CurrFuncToken = nil
			state.FuncTokenSpotStack = append(state.FuncTokenSpotStack, state.FuncTokenSpot)
			state.FuncTokenSpot = -1

			state.ValsStack = append(state.ValsStack, state.Vals)
			state.Vals = &[]any{}
			return state
		},
		"]": func(state *State) *State {
			state.Mode = state.ModeStack[len(state.ModeStack)-1]
			state.ModeStack = state.ModeStack[:len(state.ModeStack)-1]

			state.CurrFuncToken = state.FuncTokenStack[len(state.FuncTokenStack)-1]
			state.FuncTokenStack = state.FuncTokenStack[:len(state.FuncTokenStack)-1]
			state.FuncTokenSpot = state.FuncTokenSpotStack[len(state.FuncTokenSpotStack)-1]
			state.FuncTokenSpotStack = state.FuncTokenSpotStack[:len(state.FuncTokenSpotStack)-1]

			myArr := state.Vals
			state.Vals = state.ValsStack[len(state.ValsStack)-1]
			state.ValsStack = state.ValsStack[:len(state.ValsStack)-1]

			push(state.Vals, myArr)
			return state
		},
		"{": func(state *State) *State {
			state.ModeStack = append(state.ModeStack, state.Mode)
			state.Mode = "object"

			state.FuncTokenStack = append(state.FuncTokenStack, state.CurrFuncToken)
			state.CurrFuncToken = nil
			state.FuncTokenSpotStack = append(state.FuncTokenSpotStack, state.FuncTokenSpot)
			state.FuncTokenSpot = -1

			state.ValsStack = append(state.ValsStack, state.Vals)
			state.Vals = &[]any{}
			return state
		},
		"}": func(state *State) *State {
			state.Mode = state.ModeStack[len(state.ModeStack)-1]
			state.ModeStack = state.ModeStack[:len(state.ModeStack)-1]

			state.CurrFuncToken = state.FuncTokenStack[len(state.FuncTokenStack)-1]
			state.FuncTokenStack = state.FuncTokenStack[:len(state.FuncTokenStack)-1]
			state.FuncTokenSpot = state.FuncTokenSpotStack[len(state.FuncTokenSpotStack)-1]
			state.FuncTokenSpotStack = state.FuncTokenSpotStack[:len(state.FuncTokenSpotStack)-1]

			myObj := map[string]any{}
			for i := 0; i < len(*state.Vals); i += 2 {
				key := (*state.Vals)[i]
				value := (*state.Vals)[i+1]
				myObj[toString(key).(string)] = value
			}
			state.Vals = state.ValsStack[len(state.ValsStack)-1]
			state.ValsStack = state.ValsStack[:len(state.ValsStack)-1]

			push(state.Vals, myObj)
			return state
		},
		"func": func(state *State) *State {
			state.ModeStack = append(state.ModeStack, state.Mode)
			state.Mode = "normal"

			// open implied parens
			state.FuncTokenStack = append(state.FuncTokenStack, state.CurrFuncToken)
			state.CurrFuncToken = funcBuiltin
			state.FuncTokenSpotStack = append(state.FuncTokenSpotStack, state.FuncTokenSpot)
			state.FuncTokenSpot = len(*state.Vals)

			return state
		},
	}
	builtins = map[string]func(state *State) *State{
		"now": makeBuiltin_0_1(now),
		"+":   makeBuiltin_2_1(plus),
		"-":   makeBuiltin_2_1(minus),
		"+f": func(state *State) *State {
			push(state.Vals, pop(state.Vals).(float64)+pop(state.Vals).(float64))
			clearFuncToken(state)
			return state
		},
		"-f": func(state *State) *State {
			push(state.Vals, pop(state.Vals).(float64)-pop(state.Vals).(float64))
			clearFuncToken(state)
			return state
		},
		"*":  makeBuiltin_2_1(times),
		"/":  makeBuiltin_2_1(divide),
		"^":  makeBuiltin_2_1(exponent),
		"%":  makeBuiltin_2_1(mod),
		"<":  makeBuiltin_2_1(lt),
		">":  makeBuiltin_2_1(gt),
		"<=": makeBuiltin_2_1(lte),
		">=": makeBuiltin_2_1(gte),
		"==": makeBuiltin_2_1(eq),
		"!=": makeBuiltin_2_1(neq),

		"plus":  makeBuiltin_2_1(plus),
		"minus": makeBuiltin_2_1(minus),
		"times": makeBuiltin_2_1(times),
		"divBy": makeBuiltin_2_1(divide),
		"toThe": makeBuiltin_2_1(exponent),
		"mod":   makeBuiltin_2_1(mod),
		"lt":    makeBuiltin_2_1(lt),
		"gt":    makeBuiltin_2_1(gt),
		"lte":   makeBuiltin_2_1(lte),
		"gte":   makeBuiltin_2_1(gte),
		"eq":    makeBuiltin_2_1(eq),
		"neq":   makeBuiltin_2_1(neq),
		"is":    makeBuiltin_2_1(eq),
		"isnt":  makeBuiltin_2_1(neq),
		// "is":          makeBuiltin_2_1(is),

		"not":         makeBuiltin_1_1(not),
		"cc":          makeBuiltin_2_1(cc),
		"indexOf":     makeBuiltin_2_1(indexOf),
		"lastIndexOf": makeBuiltin_2_1(lastIndexOf),
		"split":       makeBuiltin_2_1(split),
		"toString":    makeBuiltin_1_1(toString),
		"toInt":       makeBuiltin_1_1(toInt),
		"toFloat":     makeBuiltin_1_1(toFloat),
		"say": func(state *State) *State {
			things := splice(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil).(*[]any)
			thingsVal := *things
			if len(thingsVal) == 0 {
				thingsVal = append(thingsVal, pop(state.Vals))
			}
			say(thingsVal...)
			clearFuncToken(state)
			return state
		},
		"say2": func(state *State) *State {
			things := splice(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil).(*[]any)
			thingsVal := *things
			if len(thingsVal) == 0 {
				thingsVal = append(thingsVal, pop(state.Vals))
			}
			fmt.Println("#deepskyblue say2", len(*things))
			for i, v := range *things {
				fmt.Printf("%d %#v\n", i, v)
			}
			clearFuncToken(state)
			return state
		},
		"put":        makeNoop(),
		"push":       makeBuiltin_2_0(push),
		"push2":      makeBuiltin_2_0(push2),
		"pushm":      makeBuiltin_2_0(pushm),
		"pop":        makeBuiltin_1_1(pop),
		"unshift":    makeBuiltin_2_0(unshift),
		"shift":      makeBuiltin_1_1(shift),
		"setIndex":   makeBuiltin_3_0(setIndex),
		"at":         makeBuiltin_2_1(at),
		"sliceFrom":  makeBuiltin_2_1(sliceFrom),
		"slice":      makeBuiltin_3_1(slice),
		"splice":     makeBuiltin_4_1(splice),
		"length":     makeBuiltin_1_1(length),
		"setProp":    makeBuiltin_3_0(setProp),
		"setPropVKO": makeBuiltin_3_0(setPropVKO),
		"getProp":    makeBuiltin_2_1(getProp),
		"getPropKO":  makeBuiltin_2_1(getPropKO),
		"deleteProp": makeBuiltin_2_0(deleteProp),
		"keys":       makeBuiltin_1_1(keys),
		"populate":   makeBuiltin_2_1(populateString),
		"fromJson": makeBuiltin_1_1(func(a any) any {
			j := a.(string)
			var r any
			json.Unmarshal([]byte(j), &r)
			return r
		}),
		"toJson": makeBuiltin_1_1(func(a any) any {
			b, err := json.Marshal(a)
			if err != nil {
				panic(err)
			}
			return string(b)
		}),
		"toJsonF": makeBuiltin_1_1(func(a any) any {
			b, err := json.MarshalIndent(a, "", "    ")
			if err != nil {
				panic(err)
			}
			return string(b)
		}),
		"exit": func(state *State) *State {
			clearFuncToken(state)
			return nil
		},
		"makeObject": func(state *State) *State {
			push(state.Vals, map[string]any{})
			clearFuncToken(state)
			return state
		},
		"makeArray": func(state *State) *State {
			push(state.Vals, &[]any{})
			clearFuncToken(state)
			return state
		},
		"incr": func(state *State) *State {
			a := pop(state.Vals).(string)
			state.Vars[a] = state.Vars[a].(int) + 1
			clearFuncToken(state)
			return state
		},
		"local": func(state *State) *State {
			b := pop(state.Vals)
			a := pop(state.Vals).(string)
			state.Vars[a] = b
			clearFuncToken(state)
			return state
		},
		"let": func(state *State) *State {
			b := pop(state.Vals)
			a := pop(state.Vals).(string)
			parentState := findParent(state, a)
			if parentState == nil {
				parentState = state
			}
			parentState.Vars[a] = b
			clearFuncToken(state)
			return state
		},
		"debugVals": func(state *State) *State {
			for i, v := range *state.Vals {
				fmt.Printf("-->%d: %s\n", i, toString(v))
			}
			clearFuncToken(state)
			return state
		},
		"as": func(state *State) *State {
			// say(state.Vals)
			b := pop(state.Vals).(string)
			a := pop(state.Vals)
			// if b == "IntA" {
			//     state.IntA = a.(int)
			//     return state
			// }
			state.Vars[b] = a
			clearFuncToken(state)
			return state
		},
		"goUp": func(state *State) *State {
			locText := pop(state.Vals).(string)
			initGoUpCache(state)
			if cachedI := state.GoUpCache[state.I]; cachedI != nil {
				state.I = *cachedI
				clearFuncToken(state)
				return state
			}
			toSearch := "#" + locText
			newI := strings.LastIndex(state.Code[0:state.I], toSearch)
			state.GoUpCache[state.I] = &newI
			state.I = newI
			clearFuncToken(state)
			return state
		},
		"goUpIf": func(state *State) *State {
			locText := pop(state.Vals).(string)
			cond := pop(state.Vals).(bool)

			if cond {
				// assuming static location

				initGoUpCache(state)
				if cachedI := state.GoUpCache[state.I]; cachedI != nil {
					state.I = *cachedI
					return state
					clearFuncToken(state)
				}
				toSearch := "#" + locText
				newI := strings.LastIndex(state.Code[0:state.I], toSearch)
				state.GoUpCache[state.I] = &newI
				state.I = newI
			}
			// push(state.Vals, state[a])
			clearFuncToken(state)
			return state
		},
		"goDown": func(state *State) *State {
			locText := pop(state.Vals).(string)
			// assuming static location
			initGoUpCache(state)
			if cachedI := state.GoUpCache[state.I]; cachedI != nil {
				state.I = *cachedI
				clearFuncToken(state)
				return state
			}
			toSearch := "#" + locText
			newI := strings.Index(state.Code[state.I:], toSearch) + state.I
			state.GoUpCache[state.I] = &newI
			state.I = newI
			clearFuncToken(state)
			return state
		},
		"goDownIf": func(state *State) *State {
			locText := pop(state.Vals).(string)
			cond := pop(state.Vals).(bool)

			if cond {
				// assuming static location
				initGoUpCache(state)
				if cachedI := state.GoUpCache[state.I]; cachedI != nil {
					state.I = *cachedI
					clearFuncToken(state)
					return state
				}
				toSearch := "#" + locText
				newI := strings.Index(state.Code[state.I:], toSearch) + state.I
				state.GoUpCache[state.I] = &newI
				state.I = newI
			}
			// push(state.Vals, state[a])
			clearFuncToken(state)
			return state
		},
		"forever": func(state *State) *State {
			clearFuncToken(state)
			return state
		},
		"loop": func(state *State) *State {
			theIndex := -1
			indexVar := pop(state.Vals).(string)
			loops := pop(state.Vals).(int)
			state.Vars[indexVar] = -1
			var spot = state.I
			var endEach func(state *State) *State
			endEach = func(state *State) *State {
				theIndex++
				if theIndex >= loops {
					state.OneLiner = false
					return state
				} else {
					state.Vars[indexVar] = theIndex
					state.I = spot
					state.EndStack = append(state.EndStack, endEach)
				}
				return state
			}
			state.EndStack = append(state.EndStack, endEach)
			var i int
			if state.OneLiner {
				i = findBeforeEndLineOnlyLine(state)
			} else {
				i = findMatchingBefore(state, []string{"end"})
			}
			state.I = i
			clearFuncToken(state)
			return state
		},
		"loopx": func(state *State) *State {
			theIndex := -1
			loops := pop(state.Vals).(int)
			var spot = state.I
			var endEach func(state *State) *State
			endEach = func(state *State) *State {
				theIndex++
				if theIndex >= loops {
					state.OneLiner = false
					return state
				} else {
					push(state.Vals, theIndex)
					state.I = spot
					state.EndStack = append(state.EndStack, endEach)
				}
				return state
			}
			state.EndStack = append(state.EndStack, endEach)
			var i int
			if state.OneLiner {
				i = findBeforeEndLineOnlyLine(state)
			} else {
				i = findMatchingBefore(state, []string{"end"})
			}
			state.I = i
			clearFuncToken(state)
			return state
		},
		"each": func(state *State) *State {
			theIndex := -1
			itemVar := pop(state.Vals).(string)
			indexVar := pop(state.Vals).(string)

			var arr *[]any
			switch actualArr := pop(state.Vals).(type) {
			case *[]any:
				arr = actualArr
			case []any:
				arr = &actualArr
			}

			state.Vars[indexVar] = -1
			state.Vars[itemVar] = nil
			var spot = state.I
			var endEach func(state *State) *State
			endEach = func(state *State) *State {
				theIndex++
				if theIndex >= len(*arr) {
					state.OneLiner = false
					return state
				} else {
					state.Vars[indexVar] = theIndex
					state.Vars[itemVar] = (*arr)[theIndex]
					state.I = spot
					state.EndStack = append(state.EndStack, endEach)
				}
				return state
			}
			state.EndStack = append(state.EndStack, endEach)
			var i int
			if state.OneLiner {
				i = findBeforeEndLineOnlyLine(state)
			} else {
				i = findMatchingBefore(state, []string{"end"})
			}
			state.I = i
			clearFuncToken(state)
			return state
		},
		"if": func(state *State) *State {
			cond := pop(state.Vals)
			if toBool(cond).(bool) == true {
				state.EndStack = append(state.EndStack, endIf)
			} else {
				// fmt.Printf("wanting to find: %q\n", indent + "end")
				if state.OneLiner {
					state.I = findAfterEndLine(state)
					state.OneLiner = false
				} else {
					r := findMatchingAfter(state, []string{"end", "else if", "else"})
					// fmt.Printf("found: %q\n", state.Code[i:])
					if r.Match == "else if" {
						// don't append an endTack
						// to pick up the if
						state.I = r.I - 2
					} else if r.Match == "else" {
						state.EndStack = append(state.EndStack, endIf)
						state.I = r.I
					} else {
						state.I = r.I
					}
				}
			}
			clearFuncToken(state)
			return state
		},
		"else": func(state *State) *State {
			endFunc := state.EndStack[len(state.EndStack)-1]
			state.EndStack = state.EndStack[:len(state.EndStack)-1]
			// don't need to call it cuz it's a noop
			_ = endFunc

			// fmt.Printf("wanting to find: %q\n", indent + "end")
			r := findMatchingAfter(state, []string{"end"})
			state.I = r.I
			clearFuncToken(state)
			return state
		},
		// "loopN":
		"end": doEnd,
		"return": func(state *State) *State {
			clearFuncToken(state) // needed?
			return state.CallingParent
		},
		"def": func(state *State) *State {
			params := splice(state.Vals, state.FuncTokenSpot+1, len(*state.Vals)-(state.FuncTokenSpot+1), nil).(*[]any)
			paramStrings := make([]string, len(*params))
			for i, p := range *params {
				paramStrings[i] = p.(string)
			}
			funcName := pop(state.Vals).(string)
			f := &Func{
				FileName:          state.FileName,
				I:                 state.I,
				Code:              state.Code,
				CachedTokens:      state.CachedTokens,
				GoUpCache:         state.GoUpCache,
				FindMatchingCache: state.FindMatchingCache,
				Params:            paramStrings,
				LexicalParent:     state,
				OneLiner:          state.OneLiner,
			}
			// stateFunc := makeFuncToken(f)
			// state.Vars[funcName] = stateFunc
			state.Vars[funcName] = f
			// todo you could keep track of indent better
			// fmt.Printf("wanting to find: %q\n", indent + "end")
			if state.OneLiner {
				state.I = findAfterEndLineOnlyLine(state)
				f.EndI = state.I
				state.OneLiner = false
			} else {
				r := findMatchingAfter(state, []string{"end"})
				state.I = r.I
				f.EndI = r.I
			}

			// fmt.Printf("found: %q\n", getCode(state)[i:])
			clearFuncToken(state)
			return state
		},
		"func": func(state *State) *State {
			params := splice(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil).(*[]any)
			paramStrings := make([]string, len(*params))
			for i, p := range *params {
				paramStrings[i] = p.(string)
			}
			f := &Func{
				FileName:          state.FileName,
				I:                 state.I,
				Code:              state.Code,
				CachedTokens:      state.CachedTokens,
				GoUpCache:         state.GoUpCache,
				FindMatchingCache: state.FindMatchingCache,
				Params:            paramStrings,
				LexicalParent:     state,
				OneLiner:          state.OneLiner,
			}
			// stateFunc := makeFuncToken(f)
			// push(state.Vals, stateFunc)
			push(state.Vals, f)
			// todo you could keep track of indent better
			// fmt.Printf("wanting to find: %q\n", indent + "end")
			if state.OneLiner {
				// we go before newline so the newline can still trigger an action
				state.I = findBeforeEndLineOnlyLine(state)
				state.OneLiner = false
				f.EndI = state.I
			} else {
				r := findMatchingAfter(state, []string{"end"})
				state.I = r.I
				f.EndI = r.I
			}

			// close implied parens
			state.Mode = state.ModeStack[len(state.ModeStack)-1]
			state.ModeStack = state.ModeStack[:len(state.ModeStack)-1]

			state.CurrFuncToken = state.FuncTokenStack[len(state.FuncTokenStack)-1]
			state.FuncTokenStack = state.FuncTokenStack[:len(state.FuncTokenStack)-1]
			// fmt.Println("#gold **cft is:", state.CurrFuncToken)
			// fmt.Println("mode", state.Mode)

			state.FuncTokenSpot = state.FuncTokenSpotStack[len(state.FuncTokenSpotStack)-1]
			state.FuncTokenSpotStack = state.FuncTokenSpotStack[:len(state.FuncTokenSpotStack)-1]

			// token, _ := nextTokenRaw(state.Code, state.I)
			// fmt.Printf("next token: %v %T\n", token, token)
			// fmt.Printf("next token: %v\n", runImmediates["\n"])

			// not calling clear because we re-assigned it above
			// clearFuncToken(state)
			return state

		},
		"execBash": func(state *State) *State {
			val := pop(state.Vals).(string)
			cmd := exec.Command("bash", "-c", val)
			cmdOutput, err := cmd.Output()
			if err != nil {
				panic(err)
			}
			push(state.Vals, string(cmdOutput))
			clearFuncToken(state)
			return state
		},
		"execBashCombined": func(state *State) *State {
			val := pop(state.Vals).(string)
			cmd := exec.Command("bash", "-c", val)
			cmdOutput, err := cmd.CombinedOutput()
			if err != nil {
				panic(err)
			}
			push(state.Vals, string(cmdOutput))
			clearFuncToken(state)
			return state
		},
		"loadFile": func(state *State) *State {
			fileName := pop(state.Vals).(string)
			b, err := os.ReadFile(fileName)
			if err != nil {
				panic(err)
			}
			push(state.Vals, string(b))
			clearFuncToken(state)
			return state
		},
		"eval": func(state *State) *State {
			code := pop(state.Vals).(string)
			// fmt.Println(unsafe.Pointer(&code))
			// if strings come from source then we can cache it, but not worth it
			evalState := makeState("__eval", code)
			evalState.Vals = state.Vals
			evalState.Vars = state.Vars

			evalState.CallingParent = state
			// eval(evalState)
			// return state
			clearFuncToken(state)
			return evalState
		},
		"dup": func(state *State) *State {
			v := pop(state.Vals)
			push(state.Vals, v)
			push(state.Vals, v)
			clearFuncToken(state)
			return state
		},
		"swap": func(state *State) *State {
			a := pop(state.Vals)
			b := pop(state.Vals)
			push(state.Vals, a)
			push(state.Vals, b)
			clearFuncToken(state)
			return state
		},
		"see": func(state *State) *State {
			a := pop(state.Vals)
			say(a)
			push(state.Vals, a)
			clearFuncToken(state)
			return state
		},
		"call": func(state *State) *State {
			// for i, v := range *state.Vals {
			//     fmt.Printf("#pink val: %d %q\n", i, toString(v))
			// }
			var f func(state *State) *State
			if len(*state.Vals)-state.FuncTokenSpot == 0 {
				f = pop(state.Vals).(func(state *State) *State)
			} else {
				fWrapper := splice(state.Vals, state.FuncTokenSpot, 1, nil).(*[]any)
				f = (*fWrapper)[0].(func(state *State) *State)
			}
			state.CurrFuncToken = f
			newState := callFunc(state)
			clearFuncToken(state) // needed here?
			return newState
		},
		"clear": func(state *State) *State {
			splice(state.Vals, 0, len(*state.Vals), nil)
			clearFuncToken(state)
			return state
		},
	}
	funcBuiltin = builtins["func"]
}

var funcBuiltin func(*State) *State


func now() any {
	return int(time.Now().UnixMilli())
}

func push(slice any, value any) {
	if s, ok := slice.(*[]any); ok {
		*s = append(*s, value)
	}
}
func push2(slice any, value any) {
	if s, ok := slice.(*[]any); ok {
		*s = append(*s, value)
		fmt.Println("pushed", *s)
	} else {
		fmt.Printf("no pushed: %T\n", slice)
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
	if m, ok := slice.(map[string]any); ok {
		return m[index.(string)]
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
func peek(slice any) any {
	if s, ok := slice.(*[]any); ok && len(*s) > 0 {
		val := (*s)[len(*s)-1]
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
		var elementsToAdd []any
		elements, ok := elements.(*[]any)
		if ok {
			elementsToAdd = *elements
		}
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
		removed := make([]any, deleteCount)
		copy(removed, (*s)[start:start+deleteCount])
		*s = append(append((*s)[:start], elementsToAdd...), (*s)[start+deleteCount:]...)
		return &removed
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
		sliced := make([]any, endInt-startInt)
		copy(sliced, (*s)[startInt:endInt])
		return &sliced
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
		// return (*s)[startInt:]
		sliced := make([]any, len(*s)-startInt)
		copy(sliced, (*s)[startInt:])
		return &sliced
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

func split(a any, b any) any {
	r := strings.Split(a.(string), b.(string))
	rr := []any{}
	for _, value := range r {
		rr = append(rr, value)
	}
	return &rr
}

func plus(a, b any) any {
	switch a := a.(type) {
	case int:
		return a + b.(int)
	case float64:
		return a + b.(float64)
	case string:
		return a + b.(string)
	default:
		fmt.Printf("bad type lol: %T\n", a)
	}
	return nil
}

func lt(a, b any) any {
	switch a := a.(type) {
	case int:
		return a < b.(int)
	case float64:
		return a < b.(float64)
	case string:
		return a < b.(string)
	}
	return false
}

func gt(a, b any) any {
	switch a := a.(type) {
	case int:
		return a > b.(int)
	case float64:
		return a > b.(float64)
	case string:
		return a > b.(string)
	}
	return false
}

func lte(a, b any) any {
	switch a := a.(type) {
	case int:
		return a <= b.(int)
	case float64:
		return a <= b.(float64)
	case string:
		return a <= b.(string)
	}
	return false
}

func gte(a, b any) any {
	switch a := a.(type) {
	case int:
		return a >= b.(int)
	case float64:
		return a >= b.(float64)
	case string:
		return a >= b.(string)
	}
	return false
}

func eq(a, b any) any {
	switch a := a.(type) {
	case int:
		return a == b.(int)
	case float64:
		return a == b.(float64)
	case string:
		return a == b.(string)
	}
	return a == b
}
func is(a, b any) any {
	return a == b
}

func neq(a, b any) any {
	return !(eq(a, b).(bool))
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

func cc(a, b any) any {
	if aArr, ok1 := a.(*[]any); ok1 {
		if bArr, ok2 := b.(*[]any); ok2 {
			result := append([]any{}, (*aArr)...)
			result = append(result, (*bArr)...)
			return &result
		}
	}

	return toString(a).(string) + toString(b).(string)
}

func toInt(a any) any {
	switch a := a.(type) {
	case bool:
		if a {
			return 1
		}
		return 0
	}
	return nil
}
func toFloat(a any) any {
	switch a := a.(type) {
	case bool:
		if a {
			return float64(1)
		}
		return float64(0)
	case int:
		return float64(a)
	}
	return nil
}
func not(a any) any {
	switch a := a.(type) {
	case bool:
		return !a
	}
	return nil
}

func say(vals ...any) {
	for i, v := range vals {
		if i < len(vals)-1 {
			fmt.Printf("%s ", toString(v).(string))
		} else {
			fmt.Printf("%s\n", toString(v).(string))
		}
	}
}
func toBool(a any) any {
	switch a := a.(type) {
	case int:
		return a != 0
	case float64:
		return a != 0
	case string:
		return a != ""
	case bool:
		return a
	case nil:
		return false
	case *Func:
		return a != nil
	default:
		return true
	}
}
func toString(a any) any {
	switch a := a.(type) {
	case map[string]any:
		jsonData, err := json.MarshalIndent(a, "", "    ")
		if err != nil {
			// panic(err)
			return fmt.Sprintf("%#v", a)
		} else {
			return string(jsonData)
		}
	case *[]any, []any:
		jsonData, err := json.MarshalIndent(a, "", "    ")
		if err != nil {
			// panic(err)
			return fmt.Sprintf("%#v", a)
			// return string(jsonData)
		} else {
			return string(jsonData)
		}
	case int:
		return strconv.Itoa(a)
	case float64:
		return strconv.FormatFloat(a, 'f', -1, 64)
	case string:
		return a
	case bool:
		if a {
			return "true"
		}
		return "false"
	case nil:
		return "<nil>"
	case *Func:
		if a == nil {
			return "<nil func>"
		}
		if a.Builtin != nil {
			return fmt.Sprintf("builtin %s (native code)\n", a.Name)
		} else {
			return fmt.Sprintf("func(%t) %v: %s", a.OneLiner, a.Params, a.Code[a.I:a.EndI])
		}
	case func(*State) State:
		// todo use unsafe ptr to see what it is
		return "a func, immediate"
	// case *RunImmediate:
	//     if a == nil {
	//         return "<nil func>"
	//     }
	//        return a.Name
	case VarName:
		return "VarName: " + a
	default:
		return fmt.Sprintf("type is %T, value is %#v\n", a, a)
	}
	return nil
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
func setIndex(a, b, c any) {
	theArrPointer := a.(*[]any)
	theArr := *theArrPointer
	theArr[b.(int)] = c
}
func setPropVKO(v, k, o any) {
	o.(map[string]any)[k.(string)] = v
}
func getProp(a, b any) any {
	return a.(map[string]any)[b.(string)]
}
func getPropKO(k, o any) any {
	return o.(map[string]any)[k.(string)]
}
func deleteProp(a, b any) {
	delete(a.(map[string]any), b.(string))
}

func makeNoop() func(state *State) *State {
	return func(state *State) *State {
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_1_0(f func(any)) func(state *State) *State {
	return func(state *State) *State {
		a := pop(state.Vals)
		f(a)
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_2_0(f func(any, any)) func(state *State) *State {
	return func(state *State) *State {
		b := pop(state.Vals)
		a := pop(state.Vals)
		f(a, b)
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_3_0(f func(any, any, any)) func(state *State) *State {
	return func(state *State) *State {
		c := pop(state.Vals)
		b := pop(state.Vals)
		a := pop(state.Vals)
		f(a, b, c)
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_0_1(f func() any) func(state *State) *State {
	return func(state *State) *State {
		push(state.Vals, f())
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_1_1(f func(any) any) func(state *State) *State {
	return func(state *State) *State {
		a := pop(state.Vals)
		push(state.Vals, f(a))
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_2_1(f func(any, any) any) func(state *State) *State {
	return func(state *State) *State {
		b := pop(state.Vals)
		a := pop(state.Vals)
		push(state.Vals, f(a, b))
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_3_1(f func(any, any, any) any) func(state *State) *State {
	return func(state *State) *State {
		c := pop(state.Vals)
		b := pop(state.Vals)
		a := pop(state.Vals)
		push(state.Vals, f(a, b, c))
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_4_1(f func(any, any, any, any) any) func(state *State) *State {
	return func(state *State) *State {
		d := pop(state.Vals)
		c := pop(state.Vals)
		b := pop(state.Vals)
		a := pop(state.Vals)
		push(state.Vals, f(a, b, c, d))
		clearFuncToken(state)
		return state
	}
}

func endIf(state *State) *State {
	state.OneLiner = false
	return state
}

func populateString(a, b any) any {
	theString := a.(string)
	theMap := b.(map[string]any)
	theArgs := make([]string, len(theMap)*2)
	i := 0
	for k, v := range theMap {
		theArgs[i*2] = k
		theArgs[(i*2)+1] = v.(string)
		i++
	}
	r := strings.NewReplacer(theArgs...)
	return r.Replace(theString)
}

func doEnd(state *State) *State {
	if len(state.EndStack) == 0 {
		return state.CallingParent
	}

	endFunc := state.EndStack[len(state.EndStack)-1]
	state.EndStack = state.EndStack[:len(state.EndStack)-1]

	clearFuncToken(state)
	return endFunc(state)
}

// </code>

// That was some code that implements a little interpreted
// programming language
//
// a key feature is that it operates on the source code as a string
// there is no converting to an AST or anythign like that
//
// please convert this code to efficient javascript
//
// The original code makes use of go type assertions
// much of that won't be needed in the javascript code
//
// although there will likely be some sort of type switch on the token
//
// there is no difference between []any and *[]any in javascript
// so the code can likely be simplified
//
// but the main structure I want to be the same
//
// prefer global functions and object over "classes"
//
// Converting this Go code to JavaScript while maintaining its structure requires some careful attention to detail. JavaScript differs from Go in typing and syntax, but functions and the flow of the program can remain largely the same. Below is a JavaScript version of your interpreted programming language implementation.
//
// Add all the code, don't leave it partially finished
//
// in the type switch on the token
// you'll need to differentiate between the VarName, Skip, and string types
// not sure the best way, maybe maybe them objects with constructors?

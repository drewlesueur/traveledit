// <code>
package main

// fix "it" when there is another on line
// "it" should reference newLineSpot, not funcTokenSpot

// TODO "break" or similar that also pops the endstack.


import (
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	"flag"
    "runtime/pprof"

)


type FindMatchingResult struct {
	Match string
	I     int
	Indent string
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

type Callback struct {
    State *State
    ReturnValues []any
}
type Machine struct {
    CallbacksCh chan Callback
    Index int
}

type State struct {
	FileName     string
	I            int
	Code         string
	CachedTokens []*TokenCacheValue
	Mode         string
	OneLiner     bool
	OneLinerParenLevel     int
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
	
	NewlineSpot          int 
	
	LexicalParent      *State
	CallingParent      *State
	DebugTokens bool
	
	Done bool
	Canceled bool // need this?
	Waiters []*State
	IsTop bool
	AsyncChildren map[int]*State
	
	Machine *Machine
}

func (state *State) AddCallback(callback Callback) {
    go func() {
        state.Machine.CallbacksCh <- callback
    }()
}

func MakeState(fileName, code string) *State {
	return &State{
		FileName:  fileName,
		I:         0,
		Code:      code,
		Mode:      "normal",
		ModeStack: nil,

		CachedTokens:       make([]*TokenCacheValue, len(code)+1),
		
		// Preinitializing this makes eval in a loop slower if it doesn't use these
		// though if you eval in a loop with a static string, you should be able to optimize
		GoUpCache:          make([]*int, len(code)+1),
		FindMatchingCache:  make([]*FindMatchingResult, len(code)+1),
		
		Vals:               &[]any{},
		ValsStack:          nil,
		EndStack:           nil,
		Vars:               map[string]any{},
		CurrFuncToken:      nil,
		FuncTokenStack:     nil,
		FuncTokenSpot:      -1,
		FuncTokenSpotStack: nil,
		
		NewlineSpot:      -1,
		
		DebugTokens: false,
		Waiters: []*State{},
	}
}

var seeDebugLogs = false
func debug(x string) {
    if seeDebugLogs {
        fmt.Println(x)
    }
}

func main() {
	cgi := flag.Bool("cgi", false, "Start cgi server")
	httpsAddr := flag.String("https", "", "https address")
	httpAddr := flag.String("http", "", "http address")
	flag.Parse()
	if *cgi {
		fmt.Println("#orange starting cgi")
		startCgiServer(*httpsAddr, *httpAddr)
		fmt.Println("#orange done cgi")
		ch := make(chan int)
		<- ch
		return
	}
	
	
	_ = pprof.StartCPUProfile
	// cpuProfile, err := os.Create("cpu.prof")
	// if err != nil {
	// 	panic(err)
	// }
	// defer cpuProfile.Close()
	// // Start CPU profiling
	// if err := pprof.StartCPUProfile(cpuProfile); err != nil {
	// 	panic(err)
	// }
	// defer pprof.StopCPUProfile() // Stop CPU profiling when the program ends

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
	state := MakeState(fileName, code)
    state.Machine = &Machine{
        CallbacksCh: make(chan Callback),
        Index: 0,
    }
	state.IsTop = true

    // start := time.Now()
	// for state.I >= 0 {
		// _, name := nextToken(state)
		// _ = name
		// // fmt.Println("#deeppink:", name)
	// }
	// state.I = 0
	// fmt.Println(time.Since(start))
	
	// fmt.Println(unsafe.Pointer(&code))
	// if strings come from source then we can cache it, but not worth it
	
	// see "eval" implementation,
	// evalState := MakeState("__stdlib", stdLib)
	// evalState.Vals = state.Vals
	// evalState.Vars = state.Vars
	// evalState.CallingParent = state
	// clearFuncToken(state)
	// return evalState
	
  	Eval(state)
}

// var stdLib = `
// def map:
// 
// end
// `


func debugStateI(state *State, startI int) {
    endI := startI + 30
    if endI >= len(state.Code) {
        endI = len(state.Code) - 1
    }
    chunks := strings.Split(state.Code[startI:endI], "\n")
    fmt.Println("state:", toJson(startI), toJson(chunks[0]))
}

func Eval(state *State) *State {
	var origState = state
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("Recovered from panic:", r)
			debugStateI(state, state.I)
			panic(r)
		}
	}()
	evalLoop:
	for {
    	if state != nil && state.Canceled {
    	    cancel(state)
    	    return nil
    	}
		token, name := nextToken(state)
		// #cyan
		if state.DebugTokens {
			fmt.Printf("#cyan token: %T %q (%d/%d)\n", token, name, state.I, len(state.Code) - 1)
		}
		_ = name
		switch token := token.(type){
		case immediateToken:
    		o := state
    		state = token(state)
            if state == nil {
            	if o.Done {
            	    // fmt.Println("#crimson ending!", o.I)
                    for _, w := range o.Waiters {
                        o.AddCallback(Callback{
                            State: w,
                            ReturnValues: *w.Vals,
                        })
                    }
                    o.Waiters = nil
            	}
                // need another state, let's get one from callback channel
                // fmt.Println("#yellow waiting for new state")
                callback, ok := <- o.Machine.CallbacksCh
                if !ok {
                    break evalLoop
                }
                // fmt.Println("#lime got new state")
                state = callback.State
                for _, v := range callback.ReturnValues {
                    pushT(state.Vals, v)
                }
            }
		case builtinFuncToken:
			state.CurrFuncToken = token
			state.FuncTokenSpot = len(*state.Vals)
		case getVarToken:
			evaled := getVar(state, string(token))
			pushT(state.Vals, evaled)
		case getVarFuncToken:
			evaledFunc := getVar(state, string(token)).(func(*State) *State)
			state.CurrFuncToken = evaledFunc
			state.FuncTokenSpot = len(*state.Vals)
        
        // this was an attempt to replace the above cases, but slower than switch
        // every added case is slow, but interfaces (and closures) are even slower
        // probably unless there are lots of cases
        // case Immediate:
        //     state = token.Process(state)
		
		
		
		// case string:
		// 	pushT(state.Vals, token)
		// case int:
		// 	pushT(state.Vals, token)
		// case float64:
		// 	pushT(state.Vals, token)
		// case bool:
		// 	pushT(state.Vals, token)
		
		// slower
		// case getVarToken:
		// 	evaled := getVar(state, string(token))
		// 	if evaledFunc, ok := evaled.(func(*State) *State); ok {
		// 		state.CurrFuncToken = evaledFunc
		// 		state.FuncTokenSpot = len(*state.Vals)
		// 	} else {
		// 		pushT(state.Vals, evaled)
		// 	}
		
		// faster


		default:
		    // wow, adding the string, int, float, bool cases
		    // made the 1 million item loop in example2.js go from 24xms to 32xms
		    // I tried interfaces with a ProcessMethod and that was also slow
		    // see jump_alt and jump_table branches
			pushT(state.Vals, token)
		    // fmt.Printf("oops type %T\n", token)
		    // panic("fail")
		}
 	}
 	
	return origState
}

func cancel(state *State) {
    state.Done = true
    state.Canceled = true
    fmt.Println("#coral canceling", state.Vars["name"])
    for _, c := range state.AsyncChildren {
        cancel(c)
    }
    state.AsyncChildren = map[int]*State{}
}
func getVar(state *State, varName string) any {
	if v, ok := state.Vars[varName]; ok {
		return v
	}
	if state.LexicalParent != nil {
		return getVar(state.LexicalParent, varName)
	}
	// return nil
	return varName
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
		// for i, v := range *state.Vals {
		// 	fmt.Printf("-->%d: %s\n", i, toString(v))
		// }
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
		return immediateToken(endOfCodeImmediate), "past end?", -1
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
					return immediateToken(endOfCodeImmediate), "end in comment", -1
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
	return immediateToken(endOfCodeImmediate), "got to end?", -1
}



type getVarFuncToken string
type getVarToken string
type builtinToken func(*State) *State
type builtinFuncToken func(*State) *State
type immediateToken func(*State) *State

// attempt
func makeImmediateFromBuiltinFuncToken(token func(*State) *State) immediateToken {
    return immediateToken(func (state *State) *State {
		state.CurrFuncToken = token
		state.FuncTokenSpot = len(*state.Vals)
        return state
    })
}

type Immediate interface{
    Process(state *State) *State
}

func (token builtinFuncToken) Process(state *State) *State {
	state.CurrFuncToken = token
	state.FuncTokenSpot = len(*state.Vals)
    return state
}
func (token getVarToken) Process(state *State) *State {
	evaled := getVar(state, string(token))
	pushT(state.Vals, evaled)
    return state
}
func (token getVarFuncToken) Process(state *State) *State {
	evaledFunc := getVar(state, string(token)).(func(*State) *State)
	state.CurrFuncToken = evaledFunc
	state.FuncTokenSpot = len(*state.Vals)
    return state
}
func (token immediateToken) Process(state *State) *State {
    state = token(state)
    return state
}

func noop(state *State) *State {
    return state
}


// TODO: files must end in newline!
type Skip string

func makeToken(state *State, val string) any {
	// immediates go first, because it could be an immediate and builtin
	if f, ok := runAlwaysImmediates[val]; ok {
		return immediateToken(f)
	}
	if f, ok := runImmediates[val]; ok {
		if state.Mode == "normal" {
			return immediateToken(f)
		} else {
		    return immediateToken(noop)
		}
	}
	if b, ok := builtins[val]; ok {
		// wow we can switch on the mode at compile time?!
		// the first run is compile time, interesting
		switch state.Mode {
		case "normal":
			if state.CurrFuncToken == nil {
				return builtinFuncToken(b)
				
				// attempt to require fewer cases in token switch
				// but it's slower, with closure and even polymorphic types, it's slower.
				// compared to switch
				// tho too many switch cases bad
				// return makeImmediateFromBuiltinFuncToken(b)
			} else {
				if val == "if" {
				    fmt.Println("Warning if is not a function!")
				    debugStateI(state, state.I)
				}
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
	case "tab":
		return "\t"
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
	    	// return getVarToken(val)
	    	
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

func isNumeric(s string) bool {
	return len(s) > 0 && ((s[0] >= '0' && s[0] <= '9') || (s[0] == '-' && len(s) > 1))
}

func toJson(v any) string {
    b, err := json.MarshalIndent(v, "", "    ")
    if err != nil {
        panic(err)
    }
    return string(b)
}


func getPrevIndent(state *State) string {
	// fmt.Println("#aqua getting prev indent")
	// debugStateI(state, state.I)

	// TODO audit the subtraction here
	code := state.Code
	i := state.I
	lastNonSpace := i
	
	// back one to get to the newline
	// another to get before newline
	i = i - 2 
loopy:
	// for i = i - 2; i >= 0; i-- {
	for i = i - 0; i >= 0; i-- {
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
	// fmt.Println("#thistle prev indent", toJson(code[i:lastNonSpace]))
	return code[i:lastNonSpace]
}

func findBeforeEndLine(state *State) int {
	// line or parens or alternate line enders (, |)
	// reusing this helpful cache
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
		Indent: "",
	}
	state.FindMatchingCache[state.I] = ret
	return ret.I
}
func findBeforeEndLineOnlyLine(state *State) int {
	// reusing this helpful cache
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
		Indent: "",
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
	// fmt.Println("#goldenrod findMatchingAfter")
	// debugStateI(state, state.I)

	if c := state.FindMatchingCache[state.I]; c != nil {
		return c
	}
	indent := getPrevIndent(state)
	
	// subtract 1 because there could be no body of an if (etc)
	// toSearch := state.Code[state.I:]
	toSearch := state.Code[state.I-1:] // #lawngreen
	
	// fmt.Println("#goldenrod but before")
	// debugStateI(state, state.I-1)

	closestIndex := -1
	minPos := len(toSearch)
	theEnd := -1
	

	for j, thing := range things {
		toFind := "\n" + indent + thing // + 1 + len(indent)
		// fmt.Println("#orange finding", toJson(toFind))
		// fmt.Println("#darkorange in", toJson(toSearch))
		index := strings.Index(toSearch, toFind)
		if index != -1 && index < minPos {
			minPos = index
			closestIndex = j
			theEnd = state.I-1 + minPos + len(toFind)
		}
	}
	ret := &FindMatchingResult{
		// I:     minDiff + state.I + len(things[closestIndex]) + 1 + len(indent),
		I:     theEnd,
		Match: things[closestIndex],
		Indent: indent,
	}
	state.FindMatchingCache[state.I] = ret
	// fmt.Println("#yellow foundMatchingAfter", toJson(ret.Match))
	// debugStateI(state, ret.I)
	return ret
}

func findMatchingBefore(state *State, things []string) int {
	r := findMatchingAfter(state, things)
	return r.I - len(r.Match)
}


var builtins map[string]func(state *State) *State
var runImmediates map[string]func(state *State) *State
var runAlwaysImmediates map[string]func(state *State) *State


func initBuiltins() {
	runAlwaysImmediates = map[string]func(state *State) *State{
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
				
			oldState := state
			state = callFunc(state)
			
			// using ModeStack as a representative of paren level
			if state.OneLiner && state.OneLinerParenLevel == len(state.ModeStack) {
				state = doEnd(state)
				if state.OneLiner {
					return state
				}
			}
			

			
			// this mode stuff was above the callFunc before?
			state.Mode = state.ModeStack[len(state.ModeStack)-1]
			state.ModeStack = state.ModeStack[:len(state.ModeStack)-1]

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

			pushT(state.Vals, myArr)
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

			pushT(state.Vals, myObj)
			return state
		},
		"string": func(state *State) *State {
			// TODO, this should happen in parsing step
			// instead of doing this parsing everytime
			if state.Code[state.I] == ':' {
				end := strings.Index(state.Code[state.I+2:], "\n")
				// 2 because of ": "
				// 1 because we want after "\n"
				pushT(state.Vals, state.Code[state.I+2:state.I+2+end])
				state.I = state.I + 2 + end + 1
			} else {
				r := findMatchingAfter(state, []string{"end"})
				str := state.Code[state.I+1:r.I-3]
				lines := strings.Split(str, "\n")
				lines = lines[0:len(lines)-1]
				prefixToTrim := r.Indent + "    "
				for i, line := range lines {
				    // fmt.Printf("%q %q" prefixToTrim, line)
				    lines[i] = strings.TrimPrefix(line, prefixToTrim)
				}
				str = strings.Join(lines, "\n")
				pushT(state.Vals, str)
				state.I = r.I
			}
			return state
		},
		"istring": func(state *State) *State {
			if state.Code[state.I] == ':' {
				end := strings.Index(state.Code[state.I+2:], "\n")
				// 2 because of ": "
				// 1 because we want after "\n"
				pushT(state.Vals, interpolateDollar(state, state.Code[state.I+2:state.I+2+end]))
				state.I = state.I + 2 + end + 1
			} else {
				r := findMatchingAfter(state, []string{"end"})
				str := state.Code[state.I+1:r.I-3]
				lines := strings.Split(str, "\n")
				lines = lines[0:len(lines)-1]
				prefixToTrim := r.Indent + "    "
				for i, line := range lines {
				    // fmt.Printf("%q %q" prefixToTrim, line)
				    lines[i] = strings.TrimPrefix(line, prefixToTrim)
				}
				str = strings.Join(lines, "\n")
				pushT(state.Vals, interpolateDollar(state, str))
				state.I = r.I
			}
			return state
		},
    }
	runImmediates = map[string]func(state *State) *State{
		
		// "gotoEnd": func(state *State) *State {
		// 	things := spliceT(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil)
		// 	thingsVal := *things
		// 	times := 1
		// 	if len(thingsVal) > 0 {
		// 	    times = thingsVal[0].(int)
		// 	}
		// 	// bug with indents,
		// 	// make a new function get dedented end or something
		// 	for i := 0; i<times-1; i++ {
		// 		r := findMatchingAfter(state, []string{"end"})
		// 		state.I = r.I
		// 	}
		// 	r := findMatchingAfter(state, []string{"end"})
		// 	state.I = r.I - 3
		// 	return state
		// },
		// -- __
		"__vals": func(state *State) *State {
			pushT(state.Vals, state.Vals)
			return state
		},
		"it": func(state *State) *State {
			// items := spliceT(state.Vals, state.FuncTokenSpot-1, 1, nil)
			items := spliceT(state.Vals, state.NewlineSpot-1, 1, nil)
			state.NewlineSpot--
			state.FuncTokenSpot--
			item := (*items)[0]
			pushT(state.Vals, item)
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
				popT(state.Vals)
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
				popT(state.Vals)
			}
			return state
		},
		"\n": func(state *State) *State {
			oldState := state
			state = callFunc(state)

			// oldState == state check becauze the moment you change state when calling function, you don't want it to end right away
			if oldState == state && oldState.OneLiner {
				state = doEnd(state)
			}
			oldState.NewlineSpot = len(*oldState.Vals)
			return state
		},
		":": func(state *State) *State {
			state.OneLiner = true
			state.OneLinerParenLevel = len(state.ModeStack)
			state = callFunc(state)
			// state.OneLiner = false
			return state
		},
		",": func(state *State) *State {
			state = callFunc(state)
			return state
		},
		"|": func(state *State) *State {
			state = callFunc(state)
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
		"else": func(state *State) *State {
			debug("#skyblue ELSE")
			debug("#pink remove end stack else")
			endFunc := state.EndStack[len(state.EndStack)-1]
			state.EndStack = state.EndStack[:len(state.EndStack)-1]
			// don't need to call it cuz it's a noop
			_ = endFunc

			// fmt.Printf("wanting to find: %q\n", indent + "end")
			r := findMatchingAfter(state, []string{"end"})
			debug("#orange jumping to end")
			state.I = r.I
			// debugStateI(state, state.I)
			clearFuncToken(state)
			return state
		},
	}
	builtins = map[string]func(state *State) *State{
		"now": makeBuiltin_0_1(now),
		"nowSeconds": makeBuiltin_0_1(func() any {
            return int(time.Now().Unix())
        }),
		"formatTimestamp": makeBuiltin_2_1(func(m any, f any) any {
	    	// from unix millis
	    	t := time.Unix(0, int64(m.(int))*int64(time.Millisecond))
	    	formattedTime := t.Format(f.(string))
	    	return formattedTime
		}),
		"rfc3339ToUnixMillis": makeBuiltin_1_1(func(s any) any {
			t, err := time.Parse(time.RFC3339, s.(string))
			if err != nil {
				panic(err)
			}
			return int(t.UnixNano() / int64(time.Millisecond))
		}),
		"unixMillisToRfc3339": makeBuiltin_1_1(func(s any) any {
			ms := s.(int64)
			sec := ms / 1000
			nsec := (ms % 1000) * 1000000
			return time.Unix(sec, nsec).Format(time.RFC3339)
		}),
		"getType": makeBuiltin_1_1(func(s any) any {
			return fmt.Sprintf("%T", s)
		}),
		"replace": makeBuiltin_3_1(func(s, x, y any) any {
			return strings.Replace(s.(string), x.(string), y.(string), -1)
		}),
		"+":   makeBuiltin_2_1(plus),
		"-":   makeBuiltin_2_1(minus),
		"+f": func(state *State) *State {
			pushT(state.Vals, popT(state.Vals).(float64)+popT(state.Vals).(float64))
			clearFuncToken(state)
			return state
		},
		"-f": func(state *State) *State {
			pushT(state.Vals, popT(state.Vals).(float64)-popT(state.Vals).(float64))
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
		"trim":       makeBuiltin_1_1(func(a any) any {
		    return strings.TrimSpace(a.(string))
		}),
		"join":       makeBuiltin_2_1(func(a, b any) any {
		    // TODO: allow anything to use slice of strings too
		    strSlice := make([]string, len(*a.(*[]any)))
		    for i, v := range *a.(*[]any) {
		        strSlice[i] = v.(string)
		    }
		    return strings.Join(strSlice, b.(string))
		}),
		"contains":       makeBuiltin_2_1(func(a, b any) any {
		    return strings.Contains(a.(string), b.(string))
		}),
		"startsWith": makeBuiltin_2_1(func(a, b any) any {
		    return strings.HasPrefix(a.(string), b.(string))
		}),
		"endsWith": makeBuiltin_2_1(func(a, b any) any {
		    return strings.HasSuffix(a.(string), b.(string))
		}),
		"upper":       makeBuiltin_1_1(func(a any) any {
		    return strings.ToUpper(a.(string))
		}),
		"lower":       makeBuiltin_1_1(func(a any) any {
		    return strings.ToLower(a.(string))
		}),
		"toString":    makeBuiltin_1_1(toString),
		"toInt":       makeBuiltin_1_1(toInt),
		"toFloat":     makeBuiltin_1_1(toFloat),
		"say": func(state *State) *State {
			things := spliceT(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil)
			thingsVal := *things
			if len(thingsVal) == 0 {
				thingsVal = append(thingsVal, popT(state.Vals))
			}
			say(thingsVal...)
			clearFuncToken(state)
			return state
		},
		"say2": func(state *State) *State {
			things := spliceT(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil)
			thingsVal := *things
			if len(thingsVal) == 0 {
				thingsVal = append(thingsVal, popT(state.Vals))
			}
			for i, v := range *things {
				fmt.Printf("%d %#v\n", i, v)
			}
			clearFuncToken(state)
			return state
		},
		"put":        makeNoop(),
		"push":       makeBuiltin_2_0(push),
		"pushTo":     makeBuiltin_2_0(pushTo),
		"pushm":      makeBuiltin_2_0(pushm),
		"pop":        makeBuiltin_1_1(pop),
		"unshift":    makeBuiltin_2_0(unshift),
		"shift":      makeBuiltin_1_1(shift),
		"setIndex":   makeBuiltin_3_0(setIndex),
		"at":         makeBuiltin_2_1(at),
		"in":         makeBuiltin_2_1(func(a, b any) any {
			_, ok := b.(map[string]any)[a.(string)]
			return ok
		}),
		"btoa": makeBuiltin_1_1(func(a any) any {
			return base64.StdEncoding.EncodeToString([]byte(a.(string)))
		}),
		"atob": makeBuiltin_1_1(func(a any) any {
			// data, err := base64.StdEncoding.DecodeString(a.(string))
			data, err := base64.RawStdEncoding.DecodeString(a.(string))
			if err != nil {
			    fmt.Println("atob:", err)
				return ""
			}
			return string(data)
		}),


		"sliceFrom":  makeBuiltin_2_1(sliceFrom),
		"sliceTo":  makeBuiltin_2_1(sliceTo),
		"slice":      makeBuiltin_3_1(slice),
		"splice":     makeBuiltin_4_1(splice),
		"length":     makeBuiltin_1_1(length),
		"setProp":    makeBuiltin_3_0(setProp),
		"setPropVKO": makeBuiltin_3_0(setPropVKO),
		"getProp":    makeBuiltin_2_1(getProp),
		"getPropKO":  makeBuiltin_2_1(getPropKO),
		"deleteProp": makeBuiltin_2_0(deleteProp),
		"keys":       makeBuiltin_1_1(keys),
		"interpolate":   makeBuiltin_2_1(interpolate),
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
	        close(state.Machine.CallbacksCh)
	        state.Done = true
	        return nil
        },
		"makeObject": func(state *State) *State {
			pushT(state.Vals, map[string]any{})
			clearFuncToken(state)
			return state
		},
		"makeArray": func(state *State) *State {
			pushT(state.Vals, &[]any{})
			clearFuncToken(state)
			return state
		},
		"incr": func(state *State) *State {
			a := popT(state.Vals).(string)
			state.Vars[a] = state.Vars[a].(int) + 1
			clearFuncToken(state)
			return state
		},
		"local": func(state *State) *State {
			b := popT(state.Vals)
			a := popT(state.Vals).(string)
			state.Vars[a] = b
			clearFuncToken(state)
			return state
		},
		"let": func(state *State) *State {
			b := popT(state.Vals)
			a := popT(state.Vals).(string)
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
			b := popT(state.Vals).(string)
			a := popT(state.Vals)
			// if b == "IntA" {
			//     state.IntA = a.(int)
			//     return state
			// }
			state.Vars[b] = a
			clearFuncToken(state)
			return state
		},
		"goUp": func(state *State) *State {
			locText := popT(state.Vals).(string)
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
			locText := popT(state.Vals).(string)
			cond := popT(state.Vals).(bool)

			if cond {
				// assuming static location

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
			// pushT(state.Vals, state[a])
			clearFuncToken(state)
			return state
		},
		"goDown": func(state *State) *State {
			locText := popT(state.Vals).(string)
			// assuming static location
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
			locText := popT(state.Vals).(string)
			cond := popT(state.Vals).(bool)

			if cond {
				// assuming static location
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
			// pushT(state.Vals, state[a])
			clearFuncToken(state)
			return state
		},
		"forever": func(state *State) *State {
			clearFuncToken(state)
			return state
		},
		"loop": func(state *State) *State {
			theIndex := -1

			things := spliceT(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil)
			thingsVal := *things

			var indexVar string
            var loops int
            if len(thingsVal) >= 2 {
			    loops = thingsVal[0].(int)
				indexVar = thingsVal[1].(string)
            } else if len(thingsVal) == 1 {
    			loops = popT(state.Vals).(int)
				indexVar = thingsVal[0].(string)
            } else {
    			loops = popT(state.Vals).(int)
            }
            if indexVar != "" {
				state.Vars[indexVar] = -1
            }
			var spot = state.I
			var endEach func(state *State) *State
			endEach = func(state *State) *State {
				theIndex++
				if theIndex >= loops {
					state.OneLiner = false
					return state
				} else {
					if indexVar != "" {
						state.Vars[indexVar] = theIndex
					} else {
						pushT(state.Vals, theIndex)
					}
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

			things := spliceT(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil)
			thingsVal := *things

			var indexVar string
			var itemVar string

			if len(thingsVal) == 2 {
				indexVar = thingsVal[0].(string)
				itemVar = thingsVal[1].(string)
			} else if len(thingsVal) == 1 {
				itemVar = thingsVal[0].(string)
			}

			var arr *[]any
			switch actualArr := popT(state.Vals).(type) {
			case *[]any:
				arr = actualArr
			case []any:
				arr = &actualArr
			}
            if indexVar != "" {
				state.Vars[indexVar] = theIndex
            }
            if itemVar != "" {
				state.Vars[itemVar] = nil
            }
			var spot = state.I
			var endEach func(state *State) *State
			endEach = func(state *State) *State {
				debug("#thistle each End")
				theIndex++
				if theIndex >= len(*arr) {
					state.OneLiner = false
					return state
				} else {
            		if indexVar != "" {
						state.Vars[indexVar] = theIndex
            		}
            		if itemVar != "" {
						state.Vars[itemVar] = (*arr)[theIndex]
            		} else {
				    	// pushT(state.Vals, theIndex)
				    	pushT(state.Vals, (*arr)[theIndex])
            		}
					state.I = spot
					debug("#white add end stack end each")
					state.EndStack = append(state.EndStack, endEach)
				}
				return state
			}
			debug("#white add end stack start each")
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
		"map": func(state *State) *State {
			// alternate implementation where we don't
			// jump to end first and we start at 0
			
			// start at -1 and jump to end to force the end check first
			theIndex := -1

			things := spliceT(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil)
			thingsVal := *things

			var indexVar string
			var itemVar string

			if len(thingsVal) == 2 {
				indexVar = thingsVal[0].(string)
				itemVar = thingsVal[1].(string)
			} else if len(thingsVal) == 1 {
				itemVar = thingsVal[0].(string)
			}

			var arr *[]any
			switch actualArr := popT(state.Vals).(type) {
			case *[]any:
				arr = actualArr
			case []any:
				arr = &actualArr
			}
			var spot = state.I
			ret := []any{}
			var endEach func(state *State) *State
			endEach = func(state *State) *State {
                if theIndex != -1 {
                    ret = append(ret, popT(state.Vals))
                }
				theIndex++
				if theIndex >= len(*arr) {
					state.OneLiner = false
					pushT(state.Vals, &ret)
					return state
				} else {
            		if indexVar != "" {
						state.Vars[indexVar] = theIndex
            		}
            		if itemVar != "" {
						state.Vars[itemVar] = (*arr)[theIndex]
            		} else {
				    	pushT(state.Vals, (*arr)[theIndex])
            		}
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
		"filter": func(state *State) *State {
			// start at -1 and jump to end to force the length check first
			theIndex := -1

			things := spliceT(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil)
			thingsVal := *things

			var indexVar string
			var itemVar string

			if len(thingsVal) == 2 {
				indexVar = thingsVal[0].(string)
				itemVar = thingsVal[1].(string)
			} else if len(thingsVal) == 1 {
				itemVar = thingsVal[0].(string)
			}

			var arr *[]any
			switch actualArr := popT(state.Vals).(type) {
			case *[]any:
				arr = actualArr
			case []any:
				arr = &actualArr
			}
			var spot = state.I
			ret := []any{}
			var endEach func(state *State) *State
			endEach = func(state *State) *State {
                if theIndex != -1 {
                    v := popT(state.Vals).(bool)
                    if v {
                        ret = append(ret, (*arr)[theIndex])
                    }
                }
				theIndex++
				if theIndex >= len(*arr) {
					state.OneLiner = false
					pushT(state.Vals, &ret)
					return state
				} else {
            		if indexVar != "" {
						state.Vars[indexVar] = theIndex
            		}
            		if itemVar != "" {
						state.Vars[itemVar] = (*arr)[theIndex]
            		} else {
				    	pushT(state.Vals, (*arr)[theIndex])
            		}
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
			debug("#skyblue IF")
			// debugStateI(state, state.I)
			cond := popT(state.Vals)
			if toBool(cond).(bool) == true {
				debug("#white add end stack true if")
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
						// state.I = r.I - 2 - 1
						debug("#aquamarine jumping to else if")
						// debugStateI(state, state.I)
					} else if r.Match == "else" {
						debug("#aqua jumping to else")
						debug("#white add end stack, jump to else")
						state.EndStack = append(state.EndStack, endIf)
						state.I = r.I
					} else {
						debug("#orange jumping to end")
						state.I = r.I
					}
				}
			}
			clearFuncToken(state)
			return state
		},
		// else was here
		// but needs to be in the immediates
		// "loopN":
		"end": doEnd,
		"return": func(state *State) *State {
			clearFuncToken(state) // needed?
			if state.CallingParent == nil {
			    state.Done = true
			}
			return state.CallingParent
		},
		// 
		"go": func(state *State) *State {
			things := spliceT(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil)
			thingsVal := *things
			
			newState := MakeState(state.FileName, state.Code)
			newState.Machine = state.Machine
			newState.CachedTokens = state.CachedTokens
			newState.GoUpCache = state.GoUpCache
			newState.FindMatchingCache = state.FindMatchingCache
			newState.I = state.I
			// newState.Vals = state.Vals
			// the vals is of type *[]any (in Go)
			// instead of assigning. I want newstate.Vals to be a shallow copy
			
			
			
			newState.Vals = things
			for _, v := range thingsVal {
			    newState.Vars[v.(string)] = getVar(state, v.(string))
			}
			
			// newState.CallingParent = state
			newState.CallingParent = nil
			newState.LexicalParent = state
			newState.OneLiner = state.OneLiner
			newState.IsTop = true

			if state.OneLiner {
				state.I = findAfterEndLineOnlyLine(state)
				// f.EndI = state.I
				state.OneLiner = false
			} else {
				r := findMatchingAfter(state, []string{"end"})
				state.I = r.I
				// f.EndI = r.I
			}
			
			// state.AsyncChildren[] = newState
            state.AddCallback(Callback{
			    State: newState,
			})
			pushT(state.Vals, newState)
			clearFuncToken(state)
			return state
		},
		// todo, also pause/resume as alternative to wait?
		// TODO: cancel
		"wait": func(state *State) *State {
			newState := popT(state.Vals).(*State)
		    if newState.Done {
		        for _, v := range *newState.Vals {
					pushT(state.Vals, v)
		        }
		    } else {
		    	newState.Waiters = append(newState.Waiters, state)
		    }
			clearFuncToken(state)
			return nil
		},
		"cancel": func(state *State) *State {
			newState := popT(state.Vals).(*State)
	        newState.Canceled = true
			clearFuncToken(state)
			return state
		},
		"def": func(state *State) *State {
			params := spliceT(state.Vals, state.FuncTokenSpot+1, len(*state.Vals)-(state.FuncTokenSpot+1), nil)
			paramStrings := make([]string, len(*params))
			for i, p := range *params {
				paramStrings[i] = p.(string)
			}
			funcName := popT(state.Vals).(string)
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
			stateFunc := makeFuncToken(f)
			state.Vars[funcName] = stateFunc
			// state.Vars[funcName] = f
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
			params := spliceT(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil)
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
			stateFunc := makeFuncToken(f)
			pushT(state.Vals, stateFunc)
			// pushT(state.Vals, f)
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
		"bashArg": func(state *State) *State {
			arg := popT(state.Vals).(string)
			modified := "'" + strings.Replace(arg, "'", "'\\''", -1) + "'"
			pushT(state.Vals, string(modified))
			clearFuncToken(state)
			return state
		},
		"execBash": func(state *State) *State {
			val := popT(state.Vals).(string)
			cmd := exec.Command("/bin/bash", "-c", val)
			cmdOutput, err := cmd.Output()
			_ = err
			if err != nil {
				if exitErr, ok := err.(*exec.ExitError); ok {
					fmt.Println("ExitError:", string(exitErr.Stderr))
				} else {
					fmt.Println("Error:", err)
				}
			}
			pushT(state.Vals, string(cmdOutput))
			clearFuncToken(state)
			return state
		},
		"execBashCombined": func(state *State) *State {
			val := popT(state.Vals).(string)
			cmd := exec.Command("/bin/bash", "-c", val)
			cmdOutput, err := cmd.CombinedOutput()
			_ = err
			if err != nil {
				fmt.Println(err)
			}
			pushT(state.Vals, string(cmdOutput))
			clearFuncToken(state)
			return state
		},
		"getStdin": func(state *State) *State {
			data, err := io.ReadAll(os.Stdin)
			if err != nil {
			    panic(err)
			}
			pushT(state.Vals, string(data))
			clearFuncToken(state)
			return state
		},
		"getEnvVars": func(state *State) *State {
	    	m := make(map[string]any)
	    	for _, env := range os.Environ() {
	    		parts := strings.SplitN(env, "=", 2)
	    		if len(parts) == 2 {
	    			m[parts[0]] = parts[1]
	    		}
	    	}
			pushT(state.Vals, m)
			clearFuncToken(state)
			return state
		},
		"readFile": func(state *State) *State {
			fileName := popT(state.Vals).(string)
			go func() {
				b, err := os.ReadFile(fileName)
				if err != nil {
					panic(err)
				}
				state.AddCallback(Callback{
				    State: state,
				    ReturnValues: []any{string(b)},
				})
			}()
			clearFuncToken(state)
			return nil
		},
		"readDirNames": func(state *State) *State {
		    dirName := popT(state.Vals).(string)
		    entries, err := os.ReadDir(dirName)
		    if err != nil {
		        panic(err)
		    }
		    var names []string
		    for _, entry := range entries {
		        if entry.Name() != "." && entry.Name() != ".." {
		            names = append(names, entry.Name())
		        }
		    }
		    pushT(state.Vals, &names)
		    clearFuncToken(state)
		    return state
		},
		"writeFile": func(state *State) *State {
			contents := popT(state.Vals).(string)
			fileName := popT(state.Vals).(string)
			err := os.WriteFile(fileName, []byte(contents), 0644)
			if err != nil {
				panic(err)
			}
			clearFuncToken(state)
			return state
		},
		"appendFile": func(state *State) *State {
			// TODO flow for keeping file open
			contents := popT(state.Vals).(string)
			fileName := popT(state.Vals).(string)
			f, err := os.OpenFile(fileName, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0644)
			if err != nil {
				panic(err)
			}
			defer f.Close()
			if _, err := f.WriteString(contents); err != nil {
				panic(err)
			}
			clearFuncToken(state)
			return state
		},
		"removeFile": func(state *State) *State {
		    fileName := popT(state.Vals).(string)
		    err := os.Remove(fileName)
		    if err != nil && !os.IsNotExist(err) {
		        panic(err)
		    }
		    clearFuncToken(state)
		    return state
		},
		"sleep": func(state *State) *State {
			ms := popT(state.Vals).(int)
			clearFuncToken(state)
			go func() {
				time.Sleep(time.Duration(ms) * time.Millisecond)	    
				state.AddCallback(Callback{State: state})
			}()
			return nil
		},
		
		
		
		"eval": func(state *State) *State {
			code := popT(state.Vals).(string)
			// fmt.Println(unsafe.Pointer(&code))
			// if strings come from source then we can cache it, but not worth it
			evalState := MakeState("__eval", code)
			evalState.Machine = state.Machine
			evalState.Vals = state.Vals
			evalState.Vars = state.Vars

			evalState.CallingParent = state
			// eval(evalState)
			// return state
			clearFuncToken(state)
			return evalState
		},
		"dup": func(state *State) *State {
			v := popT(state.Vals)
			pushT(state.Vals, v)
			pushT(state.Vals, v)
			clearFuncToken(state)
			return state
		},
		"drop": func(state *State) *State {
			popT(state.Vals)
			clearFuncToken(state)
			return state
		},
		"swap": func(state *State) *State {
			a := popT(state.Vals)
			b := popT(state.Vals)
			pushT(state.Vals, a)
			pushT(state.Vals, b)
			clearFuncToken(state)
			return state
		},
		"see": func(state *State) *State {
			a := popT(state.Vals)
			say(a)
			pushT(state.Vals, a)
			clearFuncToken(state)
			return state
		},
		"call": func(state *State) *State {
			// for i, v := range *state.Vals {
			//     fmt.Printf("#pink val: %d %q\n", i, toString(v))
			// }
			var f func(state *State) *State
			if len(*state.Vals)-state.FuncTokenSpot == 0 {
				f = popT(state.Vals).(func(state *State) *State)
			} else {
				fWrapper := spliceT(state.Vals, state.FuncTokenSpot, 1, nil)
				f = (*fWrapper)[0].(func(state *State) *State)
			}
			state.CurrFuncToken = f
			newState := callFunc(state)
			clearFuncToken(state) // needed here?
			return newState
		},
		"clear": func(state *State) *State {
			spliceT(state.Vals, 0, len(*state.Vals), nil)
			clearFuncToken(state)
			return state
		},
		"debugTokensOn": func(state *State) *State {
			state.DebugTokens = true
			clearFuncToken(state)
			return state
		},
		"debugTokensOff": func(state *State) *State {
			state.DebugTokens = false
			clearFuncToken(state)
			return state
		},
	}
	funcBuiltin = builtins["func"]
}

// closures seem to be in par with interfaces
func makeFuncToken(token *Func) func(*State) *State {
    return func(state *State) *State {
		state.CurrFuncToken = nil
		state.FuncTokenSpot = -1
		newState := MakeState(token.FileName, token.Code)
		newState.Machine = state.Machine
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
			newState.Vars[param] = popT(state.Vals)
		}
		newState.Machine = state.Machine
		// nt, _ := nextTokenRaw(newState, newState.Code, newState.I)
		// fmt.Println("#yellow peek", toString(nt))
		// fmt.Println("#yellow currentstate one liner", state.OneLiner)
		return newState
    }
}

var funcBuiltin func(*State) *State

func endOfCodeImmediate(state *State) *State {
	clearFuncToken(state)
	if state.CallingParent == nil {
	    state.Done = true
	}
	return state.CallingParent
}


func now() any {
	return int(time.Now().UnixMilli())
}

func push(slice any, value any) {
	if s, ok := slice.(*[]any); ok {
	    pushT(s, value)
	}
}
func pushTo(value any, slice any) {
	if s, ok := slice.(*[]any); ok {
	    pushT(s, value)
	}
}
func pushT(s *[]any, value any) {
	*s = append(*s, value)
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
	    return popT(s)
	}
	return nil
}
func popT(s *[]any) any {
    if len(*s) > 0 {
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

func spliceT(s *[]any, start int, deleteCount int, elements *[]any) *[]any {
	var elementsToAdd []any
	if elements != nil {
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

func splice(slice any, start any, deleteCount any, elements any) any {
	if els, ok := elements.(*[]any); ok {
		spliceT(slice.(*[]any), start.(int), deleteCount.(int), els)
	} else {
		spliceT(slice.(*[]any), start.(int), deleteCount.(int), nil)
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


func sliceTo(slice any, end any) any {
	endInt := end.(int)

	switch s := slice.(type) {
	case *[]any:
		n := len(*s)
		if endInt < 0 {
			endInt = n + endInt
		}
		if endInt < 0 {
			endInt = 0
		}
		if endInt > n {
			endInt = n
		}
		sliced := make([]any, endInt)
		copy(sliced, (*s)[:endInt])
		return &sliced
	case string:
		n := len(s)
		if endInt < 0 {
			endInt = n + endInt
		}
		if endInt < 0 {
			endInt = 0
		}
		if endInt > n {
			endInt = n
		}
		return s[:endInt]
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
	case float64:
		return int(math.Floor(a))
	case int:
		return a
	case int64:
		return int(a)
	case string:
		if f, err := strconv.ParseFloat(a, 64); err == nil {
			return int(math.Floor(f))
		}
		return 0
	}
	return 0
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
	case int64:
		return float64(a)
	case float64:
		return a
	case string:
		if f, err := strconv.ParseFloat(a, 64); err == nil {
			return f
		}
		return 0.0
	}
	return 0.0
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
	case int64:
		return strconv.Itoa(int(a))
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
func makeBuiltin_0_0(f func()) func(state *State) *State {
	return func(state *State) *State {
		f()
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_1_0(f func(any)) func(state *State) *State {
	return func(state *State) *State {
		a := popT(state.Vals)
		f(a)
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_2_0(f func(any, any)) func(state *State) *State {
	return func(state *State) *State {
		b := popT(state.Vals)
		a := popT(state.Vals)
		f(a, b)
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_3_0(f func(any, any, any)) func(state *State) *State {
	return func(state *State) *State {
		c := popT(state.Vals)
		b := popT(state.Vals)
		a := popT(state.Vals)
		f(a, b, c)
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_0_1(f func() any) func(state *State) *State {
	return func(state *State) *State {
		pushT(state.Vals, f())
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_1_1(f func(any) any) func(state *State) *State {
	return func(state *State) *State {
		a := popT(state.Vals)
		pushT(state.Vals, f(a))
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_2_1(f func(any, any) any) func(state *State) *State {
	return func(state *State) *State {
		b := popT(state.Vals)
		a := popT(state.Vals)
		pushT(state.Vals, f(a, b))
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_3_1(f func(any, any, any) any) func(state *State) *State {
	return func(state *State) *State {
		c := popT(state.Vals)
		b := popT(state.Vals)
		a := popT(state.Vals)
		pushT(state.Vals, f(a, b, c))
		clearFuncToken(state)
		return state
	}
}
func makeBuiltin_4_1(f func(any, any, any, any) any) func(state *State) *State {
	return func(state *State) *State {
		d := popT(state.Vals)
		c := popT(state.Vals)
		b := popT(state.Vals)
		a := popT(state.Vals)
		pushT(state.Vals, f(a, b, c, d))
		clearFuncToken(state)
		return state
	}
}

func endIf(state *State) *State {
	debug("#darkkhaki if End")
	state.OneLiner = false
	return state
}

func interpolate(a, b any) any {
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


var variableRe = regexp.MustCompile(`\$[a-zA-Z_][a-zA-Z0-9_]*`)
func interpolateDollar(state *State, str string) string {
	return variableRe.ReplaceAllStringFunc(str, func(match string) string {
		varName := match[1:]
		return toString(getVar(state, varName)).(string)
	})
}

func doEnd(state *State) *State {
	debug("#skyblue END")
	if len(state.EndStack) == 0 {
		debug("#crimson nothing in end stack")
		if state.CallingParent == nil {
		    state.Done = true
		}
		return state.CallingParent
	}

	debug("#pink remove end stack end")
	endFunc := state.EndStack[len(state.EndStack)-1]
	state.EndStack = state.EndStack[:len(state.EndStack)-1]

	clearFuncToken(state)
	return endFunc(state)
}

// </code>

/*
hub and clients
hub is solely for http connectivity
clients poll the hub
clients can register a subdomain
    and/or path prefix
clients are basically just running cgi
hub can create, update, delete files on server
    list directories etc
    run shell scripts
and then run cgi scripts
inter-process locking?


It can proxy by hostname or a path.
It can keep or clear the path.
It has "satellites" that can sit on other servers, poll it for requests and either respond, or also proxy to local http server.
cgi?! (edited)
it can handle all things ssh?!
what about performance, extra hops? the satellites can run arbitrary scripts statellites have a cgi-bin directory and anything there can be run as cgi
all http for now
redis model where you run scripts against an existing server (aka already running program)
idea start with just a cgi server implement the whole thing in linescript with just file locks and filesystem. Then add more perf later

fastcgi?

another flow, it can ssh to a server and
execute command

*/



type CertificateReloader struct {
	mu    sync.RWMutex
	certs map[string]*tls.Certificate
}

func formatWildcardDomain(domain string) string {
	parts := strings.SplitN(domain, ".", 2)
	if len(parts) != 2 {
		return ""
	}
	return "_." + parts[1]
}

func (r *CertificateReloader) getWildcardCertificate(clientHello *tls.ClientHelloInfo) (*tls.Certificate, error) {
	// Ensure the "certs" directory exists.
	if err := os.MkdirAll("certs", 0755); err != nil {
		return nil, fmt.Errorf("failed to create certs directory: %v", err)
	}

	wildcardDomain := formatWildcardDomain(clientHello.ServerName)
	if wildcardDomain == "" {
		return nil, fmt.Errorf("invalid server name: %s", clientHello.ServerName)
	}

	r.mu.RLock()
	cert, ok := r.certs[wildcardDomain]
	r.mu.RUnlock()
	if ok {
		return cert, nil
	}

	certFile := filepath.Join("certs", wildcardDomain, "fullchain.pem")
	keyFile := filepath.Join("certs", wildcardDomain, "privkey.pem")

	if _, err := os.Stat(certFile); os.IsNotExist(err) {
		return nil, fmt.Errorf("no certificate found for host: %s or wildcard domain: %s", clientHello.ServerName, wildcardDomain)
	}

	err := r.LoadCertificate(wildcardDomain, certFile, keyFile)
	if err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.certs[wildcardDomain], nil
}



func (r *CertificateReloader) GetCertificate(clientHello *tls.ClientHelloInfo) (*tls.Certificate, error) {
	r.mu.RLock()
	cert, ok := r.certs[clientHello.ServerName]
	if !ok {
		wildcardDomain := formatWildcardDomain(clientHello.ServerName)
		if wildcardDomain != "" {
			cert, ok = r.certs[wildcardDomain]
		}
	}
	r.mu.RUnlock()
	if ok {
		return cert, nil
	}

	certFile := filepath.Join("certs", clientHello.ServerName, "fullchain.pem")
	keyFile := filepath.Join("certs", clientHello.ServerName, "privkey.pem")

	if _, err := os.Stat(certFile); os.IsNotExist(err) {
		return r.getWildcardCertificate(clientHello)
	}

	err := r.LoadCertificate(clientHello.ServerName, certFile, keyFile)
	if err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.certs[clientHello.ServerName], nil
}

func (r *CertificateReloader) LoadCertificate(hostname string, certFile, keyFile string) error {
	fmt.Println("loading cert...")
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return fmt.Errorf("could not load certificate for host %s: %v", hostname, err)
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.certs == nil {
		r.certs = make(map[string]*tls.Certificate)
	}
	r.certs[hostname] = &cert
	return nil
}

func (r *CertificateReloader) ClearCache() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.certs = make(map[string]*tls.Certificate)
}

func executeCGI(scriptPath string, env []string, stdin io.Reader, w http.ResponseWriter) error {
	cmd := exec.Command(scriptPath)
	cmd.Env = env
	cmd.Stdin = stdin

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return err
	}

	if err := cmd.Start(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return err
	}

	// Copy script output to the response writer
	if _, err := io.Copy(w, stdout); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return err
	}

	if err := cmd.Wait(); err != nil {
		http.Error(w, stderr.String(), http.StatusInternalServerError)
		return err
	}

	return nil
}

func cgiHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("#orange cgiHandler function")
	env := os.Environ()
	env = append(env,
		"REQUEST_METHOD="+r.Method,
		"SCRIPT_NAME="+r.URL.Path,
		"QUERY_STRING="+r.URL.RawQuery,
		"CONTENT_TYPE="+r.Header.Get("Content-Type"),
		"CONTENT_LENGTH="+r.Header.Get("Content-Length"),
	)

	if err := executeCGI("index", env, r.Body, w); err != nil {
		log.Printf("Error executing CGI script: %v", err)
	}
}

// aren't there a bunch more headers that need to
// be sent as part of cgi spec?

func startCgiServer(httpsAddr, httpAddr string) {
	reloader := &CertificateReloader{}

	http.HandleFunc("/", cgiHandler)

	http.HandleFunc("/__clearcache", func(w http.ResponseWriter, r *http.Request) {
		reloader.ClearCache()
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "Certificate cache cleared")
	})

    if httpsAddr != "" {
		server := &http.Server{
			Addr: httpsAddr, // :443
			TLSConfig: &tls.Config{
				GetCertificate: reloader.GetCertificate,
			},
		}
		log.Println("Starting HTTPS server on", httpsAddr)
		go log.Fatal(server.ListenAndServeTLS("", "")) // Certificates are loaded dynamically, based on the hostname
    }
    if httpAddr != "" {
		server := &http.Server{
			Addr: httpAddr, // :80
		}
		log.Println("Starting HTTPS server on", httpAddr)
		go log.Fatal(server.ListenAndServeTLS("", "")) // Certificates are loaded dynamically, based on the hostname
    }
}



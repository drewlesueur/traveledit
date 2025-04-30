// <code>
package main

// fix "it" when there is another on line
// [x] "it" should reference newLineSpot, not funcTokenSpot

// TODO "break" or similar that also pops the endstack.
// indent to sub-call?
// backslash to escape newline
// custom loops? (each2)
// captured loop var? loops aren't new scopes so there is issue
// os/file operations with error return values too
// abstract the loops?

// template mode

// idea
// strings, streams, byte arrays to be used interchangeably
// soon, everything can be a stream. Interchangeable with strings (and byte slices)
// maybe can't use streams and strings interchangeably
// assigning, copying?
// when done reading, can you read again (yes?)
// allow fileBuffered Readers?
// It's an experiment to see if Readers (buffering) should just be an implementation detail.

// make it so some functions need the arguments after
// so we don't accidentally skip a parameter!
// things like writeFile, appendFile etc
// maybe would be nice with static number of args? (maybe other language, maybe truly postfix, that makes itself)

// need deadlines, cancel etc.
// if one state is cancelled, are all the children states?

// change the "GoUpCache", maybe needs to be a map, also uses too much memory.
// change loops to not need to jump to end, just call the onEnd function

// consider using Generics
// // Using Generics
// func Sum[T int | float64](a, b T) T {
//     return a + b
// }
//
// // Using any
// func SumAny(a, b any) any {
//     return a.(int) + b.(int) // Type assertion needed
// }

// after recent tweaks. a way to

// newer version can try more child states, and not so many stacks?
// less performant?

// alternate indention ui for params
// too much caching on GoUpCache (what about dynamic jumps?)
// it, dupit, nowMs don't need to be immediates anymore? because of func stack?
// end] // should that work? update: it works now that "end" is am immediate


import (
	"bufio"
	"bytes"
	"compress/gzip"
	"crypto/tls"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"net"
	// "golang.org/x/sys/unix"
	"io"
	"log"
	"math"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime/pprof"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"golang.org/x/crypto/acme/autocert"
)

type FindMatchingResult struct {
	Match  string
	I      int
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
	State        *State
	ReturnValues []any
}
type Machine struct {
	CallbacksCh chan Callback
	Index       int
}

// debate with child states vs different Stacks
// Still have child states
type State struct {
	FileName     string
	I            int
	Code         string
	CachedTokens []*TokenCacheValue
	// TODO: I think we can get rid of Mode and ModeStack
	Mode               string
	ModeStack          []string
	OneLiner           bool
	OneLinerParenLevel int
	// todo: caches need to be pointers???
	GoUpCache          []*int
	FindMatchingCache  []*FindMatchingResult
	Vals               *[]any
	ValsStack          []*[]any
	EndStack           []func(*State) *State
	Vars               map[string]any
	CurrFuncTokens     []func(*State) *State
	FuncTokenStack     [][]func(*State) *State
	FuncTokenSpots     []int // position of the first "argument" in vals, even tho it can grab from earlier
	FuncTokenSpotStack [][]int

	NewlineSpot              int
	InCurrentCall            bool
	CloseParensAfterLastCall bool

	LexicalParent *State
	CallingParent *State
	DebugTokens   bool

	Done                bool
	Canceled            bool // need this?
	Waiters             []*State
	IsTopOfOwnGoroutine bool
	IsMainTop           bool
	AsyncChildren       map[int]*State // needed? alternative, find all children whos asyncTop is that state? but still need children?
	// Deadline time.Time

	Out io.Writer

	Machine *Machine
	DoneCh  chan int
}

func (state *State) AddCallback(callback Callback) {
	go func() {
		state.Machine.CallbacksCh <- callback
	}()
}
func (state *State) Wait() {
	<-state.DoneCh
}

func MakeState(fileName, code string) *State {
	return &State{
		FileName:  fileName,
		I:         0,
		Code:      code,
		Mode:      "normal",
		ModeStack: nil,

		CachedTokens: make([]*TokenCacheValue, len(code)+1),

		// Preinitializing this makes eval in a loop slower if it doesn't use these
		// though if you eval in a loop with a static string, you should be able to optimize
		GoUpCache:         make([]*int, len(code)+1),
		FindMatchingCache: make([]*FindMatchingResult, len(code)+1),

		Vals:               &[]any{},
		ValsStack:          nil,
		EndStack:           nil,
		Vars:               map[string]any{},
		CurrFuncTokens:     nil,
		FuncTokenStack:     nil,
		FuncTokenSpots:     nil,
		FuncTokenSpotStack: nil,

		NewlineSpot: -1,

		DebugTokens: false,
		Waiters:     []*State{},
	}
}

var seeDebugLogs = false

func debug(x string) {
	if seeDebugLogs {
		fmt.Println(x)
	}
}

var httpsAddr string
var httpAddr string
var domain string
var cgiUrl string

//	func init() {
//	    c := make(chan int)
//	    go func() {
//	       fmt.Println("eternal....")
//	       <- c
//	    }()
//	}
func main() {
	cgi := flag.Bool("cgi", false, "Start cgi server")
	flag.StringVar(&httpsAddr, "httpsaddr", ":443", "address for http")
	flag.StringVar(&httpAddr, "httpaddr", ":80", "address for http")
	flag.StringVar(&domain, "domain", "", "domain for server that's starting")
	flag.Parse()

	cgiUrl = "https://" + domain
	if httpsAddr != ":443" {
		cgiUrl += httpsAddr
	}

	if *cgi {
		fmt.Println("#orange starting cgi")
		startCgiServer(domain, httpsAddr, httpAddr)
		fmt.Println("#orange done cgi")
	}

	if *cgi {
		ch := make(chan int)
		<-ch
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
	state := MakeState(fileName, code+"\n")
	state.Machine = &Machine{
		CallbacksCh: make(chan Callback),
		Index:       0,
	}
	state.IsTopOfOwnGoroutine = true
	state.Out = os.Stdout
	state.IsMainTop = true

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
	evalState := MakeState("__stdlib", stdlib+"\n")
	evalState.Machine = state.Machine
	evalState.Vals = state.Vals
	evalState.Vars = state.Vars
	evalState.CallingParent = state
	evalState.Out = state.Out

	Eval(evalState)
}

//go:embed stdlib.ls
var stdlib string

func debugStateI(state *State, endI int) {
	startI := endI - 100
	if startI < 0 {
		startI = 0
	}
	if endI >= len(state.Code) {
		endI = len(state.Code) - 1
	}
	fmt.Println("state:", toJson(startI), toJson(state.Code[startI:endI]))
}

func Eval(state *State) *State {
	var origState = state
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("Recovered from panic:", r)
			if state != nil {
				debugStateI(state, state.I)
			}
			panic(r)
		}
	}()
evalLoop:
	for {
		if state != nil && state.Canceled {
			cancel(state)
			return nil
		}
		if state.InCurrentCall {
			// essentially closing all the implied parens (lite)
			// oldState := state
			state = callFunc(state)
			continue
		}
		if state.CloseParensAfterLastCall && !state.InCurrentCall {
			// see ")"
			oldMode := state.Mode
			state.CloseParensAfterLastCall = false
			state.Mode = state.ModeStack[len(state.ModeStack)-1]
			state.ModeStack = state.ModeStack[:len(state.ModeStack)-1]
			state.CurrFuncTokens = state.FuncTokenStack[len(state.FuncTokenStack)-1]
			state.FuncTokenStack = state.FuncTokenStack[:len(state.FuncTokenStack)-1]
			state.FuncTokenSpots = state.FuncTokenSpotStack[len(state.FuncTokenSpotStack)-1]
			state.FuncTokenSpotStack = state.FuncTokenSpotStack[:len(state.FuncTokenSpotStack)-1]

			if oldMode == "array" {
				myArr := state.Vals
				state.Vals = state.ValsStack[len(state.ValsStack)-1]
				state.ValsStack = state.ValsStack[:len(state.ValsStack)-1]
				pushT(state.Vals, myArr)
			} else if oldMode == "object" {
				myObj := map[string]any{}
				for i := 0; i < len(*state.Vals); i += 2 {
					key := (*state.Vals)[i]
					value := (*state.Vals)[i+1]
					myObj[toString(key).(string)] = value
				}
				state.Vals = state.ValsStack[len(state.ValsStack)-1]
				state.ValsStack = state.ValsStack[:len(state.ValsStack)-1]

				pushT(state.Vals, myObj)
			}

			continue
		}
		token, name := nextToken(state)
		// #cyan
		if state.DebugTokens {
			// fmt.Printf("#cyan token: %T %q (%d/%d)\n", token, name, state.I, len(state.Code) - 1)
			appendFile("delme_tokens.txt", fmt.Sprintf("token: %q       %T (%s:%d/%d)\n", name, token, state.FileName, state.I, len(state.Code)-1))
		}
		_ = name
		switch token := token.(type) {
		case immediateToken:
			o := state
			state = token(state)
			if o.Done && o.IsMainTop {
				// this so we don't have to explicitly exit
				break evalLoop
			}
			if state == nil {
				if o.Done {
					// for now we only close if new state is nil
					// we could close even if new state is not nil

					// fmt.Println("#crimson ending!", o.I)
					for _, w := range o.Waiters {
						o.AddCallback(Callback{
							State:        w,
							ReturnValues: *o.Vals,
						})
					}
					o.Waiters = nil

				}
				// need another state, let's get one from callback channel
				// fmt.Println("#yellow waiting for new state")
				callback, ok := <-o.Machine.CallbacksCh
				if !ok {
					break evalLoop
				}
				// fmt.Println("#lime got new state")
				state = callback.State
				for _, v := range callback.ReturnValues {
					pushT(state.Vals, v)
				}
				// so "it" works after wait
				state.NewlineSpot = len(*state.Vals)
			}
		case builtinFuncToken:
			state.CurrFuncTokens = append(state.CurrFuncTokens, token)
			state.FuncTokenSpots = append(state.FuncTokenSpots, len(*state.Vals))
			// case builtinToken:
			// ??
		case getVarToken:
			evaled := getVar(state, string(token))
			pushT(state.Vals, evaled)
		case getVarFuncToken:
			evaledFunc := getVar(state, string(token)).(func(*State) *State)
			state.CurrFuncTokens = append(state.CurrFuncTokens, evaledFunc)
			state.FuncTokenSpots = append(state.FuncTokenSpots, len(*state.Vals))

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
	// see got moved to callFunc
	// state.CurrFuncToken = nil
	// state.FuncTokenSpot = -1
}

// if x is 3 len
// let :x plus 2 3

func callFunc(state *State) *State {
	if len(state.CurrFuncTokens) == 0 {
		return state
	}
	state.InCurrentCall = true // true when we stared calling but not finished
	f := state.CurrFuncTokens[len(state.CurrFuncTokens)-1]
	newState := f(state)
	state.CurrFuncTokens = state.CurrFuncTokens[:len(state.CurrFuncTokens)-1]
	state.FuncTokenSpots = state.FuncTokenSpots[:len(state.FuncTokenSpots)-1]
	if len(state.CurrFuncTokens) == 0 {
		state.InCurrentCall = false
	}

	// if state.ImpliedParenCount > 0 {
	//     state.ImpliedParenCount--
	// 	state.Mode = state.ModeStack[len(state.ModeStack)-1]
	// 	state.ModeStack = state.ModeStack[:len(state.ModeStack)-1]
	// 	state.CurrFuncToken = state.FuncTokenStack[len(state.FuncTokenStack)-1]
	// 	state.FuncTokenStack = state.FuncTokenStack[:len(state.FuncTokenStack)-1]
	// 	state.FuncTokenSpot = state.FuncTokenSpotStack[len(state.FuncTokenSpotStack)-1]
	// 	state.FuncTokenSpotStack = state.FuncTokenSpotStack[:len(state.FuncTokenSpotStack)-1]
	// } else {
	// 	state.CurrFuncToken = nil
	// 	state.FuncTokenSpot = -1
	// }
	return newState
}

type TokenCacheValue struct {
	I     int
	Token any
	Name  string
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
			case '{', '}', '(', ')', '[', ']', ',', '\n', '|', ':', '.':
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
// func makeImmediateFromBuiltinFuncToken(token func(*State) *State) immediateToken {
// 	return immediateToken(func(state *State) *State {
// 		state.CurrFuncToken = token
// 		state.FuncTokenSpot = len(*state.Vals)
// 		return state
// 	})
// }

// type Immediate interface {
// 	Process(state *State) *State
// }
//
// func (token builtinFuncToken) Process(state *State) *State {
// 	state.CurrFuncToken = token
// 	state.FuncTokenSpot = len(*state.Vals)
// 	return state
// }
// func (token getVarToken) Process(state *State) *State {
// 	evaled := getVar(state, string(token))
// 	pushT(state.Vals, evaled)
// 	return state
// }
// func (token getVarFuncToken) Process(state *State) *State {
// 	evaledFunc := getVar(state, string(token)).(func(*State) *State)
// 	state.CurrFuncToken = evaledFunc
// 	state.FuncTokenSpot = len(*state.Vals)
// 	return state
// }
// func (token immediateToken) Process(state *State) *State {
// 	state = token(state)
// 	return state
// }

func noop(state *State) *State {
	return state
}

type Reader struct {
	// Reader: io.Reader
	io.Reader
}

func (r *Reader) Iterator() {
    return 
}

// TODO: files must end in newline!
type Skip string

var stdinReader = &Reader{
	Reader: os.Stdin,
}

func makeToken(state *State, val string) any {
	// immediates go first, because it could be an immediate and builtin
	// The 2 immediate styles can be consolidated now
	if f, ok := runAlwaysImmediates[val]; ok {
		return immediateToken(f)
	}
	if f, ok := runImmediates[val]; ok {
		// if state.Mode == "normal" {
		return immediateToken(f)
		// } else {
		// return immediateToken(noop)
		// }
	}
	if b, ok := builtins[val]; ok {
		// wow we  switch on the mode at compile time?!
		// the first run is compile time, interesting

		return builtinFuncToken(b)

		// switch state.Mode {
		// case "normal":
		// 	return builtinFuncToken(b)
		// 	// attempt to require fewer cases in token switch
		// 	// but it's slower, with closure and even polymorphic types, it's slower.
		// 	// compared to switch
		// 	// tho too many switch cases bad
		// 	// return makeImmediateFromBuiltinFuncToken(b)
		// case "array", "object":
		// 	// need this?
		// 	return builtinToken(b)
		// }
	}
	// string shortcut, maybe phase out : for . ?
	if val[0] == ':' || val[0] == '.' {
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
		if val[len(val)-1:] == "f" {
			val := strings.Replace(val, "_", "", -1)
			f, err := strconv.ParseFloat(val[0:len(val)-1], 64)
			if err != nil {
				panic(err)
			}
			return f
		}
		if strings.Contains(val, ".") {
			return val
		}

		cleanedVal := strings.Replace(val, "_", "", -1)
		i, err := strconv.Atoi(cleanedVal)
		if err != nil {
			return val
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
	case "formFeed":
		return "\f"
	case "carriageReturn":
		return "\r"
	case "crlf":
		return "\r\n"
	case "tab":
		return "\t"
	case "null":
		return nil
	case "stdin":
		return stdinReader
	}

	evaled := getVar(state, val)
	// once a func, always a func
	// but have to eval twice the first round?!
	// TODO: fix the double eval
	if _, ok := evaled.(func(*State) *State); ok {
		return getVarFuncToken(val)
	} else {
		return getVarToken(val)
	}
	// switch state.Mode {
	// case "normal":
	// 	// return getVarToken(val)
	// 	evaled := getVar(state, val)
	// 	// once a func, always a func
	// 	// but have to eval twice the first round?!
	// 	// TODO: fix the double eval
	// 	if _, ok := evaled.(func(*State) *State); ok {
	// 		return getVarFuncToken(val)
	// 	} else {
	// 		return getVarToken(val)
	// 	}
	// case "array", "object":
	// 	// need this?
	// 	return getVarToken(val)
	// }
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
	return getIndent(state, -2)
}
func getIndent(state *State, iOffset int) string {
	// fmt.Println("#aqua getting prev indent")
	// debugStateI(state, state.I)

	// TODO audit the subtraction here
	code := state.Code
	i := state.I
	lastNonSpace := i

	// back one to get to the newline
	// another to get before newline
	i = i + iOffset
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
		I:      i,
		Match:  "",
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
		I:      i,
		Match:  "",
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

func findMatchingAfter(state *State, dedentCount int, things []string) *FindMatchingResult {
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

	// 4 spaces per indent
	indent = indent[4*dedentCount:]
	for j, thing := range things {
		toFind := "\n" + indent + thing // + 1 + len(indent)
		// fmt.Println("#orange finding", toJson(toFind))
		// fmt.Println("#darkorange in", toJson(toSearch))
		index := strings.Index(toSearch, toFind)
		if index != -1 && index < minPos {
			minPos = index
			closestIndex = j
			theEnd = state.I - 1 + minPos + len(toFind)
		}
	}
	ret := &FindMatchingResult{
		// I:     minDiff + state.I + len(things[closestIndex]) + 1 + len(indent),
		I:      theEnd,
		Match:  things[closestIndex],
		Indent: indent,
	}
	state.FindMatchingCache[state.I] = ret
	// fmt.Println("#yellow foundMatchingAfter", toJson(ret.Match))
	// debugStateI(state, ret.I)
	return ret
}

func findMatchingBefore(state *State, things []string) int {
	r := findMatchingAfter(state, 0, things)
	return r.I - len(r.Match)
}

var builtins map[string]func(state *State) *State
var runImmediates map[string]func(state *State) *State
var runAlwaysImmediates map[string]func(state *State) *State

func initBuiltins() {
	runAlwaysImmediates = map[string]func(state *State) *State{
		"(": func(state *State) *State {
			// fmt.Println("#yellow, mode stack up a")
			// fmt.Println("#yellow, pre", len(state.ModeStack))
			state.ModeStack = append(state.ModeStack, state.Mode)
			// fmt.Println("#yellow, post", len(state.ModeStack))
			state.Mode = "normal"

			state.FuncTokenStack = append(state.FuncTokenStack, state.CurrFuncTokens)
			state.CurrFuncTokens = nil
			state.FuncTokenSpotStack = append(state.FuncTokenSpotStack, state.FuncTokenSpots)
			state.FuncTokenSpots = nil

			return state
		},
		")": func(state *State) *State {
			// we could get in here cuz of: (func: 200)

			oldState := state
			state = callFunc(state)

			// using ModeStack as a representative of paren level
			// this needs fixing
			if state.InCurrentCall && state.OneLiner && state.OneLinerParenLevel == len(state.ModeStack) {
				state = doEnd(state)
				if state.OneLiner {
					return state
				}
			}
			oldState.CloseParensAfterLastCall = true
			return state
		},
		"[": func(state *State) *State {
			// fmt.Println("#yellow, mode stack up b")
			state.ModeStack = append(state.ModeStack, state.Mode)
			state.Mode = "array"

			state.FuncTokenStack = append(state.FuncTokenStack, state.CurrFuncTokens)
			state.CurrFuncTokens = nil
			state.FuncTokenSpotStack = append(state.FuncTokenSpotStack, state.FuncTokenSpots)
			state.FuncTokenSpots = nil

			state.ValsStack = append(state.ValsStack, state.Vals)
			state.Vals = &[]any{}
			return state
		},
		"]": func(state *State) *State {
			// fmt.Println("#aqua, mode stack down b")

			oldState := state
			state = callFunc(state)

			// using ModeStack as a representative of paren level
			// this needs fixing
			if state.InCurrentCall && state.OneLiner && state.OneLinerParenLevel == len(state.ModeStack) {
				state = doEnd(state)
				if state.OneLiner {
					return state
				}
			}
			oldState.CloseParensAfterLastCall = true

			return state
		},
		"{": func(state *State) *State {
			// fmt.Println("#yellow, mode stack up c")
			state.ModeStack = append(state.ModeStack, state.Mode)
			state.Mode = "object"

			state.FuncTokenStack = append(state.FuncTokenStack, state.CurrFuncTokens)
			state.CurrFuncTokens = nil
			state.FuncTokenSpotStack = append(state.FuncTokenSpotStack, state.FuncTokenSpots)
			state.FuncTokenSpots = nil

			state.ValsStack = append(state.ValsStack, state.Vals)
			state.Vals = &[]any{}
			return state
		},
		"}": func(state *State) *State {
			oldState := state
			state = callFunc(state)

			// using ModeStack as a representative of paren level
			// this needs fixing
			if state.InCurrentCall && state.OneLiner && state.OneLinerParenLevel == len(state.ModeStack) {
				state = doEnd(state)
				if state.OneLiner {
					return state
				}
			}
			oldState.CloseParensAfterLastCall = true

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
				// state.I = state.I + 2 + end + 1
				state.I = state.I + 2 + end
				// actually we don't want after the newline
			} else {
				r := findMatchingAfter(state, 0, []string{"end"})
				str := state.Code[state.I+1 : r.I-3]
				lines := strings.Split(str, "\n")
				lines = lines[0 : len(lines)-1]
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
				// state.I = state.I + 2 + end + 1
				state.I = state.I + 2 + end
				// actually we don't want after the newline
			} else {
				r := findMatchingAfter(state, 0, []string{"end"})
				str := state.Code[state.I+1 : r.I-3]
				lines := strings.Split(str, "\n")
				lines = lines[0 : len(lines)-1]
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
		"%%": func(state *State) *State {
			end := strings.Index(state.Code[state.I:], "\n")
            var s string
            // if false && end == 0 {
            if end == 0 {
				r := findMatchingAfter(state, 0, []string{"end"})
				str := state.Code[state.I+1 : r.I-3]
				lines := strings.Split(str, "\n")
				lines = lines[0 : len(lines)-1]
				prefixToTrim := r.Indent + "    "
				for i, line := range lines {
					// fmt.Printf("%q %q" prefixToTrim, line)
					lines[i] = strings.TrimPrefix(line, prefixToTrim)
				}
				s = strings.Join(lines, "\n")
				state.I = r.I
            } else {
                s = state.Code[state.I:state.I+end]
                state.I += end
            }
            // TODO: cached or more optimal way of doing this.
            // you could even handle in the parser?
            
            var parts []string
            start := 0
            depth := 0
            parseState := "out"
            doAppend := func(str string) {
                if len(parts)%2 == 0 {
                    wrapped := `xyzzylol"` + str + `"xyzzylol`
                    parts = append(parts, wrapped)
                } else {
                    // wrapped := `(` + str + `)`
                    wrapped := str
                    parts = append(parts, wrapped)
                }
            }
            for i := 0; i < len(s); i++ {
                if parseState == "inParen" {
                    switch s[i] {
                    case '(':
                        depth++
                    case ')':
                        depth--
                        if depth == 0 {
                            doAppend(s[start:i])
                            start = i + 1
                            parseState = "out"
                        }
                    }
                } else if parseState == "inPercent" {
                    switch s[i] {
                    case ' ', '\n':
                        doAppend(s[start:i])
                        start = i
                        parseState = "out"
                    }
                } else if parseState == "out" {
                    switch s[i] {
                    case '%':
                        if depth == 0 && len(s) > i && s[i+1] != ' ' {
                            doAppend(s[start:i])
                            start = i + 1
                            parseState = "inPercent"
                        }
                        // depth++
                    case '(':
                        if len(s) > i && s[i+1] == '%' {
                            doAppend(s[start:i])
                            start = i + 2
                            parseState = "inParen"
                            depth++
                        }
                    }
                }
            }
            if start < len(s) {
                doAppend(s[start:])
            }
            // for _, v := range parts {
            //     fmt.Println("#aqua", v)
            // }
            
            // code := "([\n" + strings.Join(parts, " ") + "\n]" + ` join "")`
            code := "([\n" + strings.Join(parts, " ") + "\n]" + ` join "")`
            // code := "([\n" + strings.Join(parts, "\n") + `] join "")`
            // code := "([\n" + strings.Join(parts, " newline\n ") + `] join "", see)`
            // fmt.Println("====code====")
            // fmt.Println(code)
            // fmt.Println("========")

			// fmt.Println(unsafe.Pointer(&code))
			// if strings come from source then we can cache it, but not worth it
			evalState := MakeState("__eval", code+"\n")
			evalState.Machine = state.Machine
			evalState.Vals = state.Vals
			evalState.Vars = state.Vars

			evalState.CallingParent = state
			evalState.LexicalParent = state
			evalState.Out = state.Out
			return evalState
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
		"now":       makeBuiltin_0_1(now),
		"nowMillis": makeBuiltin_0_1(now),
		"nowMs":     makeBuiltin_0_1(now),
		"nowSeconds": makeBuiltin_0_1(func() any {
			return int(time.Now().Unix())
		}),
		"__vals": func(state *State) *State {
			pushT(state.Vals, state.Vals)
			return state
		},
		"__state": func(state *State) *State {
			pushT(state.Vals, state)
			return state
		},
		"it": func(state *State) *State {
			// items := spliceT(state.Vals, state.FuncTokenSpot-1, 1, nil)
			items := spliceT(state.Vals, state.NewlineSpot-1, 1, nil)
			state.NewlineSpot--
			// f1 a f2 b f3 c it
			// state.FuncTokenSpots[len(state.FuncTokenSpots)-1]--
			for i, v := range state.FuncTokenSpots {
				state.FuncTokenSpots[i] = v - 1
			}
			item := (*items)[0]
			pushT(state.Vals, item)
			return state
		},
		"dupit": func(state *State) *State {
			item := (*state.Vals)[state.NewlineSpot-1]
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
			newState := callFunc(state)
			// we want to set NewlineSpot here? I think not
			state.NewlineSpot = len(*state.Vals)
			state.InCurrentCall = false
			return newState
		},
		"|": func(state *State) *State {
			state = callFunc(state)
			return state
		},
		"func (old before auto implied parens)": func(state *State) *State {
			// fmt.Println("#yellow, mode stack up d (func)")

			// open implied parens
			// state.ModeStack = append(state.ModeStack, state.Mode)
			// state.Mode = "normal"
			// state.FuncTokenStack = append(state.FuncTokenStack, state.CurrFuncToken)
			// state.CurrFuncToken = funcBuiltin
			// state.FuncTokenSpotStack = append(state.FuncTokenSpotStack, state.FuncTokenSpot)
			// state.FuncTokenSpot = len(*state.Vals)

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
			r := findMatchingAfter(state, 0, []string{"end"})
			debug("#orange jumping to end")
			state.I = r.I
			// debugStateI(state, state.I)
			clearFuncToken(state)
			return state
		},
		"end": doEnd,
	}
	builtins = map[string]func(state *State) *State{
		"formatTimestamp": makeBuiltin_2_1(func(m any, f any) any {
			// from unix millis
			t := time.Unix(0, int64(toIntInternal(m))*int64(time.Millisecond))
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
			ms := toIntInternal(s)
			sec := int64(ms / 1000)
			nsec := int64(ms%1000) * 1000000
			return time.Unix(sec, nsec).Format(time.RFC3339)
		}),
		"getType": makeBuiltin_1_1(func(s any) any {
			return fmt.Sprintf("%T", s)
		}),
		"replace": makeBuiltin_3_1(func(s, x, y any) any {
			return strings.Replace(s.(string), x.(string), y.(string), -1)
		}),
		"getEnvVar": makeBuiltin_1_1(func(v any) any {
			return os.Getenv(v.(string))
		}),
		"+": makeBuiltin_2_1(plus),
		"-": makeBuiltin_2_1(minus),
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
		"^":  makeBuiltin_2_1(pow),
		"%":  makeBuiltin_2_1(mod),
		"<":  makeBuiltin_2_1(lt),
		">":  makeBuiltin_2_1(gt),
		"<=": makeBuiltin_2_1(lte),
		">=": makeBuiltin_2_1(gte),

		"plus":  makeBuiltin_2_1(plus),
		"minus": makeBuiltin_2_1(minus),
		"times": makeBuiltin_2_1(times),
		"divBy": makeBuiltin_2_1(divide),
		"toThe": makeBuiltin_2_1(pow),
		"mod":   makeBuiltin_2_1(mod),
		"lt":    makeBuiltin_2_1(lts),
		"gt":    makeBuiltin_2_1(gts),
		"lte":   makeBuiltin_2_1(ltes),
		"gte":   makeBuiltin_2_1(gtes),
		// TODO: lex versions
		"is":    makeBuiltin_2_1(is),
		"isnt":  makeBuiltin_2_1(isnt),
		"eq":    makeBuiltin_2_1(eq),
		"neq":   makeBuiltin_2_1(neq),
		"!=":    makeBuiltin_2_1(neq),
		"==":    makeBuiltin_2_1(eq),
		"round": makeBuiltin_2_1(round),

		"not":         makeBuiltin_1_1(not),
		"cc":          makeBuiltin_2_1(cc),
		"++":          makeBuiltin_2_1(cc),
		"indexOf":     makeBuiltin_2_1(indexOf),
		"lastIndexOf": makeBuiltin_2_1(lastIndexOf),
		"split":       makeBuiltin_2_1(split),
		"trim": makeBuiltin_1_1(func(a any) any {
			return strings.TrimSpace(a.(string))
		}),
		"join": makeBuiltin_2_1(func(a, b any) any {
			// TODO: allow anything to use slice of strings too
			strSlice := make([]string, len(*a.(*[]any)))
			for i, v := range *a.(*[]any) {
				strSlice[i] = toStringInternal(v)
			}
			return strings.Join(strSlice, b.(string))
		}),
		"contains": makeBuiltin_2_1(func(a, b any) any {
			return strings.Contains(a.(string), b.(string))
		}),
		"startsWith": makeBuiltin_2_1(func(a, b any) any {
			return strings.HasPrefix(a.(string), b.(string))
		}),
		"endsWith": makeBuiltin_2_1(func(a, b any) any {
			return strings.HasSuffix(a.(string), b.(string))
		}),
		"trimPrefix": makeBuiltin_2_1(func(a, b any) any {
			return strings.TrimPrefix(a.(string), b.(string))
		}),
		"trimSuffix": makeBuiltin_2_1(func(a, b any) any {
			return strings.TrimSuffix(a.(string), b.(string))
		}),
		"upper": makeBuiltin_1_1(func(a any) any {
			return strings.ToUpper(a.(string))
		}),
		"lower": makeBuiltin_1_1(func(a any) any {
			return strings.ToLower(a.(string))
		}),
		"toString": makeBuiltin_1_1(toString),
		"toInt":    makeBuiltin_1_1(toInt),
		"toFloat":  makeBuiltin_1_1(toFloat),
		"toBool":   makeBuiltin_1_1(toBool),
		"say": func(state *State) *State {
			things := getArgs(state)
			thingsVal := *things
			if len(thingsVal) == 0 {
				thingsVal = append(thingsVal, popT(state.Vals))
			}
			say(state.Out, thingsVal...)
			clearFuncToken(state)
			return state
		},
		"sayRaw": func(state *State) *State {
			v := popT(state.Vals)
			fmt.Fprintf(state.Out, "%v", v)
			clearFuncToken(state)
			return state
		},
		// "say2": func(state *State) *State {
		// 	things := spliceT(state.Vals, state.FuncTokenSpot, len(*state.Vals)-(state.FuncTokenSpot), nil)
		// 	thingsVal := *things
		// 	if len(thingsVal) == 0 {
		// 		thingsVal = append(thingsVal, popT(state.Vals))
		// 	}
		// 	for i, v := range *things {
		// 		fmt.Printf("%d %#v\n", i, v)
		// 	}
		// 	clearFuncToken(state)
		// 	return state
		// },
		"put":      makeNoop(),
		"push":     makeBuiltin_2_0(push),
		"pushTo":   makeBuiltin_2_0(pushTo),
		"pushm":    makeBuiltin_2_0(pushm),
		"pop":      makeBuiltin_1_1(pop),
		"unshift":  makeBuiltin_2_0(unshift),
		"shift":    makeBuiltin_1_1(shift),
		"setIndex": makeBuiltin_3_0(setIndex),
		"at":       makeBuiltin_2_1(at),
		"in": makeBuiltin_2_1(func(a, b any) any {
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
		"base64Encode": makeBuiltin_1_1(func(a any) any {
			return base64.StdEncoding.EncodeToString([]byte(a.(string))) 
		}),
		"base64Decode": makeBuiltin_1_1(func(a any) any {
			ret, err := base64.StdEncoding.DecodeString(a.(string)) 
			if err != nil {
				panic(err)
			}
			return string(ret)
		}),
		"urlEncode": makeBuiltin_1_1(func(a any) any {
			return url.PathEscape(a.(string))
		}),
		"rand": makeBuiltin_2_1(func(a, b any) any {
			min := toIntInternal(a)
			max := toIntInternal(b)
			return rand.Intn(max-min+1) + min
		}),
		"padLeft": makeBuiltin_3_1(func(s, padChar any, length any) any {
			str := s.(string)
			pad := padChar.(string)
			padLength := toIntInternal(length)
			for len(str) < padLength {
				str = pad + str
			}
			return str
		}),
		"padRight": makeBuiltin_3_1(func(s, padChar any, length any) any {
			str := s.(string)
			pad := padChar.(string)
			padLength := length.(int)
			for len(str) < padLength {
				str = str + pad
			}
			return str
		}),
		"slice":       makeBuiltin_3_1(slice),
		"splice":      makeBuiltin_4_1(splice),
		"length":      makeBuiltin_1_1(length),
		"len":         makeBuiltin_1_1(length),
		"setProp":     makeBuiltin_3_0(setProp),
		"setPropVKO":  makeBuiltin_3_0(setPropVKO),
		"getProp":     makeBuiltin_2_1(getProp),
		"getPropKO":   makeBuiltin_2_1(getPropKO),
		"deleteProp":  makeBuiltin_2_0(deleteProp),
		"keys":        makeBuiltin_1_1(keys),
		"interpolate": makeBuiltin_2_1(interpolate),
		"unquote": makeBuiltin_1_1(func(a any) any {
			q := a.(string)
			r, err := strconv.Unquote(q)
			if err != nil {
				panic(err)
			}
			return r
		}),
		"tcpConnect": makeBuiltin_1_1(func(a any) any {
			conn, err := net.Dial("tcp", a.(string))
			if err != nil {
				panic(err)
			}
			return conn
		}),
		"tcpClose": makeBuiltin_1_0(func(a any) {
			a.(net.Conn).Close()
		}),
		"tcpWrite": makeBuiltin_2_0(func(a, b any) {
			bts := []byte(toStringInternal(b))
			n, err := a.(net.Conn).Write(bts)
			if err != nil {
				panic(err)
			}
			if n != len(bts) {
				panic("short write")
			}
		}),
		"tcpRead": makeBuiltin_2_1(func(a, b any) any {
			buf := make([]byte, toIntInternal(b))
			n, err := a.(net.Conn).Read(buf)
			if err != nil {
				if err == io.EOF {
				} else {
					panic("short write")
				}
			}
			return string(buf[:n])
		}),
		"fromJson": makeBuiltin_1_1(func(a any) any {
			j := a.(string)
			var r any
			err := json.Unmarshal([]byte(j), &r)
			if err != nil {
				panic(err)
			}
			var recursivelyPtrArrays func(any) any
			recursivelyPtrArrays = func(x any) any {
				switch x := x.(type) {
				case []any:
					// Recursively process each element
					for i, v := range x {
						x[i] = recursivelyPtrArrays(v)
					}
					return &x // Return pointer to the array
				case map[string]any:
					for k, v := range x {
						x[k] = recursivelyPtrArrays(v)
					}
					return x
				default:
					return x
				}
			}
			return recursivelyPtrArrays(r)
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
			state.Vars[a] = toIntInternal(state.Vars[a]) + 1
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
		"=": func(state *State) *State {
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
			indent := getPrevIndent(state)
			if cachedI := state.GoUpCache[state.I]; cachedI != nil {
				state.I = *cachedI
			} else {
				toSearch := "#" + locText
				newI := strings.LastIndex(state.Code[0:state.I], toSearch)
				state.GoUpCache[state.I] = &newI
				state.I = newI
			}
			newIndent := getIndent(state, 0)
			count := (len(newIndent) - len(indent)) / 4
			state.EndStack = state.EndStack[:len(state.EndStack)-count]
			clearFuncToken(state)
			return state
		},
		"goDown": func(state *State) *State {
			locText := popT(state.Vals).(string)
			indent := getPrevIndent(state)
			// assuming static location
			if cachedI := state.GoUpCache[state.I]; cachedI != nil {
				state.I = *cachedI
			} else {
				toSearch := "#" + locText
				newI := strings.Index(state.Code[state.I:], toSearch) + state.I
				state.GoUpCache[state.I] = &newI
				state.I = newI
			}
			newIndent := getIndent(state, 0)
			count := (len(indent) - len(newIndent)) / 4
			state.EndStack = state.EndStack[:len(state.EndStack)-count]
			clearFuncToken(state)
			return state
		},
		"forever": func(state *State) *State {
			clearFuncToken(state)
			return state
		},
		"break": func(state *State) *State {
			count := toIntInternal(popT(state.Vals))
			r := findMatchingAfter(state, count, []string{"end"})
			state.I = r.I
			state.EndStack = state.EndStack[:len(state.EndStack)-count]
			clearFuncToken(state)
			return state
		},
		// "onEnd": func(state *State) *State {
		// 	endFunc := popT(state.Vals).(func (*State) *State)
		//
		// 	write Go(lang) idiom
		// 	for poping a value (a) from a slice
		// 	then pushing a value (b)
		// 	then pushing (a) again
		//
		// 	s = append(s[1:], b, s[0])
		//
		// 	but we pop from the end
		//
		// 	In Go, if you want to pop a value from the end of a slice, then push a new value and the popped value back to the slice, you can achieve this by manipulating the slice indices. Here's how you could implement it idiomatically:
		//
		// 	```go
		// 	package main
		//
		// 	import "fmt"
		//
		// 	func main() {
		// 		// Example slice
		// 		s := []int{1, 2, 3, 4, 5}
		//
		// 		// Pop the value from the end
		// 		a := s[len(s)-1]
		// 		s = s[:len(s)-1]
		//
		// 		// Declare b as the new value to push
		// 		b := 10
		//
		// 		// Push b and the popped value a back to the slice
		// 		s = append(s, b, a)
		//
		// 		fmt.Println(s) // Output: [1 2 3 4 10 5]
		// 	}
		// 	```
		//
		// 	### Explanation:
		//
		// 	1. **Pop the value from the end:**
		// 	   - `a := s[len(s)-1]` stores the last element of the slice in `a`.
		// 	   - `s = s[:len(s)-1]` resizes the slice to exclude the last element, effectively popping it.
		//
		// 	2. **Push a new value:**
		// 	   - `b` is declared as the new value to be pushed. You can change `b` to whatever value you’d like to push.
		//
		// 	3. **Push the popped value and new value back:**
		// 	   - `s = append(s, b, a)` appends `b` and then `a` to the slice.
		//
		// 	This results in a slice with the new value `b` and the previously popped value `a` at the end.
		//
		//
		//
		// 	state.EndStack = append(state.EndStack, endFunc)
		// 	clearFuncToken(state)
		// 	return state
		// },
		"loop": func(state *State) *State {
			theIndex := 0

			things := getArgs(state)
			thingsVal := *things

			var indexVar string
			var loops int
			if len(thingsVal) >= 2 {
				loops = toIntInternal(thingsVal[0])
				indexVar = thingsVal[1].(string)
			} else if len(thingsVal) == 1 {
				loops = toIntInternal(popT(state.Vals))
				indexVar = thingsVal[0].(string)
			} else {
				loops = toIntInternal(popT(state.Vals))
			}

			if indexVar != "" {
				state.Vars[indexVar] = -1
			}
			var spot = state.I
			var endEach func(state *State) *State
			endEach = func(state *State) *State {
				theIndex++
				if theIndex > loops {
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
		// inclusive
		"loopRange": func(state *State) *State {
			var theIndex int

			things := getArgs(state)
			thingsVal := *things

			var indexVar string
			var loopStart int
			var loopEnd int
			if len(thingsVal) >= 3 {
				loopStart = toIntInternal(thingsVal[0])
				loopEnd = toIntInternal(thingsVal[1])
				indexVar = thingsVal[2].(string)
			} else if len(thingsVal) == 2 {
				loopStart = toIntInternal(thingsVal[0])
				loopEnd = toIntInternal(thingsVal[1])
			} else if len(thingsVal) == 1 {
				loopEnd = toIntInternal(popT(state.Vals))
				loopStart = toIntInternal(popT(state.Vals))
				indexVar = thingsVal[0].(string)
			} else {
				loopStart = toIntInternal(popT(state.Vals))
				loopEnd = toIntInternal(popT(state.Vals))
			}

			if indexVar != "" {
				state.Vars[indexVar] = -1
			}
			if loopStart < loopEnd {
				theIndex = loopStart - 1
			} else {
				theIndex = loopStart + 1
			}

			var spot = state.I
			var endEach func(state *State) *State
			endEach = func(state *State) *State {
				shouldStop := false

				if loopStart < loopEnd {
					theIndex++
					if theIndex > loopEnd {
						shouldStop = true
					}
				} else {
					theIndex--
					if theIndex < loopEnd {
						shouldStop = true
					}
				}
				if shouldStop {
					state.OneLiner = false
					return state
				} else {
					if indexVar != "" {
						state.Vars[indexVar] = theIndex
						// state.Vars[indexVar] = strconv.Itoa(theIndex)
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
			theIndex := 0
            indexVar, itemVar := getLoopVars(state)

			iterator := makeIterator(popT(state.Vals))
			setLoopVarsInit(state, indexVar, itemVar, theIndex, nil)
			var spot = state.I
			var endEach func(state *State) *State
			endEach = func(state *State) *State {
				theIndex, value, ok := iterator.Next()
				if !ok {
					state.OneLiner = false
					return state
				}
				setLoopVars(state, indexVar, itemVar, theIndex, value)
				state.I = spot
				state.EndStack = append(state.EndStack, endEach)
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
			return state
		},

		// update this so that the "arr" argument
		// is a filename (string)
		// and the looping it does is over each line of the file
		// the indexVar is the line index
		// the itemVar is the string that's the line of the file
		// call the name of the function "fileByLine"
		// Note that you won't loop in this function!
		// the endEach handles the iteration!
		// also use bufio.NewReader cuz I don't know how long each line will be
		"readFileByLine": func(state *State) *State {
			theIndex := 0

			things := getArgs(state)
			thingsVal := *things

			var indexVar string
			var itemVar string

			if len(thingsVal) == 2 {
				indexVar = thingsVal[0].(string)
				itemVar = thingsVal[1].(string)
			} else if len(thingsVal) == 1 {
				itemVar = thingsVal[0].(string)
			}

			// Pop the filename from the stack and open the file
			fileName := popT(state.Vals).(string)
			f, err := os.Open(fileName)
			if err != nil {
				// other idea is go to end
				panic(err)
			}
			reader := bufio.NewReader(f)

			if indexVar != "" {
				state.Vars[indexVar] = theIndex
				// state.Vars[indexVar] = strconv.Itoa(theIndex)
			}
			if itemVar != "" {
				state.Vars[itemVar] = nil
			}

			spot := state.I
			var endFileLine func(state *State) *State
			endFileLine = func(state *State) *State {
				debug("#thistle fileByLine End")
				theIndex++

				line, err := reader.ReadString('\n')
				if err != nil {
					f.Close()
					state.OneLiner = false
					return state
				}
				line = strings.TrimRight(line, "\n")
				if indexVar != "" {
					state.Vars[indexVar] = theIndex
					// state.Vars[indexVar] = strconv.Itoa(theIndex)
				}
				if itemVar != "" {
					state.Vars[itemVar] = line
				} else {
					pushT(state.Vals, line)
				}
				state.I = spot
				debug("#white add end stack end fileByLine")
				state.EndStack = append(state.EndStack, endFileLine)
				return state
			}
			debug("#white add end stack start fileByLine")
			state.EndStack = append(state.EndStack, endFileLine)
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

			// start at 1 and jump to end to force the end check first
			theIndex := 0

			things := getArgs(state)
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
						state.Vars[indexVar] = theIndex + 1
						// state.Vars[indexVar] = strconv.Itoa(theIndex+1)
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

			things := getArgs(state)
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
						state.Vars[indexVar] = theIndex + 1
						// state.Vars[indexVar] = strconv.Itoa(theIndex+1)
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
					r := findMatchingAfter(state, 0, []string{"end", "else if", "else"})
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
		// "end": doEnd,
		"return": func(state *State) *State {
			clearFuncToken(state) // needed?
			if state.CallingParent == nil {
				state.Done = true
			}
			return state.CallingParent
		},
		//
		"go": func(state *State) *State {
			things := getArgs(state)
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

			// newState.Vals = things
			for _, v := range thingsVal {
				newState.Vars[v.(string)] = getVar(state, v.(string))
			}

			// newState.CallingParent = state
			newState.CallingParent = nil
			newState.LexicalParent = state
			newState.OneLiner = state.OneLiner
			newState.IsTopOfOwnGoroutine = true
			newState.Out = state.Out

			if state.OneLiner {
				state.I = findAfterEndLineOnlyLine(state)
				// f.EndI = state.I
				state.OneLiner = false
			} else {
				r := findMatchingAfter(state, 0, []string{"end"})
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
			v := popT(state.Vals)
			newState, ok := v.(*State)
			if !ok {
				fmt.Printf("#orangered error: %T (%v)\n", v, v)
			}
			if newState.Done {
				for _, v := range *newState.Vals {
					pushT(state.Vals, v)
				}
				clearFuncToken(state)
				return state
			} else {
				newState.Waiters = append(newState.Waiters, state)
				clearFuncToken(state)
				return nil
			}
		},
		"cancel": func(state *State) *State {
			newState := popT(state.Vals).(*State)
			newState.Canceled = true
			// TODO, consider every child goroutine should be canceled (ayncParent implementation)
			clearFuncToken(state)
			return state
		},
		"def": func(state *State) *State {
			// params := spliceT(state.Vals, state.FuncTokenSpot+1, len(*state.Vals)-(state.FuncTokenSpot+1), nil)
			ftSpot := state.FuncTokenSpots[len(state.FuncTokenSpots)-1]
			params := spliceT(state.Vals, ftSpot+1, len(*state.Vals)-(ftSpot+1), nil)
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
				r := findMatchingAfter(state, 0, []string{"end"})
				state.I = r.I
				f.EndI = r.I
			}

			// fmt.Printf("found: %q\n", getCode(state)[i:])
			clearFuncToken(state)
			return state
		},
		"func": func(state *State) *State {
			params := getArgs(state)
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
				r := findMatchingAfter(state, 0, []string{"end"})
				state.I = r.I
				f.EndI = r.I
			}

			// close implied parens,
			// TODO REVISIT
			// fmt.Println("#aqua, mode stack down d (func)")
			// state.Mode = state.ModeStack[len(state.ModeStack)-1]
			// state.ModeStack = state.ModeStack[:len(state.ModeStack)-1]
			// state.CurrFuncTokens = state.FuncTokenStack[len(state.FuncTokenStack)-1]
			// state.FuncTokenStack = state.FuncTokenStack[:len(state.FuncTokenStack)-1]
			// state.FuncTokenSpots = state.FuncTokenSpotStack[len(state.FuncTokenSpotStack)-1]
			// state.FuncTokenSpotStack = state.FuncTokenSpotStack[:len(state.FuncTokenSpotStack)-1]

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
		"execShell": func(state *State) *State {
			things := getArgs(state)
			thingsVal := *things
			thingsString := make([]string, len(thingsVal))
			for i, v := range thingsVal {
				thingsString[i] = toStringInternal(v)
			}
			name := thingsString[0]
			var args []string
			if len(thingsString) > 1 {
				args = thingsString[1:]
			}
			cmd := exec.Command(name, args...)
			cmdOutput, err := cmd.Output()
			_ = err
			if err != nil {
				if exitErr, ok := err.(*exec.ExitError); ok {
					fmt.Println("\nExitError:", string(exitErr.Stderr))
				} else {
					fmt.Println("Error:", err)
				}
			}
			pushT(state.Vals, string(cmdOutput))
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
					fmt.Println("\nExitError:", string(exitErr.Stderr))
				} else {
					fmt.Println("Error:", err)
				}
			}
			pushT(state.Vals, string(cmdOutput))
			clearFuncToken(state)
			return state
		},
		"execBashStdout": func(state *State) *State {
		    val := popT(state.Vals).(string)
		    cmd := exec.Command("/bin/bash", "-c", val)
		    stdout, err := cmd.StdoutPipe()
		    if err != nil {
		        fmt.Println("StdoutPipe Error:", err)
		        pushT(state.Vals, nil)
		        clearFuncToken(state)
		        return state
		    }
		    if err := cmd.Start(); err != nil {
		        fmt.Println("Start Error:", err)
		        pushT(state.Vals, nil)
		        clearFuncToken(state)
		        return state
		    }
		    pushT(state.Vals, &Reader{Reader:stdout}) // Push the io.ReadCloser
		    clearFuncToken(state)
		    return state
		},
		// make a version of this that allows a reader too (as another popT)
		// if it's a string then make a new Reader out of the string and make that the Stdin of the command
		// If it's a Reader already then make that the Stdin of the command.
		"execBashStdin": func(state *State) *State {
			input := popT(state.Vals)
			cmdString := popT(state.Vals).(string)
			var stdin io.Reader
			switch v := input.(type) {
			case string:
				stdin = strings.NewReader(v)
			case *Reader:
				stdin = v.Reader
			default:
				panic("unexpected stdin")
			}

			cmd := exec.Command("/bin/bash", "-c", cmdString)
			cmd.Stdin = stdin

			cmdOutput, err := cmd.Output()
			_ = err
			if err != nil {
				if exitErr, ok := err.(*exec.ExitError); ok {
					// extra newline for convenience with cgi, so it's not treated as header
					fmt.Println("\nExitError:", string(exitErr.Stderr))
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
					State:        state,
					ReturnValues: []any{string(b)},
				})
			}()
			clearFuncToken(state)
			return nil
		},
		"readDir": func(state *State) *State {
			dirName := popT(state.Vals).(string)
			var names []string
			entries, err := os.ReadDir(dirName)
			if err != nil {
				if os.IsNotExist(err) {
					pushT(state.Vals, &names)
					clearFuncToken(state)
					return state
				}
				panic(err)
			}
			for _, entry := range entries {
				if entry.Name() != "." && entry.Name() != ".." {
					names = append(names, entry.Name())
				}
			}
			pushT(state.Vals, &names)
			clearFuncToken(state)
			return state
		},
		// todo rename
		"writeFile": func(state *State) *State {
			contents := popT(state.Vals).(string)
			fileName := popT(state.Vals).(string)
			err := os.MkdirAll(filepath.Dir(fileName), os.ModePerm)
			if err != nil {
				panic(err)
			}
			err = os.WriteFile(fileName, []byte(contents), 0644)
			if err != nil {
				panic(err)
			}
			clearFuncToken(state)
			return state
		},
		"waitReadDir": func(state *State) *State {
			timeoutMs := toIntInternal(popT(state.Vals))
			dir := popT(state.Vals).(string)

			watcher, err := fsnotify.NewWatcher()
			if err != nil {
				panic(err)
			}
			defer watcher.Close()

			err = watcher.Add(dir)
			if err != nil {
				panic(err)
			}

			timer := time.NewTimer(time.Duration(timeoutMs) * time.Millisecond)
			defer timer.Stop()

			for {
				select {
				case event, ok := <-watcher.Events:
					if !ok {
						panic(fmt.Errorf("watcher events channel closed"))
					}
					if event.Op&fsnotify.Create == fsnotify.Create {
						fmt.Println("New file detected:", event.Name)
						pushT(state.Vals, event.Name)
					}

				case err, ok := <-watcher.Errors:
					if !ok {
						panic(fmt.Errorf("watcher errors channel closed"))
					}
					panic(fmt.Errorf("watcher error: %w", err))

				case <-timer.C:
					panic(fmt.Errorf("timeout: no file created within %d", timeoutMs))
					return state
				}
			}
			return state

		},
		"gunzip": func(state *State) *State {
			gzippedData := []byte(popT(state.Vals).(string))
			reader, err := gzip.NewReader(bytes.NewReader(gzippedData))
			if err != nil {
				panic(err)
			}
			defer reader.Close()

			var outBuffer bytes.Buffer
			_, err = io.Copy(&outBuffer, reader)
			if err != nil {
				panic(err)
			}

			clearFuncToken(state)
			pushT(state.Vals, outBuffer.String())
			return state
		},
		"appendFile": func(state *State) *State {
			// TODO flow for keeping file open
			contents := popT(state.Vals).(string)
			fileName := popT(state.Vals).(string)
			appendFile(fileName, contents)
			clearFuncToken(state)
			return state
		},
		"appendLine": func(state *State) *State {
			// TODO flow for keeping file open
			contents := popT(state.Vals).(string)
			fileName := popT(state.Vals).(string)
			appendFile(fileName, contents+"\n")
			clearFuncToken(state)
			return state
		},
		"deleteFile": func(state *State) *State {
			fileName := popT(state.Vals).(string)
			err := os.Remove(fileName)
			if err != nil && !os.IsNotExist(err) {
				panic(err)
			}
			clearFuncToken(state)
			return state
		},
		// make something like this chat checks if filename is either a file or dorectory
		// if file return "file", if directory return, "dir"
		// if not exists return ""
		// panic on error
		"fileExists": func(state *State) *State {
			fileName := popT(state.Vals).(string)
			_, err := os.Stat(fileName)
			if err != nil {
				// not a directory when you have a "/suffix" on a regular file
				if os.IsNotExist(err) || strings.Contains(err.Error(), "not a directory") {
					pushT(state.Vals, false)
				} else {
					panic(err)
				}
			} else {
				pushT(state.Vals, true)
			}
			clearFuncToken(state)
			return state
		},
		"isFile": func(state *State) *State {
			fileName := popT(state.Vals).(string)
			info, err := os.Stat(fileName)
			if err != nil {
				// not a directory when you have a "/suffix" on a regular file
				if os.IsNotExist(err) || strings.Contains(err.Error(), "not a directory") {
					pushT(state.Vals, false)
				} else {
					panic(err)
				}
			} else {
				pushT(state.Vals, !info.IsDir())
			}
			clearFuncToken(state)
			return state
		},
		"isDir": func(state *State) *State {
			fileName := popT(state.Vals).(string)
			info, err := os.Stat(fileName)
			if err != nil {
				// not a directory when you have a "/suffix" on a regular file
				if os.IsNotExist(err) || strings.Contains(err.Error(), "not a directory") {
					pushT(state.Vals, false)
				} else {
					panic(err)
				}
			} else {
				pushT(state.Vals, info.IsDir())
			}
			clearFuncToken(state)
			return state
		},
		"isExecutable": func(state *State) *State {
			fileName := popT(state.Vals).(string)
			info, err := os.Stat(fileName)
			if err != nil {
				// not a directory when you have a "/suffix" on a regular file
				if os.IsNotExist(err) || strings.Contains(err.Error(), "not a directory") {
					pushT(state.Vals, false)
				} else {
					panic(err)
				}
			} else {
				mode := info.Mode()
				pushT(state.Vals, mode&0111 != 0)
			}
			clearFuncToken(state)
			return state
		},
		"getFileSize": func(state *State) *State {
			fileName := popT(state.Vals).(string)
			info, err := os.Stat(fileName)
			if err != nil {
				// not a directory when you have a "/suffix" on a regular file
				if os.IsNotExist(err) || strings.Contains(err.Error(), "not a directory") {
					pushT(state.Vals, int64(0))
				} else {
					panic(err)
				}
			} else {
				pushT(state.Vals, info.Size())
			}
			clearFuncToken(state)
			return state
		},
		"sleep":   sleepMs,
		"sleepMs": sleepMs,
		"pause": func(state *State) *State {
			return nil
		},
		"resume": func(state *State) *State {
			things := getArgs(state)
			thingsVal := *things
			state.AddCallback(Callback{
				State:        thingsVal[0].(*State),
				ReturnValues: *slice(things, 2, -1).(*[]any),
			})
			return state
		},
		"eval": func(state *State) *State {
			code := popT(state.Vals).(string)
			// fmt.Println(unsafe.Pointer(&code))
			// if strings come from source then we can cache it, but not worth it
			evalState := MakeState("__eval", code+"\n")
			evalState.Machine = state.Machine
			evalState.Vals = state.Vals
			evalState.Vars = state.Vars

			evalState.CallingParent = state
			evalState.LexicalParent = state
			evalState.Out = state.Out
			// eval(evalState)
			// return state
			clearFuncToken(state)
			return evalState
		},
		"include": func(state *State) *State {
			filename := popT(state.Vals).(string)
			b, err := os.ReadFile(filename)
			if err != nil {
				panic(err)
			}
			evalState := MakeState(filename, string(b))
			evalState.Machine = state.Machine
			evalState.Vals = state.Vals
			evalState.Vars = state.Vars

			evalState.CallingParent = state
			evalState.LexicalParent = state
			evalState.Out = state.Out
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
			say(state.Out, a)
			pushT(state.Vals, a)
			clearFuncToken(state)
			return state
		},
		"call": func(state *State) *State {
			// for i, v := range *state.Vals {
			//     fmt.Printf("#pink val: %d %q\n", i, toString(v))
			// }
			var f func(state *State) *State
			if len(*state.Vals)-state.FuncTokenSpots[len(state.FuncTokenSpots)-1] == 0 {
				f = popT(state.Vals).(func(state *State) *State)
			} else {
				fWrapper := spliceT(state.Vals, state.FuncTokenSpots[len(state.FuncTokenSpots)-1], 1, nil)
				f = (*fWrapper)[0].(func(state *State) *State)
			}
			state.CurrFuncTokens[len(state.CurrFuncTokens)-1] = f
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
		"debugVals": func(state *State) *State {
			for i, v := range *state.Vals {
				fmt.Printf("-->%d: %s\n", i, toString(v))
			}
			clearFuncToken(state)
			return state
		},
		"debugValsLen": func(state *State) *State {
			fmt.Println("#coral val length is", len(*state.Vals))
			clearFuncToken(state)
			return state
		},
		"debugEndStack": func(state *State) *State {
			fmt.Println("#tomato endstack length is", len(state.EndStack))
			clearFuncToken(state)
			return state
		},
		// "writePipe": func(state *State) *State {
		// 	timeoutMs := toIntInternal(popT(state.Vals))
		// 	bufSize := toIntInternal(popT(state.Vals))
		// 	data := popT(state.Vals).(string)
		// 	fifoPath := popT(state.Vals).(string)
		// 	go func() {
		// 		err := writePipe(fifoPath, []byte(data), bufSize, timeoutMs)
		// 		if err != nil {
		// 			log.Println("Error writing:", err)
		// 			if strings.Contains(err.Error(), "timeout") {
		// 				state.AddCallback(Callback{
		// 					State:        state,
		// 					ReturnValues: []any{err == nil},
		// 				})
		// 			} else {
		// 				panic(err)
		// 			}
		// 			return
		// 		}
		// 		state.AddCallback(Callback{
		// 			State:        state,
		// 			ReturnValues: []any{err == nil},
		// 		})
		// 	}()
		// 	clearFuncToken(state)
		// 	return nil
		// },
		// "readPipe": func(state *State) *State {
		// 	timeoutMs := popT(state.Vals).(int)
		// 	bufSize := popT(state.Vals).(int)
		// 	fifoPath := popT(state.Vals).(string)
		// 	go func() {
		// 		b, err := readPipe(fifoPath, bufSize, timeoutMs)
		// 		if err != nil {
		// 			if strings.Contains(err.Error(), "timeout") {
		// 				state.AddCallback(Callback{
		// 					State:        state,
		// 					ReturnValues: []any{""},
		// 				})
		// 			} else {
		// 				panic(err)
		// 			}
		// 			return
		// 		}
		// 		state.AddCallback(Callback{
		// 			State:        state,
		// 			ReturnValues: []any{string(b)},
		// 		})
		// 	}()
		// 	clearFuncToken(state)
		// 	return nil
		// },
	}
	funcBuiltin = builtins["func"]
}

func getArgs(state *State) *[]any {
	ftSpot := state.FuncTokenSpots[len(state.FuncTokenSpots)-1]
	return spliceT(state.Vals, ftSpot, len(*state.Vals)-ftSpot, nil)
}

// createNamedPipe checks if the FIFO exists and creates it if it doesn't.
// func createNamedPipe(fifoPath string) error {
// 	if _, err := os.Stat(fifoPath); os.IsNotExist(err) {
// 		if err := unix.Mkfifo(fifoPath, 0666); err != nil {
// 			return fmt.Errorf("mkfifo: %w", err)
// 		}
// 		fmt.Printf("FIFO created at %s\n", fifoPath)
// 	}
// 	return nil
// }

// writePipe writes the given data to the FIFO located at fifoPath.
// It polls for the FIFO to be writable for up to timeoutMs milliseconds.
// func writePipe(fifoPath string, data []byte, timeoutMs int) error {
// 	// Ensure the FIFO exists.
// 	if err := createNamedPipe(fifoPath); err != nil {
// 		return err
// 	}
//
// 	// Open the FIFO in non-blocking write-only mode.
// 	// this will fail right away if there is no reader?
// 	// fd, err := unix.Open(fifoPath, unix.O_WRONLY|unix.O_NONBLOCK, 0)
//
// 	fd, err := unix.Open(fifoPath, unix.O_WRONLY, 0)
// 	if err != nil {
// 		return fmt.Errorf("fifo open (%s): %w", fifoPath, err)
// 	}
//
// 	defer unix.Close(fd)
//
// 	// Set up the pollfd structure to wait for write readiness.
// 	pfds := []unix.PollFd{
// 		{
// 			Fd:     int32(fd),
// 			Events: unix.POLLOUT,
// 		},
// 	}
//
// 	// Poll for write readiness with the specified timeout.
// 	n, err := unix.Poll(pfds, timeoutMs)
// 	if err != nil {
// 		return fmt.Errorf("poll: %w", err)
// 	}
// 	if n == 0 {
// 		return fmt.Errorf("timeout after %d ms, FIFO not ready for writing", timeoutMs)
// 	}
//
// 	// Write the data to the FIFO.
// 	nWritten, err := unix.Write(fd, data)
// 	if err != nil {
// 		return fmt.Errorf("write: %w", err)
// 	}
// 	if nWritten != len(data) {
// 		return fmt.Errorf("incomplete write: wrote %d bytes, expected %d", nWritten, len(data))
// 	}
//
// 	fmt.Printf("Successfully wrote %d bytes to FIFO.\n", nWritten)
// 	return nil
// }

// the timeoutMs doesn't seem to be respected
// is that because it's in blocking mode?
//
// Yes, you are correct. The issue you're encountering with the `timeoutMs` not being respected is likely because the FIFO is being opened in blocking mode rather than non-blocking mode. When you open a FIFO in blocking mode (i.e., without the `O_NONBLOCK` flag), operations on that FIFO will block until they can proceed. This means that the `Poll` call effectively becomes unnecessary because the write operation won't proceed until the FIFO is ready for writing.
//
// but it fails to open at all if there isn't already a reader when it's in non-blocking mode
//
// When opening a FIFO in non-blocking mode, it will indeed fail if there is no process currently reading from the other end of the FIFO. This is expected behavior, as non-blocking mode is designed to return immediately to indicate the current state without waiting for the resource to become available.
//
// To handle this situation, you can implement a loop to retry opening the FIFO. This loop should check for the specific error and use a backoff strategy (e.g., a short sleep) to repeatedly attempt to open the FIFO, respecting the specified timeout.

// ok can you just modify that code to not poll, but simply write in blocking mode?
//
// Certainly! To modify the function to write in blocking mode without the polling logic, we can simply open the FIFO in blocking mode and directly attempt to write to it. Here's how you can do it:

// writePipe writes the given data to the FIFO located at fifoPath.
// It opens the FIFO in blocking mode and writes the data to it.
// func writePipe(fifoPath string, data []byte) error {
// 	// Ensure the FIFO exists.
// 	if err := createNamedPipe(fifoPath); err != nil {
// 		return err
// 	}
//
// 	// Open the FIFO in blocking write-only mode.
// 	fd, err := unix.Open(fifoPath, unix.O_WRONLY, 0)
// 	if err != nil {
// 		return fmt.Errorf("fifo open (%s): %w", fifoPath, err)
// 	}
// 	defer unix.Close(fd)
//
// 	// Write the data to the FIFO.
// 	nWritten, err := unix.Write(fd, data)
// 	if err != nil {
// 		return fmt.Errorf("write: %w", err)
// 	}
// 	if nWritten != len(data) {
// 		return fmt.Errorf("incomplete write: wrote %d bytes, expected %d", nWritten, len(data))
// 	}
//
// 	fmt.Printf("Successfully wrote %d bytes to FIFO.\n", nWritten)
// 	return nil
// }

// ok scratch that, I want non-blocking,
// but can you do a simple poll on unix.Open
// if we hit timeoutMs, then return the error,
// then when we do the unix.Poll, pass in the remaining timeoutMs
//
// Certainly! To achieve this, you can implement a retry mechanism while trying to open the FIFO in non-blocking mode. If there’s no reader, you keep retrying until the provided timeout is reached. Once the FIFO is opened successfully, you can proceed with the polling and writing logic with the remaining time available.
//
// Here's an updated implementation to handle your requirements:

// writePipe writes the given data to the FIFO located at fifoPath.
// It opens the FIFO in non-blocking mode and writes the data to it, with a timeout.
// func writePipe(fifoPath string, data []byte, bufSize int, timeoutMs int) error {
// 	// Ensure the FIFO exists.
// 	if err := createNamedPipe(fifoPath); err != nil {
// 		return fmt.Errorf("writePipe: create error: %v", err)
// 	}
//
// 	timeout := time.Duration(timeoutMs) * time.Millisecond
// 	deadline := time.Now().Add(timeout)
//
// 	var fd int
// 	var err error
//
// 	// Try to open the FIFO in non-blocking mode until timeout is reached.
// 	for {
// 		// fd, err = unix.Open(fifoPath, unix.O_WRONLY|unix.O_NONBLOCK, 0)
// 		fd, err = unix.Open(fifoPath, unix.O_WRONLY, 0)
// 		if err == nil {
// 			// Successfully opened; exit the loop.
// 			break
// 		}
//
// 		if time.Now().After(deadline) {
// 			return fmt.Errorf("timeout after %d ms while trying to open FIFO: %w", timeoutMs, err)
// 		}
//
// 		// Sleep for a short interval before retrying.
// 		// time.Sleep(50 * time.Millisecond)
// 		time.Sleep(500 * time.Millisecond)
// 	}
//
// 	defer unix.Close(fd)
//
// 	// Calculate remaining timeout for the poll.
// 	remainingMs := int(time.Until(deadline).Milliseconds())
//
// 	if false {
//
// 		// Set up the pollfd structure to wait for write readiness.
// 		pfds := []unix.PollFd{
// 			{
// 				Fd:     int32(fd),
// 				Events: unix.POLLOUT,
// 			},
// 		}
//
// 		// Poll for write readiness with the remaining timeout.
// 		n, err := unix.Poll(pfds, remainingMs)
// 		if err != nil {
// 			return fmt.Errorf("writePipe poll: %w", err)
// 		}
// 		if n == 0 {
// 			return fmt.Errorf("timeout after %d ms, FIFO not ready for writing", timeoutMs)
// 		}
// 	}
//
// 	// Write the data to the FIFO.
//
// 	// fill up the buffer for simplicity, every message takes up buffer size
// 	if len(data) < bufSize {
// 		wrapped := make([]byte, bufSize)
// 		for i := len(data); i < bufSize; i++ {
// 			wrapped[i] = ' '
// 		}
// 		copy(wrapped, data)
// 		data = wrapped
// 	}
//
// 	nWritten, err := unix.Write(fd, data)
// 	if err != nil {
// 		log.Println("writePipe: write error", err)
// 		return fmt.Errorf("write: %w", err)
// 	}
// 	if nWritten != len(data) {
// 		log.Println("writePipe: incomplete error", err)
// 		return fmt.Errorf("incomplete write: wrote %d bytes, expected %d", nWritten, len(data))
// 	}
// 	fmt.Println("successfully wrote", string(data))
// 	return nil
// }

// I sometimes get missed writes??! and no error?
// this code is racey?
//
// Your `writePipe` function seems to be encountering issues with missed writes, but without returning an error. There are several potential reasons for this. Let's go through the code and identify areas that may be contributing to this problem:
//
// 1. **Check for Non-blocking Behavior**:
//    - When you open the FIFO with `O_NONBLOCK`, ensure that the consumer is ready to read from the FIFO. If there's no reader, the writes might fail silently depending on the system's buffering characteristics. It's important to understand how your specific environment handles FIFO in non-blocking mode.
//
// 2. **Handling of Buffered Writes**:
//    - The way the buffer is filled (`wrapped` buffer logic) can potentially cause partial writes if not handled properly. Ensure the consumer handles these 'x' padded data properly indicating end of useful data.
//
// 3. **Concurrency Issues**:
//    - If multiple goroutines are attempting to write to the same FIFO, you might face race conditions where bytes are written by different goroutines to the same FIFO at the same time. Use mutexes (synchronization) to prevent concurrent writes if that's the case.
//
// 4. **Error Handling During Write**:
//    - It's worth logging every time an error occurs without exiting immediately, which can give more detailed insights into why a write might be failing.
//
// 5. **System Specifics**:
//    - The behavior can be different based on the operating system and its handling of FIFOs. For instance, on some systems, writing to a non-blocking FIFO could succeed as long as any bytes were transferred. On others, it might block until all bytes are written, depending on flags.
//
// 6. **Polling for Write Readiness**:
//    - Ensure the `Poll()` function is correctly setting up the poll flags and interpreting the results. Sometimes, subtle differences in how poll readiness is interpreted cause writes to proceed when they shouldn't.
//
// To mitigate these issues, consider these potential solutions:
//
// - Ensure that the reader is ready and consuming from the FIFO before starting the write process.
// - Double-check the error handling and clarify the logging to better understand where the problem might be.
// - Use synchronization techniques such as mutexes if there's any chance multiple writers might attempt to write concurrently.
// - Test this function in a controlled way to isolate the problem (`lsof` can be helpful to check which processes have the FIFO open for reading/writing).
//
// Debugging this kind of issue often involves instrumenting the code with additional logging or running in a debugger to understand precisely how the code path is being executed.
//

// readPipe reads up to bufSize bytes from the FIFO located at fifoPath.
// It polls for the FIFO to have data (readable) for up to timeoutMs milliseconds.
// Returns the read bytes along with any error.
// func readPipe(fifoPath string, bufSize int, timeoutMs int) ([]byte, error) {
// 	// Ensure the FIFO exists.
// 	if err := createNamedPipe(fifoPath); err != nil {
// 		return nil, err
// 	}
//
// 	// Open the FIFO in non-blocking read-only mode.
// 	// fd, err := unix.Open(fifoPath, unix.O_RDONLY|unix.O_NONBLOCK, 0)
// 	fd, err := unix.Open(fifoPath, unix.O_RDONLY, 0)
// 	if err != nil {
// 		return nil, fmt.Errorf("open: %w", err)
// 	}
// 	defer unix.Close(fd)
// 	if false {
// 		// Set up the pollfd structure to wait for read readiness.
// 		pfds := []unix.PollFd{
// 			{
// 				Fd:     int32(fd),
// 				Events: unix.POLLIN,
// 			},
// 		}
//
// 		// Poll for read readiness with the specified timeout.
// 		n, err := unix.Poll(pfds, timeoutMs)
// 		if err != nil {
// 			return nil, fmt.Errorf("poll: %w", err)
// 		}
// 		if n == 0 {
// 			return nil, fmt.Errorf("timeout after %d ms, no data received", timeoutMs)
// 		}
// 	}
//
// 	// Read from the FIFO.
// 	buf := make([]byte, bufSize)
// 	nRead, err := unix.Read(fd, buf)
// 	if err != nil {
// 		return nil, fmt.Errorf("read: %w", err)
// 	}
//
// 	return buf[:nRead], nil
// }

// func main() {
// 	// Set the parameters.
// 	fifoPath := "/path/to/your.fifo"
// 	timeoutMs := 10000 // 10 seconds timeout
// 	bufSize := 256     // Buffer size of 256 bytes
//
// 	// Select the mode: "read" or "write".
// 	mode := "write"
// 	if len(os.Args) > 1 {
// 		mode = os.Args[1]
// 	}
//
// 	switch mode {
// 	case "write":
// 		// Example data to send.
// 		data := []byte("Hello FIFO!")
// 		if err := writeToFIFO(fifoPath, timeoutMs, data); err != nil {
// 			log.Fatal(err)
// 		}
// 	case "read":
// 		data, err := readFromFIFO(fifoPath, timeoutMs, bufSize)
// 		if err != nil {
// 			log.Fatal(err)
// 		}
// 		// Use the returned data as needed.
// 		fmt.Printf("Data read: %s\n", string(data))
// 	default:
// 		log.Fatalf("Invalid mode. Use 'read' or 'write'.")
// 	}
// }

// closures seem to be in par with interfaces
func makeFuncToken(token *Func) func(*State) *State {
	return func(state *State) *State {
		// state.CurrFuncTokens = nil
		// state.FuncTokenSpots = nil
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
		newState.Out = state.Out
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

func at(mySlice any, index any) any {
	switch v := mySlice.(type) {
	case *[]any:
		indexInt := toIntInternal(index)
		if indexInt < 0 {
			return (*v)[len(*v)+indexInt]
		}
		return (*v)[indexInt-1]
	case map[string]any:
		return v[index.(string)]
	case string:
		indexInt := toIntInternal(index)
		if indexInt < 0 {
			return string(v[len(v)+indexInt])
		}
		return string(v[indexInt-1])
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
	// if start < 0 {
	// 	start = len(*s) + start
	// }
	// if start < 0 {
	// 	start = 0
	// }
	// if start > len(*s) {
	// 	start = len(*s)
	// }
	// if deleteCount < 0 {
	// 	deleteCount = 0
	// }
	// if start+deleteCount > len(*s) {
	// 	deleteCount = len(*s) - start
	// }
	removed := make([]any, deleteCount)
	copy(removed, (*s)[start:start+deleteCount])
	*s = append(append((*s)[:start], elementsToAdd...), (*s)[start+deleteCount:]...)
	return &removed
}

func splice(sAny any, start any, end any, elements any) any {
	startInt := toIntInternal(start)
	s := sAny.(*[]any)
	endInt := toIntInternal(end)
	if startInt < 0 {
		startInt = len(*s) + startInt + 1
	}
	if startInt <= 0 {
		startInt = 1
	}
	if startInt > len(*s) {
		startInt = len(*s)
	}
	if endInt < 0 {
		endInt = len(*s) + endInt + 1
	}
	if endInt <= 0 {
		endInt = 1
	}
	if endInt > len(*s) {
		endInt = len(*s)
	}
	if startInt > endInt {
		return nil
	}
	if els, ok := elements.(*[]any); ok {
		return spliceT(s, startInt-1, endInt-startInt+1, els)
	} else {
		return spliceT(s, startInt-1, endInt-startInt+1, nil)
	}
}

func slice(s any, start any, end any) any {
	startInt := toIntInternal(start)
	endInt := toIntInternal(end)
	switch s := s.(type) {
	case *[]any:
		if startInt < 0 {
			startInt = len(*s) + startInt + 1
		}
		if startInt <= 0 {
			startInt = 1
		}
		if startInt > len(*s) {
			startInt = len(*s)
		}
		if endInt < 0 {
			endInt = len(*s) + endInt + 1
		}
		if endInt <= 0 {
			endInt = 1
		}
		if endInt > len(*s) {
			endInt = len(*s)
		}
		if startInt > endInt {
			return nil
		}
		sliced := make([]any, endInt-startInt+1)
		copy(sliced, (*s)[startInt-1:endInt])
		return &sliced
	case string:
		if startInt < 0 {
			startInt = len(s) + startInt + 1
		}
		if startInt <= 0 {
			startInt = 1
		}
		if startInt > len(s) {
			startInt = len(s)
		}
		if endInt < 0 {
			endInt = len(s) + endInt + 1
		}
		if endInt <= 0 {
			endInt = 1
		}
		if endInt > len(s) {
			endInt = len(s)
		}
		if startInt > endInt {
			return ""
		}
		return s[startInt-1 : endInt]
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
		return strings.Index(a, b.(string)) + 1
	}
	return 0
}
func lastIndexOf(a any, b any) any {
	if a, ok := a.(string); ok {
		return strings.LastIndex(a, b.(string)) + 1
	}
	return 0
}

func split(a any, b any) any {
	r := strings.Split(a.(string), b.(string))
	rr := []any{}
	for _, value := range r {
		rr = append(rr, value)
	}
	return &rr
}

func makeMather(fInt func(int, int) any, fFloat func(float64, float64) any, fString func(string, string) any) func(any, any) any {
	return func(a, b any) any {
		switch a := a.(type) {
		case int:
			switch b := b.(type) {
			case int:
				return fInt(a, b)
			case float64:
				return fFloat(float64(a), b)
			case string:
				return fString(strconv.Itoa(a), b)
			case bool:
				var bInt int
				if b {
					bInt = 1
				}
				return fInt(a, bInt)
			case nil:
				return fInt(a, 0)
			default:
				panic("unknown type A")
				return 0
			}
		case float64:
			switch b := b.(type) {
			case int:
				return fFloat(a, float64(b))
			case float64:
				return fFloat(a, b)
			case string:
				return fString(strconv.FormatFloat(a, 'f', -1, 64), b)
			case bool:
				var aInt int
				if a != 0 {
					aInt = 1
				}
				var bInt int
				if b {
					bInt = 1
				}
				return fInt(aInt, bInt)
			case nil:
				return fFloat(a, 0)
			default:
				panic("unknown type B")
				return 0
			}
		case string:
			switch b := b.(type) {
			case int:
				return fString(a, strconv.Itoa(b))
			case float64:
				return fString(a, strconv.FormatFloat(b, 'f', -1, 64))
			case string:
				return fString(a, b)
			case bool:
				var aInt int
				if !Equal(a, "0") {
					aInt = 1
				}
				var bInt int
				if b {
					bInt = 1
				}
				return fInt(aInt, bInt)
			case nil:
				return fString(a, "")
			default:
				panic("unknown type B")
				return 0
			}
		case bool:
			var aInt int
			if a {
				aInt = 1
			}
			switch b := b.(type) {
			case int:
				return fInt(aInt, b)
			case float64:
				var bInt int
				if b != 0 {
					bInt = 1
				}
				return fInt(aInt, bInt)
			case string:
				var aString = "0"
				if a {
					aString = "1"
				}
				return fString(aString, b)
			case bool:
				var bInt int
				if b {
					bInt = 1
				}
				return fInt(aInt, bInt)
			case nil:
				return fInt(aInt, 0)
			default:
				panic("unknown type C")
				return 0
			}
		case nil:
			switch b := b.(type) {
			case int:
				return fInt(0, b)
			case float64:
				return fFloat(0, b)
			case string:
				return fString("", b)
			case bool:
				var bInt int
				if b {
					bInt = 1
				}
				return fInt(0, bInt)
			case nil:
				return fInt(0, 0)
			default:
				panic("unknown type B")
				return 0
			}
		default:
			fmt.Printf("bad type lol mather: %T\n", a)
			panic("unknown type D " + fmt.Sprintf("%T", a))
			return 0
		}
	}
}

// Round function to round a float to the specified number of decimal places
func roundFloat(num float64, places int) float64 {
	scale := math.Pow(10, float64(places))
	return math.Round(num*scale) / scale
}

func round(a, b any) any {
	switch a := a.(type) {
	case int:
		return a
	case float64:
		switch b := b.(type) {
		case int:
			return roundFloat(a, b)
		case float64:
			return roundFloat(a, int(b))
		case string:
			return roundFloat(a, toIntInternal(b))
		default:
			return 0
		}
	case string:
		switch b := b.(type) {
		case int:
			return Round(a, b)
		case float64:
			return Round(a, int(b))
		case string:
			d, _ := strconv.Atoi(b)
			return Round(a, d)
		default:
			return 0
		}
	default:
		fmt.Printf("bad type lol round: %T\n", a)
		return 0
	}
}

var plus = makeMather(
	func(a, b int) any {
		return a + b
	},
	func(a, b float64) any {
		return a + b
	},
	func(a, b string) any {
		return Add(a, b)
	},
)

// minus uses subtraction (calls Subtract for strings)
var minus = makeMather(
	func(a, b int) any {
		return a - b
	},
	func(a, b float64) any {
		return a - b
	},
	func(a, b string) any {
		return Subtract(a, b)
	},
)

var times = makeMather(
	func(a, b int) any {
		return a * b
	},
	func(a, b float64) any {
		return a * b
	},
	func(a, b string) any {
		return Multiply(a, b)
	},
)

var decimalPrecision = 50

// divide uses division (calls Divide for strings)
var divide = makeMather(
	func(a, b int) any {
		// Note: integer division
		if b == 0 {
			// return "division by zero"
			return 0 // ?
		}
		if a%b == 0 {
			return a / b
		}
		return Divide(strconv.Itoa(a), strconv.Itoa(b), decimalPrecision)
	},
	func(a, b float64) any {
		if b == 0 {
			// return "division by zero"
			return 0 // ?
		}
		return a / b
	},
	func(a, b string) any {
		return Divide(a, b, decimalPrecision)
	},
)

// pow uses exponentiation (calls Pow for strings)
var pow = makeMather(
	func(a, b int) any {
		// Simple integer exponentiation. Only for positive exponents.
		if b < 0 {
			return Pow(strconv.Itoa(a), strconv.Itoa(b), decimalPrecision)
		}
		result := 1
		for i := 0; i < b; i++ {
			result *= a
		}
		return result
	},
	func(a, b float64) any {
		return math.Pow(a, b)
	},
	func(a, b string) any {
		return Pow(a, b, decimalPrecision)
	},
)

// mod uses modulo (calls Mod for strings)
var mod = makeMather(
	func(a, b int) any {
		if b == 0 {
			return "modulo by zero"
		}
		return a % b
	},
	func(a, b float64) any {
		if b == 0 {
			return "modulo by zero"
		}
		return math.Mod(a, b)
	},
	func(a, b string) any {
		return Mod(a, b)
	},
)

// lt returns whether a is less than b.
var lt = makeMather(
	func(a, b int) any {
		return a < b
	},
	func(a, b float64) any {
		return a < b
	},
	func(a, b string) any {
		return LessThan(a, b)
	},
)

// gt returns whether a is greater than b.
var gt = makeMather(
	func(a, b int) any {
		return a > b
	},
	func(a, b float64) any {
		return a > b
	},
	func(a, b string) any {
		return GreaterThan(a, b)
	},
)

// lte returns whether a is less than or equal to b.
var lte = makeMather(
	func(a, b int) any {
		return a <= b
	},
	func(a, b float64) any {
		return a <= b
	},
	func(a, b string) any {
		return LessThanOrEqualTo(a, b)
	},
)

// gte returns whether a is greater than or equal to b.
var gte = makeMather(
	func(a, b int) any {
		return a >= b
	},
	func(a, b float64) any {
		return a >= b
	},
	func(a, b string) any {
		return GreaterThanOrEqualTo(a, b)
	},
)

// lt returns whether a is less than b.
var lts = makeMather(
	func(a, b int) any {
		return a < b
	},
	func(a, b float64) any {
		return a < b
	},
	func(a, b string) any {
		return a < b
	},
)

// gt returns whether a is greater than b.
var gts = makeMather(
	func(a, b int) any {
		return a > b
	},
	func(a, b float64) any {
		return a > b
	},
	func(a, b string) any {
		return a > b
	},
)

// lte returns whether a is less than or equal to b.
var ltes = makeMather(
	func(a, b int) any {
		return a <= b
	},
	func(a, b float64) any {
		return a <= b
	},
	func(a, b string) any {
		return a <= b
	},
)

// gte returns whether a is greater than or equal to b.
var gtes = makeMather(
	func(a, b int) any {
		return a >= b
	},
	func(a, b float64) any {
		return a >= b
	},
	func(a, b string) any {
		return a >= b
	},
)

// is returns whether a equals b.
var is = func(a, b any) any {
	return a == b
}
var isnt = func(a, b any) any {
	return a != b
}

// is returns whether a equals b.
var eq = makeMather(
	func(a, b int) any {
		return a == b
	},
	func(a, b float64) any {
		return a == b
	},
	func(a, b string) any {
		return Equal(a, b)
	},
)

// isnt returns whether a is not equal to b.
var neq = makeMather(
	func(a, b int) any {
		return a != b
	},
	func(a, b float64) any {
		return a != b
	},
	func(a, b string) any {
		return !Equal(a, b)
	},
)

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

func toIntInternal(a any) int {
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
func toInt(a any) any {
	return toIntInternal(a)
}

func toFloatInternal(a any) float64 {
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
func toFloat(a any) any {
	return toFloatInternal(a)
}

func not(a any) any {
	// fmt.Printf("not called %T %v\n", a, a)
	switch a := a.(type) {
	case bool:
		return !a
	case int:
		return a == 0
	case float64:
		return a == 0
	case string:
		return a == ""
	case nil:
		return true
	}
	return nil
}

func say(out io.Writer, vals ...any) {
	for i, v := range vals {
		if r, ok := v.(io.Reader); ok {
			buf := make([]byte, 1024)
			for {
				n, err := r.Read(buf)
				if n > 0 {
					out.Write(buf[:n])
					// time.Sleep(2 * time.Second)
				}
				if err != nil {
					break
				}
			}
			if i < len(vals)-1 {
				out.Write([]byte(" "))
			} else {
				out.Write([]byte("\n"))
			}
		} else {
			if i < len(vals)-1 {
				fmt.Fprintf(out, "%s ", toString(v).(string))
			} else {
				fmt.Fprintf(out, "%s\n", toString(v).(string))
			}
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
		if isNumeric(a) {
			return !Equal(a, "0")
		}
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
	return toStringInternal(a)
}
func toStringInternal(a any) string {
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
	case *Reader:
		// TODO: read until a certain threshold,
		// then use files?
		// TODO: if this is part of "say" you can also consider just copying to stdout
		// also execBash family should likely return a Reader.
		b, err := io.ReadAll(a.Reader)
		if err != nil {
			panic(err) // ?
		}
		// "reset" the reader for later use
		// part of the experiment to make readers and strings somewhat interchangeable
		a.Reader = bytes.NewReader(b)

		return string(b)
	default:
		return fmt.Sprintf("toString: unknown type: type is %T, value is %#v\n", a, a)
	}
	return ""
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
	theArr[toIntInternal(b)] = c
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
		theArgs[(i*2)+1] = toString(v).(string)
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

// func executeCGI(scriptPath string, env []string, stdin io.Reader, w http.ResponseWriter) error {
// 	cmd := exec.Command(scriptPath)
// 	cmd.Env = env
// 	cmd.Stdin = stdin
//
// 	var stderr bytes.Buffer
// 	cmd.Stderr = &stderr
//
// 	stdout, err := cmd.StdoutPipe()
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return err
// 	}
//
// 	if err := cmd.Start(); err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return err
// 	}
//
// 	// Copy script output to the response writer
// 	if _, err := io.Copy(w, stdout); err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return err
// 	}
//
// 	if err := cmd.Wait(); err != nil {
// 		http.Error(w, stderr.String(), http.StatusInternalServerError)
// 		return err
// 	}
//
// 	return nil
// }
// This doesn't seem to handle http headers they way I'd
// expect in cgi

func executeCGI(scriptPath string, env []string, stdin io.Reader, w http.ResponseWriter, r *http.Request) error {
	cmd := exec.Command(scriptPath)
	cmd.Env = env

	// start debugging
	inputData, err := io.ReadAll(stdin)
	if err != nil {
		log.Fatalf("Failed to read stdin: %v", err)
	}
	// if r.Method == "POST" {
	//     log.Println("Input:", string(inputData))
	//     log.Println("actual length:", len(inputData))
	//     log.Println("the content length:", r.Header.Get("Content-Length"))
	//     j, _ := json.Marshal(string(inputData))
	//     log.Println("as json:", string(j))
	// }
	newReader := bytes.NewReader(inputData)
	stdin = io.NopCloser(newReader)
	// end debugging

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

	headers := http.Header{}

	reader := bufio.NewReader(stdout)

	// start debugging
	// var buf bytes.Buffer
	// tee := io.TeeReader(reader, &buf)
	// data, _ := io.ReadAll(tee)
	// fmt.Println("here is the data:", string(data))
	// reader = bufio.NewReader(&buf)
	// end debugging

	var theStatus int = 200

	for {
		// cgi technically wants \r\n
		// but I chose to just do \n
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return err
		}
		line = line[0 : len(line)-1] // trim the trailing newline
		if line == "" {
			// fmt.Printf("yay got empty string!")
			// Empty line indicates end of headers
			for key, values := range headers {
				for _, value := range values {
					w.Header().Add(key, value)
				}
			}
			w.WriteHeader(theStatus)
			break
			// continue
		}

		// Process CGI headers
		parts := strings.SplitN(line, ": ", 2)
		if len(parts) != 2 {
			break
		} else {
			headerKey := parts[0]
			headerValue := parts[1]

			// Special handling for "Status" header
			if headerKey == "Status" {
				statusCodeStr := strings.SplitN(headerValue, " ", 2)[0]
				statusCode, err := strconv.Atoi(statusCodeStr)
				if err != nil {
					http.Error(w, "invalid status code", http.StatusInternalServerError)
					return fmt.Errorf("invalid status code: %s", statusCodeStr)
				}
				theStatus = statusCode
			} else {
				headers.Add(headerKey, headerValue)
			}
		}
	}

	// Copy the rest of the output as binary
	io.Copy(w, reader)

	// actually write that reader to a file named "delme_server.gz"
	// in addition to copying to w.
	// f, err := os.Create("delme_server.gz")
	// if err != nil {
	// 	log.Fatal(err)
	// }
	// defer f.Close()
	// multiWriter := io.MultiWriter(w, f)
	// if _, err := io.Copy(multiWriter, reader); err != nil {
	// 	log.Fatal(err)
	// }

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
		// "SCRIPT_NAME="+r.URL.Path,
		// "QUERY_STRING="+r.URL.RawQuery,
		"CONTENT_TYPE="+r.Header.Get("Content-Type"),
		"CONTENT_LENGTH="+r.Header.Get("Content-Length"),
		"REQUEST_URI="+r.RequestURI,
		"REQUEST_URI="+r.RequestURI,
		"LS_EVAL_URL="+cgiUrl+"/__eval",
	)

	// Add additional HTTP headers with "HTTP_" prefix
	for header, values := range r.Header {
		key := "HTTP_" + strings.ReplaceAll(strings.ToUpper(header), "-", "_")
		env = append(env, key+"="+strings.Join(values, ","))
	}

	if err := executeCGI("./index", env, r.Body, w, r); err != nil {
		log.Printf("Error executing CGI script: %v", err)
	}

}

// aren't there a bunch more headers that need to
// be sent as part of cgi spec?
func startCgiServerOld(httpsAddr, httpAddr string) {
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

func startCgiServer(domain, httpsAddr, httpAddr string) {
	state := MakeState("__local", "say hi" + "\n")
	state.Machine = &Machine{
		CallbacksCh: make(chan Callback),
		Index:       0,
	}
	state.IsTopOfOwnGoroutine = true
	state.Out = os.Stdout
	fmt.Fprintf(state.Out, "%s", "testing stdout")
	state.IsMainTop = true

	// see "eval" implementation,
	evalState := MakeState("__stdlib", stdlib + "\n")
	evalState.Machine = state.Machine
	evalState.Vals = state.Vals
	evalState.Vars = state.Vars
	evalState.CallingParent = state
	evalState.Out = state.Out

	Eval(evalState)

	// state := MakeState("__local", "say hiworld; say 200;")
	// state.Machine = &Machine{
	// 	CallbacksCh: make(chan Callback),
	// 	Index:       0,
	// }
	// state.IsTopOfOwnGoroutine = true
	// state.IsMainTop = true
	// state.Out = os.Stdout
 //
	// evalState := MakeState("__stdlib", stdlib + "\n")
	// evalState.Machine = state.Machine
	// evalState.Vals = state.Vals
	// evalState.Vars = state.Vars
	// evalState.CallingParent = state
	// evalState.Out = state.Out
	// go func() {
	// 	fmt.Println("evaling state")
	// 	Eval(evalState)
	// 	fmt.Println("done!")
	// }()
 //
	mux := http.NewServeMux()
	mux.HandleFunc("/", cgiHandler)

	// TODO: permission
	mux.HandleFunc("/__eval", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("#deepskyblue called eval")
		var code string
		if r.Method == "GET" {
			code = r.FormValue("code")
		} else {
			body, _ := io.ReadAll(r.Body)
			code = string(body)
		}
		// see "eval"
		evalState := MakeState("__eval", code+"\n")
		evalState.Machine = state.Machine
		evalState.Vals = state.Vals
		evalState.Vars = state.Vars

		evalState.CallingParent = nil
		evalState.LexicalParent = state
		evalState.Out = w
		evalState.DoneCh = make(chan int)

		state.AddCallback(Callback{
			State:        evalState,
			ReturnValues: []any{},
		})
		time.Sleep(3 * time.Second)
		// evalState.Wait()
		
	})

	m := &autocert.Manager{
		Cache:      autocert.DirCache("certs"),     // Store certificates in a directory
		Prompt:     autocert.AcceptTOS,             // Automatically accept Let's Encrypt TOS
		HostPolicy: autocert.HostWhitelist(domain), // Set allowed domains
	}
	// Serve HTTP (Port 80) and handle Let's Encrypt challenges
	go func() {
		httpSrv := &http.Server{
			Addr: ":80",
			// Handler: m.HTTPHandler(mux), // Wrap the existing mux to handle ACME challenges
			Handler: m.HTTPHandler(nil),
		}
		log.Fatal(httpSrv.ListenAndServe())
	}()

	// Serve HTTPS (Port 443) with TLS using autocert
	httpsSrv := &http.Server{
		Addr:      ":443",
		TLSConfig: &tls.Config{GetCertificate: m.GetCertificate},
		Handler:   mux, // Serve the same handler over HTTPS
	}

	log.Fatal(httpsSrv.ListenAndServeTLS("", ""))
}

func appendFile(fileName, contents string) {
	err := os.MkdirAll(filepath.Dir(fileName), os.ModePerm)
	if err != nil {
		panic(err)
	}
	f, err := os.OpenFile(fileName, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0644)
	if err != nil {
		panic(err)
	}
	defer f.Close()
	if _, err := f.WriteString(contents); err != nil {
		panic(err)
	}
}

func sleepMs(state *State) *State {
	ms := toIntInternal(popT(state.Vals))
	clearFuncToken(state)
	go func() {
		time.Sleep(time.Duration(ms) * time.Millisecond)
		state.AddCallback(Callback{State: state})
	}()
	return nil
}

type Iterable interface{
    Iterator() Iterator
}

type Iterator interface {
    Next() (int, any, bool)
}

type SliceIterator struct {
    Slice []any
    I int // 1 based
}

func makeSliceIterator(theSlice []any) (*SliceIterator) {
    return &SliceIterator{
        Slice: theSlice,
        I: 1,
    }
}

func (s *SliceIterator) Next() (int, any, bool) {
    if s.I <= len(s.Slice) {
        ret := s.Slice[s.I-1]
        i := s.I
        s.I++
        return i, ret, true
    }
    return s.I, nil, false
}

func makeIterator(v any) (Iterator) {
	switch actualArr := v.(type) {
	case *[]any:
		return makeSliceIterator(*actualArr)
	case []any:
		// not a normal case we should get in
		return makeSliceIterator(actualArr)
	default:
	    Iterable, ok := actualArr.(Iterable)
	    if !ok {
	        panic("not eachable")
	    }
	    return Iterable.Iterator()
	}
}


func getLoopVars(state *State) (string, string) {
	things := getArgs(state)
	thingsVal := *things

	var indexVar string
	var itemVar string

	if len(thingsVal) == 2 {
		indexVar = thingsVal[0].(string)
		itemVar = thingsVal[1].(string)
	} else if len(thingsVal) == 1 {
		itemVar = thingsVal[0].(string)
	}
	return indexVar, itemVar
}

func setLoopVarsInit(state *State, indexVar, itemVar string, theIndex int, value any)  {
	if indexVar != "" {
		state.Vars[indexVar] = theIndex
	}
	if itemVar != "" {
		state.Vars[itemVar] = value
	}
}
func setLoopVars(state *State, indexVar, itemVar string, theIndex int, value any)  {
	if indexVar != "" {
		state.Vars[indexVar] = theIndex
	}
	if itemVar != "" {
		state.Vars[itemVar] = value
	} else {
		pushT(state.Vals, value)
	}
}
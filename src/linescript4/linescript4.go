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
// // Using DValue
// func SumAny(a, b DValue) DValue {
//     return a.(int) + b.(int) // Type assertion needed
// }

// after recent tweaks. a way to

// newer version can try more child states, and not so mDValue stacks?
// less performant?

// alternate indention ui for params
// too much caching on GoUpCache (what about dynamic jumps?)
// it, dupit, nowMs don't need to be immediates DValuemore? because of func stack?
// end] // should that work? update: it works now that "end" is am immediate

// DStrings with underlying index
// todo check for dvalue re-wraps, see how we do in Sort
// check ready file bynline?

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
	"sort"

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
	ICache []*ICache
	// TODO check these caches, or combine them ?
	// in a function are they correctly copied?
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

const (
    NullType byte = iota
    IntType
    FloatType
    StringType
    DStringType
    ReaderType
    BoolType
    MapType
    SliceType
    FuncType
    StateType
    AnyType
)
var null = DValue{Type: 0}

type DValue struct {
    Type byte
    Int int
    Float float64
    String string
    DString *DString
    Reader *Reader
    Bool bool
    Map map[string]DValue
    Slice *[]DValue
    ByteSlice []byte
    Func func(state *State) *State
    State *State
    Any any
}
func DValueSlice(s *[]DValue) DValue {
    return DValue{
        Type: SliceType,
        Slice: s,
    }
}
func DValueInt(i int) DValue {
    return DValue{
        Type: IntType,
        Int: i,
    }
}

func DValueNull() DValue {
    return DValue{Type: NullType}
}
func DValueFloat(f float64) DValue {
    return DValue{Type: FloatType, Float: f}
}
func DValueString(s string) DValue {
    return DValue{Type: StringType, String: s}
}
func DValueDString(ds *DString) DValue {
    return DValue{Type: DStringType, DString: ds}
}
func DValueReader(r *Reader) DValue {
    return DValue{Type: ReaderType, Reader: r}
}
func DValueBool(b bool) DValue {
    return DValue{Type: BoolType, Bool: b}
}
func DValueMap(m map[string]DValue) DValue {
    return DValue{Type: MapType, Map: m}
}

func DValueByteSlice(b []byte) DValue {
    return DValue{Type: SliceType, ByteSlice: b}
}
func DValueFunc(f func(state *State) *State) DValue {
    return DValue{Type: FuncType, Func: f}
}
func DValueState(s *State) DValue {
    return DValue{Type: StateType, State: s}
}
func DValueAny(a any) DValue {
    return DValue{Type: AnyType, Any: a}
}





type Callback struct {
	State        *State
	ReturnValues []DValue
}
type Machine struct {
	CallbacksCh chan Callback
	Index       int
}

type DString struct {
    String string
    RecordIndex int
    Record *Record
    SourceI int
    SourceState *State
}


type Record struct {
    Values     []DValue
    KeyToIndex map[string]int
    Keys       []string
}

// NewRecord creates an empty Record ready for Set/Get calls.
func NewRecord() *Record {
    return &Record{
        Values:     make([]DValue, 0),
        KeyToIndex: make(map[string]int),
        Keys:       make([]string, 0),
    }
}

// Set assigns value to key. If key is new, it appends it.
func (r *Record) Set(key string, value DValue) {
    if idx, ok := r.KeyToIndex[key]; ok {
        r.Values[idx] = value
    } else {
        r.Keys = append(r.Keys, key)
        r.Values = append(r.Values, value)
        r.KeyToIndex[key] = len(r.Values) - 1
    }
}
func (r *Record) SetDString(key *DString, value DValue) {
    // if true || key.RecordIndex == -1 {
    if key.RecordIndex == -1 {
        key.RecordIndex = r.SetSeeIndex(key.String, value)
        key.Record = r // likely not used because we set in different spot than get
    } else {
        // fmt.Println("yay set cache ", key.String)
        r.Values[key.RecordIndex] = value
    }
}



// Get returns the value for key. The bool is false if key was not present.
func (r *Record) Get(key string) DValue {
    if idx, ok := r.KeyToIndex[key]; ok {
        return r.Values[idx]
    }
    return null
}

func (r *Record) GetHas(key string) (DValue, bool) {
    if idx, ok := r.KeyToIndex[key]; ok {
        return r.Values[idx], true
    }
    return null, false
}
func (r *Record) GetHasSeeIndex(key string) (DValue, int, bool) {
    if idx, ok := r.KeyToIndex[key]; ok {
        return r.Values[idx], idx, true
    }
    return null, -1, false
}

func (r *Record) SetSeeIndex(key string, value DValue) int {
    if idx, ok := r.KeyToIndex[key]; ok {
        r.Values[idx] = value
        return idx
    }
    // new key
    idx := len(r.Values)
    r.Keys = append(r.Keys, key)
    r.Values = append(r.Values, value)
    r.KeyToIndex[key] = idx
    return idx
}
func (r *Record) GetSeeIndex(key string) (value DValue, idx int) {
    idx, ok := r.KeyToIndex[key]
    if !ok {
        return null, -1
    }
    return r.Values[idx], idx
}

// SetIndex changes the value at the given index. Returns an error if out of range.
func (r *Record) SetIndex(index int, value DValue) {
    if index < 0 || index >= len(r.Values) {
        return
    }
    r.Values[index] = value
}

// GetIndex returns the value at the given index or an error if out of range.
func (r *Record) GetIndex(index int) DValue {
    if index < 0 || index >= len(r.Values) {
        return null
    }
    return r.Values[index]
}

type ICache struct {
    GoUp *int
    FindMatching *FindMatchingResult
    CachedToken *TokenCacheValue
    NextTokenName *string
}

// debate with child states vs different Stacks
// Still have child states
type State struct {
	FileName     string
	I            int
	Code         string
	// TODO: I think we can get rid of Mode and ModeStack
	Mode               string
	ModeStack          []string
	OneLiner           bool
	OneLinerParenLevel int
	
	// todo: caches need to be pointers???
	// also caches are unoptimally as bug as every char in codebase
	// also goUpCache breaks on dynamic jumps
	ICache []*ICache
	DStringCache map[string]*DString
	// CachedTokens []*TokenCacheValue
	// GoUpCache          []*int
	// FindMatchingCache  []*FindMatchingResult
	Vals               *[]DValue
	ValsStack          []*[]DValue
	EndStack           []func(*State) *State
	Vars               *Record
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

		// Preinitializing this makes eval in a loop slower if it doesn't use these
		// though if you eval in a loop with a static string, you should be able to optimize

		Vals:               &[]DValue{},
		// Vals:               &make([]DValue{}, 0, 500),
		ValsStack:          nil,
		EndStack:           nil,
		// Vars:               map[string]DValue{},
		Vars:               NewRecord(),
		DStringCache: make(map[string]*DString),
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
	state.ICache = make([]*ICache, len(code)+2)
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
	evalState.ICache = make([]*ICache, len(stdlib)+2)
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
				pushT(state.Vals, DValueSlice(myArr))
			} else if oldMode == "object" {
				myObj := map[string]DValue{}
				for i := 0; i < len(*state.Vals); i += 2 {
					key := (*state.Vals)[i]
					value := (*state.Vals)[i+1]
					myObj[toStringInternal(key)] = value
				}
				state.Vals = state.ValsStack[len(state.ValsStack)-1]
				state.ValsStack = state.ValsStack[:len(state.ValsStack)-1]

				pushT(state.Vals, DValueMap(myObj))
			}

			continue
		}
		token, _ := nextToken(state)
		
		// #cyan
		// if state.DebugTokens {
		// 	// fmt.Printf("#cyan token: %T %q (%d/%d)\n", token, name, state.I, len(state.Code) - 1)
		// 	appendFile("delme_tokens.txt", fmt.Sprintf("token: %q       %T (%s:%d/%d)\n", name, token, state.FileName, state.I, len(state.Code)-1))
		// }
		// _ = name
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
				state.NewlineSpot = len(*state.Vals)
			}
		case builtinFuncToken:
			state.CurrFuncTokens = append(state.CurrFuncTokens, token)
			state.FuncTokenSpots = append(state.FuncTokenSpots, len(*state.Vals))
			// case builtinToken:
			// ??
		case getVarToken:
			evaled := getVar(state, token)
			pushT(state.Vals, evaled)
		case getVarFuncToken:
			evaledFunc := getVar(state, token).Func
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

		// default:
		case DValue:
			// wow, adding the string, int, float, bool cases
			// made the 1 million item loop in example2.js go from 24xms to 32xms
			// I tried interfaces with a ProcessMethod and that was also slow
			// see jump_alt and jump_table branches
			pushT(state.Vals, token)
			// fmt.Printf("oops type %T\n", token)
				// panic("fail")
		default:
		    panic(fmt.Sprintf("not a dvalue: %s", token))
		}
	}

	return origState
}
// 
// Cleanup this function and hoist hop loop fields in to locals
// 
// Here’s one way to both clean up the giant `Eval` function and pull the “hot” state‐fields into locals on each iteration of the main loop.  We also factor out two of the big inner branches into their own helpers (`popParen` and the “fetch next state” logic).  You can measure before/after to see that you only pay the cost of loading these fields out of the struct once per iteration, instead of multiple times.



func cancel(state *State) {
	state.Done = true
	state.Canceled = true
	fmt.Println("#coral canceling", state.Vars.Get("name"))
	for _, c := range state.AsyncChildren {
		cancel(c)
	}
	state.AsyncChildren = map[int]*State{}
}
func getVar(state *State, varName *DString) DValue {
	parent, v := findParentAndValue(state, varName)
	if parent == nil {
	    panic("var not found: " + varName.String)
	}
	return v
}

func findParentAndValue(state *State, varName *DString) (*Record, DValue) {
	if varName.Record != nil {
        // fmt.Println("yay get cache ", varName.String)
	    return varName.Record, varName.Record.Values[varName.RecordIndex]
	}
	for state != nil {
		v, idx, ok := state.Vars.GetHasSeeIndex(varName.String)
		if ok {
		    varName.Record = state.Vars
		    varName.RecordIndex = idx
		    return state.Vars, v
		}
		state = state.LexicalParent
	}
	return nil, null
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
	// fmt.Println("i:", i, "len", len(state.ICache))
	// if i >= len(state.ICache) {
	//     fmt.Println(state.Code)
	//     panic("fake")
	// }
	if cached := state.ICache[i]; cached != nil && cached.CachedToken != nil {
		state.I = cached.CachedToken.I
		// fmt.Printf("yay cached token %T\n", cached.CachedToken.Token)
		return cached.CachedToken.Token, cached.CachedToken.Name
	}
	// fmt.Println("cache miss")
	token, name, newI := nextTokenRaw(state, code, i)
	state.I = newI
	if state.ICache[i] == nil {
	    state.ICache[i] = &ICache{}
	}
	state.ICache[i].CachedToken = &TokenCacheValue{I: newI, Token: token, Name: name}
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
			case '{', '}', '(', ')', '[', ']', ',', '\n', ';', '|':
				str := string(b)
				return makeToken(state, str), str, i + 1
			case ' ', '\t', '\r':
				continue
			case '"', '\'':
				expectedQuoteEnd := string(code[i])
				end := strings.Index(code[i+1:], expectedQuoteEnd)
				str := code[i+1 : i+1+end]
				return DValueString(str), str, i + 1 + end + 1
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
			case '{', '}', '(', ')', '[', ']', ',', '\n', ';', '|', ':':
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

type getVarFuncToken *DString
// type getVarToken string
type getVarToken *DString
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
	Index int
}

func (r *Reader) Iterator() Iterator {
    return r
}
// could make this separate
func (r *Reader) Next() (DValue, DValue, bool) {
	r.Index++
	buf := make([]byte, 1024)
	n, err := r.Read(buf)
	if err != nil {
		if err == io.EOF {
		} else {
			panic(err)
		}
	}
	// if we get EOF and bytes, must call again. hopefully this simplifies
	return DValueInt(r.Index), DValueByteSlice(buf[0:n]), err == nil || n > 0
}

type Newliner struct {
    Index int
    Reader *bufio.Reader
}
func (n *Newliner) Iterator() Iterator {
    return n
}
// could make this separate
func (n *Newliner) Next() (DValue, DValue, bool) {
	n.Index++
	line, err := n.Reader.ReadString('\n')
	if err != nil {
		if err == io.EOF {
		} else {
			panic(err)
		}
	}
	fmt.Printf("got %q, %v", line, err)
	origLine := line
	line = strings.TrimRight(line, "\n")
	return DValueInt(n.Index), DValueString(line), err == nil || len(origLine) > 0
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
		return builtinFuncToken(b)
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
		// return theString
		// return &DString{String: theString, RecordIndex: -1}
		return DValueDString(GetDString(state, theString))
	}
	if val[len(val)-1] == '.' {
		theString := val[0:len(val)-1]
		// return theString
		// return &DString{String: theString, RecordIndex: -1}
		return DValueDString(GetDString(state, theString))
	}
	if isNumeric(val) {
		if val[len(val)-1:] == "f" {
			val := strings.Replace(val, "_", "", -1)
			f, err := strconv.ParseFloat(val[0:len(val)-1], 64)
			if err != nil {
				panic(err)
			}
			return DValueFloat(f)
		}
		if strings.Contains(val, ".") {
			// return val
			
			val := strings.Replace(val, "_", "", -1)
			f, err := strconv.ParseFloat(val, 64)
			if err != nil {
				panic(err)
			}
			return DValueFloat(f)
		}

		cleanedVal := strings.Replace(val, "_", "", -1)
		i, err := strconv.Atoi(cleanedVal)
		if err != nil {
			return DValueString(val)
		}
		return DValueInt(i)
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

    // dval := &DString{String: val, RecordIndex: -1}
    dval := GetDString(state, val)
	evaled := getVar(state, dval)
	// once a func, always a func
	// but have to eval twice the first round?!
	// TODO: fix the double eval
	// if _, ok := evaled.(func(*State) *State); ok {
	if evaled.Type == FuncType {
		return getVarFuncToken(dval)
	} else {
		// return getVarToken(val)
		return getVarToken(dval)
	}
	panic("no slash?")
	return nil
}

// won't work for keys of different objects
// need to use a map where key is pointer to object
// TODO: maybe remove this?
func GetDString(state *State, name string) *DString {
    // fmt.Println("GetDString")
    if d, ok := state.DStringCache[name]; ok {
        return d
    }
    d := &DString{String: name, RecordIndex: -1}
    state.DStringCache[name] = d
    return d
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
	if c := state.ICache[state.I]; c != nil && c.FindMatching != nil {
		return c.FindMatching.I
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
		if chr == '\n' || chr == ';' || chr == ',' || chr == '|' {
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
	if state.ICache[state.I] == nil {
	    state.ICache[state.I] = &ICache{}
	}
	state.ICache[state.I].FindMatching = ret
	return ret.I
}
func findBeforeEndLineOnlyLine(state *State) int {
	// reusing this helpful cache
	if c := state.ICache[state.I]; c != nil && c.FindMatching != nil {
		return c.FindMatching.I
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
		if chr == '\n' || chr == ';' {
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
	if state.ICache[state.I] == nil {
	    state.ICache[state.I] = &ICache{}
	}
	state.ICache[state.I].FindMatching = ret
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

	if c := state.ICache[state.I]; c != nil && c.FindMatching != nil {
		return c.FindMatching
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
	if state.ICache[state.I] == nil {
	    state.ICache[state.I] = &ICache{}
	}
	state.ICache[state.I].FindMatching = ret
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
			state.Vals = &[]DValue{}
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
			state.Vals = &[]DValue{}
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
				pushT(state.Vals, DValueString(state.Code[state.I+2:state.I+2+end]))
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
				pushT(state.Vals, DValueString(str))
				state.I = r.I
			}
			return state
		},
		"istring": func(state *State) *State {
		    panic("istring feature removed")
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
                    wrapped := `(` + str + `)`
                    // wrapped := str
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
                    // switch s[i] {
                    // case ' ', '\n':
                    //     doAppend(s[start:i])
                    //     start = i
                    //     parseState = "out"
                    // }
                    // change this case to DValuething non alphanumeric and underscore
                    // use simple math for thr ranges, not unicode package

                    switch {
                    case s[i] < '0' ||
                        (s[i] > '9' && s[i] < 'A') ||
                        (s[i] > 'Z' && s[i] < '_') ||
                        (s[i] > '_' && s[i] < 'a') ||
                        s[i] > 'z':
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
			// TODO: we can cache this
			evalState := MakeState("__eval", code+"\n")
			evalState.ICache = make([]*ICache, len(code)+2)
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
		"now":       makeBuiltin_0_1(now),
		"nowMillis": makeBuiltin_0_1(now),
		"nowMs":     makeBuiltin_0_1(now),
		"nowSeconds": makeBuiltin_0_1(func() DValue {
			return DValueInt(int(time.Now().Unix()))
		}),
		"__vals": func(state *State) *State {
			pushT(state.Vals, DValueSlice(state.Vals))
			return state
		},
		"__state": func(state *State) *State {
			pushT(state.Vals, DValueState(state))
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
			if !toBool(v).Bool {
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
			if toBool(v).Bool {
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
			// fmt.Println(" setting NewlineSpot to", oldState.NewlineSpot)
			return state
		},
		";": func(state *State) *State {
			// same as newline
			oldState := state
			state = callFunc(state)
			if oldState == state && oldState.OneLiner {
				state = doEnd(state)
			}
			oldState.NewlineSpot = len(*oldState.Vals)
			return state
		},
		",": func(state *State) *State {
			newState := callFunc(state)
			// we want to set NewlineSpot here? I think not
			state.NewlineSpot = len(*state.Vals)
			state.InCurrentCall = false
			return newState
		},
		":": func(state *State) *State {
			state.OneLiner = true
			state.OneLinerParenLevel = len(state.ModeStack)
			state = callFunc(state)
			// state.OneLiner = false
			return state
		},
		"|": func(state *State) *State {
			state = callFunc(state)
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
			return state
		},
		"end": doEnd,
	}
	builtins = map[string]func(state *State) *State{
		"formatTimestamp": makeBuiltin_2_1(func(m DValue, f DValue) DValue {
			// from unix millis
			t := time.Unix(0, int64(toIntInternal(m))*int64(time.Millisecond))
			formattedTime := t.Format(toStringInternal(f))
			return DValueString(formattedTime)
		}),
		"rfc3339ToUnixMillis": makeBuiltin_1_1(func(s DValue) DValue {
			t, err := time.Parse(time.RFC3339, toStringInternal(s))
			if err != nil {
				panic(err)
			}
			return DValueInt(int(t.UnixNano() / int64(time.Millisecond)))
		}),
		"unixMillisToRfc3339": makeBuiltin_1_1(func(s DValue) DValue {
			ms := toIntInternal(s)
			sec := int64(ms / 1000)
			nsec := int64(ms%1000) * 1000000
			return DValueString(time.Unix(sec, nsec).Format(time.RFC3339))
		}),
		"getType": makeBuiltin_1_1(func(s DValue) DValue {
			return DValueString(fmt.Sprintf("%T", s))
		}),
		"replace": makeBuiltin_3_1(func(s, x, y DValue) DValue {
			return DValueString(strings.Replace(toStringInternal(s), toStringInternal(x), toStringInternal(y), -1))
		}),
		"getEnvVar": makeBuiltin_1_1(func(v DValue) DValue {
			return DValueString(os.Getenv(toStringInternal(v)))
		}),
		"+": makeBuiltin_2_1(plus),
		"-": makeBuiltin_2_1(minus),
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
		"trim": makeBuiltin_1_1(func(a DValue) DValue {
			return DValueString(strings.TrimSpace(toStringInternal(a)))
		}),
		"join": makeBuiltin_2_1(func(a, b DValue) DValue {
			// TODO: allow DValuething to use slice of strings too
			strSlice := make([]string, len(*(a.Slice)))
			for i, v := range *(a.Slice) {
				strSlice[i] = toStringInternal(v)
			}
			return DValueString(strings.Join(strSlice, toStringInternal(b)))
		}),
		"contains": makeBuiltin_2_1(func(a, b DValue) DValue {
			return DValueBool(strings.Contains(toStringInternal(a), toStringInternal(b)))
		}),
		"startsWith": makeBuiltin_2_1(func(a, b DValue) DValue {
			return DValueBool(strings.HasPrefix(toStringInternal(a), toStringInternal(b)))
		}),
		"endsWith": makeBuiltin_2_1(func(a, b DValue) DValue {
			return DValueBool(strings.HasSuffix(toStringInternal(a), toStringInternal(b)))
		}),
		"trimPrefix": makeBuiltin_2_1(func(a, b DValue) DValue {
			return DValueString(strings.TrimPrefix(toStringInternal(a), toStringInternal(b)))
		}),
		"trimSuffix": makeBuiltin_2_1(func(a, b DValue) DValue {
			return DValueString(strings.TrimSuffix(toStringInternal(a), toStringInternal(b)))
		}),
		"upper": makeBuiltin_1_1(func(a DValue) DValue {
			return DValueString(strings.ToUpper(toStringInternal(a)))
		}),
		"lower": makeBuiltin_1_1(func(a DValue) DValue {
			return DValueString(strings.ToLower(toStringInternal(a)))
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
			return say(state, state.Out, thingsVal...)
		},
		"sayRaw": func(state *State) *State {
			v := popT(state.Vals)
			fmt.Fprintf(state.Out, "%v", v)
			return state
		},
		"put":      makeNoop(),
		"push":     makeBuiltin_2_0(push),
		"pushTo":   makeBuiltin_2_0(pushTo),
		"pushm":    makeBuiltin_2_0(pushm),
		"pop":      makeBuiltin_1_1(pop),
		"unshift":  makeBuiltin_2_0(unshift),
		"shift":    makeBuiltin_1_1(shift),
		"setIndex": makeBuiltin_3_0(setIndex),
		"at":       makeBuiltin_2_1(at),
		"in": makeBuiltin_2_1(func(a, b DValue) DValue {
			_, ok := b.Map[toStringInternal(a)]
			return DValueBool(ok)
		}),
		"btoa": makeBuiltin_1_1(func(a DValue) DValue {
		    panic("deprecated")
		}),
		"atob": makeBuiltin_1_1(func(a DValue) DValue {
		    panic("deprecated")
		}),
		"base64Encode": makeBuiltin_1_1(func(a DValue) DValue {
		    panic("deprecated")
		}),
		"base64Decode": makeBuiltin_1_1(func(a DValue) DValue {
		    panic("deprecated")
		}),
		"toBase64": makeBuiltin_1_1(func(a DValue) DValue {
			return DValueString(base64.StdEncoding.EncodeToString([]byte(toStringInternal(a))))
		}),
		"fromBase64": makeBuiltin_1_1(func(a DValue) DValue {
			ret, err := base64.StdEncoding.DecodeString(toStringInternal(a))
			if err != nil {
				panic(err)
			}
			return DValueString(string(ret))
		}),
		"urlEncode": makeBuiltin_1_1(func(a DValue) DValue {
			return DValueString(url.PathEscape(toStringInternal(a)))
		}),
		"rand": makeBuiltin_2_1(func(a, b DValue) DValue {
			min := toIntInternal(a)
			max := toIntInternal(b)
			return DValueInt(rand.Intn(max-min+1) + min)
		}),
		"padLeft": makeBuiltin_3_1(func(s, padChar DValue, length DValue) DValue {
			str := toStringInternal(s)
			pad := toStringInternal(padChar)
			padLength := toIntInternal(length)
			for len(str) < padLength {
				str = pad + str
			}
			return DValueString(str)
		}),
		"padRight": makeBuiltin_3_1(func(s, padChar DValue, length DValue) DValue {
			str := toStringInternal(s)
			pad := toStringInternal(padChar)
			padLength := length.Int
			for len(str) < padLength {
				str = str + pad
			}
			return DValueString(str)
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
		"unquote": makeBuiltin_1_1(func(a DValue) DValue {
			q := toStringInternal(a)
			r, err := strconv.Unquote(q)
			if err != nil {
				panic(err)
			}
			return DValueString(r)
		}),
		"tcpConnect": makeBuiltin_1_1(func(a DValue) DValue {
			conn, err := net.Dial("tcp", toStringInternal(a))
			if err != nil {
				panic(err)
			}
			return DValueAny(conn)
		}),
		"tcpClose": makeBuiltin_1_0(func(a DValue) {
			a.Any.(net.Conn).Close()
		}),
		"tcpWrite": makeBuiltin_2_0(func(a, b DValue) {
			bts := []byte(toStringInternal(b))
			n, err := a.Any.(net.Conn).Write(bts)
			if err != nil {
				panic(err)
			}
			if n != len(bts) {
				panic("short write")
			}
		}),
		"tcpRead": makeBuiltin_2_1(func(a, b DValue) DValue {
			buf := make([]byte, toIntInternal(b))
			n, err := a.Any.(net.Conn).Read(buf)
			if err != nil {
				if err == io.EOF {
				} else {
					panic(err)
				}
			}
			return DValueString(string(buf[:n]))
		}),
		"close": makeBuiltin_1_0(func(a DValue) {
		    if a, ok := a.Any.(io.Closer); ok {
		        a.Close()
		    }
		}),
		// TODO, wrangle the panics
		// maybe don't panic
		"read": makeBuiltin_2_1(func(a, b DValue) DValue {
		    if a, ok := a.Any.(io.Reader); ok {
				buf := make([]byte, toIntInternal(b))
		        n, err := a.Read(buf)
				if err != nil {
					if err == io.EOF {
					} else {
						panic(err)
					}
				}
				return DValueString(string(buf[:n]))
		    }
		    return DValueString("")
		}),
		"write": makeBuiltin_2_0(func(a, b DValue) {
		    if a, ok := a.Any.(io.Writer); ok {
				bts := []byte(toStringInternal(b))
				n, err := a.(net.Conn).Write(bts)
				if err != nil {
					panic(err)
				}
				if n != len(bts) {
					panic("short write")
				}
		    }
		}),
		"fromJson": makeBuiltin_1_1(func(a DValue) DValue {
			panic("need to get this working for dvalue")
			j := toStringInternal(a)
			var r any
			err := json.Unmarshal([]byte(j), &r)
			if err != nil {
				panic(err)
			}
			var recursiveDValues func(any) DValue
			recursiveDValues = func(x any) DValue {
				switch x := x.(type) {
				case []any:
					xNew := make([]DValue, len(x))
					// Recursively process each element
					for i, v := range x {
						xNew[i] = recursiveDValues(v)
					}
					return DValueSlice(&xNew) // Return pointer to the array
				case map[string]any:
					newX := map[string]DValue{}
					for k, v := range x {
						newX[k] = recursiveDValues(v)
					}
					return DValueMap(newX)
				case string:
				    return DValueString(x)
				case float64:
				    return DValueFloat(x)
				case nil:
				    return null
				default:
				    panic("unexpected json type")
				}
			}
			ret := recursiveDValues(r)
			return ret
		}),
		"toJson": makeBuiltin_1_1(func(a DValue) DValue {
			b, err := json.Marshal(a)
			if err != nil {
				panic(err)
			}
			return DValueString(string(b))
		}),
		"toJsonF": makeBuiltin_1_1(func(a DValue) DValue {
			b, err := json.MarshalIndent(a, "", "    ")
			if err != nil {
				panic(err)
			}
			return DValueString(string(b))
		}),
		"exit": func(state *State) *State {
			close(state.Machine.CallbacksCh)
			state.Done = true
			return nil
		},
		"makeObject": func(state *State) *State {
			pushT(state.Vals, DValueMap(map[string]DValue{}))
			return state
		},
		"makeArray": func(state *State) *State {
			pushT(state.Vals, DValueSlice(&[]DValue{}))
			return state
		},
		"incr": func(state *State) *State {
			panic("fix this")
			return state
		},
		"local": func(state *State) *State {
			b := popT(state.Vals)
			a := popT(state.Vals).DString
			state.Vars.SetDString(a, b)
			return state
		},
		"let": func(state *State) *State {
			b := popT(state.Vals)
			a := popT(state.Vals).DString
			parentVars, _ := findParentAndValue(state, a)
			if parentVars == nil {
				parentVars = state.Vars
			}
			parentVars.SetDString(a, b)
			return state
		},
		"=": func(state *State) *State {
		    return builtins["let"](state)
		},
		"as": func(state *State) *State {
		    // Note: we pop b first, then a
		    rawB := popT(state.Vals)
		    rawA := popT(state.Vals)

		    switch rawB.Type {
		    case DStringType:
		        // simple: single variable
		        state.Vars.SetDString(rawB.DString, rawA)
		    case StringType:
		        // simple: single variable
		        state.Vars.Set(rawB.String, rawA)
		    case SliceType:
		        // case: keys are in a []interface{} (each must be a string)
		        aSlice := rawA.Slice
		        for i, keyI := range *(rawB.Slice) {
		            if i < len(*aSlice) {
		                state.Vars.Set(toStringInternal(keyI), (*aSlice)[i])
		            } else {
		                state.Vars.Set(toStringInternal(keyI), null)
		            }
		        }
		    default:
		        panic(fmt.Sprintf("as: unsupported LHS type %T", rawB))
		    }
		    return state
		},


		"goUp": func(state *State) *State {
			locText := toStringInternal(popT(state.Vals))
			indent := getPrevIndent(state)
			if cachedI := state.ICache[state.I]; cachedI != nil && cachedI.GoUp != nil {
				state.I = *cachedI.GoUp
			} else {
				toSearch := "#" + locText
				newI := strings.LastIndex(state.Code[0:state.I], toSearch)
				if state.ICache[state.I] == nil {
				    state.ICache[state.I] = &ICache{}
				}
				state.ICache[state.I].GoUp = &newI
				state.I = newI
			}
			newIndent := getIndent(state, 0)
			count := (len(newIndent) - len(indent)) / 4
			state.EndStack = state.EndStack[:len(state.EndStack)-count]
			return state
		},
		"goDown": func(state *State) *State {
			locText := toStringInternal(popT(state.Vals))
			indent := getPrevIndent(state)
			// assuming static location
			if cachedI := state.ICache[state.I]; cachedI != nil && cachedI.GoUp != nil {
				state.I = *cachedI.GoUp
			} else {
				toSearch := "#" + locText
				newI := strings.Index(state.Code[state.I:], toSearch) + state.I
				if state.ICache[state.I] == nil {
				    state.ICache[state.I] = &ICache{}
				}
				state.ICache[state.I].GoUp = &newI
				state.I = newI
			}
			newIndent := getIndent(state, 0)
			count := (len(indent) - len(newIndent)) / 4
			state.EndStack = state.EndStack[:len(state.EndStack)-count]
			return state
		},
		"forever": func(state *State) *State {
			var spot = state.I
			var endEach func(state *State) *State
			endEach = func(state *State) *State {
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
		"break": func(state *State) *State {
			count := toIntInternal(popT(state.Vals))
			r := findMatchingAfter(state, count, []string{"end"})
			state.I = r.I
			state.EndStack = state.EndStack[:len(state.EndStack)-count]
			return state
		},
		"loop": func(state *State) *State {
			theIndex := 0

			things := getArgs(state)
			thingsVal := *things

			var indexVar *DString
			var loops int
			if len(thingsVal) >= 2 {
				loops = toIntInternal(thingsVal[0])
				indexVar = thingsVal[1].DString
			} else if len(thingsVal) == 1 {
				loops = toIntInternal(popT(state.Vals))
				indexVar = thingsVal[0].DString
			} else {
				loops = toIntInternal(popT(state.Vals))
			}

			if indexVar != nil {
				state.Vars.SetDString(indexVar, DValueInt(-1))
			}
			var spot = state.I
			var endEach func(state *State) *State
			endEach = func(state *State) *State {
				theIndex++
				if theIndex > loops {
					state.OneLiner = false
					return state
				} else {
					if indexVar != nil {
						state.Vars.SetDString(indexVar, DValueInt(theIndex))
						// state.Vars.Set(indexVar.String, theIndex)
					} else {
						pushT(state.Vals, DValueInt(theIndex))
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
			return state
		},
		// inclusive
		"loopRange": func(state *State) *State {
			var theIndex int

			things := getArgs(state)
			thingsVal := *things

			var indexVar *DString
			var loopStart int
			var loopEnd int
			if len(thingsVal) >= 3 {
				loopStart = toIntInternal(thingsVal[0])
				loopEnd = toIntInternal(thingsVal[1])
				indexVar = thingsVal[2].DString
			} else if len(thingsVal) == 2 {
				loopStart = toIntInternal(thingsVal[0])
				loopEnd = toIntInternal(thingsVal[1])
			} else if len(thingsVal) == 1 {
				loopEnd = toIntInternal(popT(state.Vals))
				loopStart = toIntInternal(popT(state.Vals))
				indexVar = thingsVal[0].DString
			} else {
				loopStart = toIntInternal(popT(state.Vals))
				loopEnd = toIntInternal(popT(state.Vals))
			}

			if indexVar != nil {
				state.Vars.SetDString(indexVar, DValueInt(-1))
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
					if indexVar != nil {
						state.Vars.SetDString(indexVar, DValueInt(theIndex))
					} else {
						pushT(state.Vals, DValueInt(theIndex))
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
			return state
		},
		"sort": func(state *State) *State {
			aWrap := popT(state.Vals)
			a := aWrap.Slice
			aVal := *a
			sort.Slice(aVal, func(i, j int) bool {
			    return toStringInternal(aVal[i]) < toStringInternal(aVal[j])
			})
			pushT(state.Vals, aWrap)
			return state
		},
		"each": func(state *State) *State {
			return processLoop(state, nil, nil)
		},
		"map": func(state *State) *State {
			ret := []DValue{}
			return processLoop(state, func(state *State, theIndex DValue, value DValue) {
				ret = append(ret, popT(state.Vals))
			}, func(state *State) {
				pushT(state.Vals, DValueSlice(&ret))
			})
			return state
		},
		"readFileByLine": func(state *State) *State {
			ftSpot := state.FuncTokenSpots[len(state.FuncTokenSpots)-1] - 1
			// fmt.Println("ftspot: ", ftSpot)
			fileName := toStringInternal((*state.Vals)[ftSpot])
			// fmt.Println("filename: ", fileName)
			f, err := os.Open(fileName)
			if err != nil {
				// other idea is go to end
				panic(err)
			}
			reader := bufio.NewReader(f)
			(*state.Vals)[ftSpot] = DValueAny(&Newliner{Reader: reader})
			return processLoop(state, nil, func(state *State) {
			    f.Close()
			})
			return state
		},
		"filter": func(state *State) *State {
			ret := []DValue{}
			return processLoop(state, func(state *State, theIndex DValue, value DValue) {
				v := toBool(popT(state.Vals)).Bool
				if v {
					ret = append(ret, value)
				}
			}, func(state *State) {
				pushT(state.Vals, DValueSlice(&ret))
			})
			return state
		},
		"if": func(state *State) *State {
			debug("#skyblue IF")
			// debugStateI(state, state.I)
			cond := popT(state.Vals)
			if toBool(cond).Bool == true {
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
			return state
		},
		// else was here
		// but needs to be in the immediates
		// "loopN":
		// "end": doEnd,
		"return": func(state *State) *State {
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
			newState.ICache = state.ICache
			newState.I = state.I
			// newState.Vals = state.Vals
			// the vals is of type *[]DValue (in Go)
			// instead of assigning. I want newstate.Vals to be a shallow copy

			// newState.Vals = things
			if len(thingsVal) == 0 {
				// pushT(newState.Vals, popT(state.Vals))
			} else {
				for _, v := range thingsVal {
					newState.Vars.SetDString(v.DString, getVar(state, v.DString))
				}
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
            // In think I want this back on
			// state.AsyncChildren[] = newState
			state.AddCallback(Callback{
				State: newState,
			})
			pushT(state.Vals, DValueState(newState))
			return state
		},
		// todo, also pause/resume as alternative to wait?
		// TODO: cancel
		"wait": func(state *State) *State {
			v := popT(state.Vals)
			newState := v.State
			if newState.Done {
				for _, v := range *newState.Vals {
					pushT(state.Vals, v)
				}
				return state
			} else {
				newState.Waiters = append(newState.Waiters, state)
				return nil
			}
		},
		"cancel": func(state *State) *State {
			newState := popT(state.Vals).State
			newState.Canceled = true
			// TODO, consider every child goroutine should be canceled (ayncParent implementation)
			return state
		},
		"def": func(state *State) *State {
			// params := spliceT(state.Vals, state.FuncTokenSpot+1, len(*state.Vals)-(state.FuncTokenSpot+1), nil)
			ftSpot := state.FuncTokenSpots[len(state.FuncTokenSpots)-1]
			params := spliceT(state.Vals, ftSpot+1, len(*state.Vals)-(ftSpot+1), nil)
			paramStrings := make([]string, len(*params))
			for i, p := range *params {
				paramStrings[i] = toStringInternal(p)
			}
			funcName := toStringInternal(popT(state.Vals))
			f := &Func{
				FileName:          state.FileName,
				I:                 state.I,
				Code:              state.Code,
				ICache:            state.ICache,
				Params:            paramStrings,
				LexicalParent:     state,
				OneLiner:          state.OneLiner,
			}
			stateFunc := makeFuncToken(f)
			state.Vars.Set(funcName, DValueFunc(stateFunc))
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
			return state
		},
		"func": func(state *State) *State {
			params := getArgs(state)
			paramStrings := make([]string, len(*params))
			for i, p := range *params {
				paramStrings[i] = toStringInternal(p)
			}
			f := &Func{
				FileName:          state.FileName,
				I:                 state.I,
				Code:              state.Code,
				ICache:              state.ICache,
				Params:            paramStrings,
				LexicalParent:     state,
				OneLiner:          state.OneLiner,
			}
			stateFunc := makeFuncToken(f)
			pushT(state.Vals, DValueFunc(stateFunc))
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

			return state

		},
		"bashArg": func(state *State) *State {
			arg := toStringInternal(popT(state.Vals))
			modified := "'" + strings.Replace(arg, "'", "'\\''", -1) + "'"
			pushT(state.Vals, DValueString(string(modified)))
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
			pushT(state.Vals, DValueString(string(cmdOutput)))
			return state
		},
		"execBash": func(state *State) *State {
			val := toStringInternal(popT(state.Vals))
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
			pushT(state.Vals, DValueString(string(cmdOutput)))
			return state
		},
		"execBashStdout": func(state *State) *State {
		    val := popTString(state.Vals)
		    cmd := exec.Command("/bin/bash", "-c", val)
		    stdout, err := cmd.StdoutPipe()
		    if err != nil {
		        fmt.Println("StdoutPipe Error:", err)
		        pushT(state.Vals, null)
		        return state
		    }
		    if err := cmd.Start(); err != nil {
		        fmt.Println("Start Error:", err)
		        pushT(state.Vals, null)
		        return state
		    }
		    pushT(state.Vals, DValueReader(&Reader{Reader:stdout})) // Push the io.ReadCloser
		    return state
		},
		// make a version of this that allows a reader too (as another popT)
		// if it's a string then make a new Reader out of the string and make that the Stdin of the command
		// If it's a Reader already then make that the Stdin of the command.
		"execBashStdin": func(state *State) *State {
			input := popT(state.Vals)
			cmdString := popTString(state.Vals)
			var stdin io.Reader
			switch input.Type {
			case StringType:
				stdin = strings.NewReader(input.String)
			case ReaderType:
				stdin = input.Reader
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

			pushT(state.Vals, DValueString(string(cmdOutput)))
			return state
		},

		"execBashCombined": func(state *State) *State {
			val := popTString(state.Vals)
			cmd := exec.Command("/bin/bash", "-c", val)
			cmdOutput, err := cmd.CombinedOutput()
			_ = err
			if err != nil {
				fmt.Println(err)
			}
			pushT(state.Vals, DValueString(string(cmdOutput)))
			return state
		},
		"getEnvVars": func(state *State) *State {
			m := make(map[string]DValue)
			for _, env := range os.Environ() {
				parts := strings.SplitN(env, "=", 2)
				if len(parts) == 2 {
					m[parts[0]] = DValueString(parts[1])
				}
			}
			pushT(state.Vals, DValueMap(m))
			return state
		},
		"readFile": func(state *State) *State {
			fileName := popTString(state.Vals)
			go func() {
				b, err := os.ReadFile(fileName)
				if err != nil {
					panic(err)
				}
				state.AddCallback(Callback{
					State:        state,
					ReturnValues: []DValue{DValueString(string(b))},
				})
			}()
			return nil
		},
		"readDir": func(state *State) *State {
			dirName := popTString(state.Vals)
			names :=[]DValue{}
			entries, err := os.ReadDir(dirName)
			if err != nil {
				if os.IsNotExist(err) {
					pushT(state.Vals, DValueSlice(nil))
					return state
				}
				panic(err)
			}
			for _, entry := range entries {
				if entry.Name() != "." && entry.Name() != ".." {
					names = append(names, DValueString(entry.Name()))
				}
			}
			pushT(state.Vals, DValueSlice(&names))
			return state
		},
		// todo rename
		"writeFile": func(state *State) *State {
			contents := popTString(state.Vals)
			fileName := popTString(state.Vals)
			err := os.MkdirAll(filepath.Dir(fileName), os.ModePerm)
			if err != nil {
				panic(err)
			}
			err = os.WriteFile(fileName, []byte(contents), 0644)
			if err != nil {
				panic(err)
			}
			return state
		},
		"waitReadDir": func(state *State) *State {
			timeoutMs := toIntInternal(popT(state.Vals))
			dir := popTString(state.Vals)

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
						pushT(state.Vals, DValueString(event.Name))
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
			gzippedData := []byte(popTString(state.Vals))
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

			pushT(state.Vals, DValueString(outBuffer.String()))
			return state
		},
		"appendFile": func(state *State) *State {
			// TODO flow for keeping file open
			contents := popTString(state.Vals)
			fileName := popTString(state.Vals)
			appendFile(fileName, contents)
			return state
		},
		"appendLine": func(state *State) *State {
			// TODO flow for keeping file open
			contents := popTString(state.Vals)
			fileName := popTString(state.Vals)
			appendFile(fileName, contents+"\n")
			return state
		},
		"deleteFile": func(state *State) *State {
			fileName := popTString(state.Vals)
			err := os.Remove(fileName)
			if err != nil && !os.IsNotExist(err) {
				panic(err)
			}
			return state
		},
		// make something like this chat checks if filename is either a file or dorectory
		// if file return "file", if directory return, "dir"
		// if not exists return ""
		// panic on error
		"fileExists": func(state *State) *State {
			fileName := popTString(state.Vals)
			_, err := os.Stat(fileName)
			if err != nil {
				// not a directory when you have a "/suffix" on a regular file
				if os.IsNotExist(err) || strings.Contains(err.Error(), "not a directory") {
					pushT(state.Vals, DValueBool(false))
				} else {
					panic(err)
				}
			} else {
				pushT(state.Vals, DValueBool(true))
			}
			return state
		},
		"isFile": func(state *State) *State {
			fileName := popTString(state.Vals)
			info, err := os.Stat(fileName)
			if err != nil {
				// not a directory when you have a "/suffix" on a regular file
				if os.IsNotExist(err) || strings.Contains(err.Error(), "not a directory") {
					pushT(state.Vals, DValueBool(false))
				} else {
					panic(err)
				}
			} else {
				pushT(state.Vals, DValueBool(!info.IsDir()))
			}
			return state
		},
		"isDir": func(state *State) *State {
			fileName := popTString(state.Vals)
			info, err := os.Stat(fileName)
			if err != nil {
				// not a directory when you have a "/suffix" on a regular file
				if os.IsNotExist(err) || strings.Contains(err.Error(), "not a directory") {
					pushT(state.Vals, DValueBool(false))
				} else {
					panic(err)
				}
			} else {
				pushT(state.Vals, DValueBool(info.IsDir()))
			}
			return state
		},
		"isExecutable": func(state *State) *State {
			fileName := popTString(state.Vals)
			info, err := os.Stat(fileName)
			if err != nil {
				// not a directory when you have a "/suffix" on a regular file
				if os.IsNotExist(err) || strings.Contains(err.Error(), "not a directory") {
					pushT(state.Vals, DValueBool(false))
				} else {
					panic(err)
				}
			} else {
				mode := info.Mode()
				pushT(state.Vals, DValueBool(mode&0111 != 0))
			}
			return state
		},
		"getFileSize": func(state *State) *State {
			fileName := popTString(state.Vals)
			info, err := os.Stat(fileName)
			if err != nil {
				// not a directory when you have a "/suffix" on a regular file
				if os.IsNotExist(err) || strings.Contains(err.Error(), "not a directory") {
					pushT(state.Vals, DValueInt(0))
				} else {
					panic(err)
				}
			} else {
				pushT(state.Vals, DValueInt(int(info.Size())))
			}
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
				State:        thingsVal[0].State,
				ReturnValues: *slice(DValueSlice(things), DValueInt(2), DValueInt(-1)).Slice,
			})
			return state
		},
		"eval": func(state *State) *State {
			code := popTString(state.Vals)
			// fmt.Println(unsafe.Pointer(&code))
			// if strings come from source then we can cache it, but not worth it
			evalState := MakeState("__eval", code+"\n")
			evalState.Machine = state.Machine
			evalState.Vals = state.Vals
			evalState.Vars = state.Vars
			evalState.ICache = make([]*ICache, len(code)+2)

			evalState.CallingParent = state
			evalState.LexicalParent = state
			evalState.Out = state.Out
			// eval(evalState)
			// return state
			return evalState
		},
		"include": func(state *State) *State {
			filename := popTString(state.Vals)
			b, err := os.ReadFile(filename)
			if err != nil {
				panic(err)
			}
			evalState := MakeState(filename, string(b) + "\n")
			evalState.Machine = state.Machine
			evalState.Vals = state.Vals
			evalState.Vars = state.Vars
			evalState.ICache = make([]*ICache, len(string(b)) + 2)

			evalState.CallingParent = state
			evalState.LexicalParent = state
			evalState.Out = state.Out
			// eval(evalState)
			// return state
			return evalState
		},
		"dup": func(state *State) *State {
			v := popT(state.Vals)
			pushT(state.Vals, v)
			pushT(state.Vals, v)
			return state
		},
		"drop": func(state *State) *State {
			popT(state.Vals)
			return state
		},
		"swap": func(state *State) *State {
			a := popT(state.Vals)
			b := popT(state.Vals)
			pushT(state.Vals, a)
			pushT(state.Vals, b)
			return state
		},
		"see": func(state *State) *State {
			a := popT(state.Vals)
			say(state, state.Out, a)
			pushT(state.Vals, a)
			return state
		},
		"call": func(state *State) *State {
			// for i, v := range *state.Vals {
			//     fmt.Printf("#pink val: %d %q\n", i, toString(v))
			// }
			var f func(state *State) *State
			if len(*state.Vals)-state.FuncTokenSpots[len(state.FuncTokenSpots)-1] == 0 {
				f = popT(state.Vals).Func
			} else {
				fWrapper := spliceT(state.Vals, state.FuncTokenSpots[len(state.FuncTokenSpots)-1], 1, nil)
				f = (*fWrapper)[0].Func
			}
			state.CurrFuncTokens[len(state.CurrFuncTokens)-1] = f
			newState := callFunc(state)
			return newState
		},
		"clear": func(state *State) *State {
			spliceT(state.Vals, 0, len(*state.Vals), nil)
			return state
		},
		"debugTokensOn": func(state *State) *State {
			state.DebugTokens = true
			return state
		},
		"debugTokensOff": func(state *State) *State {
			state.DebugTokens = false
			return state
		},
		"debugVals": func(state *State) *State {
			for i, v := range *state.Vals {
				fmt.Printf("-->%d: %s\n", i, toString(v))
			}
			return state
		},
		"debugValsLen": func(state *State) *State {
			fmt.Println("#coral val length is", len(*state.Vals))
			return state
		},
		"debugEndStack": func(state *State) *State {
			fmt.Println("#tomato endstack length is", len(state.EndStack))
			return state
		},
	}
	funcBuiltin = builtins["func"]
}

func getArgs(state *State) *[]DValue {
	ftSpot := state.FuncTokenSpots[len(state.FuncTokenSpots)-1]
	return spliceT(state.Vals, ftSpot, len(*state.Vals)-ftSpot, nil)
}


// closures seem to be in par with interfaces
func makeFuncToken(token *Func) func(*State) *State {
	return func(state *State) *State {
		// state.CurrFuncTokens = nil
		// state.FuncTokenSpots = nil
		newState := MakeState(token.FileName, token.Code)
		newState.Machine = state.Machine
		
		newState.ICache = token.ICache
		newState.I = token.I
		newState.Vals = state.Vals
		newState.CallingParent = state
		newState.LexicalParent = token.LexicalParent
		newState.OneLiner = token.OneLiner
		for i := len(token.Params) - 1; i >= 0; i-- {
			param := token.Params[i]
			newState.Vars.Set(param, popT(state.Vals))
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
	if state.CallingParent == nil {
		state.Done = true
	}
	return state.CallingParent
}

func now() DValue {
	return DValueInt(int(time.Now().UnixMilli()))
}

func push(s DValue, value DValue) {
	pushT(s.Slice, value)
}

func pushTo(value DValue, s DValue) {
	pushT(s.Slice, value)
}
func pushT(s *[]DValue, value DValue) {
	*s = append(*s, value)
}

func pushm(s DValue, v DValue) {
	*s.Slice = append(*s.Slice, *v.Slice...)
}

func at(mySlice DValue, index DValue) DValue {
	switch mySlice.Type {
	case SliceType:
		v := mySlice.Slice
		indexInt := toIntInternal(index)
		if indexInt < 0 {
			return (*v)[len(*v)+indexInt]
		}
		return (*v)[indexInt-1]
	case MapType:
		v := mySlice.Map
		return v[toStringInternal(index)]
	case StringType:
		v := mySlice.String
		indexInt := toIntInternal(index)
		if indexInt < 0 {
			return DValueString(string(v[len(v)+indexInt]))
		}
		return DValueString(string(v[indexInt-1]))
	}
	return null
}

func pop(s DValue) DValue {
	return popT(s.Slice)
	return null
}
func popT(s *[]DValue) DValue {
	if len(*s) > 0 {
		val := (*s)[len(*s)-1]
		*s = (*s)[:len(*s)-1]
		return val
	}
	return null
}

func popTString(s *[]DValue) string {
	if len(*s) > 0 {
		val := (*s)[len(*s)-1]
		*s = (*s)[:len(*s)-1]
		return toStringInternal(val)
	}
	return ""
}
func peek(s *[]DValue) DValue {
	val := (*s)[len(*s)-1]
	return val
}

func shift(sV DValue) DValue {
	s := sV.Slice
	if len(*s) > 0 {
		val := (*s)[0]
		*s = (*s)[1:]
		return val
	}
	return null
}

func unshift(s DValue, value DValue) {
	*s.Slice = append([]DValue{value}, *s.Slice...)
}

func spliceT(s *[]DValue, start int, deleteCount int, elements *[]DValue) *[]DValue {
	var elementsToAdd []DValue
	if elements != nil {
		elementsToAdd = *elements
	}
	removed := make([]DValue, deleteCount)
	copy(removed, (*s)[start:start+deleteCount])
	*s = append(append((*s)[:start], elementsToAdd...), (*s)[start+deleteCount:]...)
	return &removed
}

func splice(sAny DValue, start DValue, end DValue, elements DValue) DValue {
	startInt := toIntInternal(start)
	s := sAny.Slice
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
		return null
	}
	return DValueSlice(spliceT(s, startInt-1, endInt-startInt+1, elements.Slice))
}

func slice(s DValue, start DValue, end DValue) DValue {
	startInt := toIntInternal(start)
	endInt := toIntInternal(end)
	switch s.Type {
	case SliceType:
		if startInt < 0 {
			startInt = len(*s.Slice) + startInt + 1
		}
		if startInt <= 0 {
			startInt = 1
		}
		if startInt > len(*s.Slice) {
			startInt = len(*s.Slice)
		}
		if endInt < 0 {
			endInt = len(*s.Slice) + endInt + 1
		}
		if endInt <= 0 {
			endInt = 1
		}
		if endInt > len(*s.Slice) {
			endInt = len(*s.Slice)
		}
		if startInt > endInt {
			return null
		}
		sliced := make([]DValue, endInt-startInt+1)
		copy(sliced, (*s.Slice)[startInt-1:endInt])
		return DValueSlice(&sliced)
	case StringType:
		if startInt < 0 {
			startInt = len(s.String) + startInt + 1
		}
		if startInt <= 0 {
			startInt = 1
		}
		if startInt > len(s.String) {
			startInt = len(s.String)
		}
		if endInt < 0 {
			endInt = len(s.String) + endInt + 1
		}
		if endInt <= 0 {
			endInt = 1
		}
		if endInt > len(s.String) {
			endInt = len(s.String)
		}
		if startInt > endInt {
			return DValueString("")
		}
		return DValueString(s.String[startInt-1 : endInt])
	}
	return null
}

func length(s DValue) DValue {
	switch s.Type {
	case SliceType:
		return DValueInt(len(*s.Slice))
	case StringType:
		return DValueInt(len(s.String))
	}
	return DValueInt(0)
}
func indexOf(a DValue, b DValue) DValue {
	return DValueInt(strings.Index(toStringInternal(a), toStringInternal(b)) + 1)
}
func lastIndexOf(a DValue, b DValue) DValue {
	return DValueInt(strings.LastIndex(toStringInternal(a), toStringInternal(b)) + 1)
}

func split(a DValue, b DValue) DValue {
	r := strings.Split(toStringInternal(a), toStringInternal(b))
	rr := []DValue{}
	for _, value := range r {
		rr = append(rr, DValueString(value))
	}
	return DValueSlice(&rr)
}

// func makeMather(fInt func(int, int) DValue, fFloat func(float64, float64) DValue, fString func(string, string) DValue) func(DValue, DValue) DValue {
// 	return func(a, b DValue) DValue {
// 		switch a.Type {
// 		case IntType:
// 			switch b.Type {
// 			case IntType:
// 				return fInt(a.Int, b.Int)
// 			case FloatType:
// 				return fFloat(float64(a.Int), b.Float)
// 			case StringType:
// 				return fString(strconv.Itoa(a.Int), b.String)
// 			case BoolType:
// 				var bInt int
// 				if b.Int {
// 					bInt = 1
// 				}
// 				return fInt(a.Int, bInt)
// 			case NullType:
// 				return fInt(a.Int, 0)
// 			default:
// 				panic("unknown type A")
// 				return DValueInt(0)
// 			}
//         // Fix everything below here to follow the pattern above
// 		case float64:
// 			switch b := b.(type) {
// 			case int:
// 				return fFloat(a, float64(b))
// 			case float64:
// 				return fFloat(a, b)
// 			case string:
// 				return fString(strconv.FormatFloat(a, 'f', -1, 64), b)
// 			case bool:
// 				var aInt int
// 				if a != 0 {
// 					aInt = 1
// 				}
// 				var bInt int
// 				if b {
// 					bInt = 1
// 				}
// 				return fInt(aInt, bInt)
// 			case nil:
// 				return fFloat(a, 0)
// 			default:
// 				panic("unknown type B")
// 				return 0
// 			}
// 		case string:
// 			switch b := b.(type) {
// 			case int:
// 				return fString(a, strconv.Itoa(b))
// 			case float64:
// 				return fString(a, strconv.FormatFloat(b, 'f', -1, 64))
// 			case string:
// 				return fString(a, b)
// 			case bool:
// 				var aInt int
// 				if !Equal(a, "0") {
// 					aInt = 1
// 				}
// 				var bInt int
// 				if b {
// 					bInt = 1
// 				}
// 				return fInt(aInt, bInt)
// 			case nil:
// 				return fString(a, "")
// 			default:
// 				panic("unknown type B")
// 				return 0
// 			}
// 		case bool:
// 			var aInt int
// 			if a {
// 				aInt = 1
// 			}
// 			switch b := b.(type) {
// 			case int:
// 				return fInt(aInt, b)
// 			case float64:
// 				var bInt int
// 				if b != 0 {
// 					bInt = 1
// 				}
// 				return fInt(aInt, bInt)
// 			case string:
// 				var aString = "0"
// 				if a {
// 					aString = "1"
// 				}
// 				return fString(aString, b)
// 			case bool:
// 				var bInt int
// 				if b {
// 					bInt = 1
// 				}
// 				return fInt(aInt, bInt)
// 			case nil:
// 				return fInt(aInt, 0)
// 			default:
// 				panic("unknown type C")
// 				return 0
// 			}
// 		case nil:
// 			switch b := b.(type) {
// 			case int:
// 				return fInt(0, b)
// 			case float64:
// 				return fFloat(0, b)
// 			case string:
// 				return fString("", b)
// 			case bool:
// 				var bInt int
// 				if b {
// 					bInt = 1
// 				}
// 				return fInt(0, bInt)
// 			case nil:
// 				return fInt(0, 0)
// 			default:
// 				panic("unknown type B")
// 				return 0
// 			}
// 		default:
// 			fmt.Printf("bad type lol mather: %T\n", a)
// 			panic("unknown type D " + fmt.Sprintf("%T", a))
// 			return 0
// 		}
// 	}
// }

func makeMather(
    fInt func(int, int) DValue,
    fFloat func(float64, float64) DValue,
    fString func(string, string) DValue,
) func(DValue, DValue) DValue {
    return func(a, b DValue) DValue {
        switch a.Type {
        case IntType:
            switch b.Type {
            case IntType:
                return fInt(a.Int, b.Int)
            case FloatType:
                return fFloat(float64(a.Int), b.Float)
            case StringType:
                return fString(strconv.Itoa(a.Int), b.String)
            case BoolType:
                bi := 0
                if b.Bool {
                    bi = 1
                }
                return fInt(a.Int, bi)
            case NullType:
                return fInt(a.Int, 0)
            default:
                panic("makeMather: unknown B type in IntType")
            }

        case FloatType:
            switch b.Type {
            case IntType:
                return fFloat(a.Float, float64(b.Int))
            case FloatType:
                return fFloat(a.Float, b.Float)
            case StringType:
                return fString(strconv.FormatFloat(a.Float, 'f', -1, 64), b.String)
            case BoolType:
                bi := 0
                if b.Bool {
                    bi = 1
                }
                return fFloat(a.Float, float64(bi))
            case NullType:
                return fFloat(a.Float, 0)
            default:
                panic("makeMather: unknown B type in FloatType")
            }

        case StringType:
            switch b.Type {
            case IntType:
                return fString(a.String, strconv.Itoa(b.Int))
            case FloatType:
                return fString(a.String, strconv.FormatFloat(b.Float, 'f', -1, 64))
            case StringType:
                return fString(a.String, b.String)
            case BoolType:
                // convert both to int for fInt
                ai := 0
                if a.String != "0" && a.String != "" {
                    ai = 1
                }
                bi := 0
                if b.Bool {
                    bi = 1
                }
                return fInt(ai, bi)
            case NullType:
                return fString(a.String, "")
            default:
                panic("makeMather: unknown B type in StringType")
            }

        case BoolType:
            ai := 0
            if a.Bool {
                ai = 1
            }
            switch b.Type {
            case IntType:
                return fInt(ai, b.Int)
            case FloatType:
                bi := 0
                if b.Float != 0 {
                    bi = 1
                }
                return fInt(ai, bi)
            case StringType:
                // both to string via "0"/"1" then use fString
                aStr := "0"
                if a.Bool {
                    aStr = "1"
                }
                return fString(aStr, b.String)
            case BoolType:
                bi := 0
                if b.Bool {
                    bi = 1
                }
                return fInt(ai, bi)
            case NullType:
                return fInt(ai, 0)
            default:
                panic("makeMather: unknown B type in BoolType")
            }

        case NullType:
            switch b.Type {
            case IntType:
                return fInt(0, b.Int)
            case FloatType:
                return fFloat(0, b.Float)
            case StringType:
                return fString("", b.String)
            case BoolType:
                bi := 0
                if b.Bool {
                    bi = 1
                }
                return fInt(0, bi)
            case NullType:
                return fInt(0, 0)
            default:
                panic("makeMather: unknown B type in NullType")
            }

        default:
            panic(fmt.Sprintf("makeMather: unknown A type %v", a.Type))
        }
    }
}
func roundFloat(num float64, places int) float64 {
	scale := math.Pow(10, float64(places))
	return math.Round(num*scale) / scale
}

var round = makeMather(
	func(a, b int) DValue {
		return DValueInt(a)
	},
	func(a, b float64) DValue {
		return DValueFloat(roundFloat(a, int(b)))
	},
	func(a, b string) DValue {
		bInt, _ := strconv.Atoi(b)
		return DValueString(Round(a, bInt))
	},
)

var plus = makeMather(
	func(a, b int) DValue {
		return DValueInt(a + b)
	},
	func(a, b float64) DValue {
		return DValueFloat(a + b)
	},
	func(a, b string) DValue {
		return DValueString(Add(a, b))
	},
)

// minus uses subtraction (calls Subtract for strings)
var minus = makeMather(
	func(a, b int) DValue {
		return DValueInt(a - b)
	},
	func(a, b float64) DValue {
		return DValueFloat(a - b)
	},
	func(a, b string) DValue {
		return DValueString(Subtract(a, b))
	},
)

var times = makeMather(
	func(a, b int) DValue {
		return DValueInt(a * b)
	},
	func(a, b float64) DValue {
		return DValueFloat(a * b)
	},
	func(a, b string) DValue {
		return DValueString(Multiply(a, b))
	},
)

var decimalPrecision = 50

// divide uses division (calls Divide for strings)
var divide = makeMather(
	func(a, b int) DValue {
		// Note: integer division
		if b == 0 {
			// return DValueInt("division by zero")
			return DValueInt(0) // ?
		}
		if a%b == 0 {
			return DValueInt(a / b)
		}
		// return Divide(strconv.Itoa(a), strconv.Itoa(b), decimalPrecision)
		return DValueFloat(float64(a) / float64(b))
	},
	func(a, b float64) DValue {
		if b == 0 {
			// return "division by zero"
			return DValueFloat(0)
		}
		return DValueFloat(a / b)
	},
	func(a, b string) DValue {
		return DValueString(Divide(a, b, decimalPrecision))
	},
)

// pow uses exponentiation (calls Pow for strings)
var pow = makeMather(
	func(a, b int) DValue {
		// Simple integer exponentiation. Only for positive exponents.
		if b < 0 {
			return DValueFloat(math.Pow(float64(a), float64(b)))
		}
		result := 1
		for i := 0; i < b; i++ {
			result *= a
		}
		return DValueInt(result)
	},
	func(a, b float64) DValue {
		return DValueFloat(math.Pow(a, b))
	},
	func(a, b string) DValue {
		return DValueString(Pow(a, b, decimalPrecision))
	},
)

// mod uses modulo (calls Mod for strings)
var mod = makeMather(
	func(a, b int) DValue {
		if b == 0 {
			return DValueString("modulo by zero")
		}
		return DValueInt(a % b)
	},
	func(a, b float64) DValue {
		if b == 0 {
			return DValueString("modulo by zero")
		}
		return DValueFloat(math.Mod(a, b))
	},
	func(a, b string) DValue {
		return DValueString(Mod(a, b))
	},
)

// lt returns whether a is less than b.
var lt = makeMather(
	func(a, b int) DValue {
		return DValueBool(a < b)
	},
	func(a, b float64) DValue {
		return DValueBool(a < b)
	},
	func(a, b string) DValue {
		return DValueBool(LessThan(a, b))
	},
)

// gt returns whether a is greater than b.
var gt = makeMather(
	func(a, b int) DValue {
		return DValueBool(a > b)
	},
	func(a, b float64) DValue {
		return DValueBool(a > b)
	},
	func(a, b string) DValue {
		return DValueBool(GreaterThan(a, b))
	},
)

// lte returns whether a is less than or equal to b.
var lte = makeMather(
	func(a, b int) DValue {
		return DValueBool(a <= b)
	},
	func(a, b float64) DValue {
		return DValueBool(a <= b)
	},
	func(a, b string) DValue {
		return DValueBool(LessThanOrEqualTo(a, b))
	},
)

// gte returns whether a is greater than or equal to b.
var gte = makeMather(
	func(a, b int) DValue {
		return DValueBool(a >= b)
	},
	func(a, b float64) DValue {
		return DValueBool(a >= b)
	},
	func(a, b string) DValue {
		return DValueBool(GreaterThanOrEqualTo(a, b))
	},
)

// lt returns whether a is less than b.
var lts = makeMather(
	func(a, b int) DValue {
		return DValueBool(a < b)
	},
	func(a, b float64) DValue {
		return DValueBool(a < b)
	},
	func(a, b string) DValue {
		return DValueBool(a < b)
	},
)

// gt returns whether a is greater than b.
var gts = makeMather(
	func(a, b int) DValue {
		return DValueBool(a > b)
	},
	func(a, b float64) DValue {
		return DValueBool(a > b)
	},
	func(a, b string) DValue {
		return DValueBool(a > b)
	},
)

// lte returns whether a is less than or equal to b.
var ltes = makeMather(
	func(a, b int) DValue {
		return DValueBool(a <= b)
	},
	func(a, b float64) DValue {
		return DValueBool(a <= b)
	},
	func(a, b string) DValue {
		return DValueBool(a <= b)
	},
)

// gte returns whether a is greater than or equal to b.
var gtes = makeMather(
	func(a, b int) DValue {
		return DValueBool(a >= b)
	},
	func(a, b float64) DValue {
		return DValueBool(a >= b)
	},
	func(a, b string) DValue {
		return DValueBool(a >= b)
	},
)

// is returns whether a equals b.
var is = func(a, b DValue) DValue {
	// TODO, cases fod Map and slice?
	return DValueBool(toStringInternal(a) == toStringInternal(b))
}


var isnt = func(a, b DValue) DValue {
	return DValueBool(toStringInternal(a) != toStringInternal(b))
}

// is returns whether a equals b.
var eq = makeMather(
	func(a, b int) DValue {
		return DValueBool(a == b)
	},
	func(a, b float64) DValue {
		return DValueBool(a == b)
	},
	func(a, b string) DValue {
		return DValueBool(Equal(a, b))
	},
)

// isnt returns whether a is not equal to b.
var neq = makeMather(
	func(a, b int) DValue {
		return DValueBool(a != b)
	},
	func(a, b float64) DValue {
		return DValueBool(a != b)
	},
	func(a, b string) DValue {
		return DValueBool(!Equal(a, b))
	},
)

func cc(a, b DValue) DValue {
	if a.Type == SliceType && b.Type == SliceType {
		result := append([]DValue{}, (*a.Slice)...)
		result = append(result, (*b.Slice)...)
		return DValueSlice(&result)
	}

	return DValueString(toStringInternal(a) + toStringInternal(b))
}

func toIntInternal(a DValue) int {
	switch a.Type {
	case BoolType:
		if a.Bool {
			return 1
		}
		return 0
	case FloatType:
		return int(math.Floor(a.Float))
	case IntType:
		return a.Int
	case StringType:
		if f, err := strconv.ParseFloat(a.String, 64); err == nil {
			return int(math.Floor(f))
		}
		return 0
	}
	return 0
}
func toInt(a DValue) DValue {
	return DValueInt(toIntInternal(a))
}



func toFloatInternal(a DValue) float64 {
	switch a.Type {
	case BoolType:
		if a.Bool {
			return 1
		}
		return 0
	case IntType:
		return float64(a.Int)
	case FloatType:
		return a.Float
	case StringType:
		if f, err := strconv.ParseFloat(a.String, 64); err == nil {
			return f
		}
		return 0
	}
	return 0
}
func toFloat(a DValue) DValue {
	return DValueFloat(toFloatInternal(a))
}
func notInternal(a DValue) bool {
	switch a.Type {
	case BoolType:
		return !a.Bool
	case IntType:
		return a.Int == 0
	case FloatType:
		return a.Float == 0
	case StringType:
		return a.String == ""
	case NullType:
		return true
	}
	return false
}
func not(a DValue) DValue {
	return DValueBool(notInternal(a))
}

// Please change the toBool and ToString family
// of finctions to be like thenones above


// func toString(a DValue) DValue {
// 	return toStringInternal(a)
// }
// func toStringInternal(a DValue) string {
// 	switch a := a.(type) {
// 	case string:
// 		return a
// 	case *DString:
// 		return a.String
// 	case map[string]DValue:
// 		jsonData, err := json.MarshalIndent(a, "", "    ")
// 		if err != nil {
// 			// panic(err)
// 			return fmt.Sprintf("%#v", a)
// 		} else {
// 			return string(jsonData)
// 		}
// 	case *[]DValue, []DValue:
// 		jsonData, err := json.MarshalIndent(a, "", "    ")
// 		if err != nil {
// 			// panic(err)
// 			return fmt.Sprintf("%#v", a)
// 			// return string(jsonData)
// 		} else {
// 			return string(jsonData)
// 		}
// 	case int:
// 		return strconv.Itoa(a)
// 	case int64:
// 		return strconv.Itoa(int(a))
// 	case float64:
// 		return strconv.FormatFloat(a, 'f', -1, 64)
// 	case bool:
// 		if a {
// 			return "true"
// 		}
// 		return "false"
// 	case nil:
// 		return "<nil>"
// 	case *Func:
// 		if a == nil {
// 			return "<nil func>"
// 		}
// 		if a.Builtin != nil {
// 			return fmt.Sprintf("builtin %s (native code)\n", a.Name)
// 		} else {
// 			return fmt.Sprintf("func(%t) %v: %s", a.OneLiner, a.Params, a.Code[a.I:a.EndI])
// 		}
// 	case func(*State) State:
// 		// todo use unsafe ptr to see what it is
// 		return "a func, immediate"
// 	// case *RunImmediate:
// 	//     if a == nil {
// 	//         return "<nil func>"
// 	//     }
// 	//        return a.Name
// 	case *Reader:
// 		// TODO: read until a certain threshold,
// 		// then use files?
// 		// TODO: if this is part of "say" you can also consider just copying to stdout
// 		// also execBash family should likely return a Reader.
// 		b, err := io.ReadAll(a.Reader)
// 		if err != nil {
// 			panic(err) // ?
// 		}
// 		// "reset" the reader for later use
// 		// part of the experiment to make readers and strings somewhat interchangeable
// 		a.Reader = bytes.NewReader(b)
// 
// 		return string(b)
// 	default:
// 		return fmt.Sprintf("toString: unknown type: type is %T, value is %#v\n", a, a)
// 	}
// 	return ""
// }

func toBoolInternal(a DValue) bool {
	switch a.Type {
	case BoolType:
		return a.Bool
	case IntType:
		return a.Int != 0
	case FloatType:
		return a.Float != 0
	case StringType:
		if isNumeric(a.String) {
			return !Equal(a.String, "0")
		}
		return a.String != ""
	case NullType:
		return false
	case FuncType:
		return a.Func != nil
	default:
		return true
	}
}
func toBool(a DValue) DValue {
	return DValueBool(toBoolInternal(a))
}

func toStringInternal(a DValue) string {
	switch a.Type {
	case StringType:
		return a.String
	case IntType:
		return strconv.Itoa(a.Int)
	case FloatType:
		return strconv.FormatFloat(a.Float, 'f', -1, 64)
	case BoolType:
		if a.Bool {
			return "true"
		}
		return "false"
	case NullType:
		return "<nil>"
	case MapType:
		jsonData, err := json.MarshalIndent(a.Map, "", "    ")
		if err != nil {
			return fmt.Sprintf("%#v", a.Map)
		}
		return string(jsonData)
	case SliceType:
		jsonData, err := json.MarshalIndent(a.Slice, "", "    ")
		if err != nil {
			return fmt.Sprintf("%#v", a.Slice)
		}
		return string(jsonData)
	// case FuncType:
	// 	if a.Func == nil {
	// 		return "<nil func>"
	// 	}
	// 	if a.Func.Builtin != nil {
	// 		return fmt.Sprintf("builtin %s (native code)\n", a.Func.Name)
	// 	}
	// 	return fmt.Sprintf("func(%t) %v: %s", a.Func.OneLiner, a.Func.Params, a.Func.Code[a.Func.I:a.Func.EndI])
	// case ReaderType:
	// 	b, err := io.ReadAll(a.Reader)
	// 	if err != nil {
	// 		panic(err)
	// 	}
	// 	a.Reader = bytes.NewReader(b)
	// 	return string(b)
	default:
		return fmt.Sprintf("toString: unknown type: %v, value is %#v\n", a.Type, a)
	}
}
func toString(a DValue) DValue {
	return DValueString(toStringInternal(a))
}


func say(state *State, out io.Writer, vals ...DValue) *State {
	for i, v := range vals {
		if v.Type == ReaderType {
			r := v.Reader
			buf := make([]byte, 1024)
			
			go func() {
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
				state.AddCallback(Callback{
				    State: state,
				    ReturnValues: []DValue{},
				})
			}()
			return nil
		} else {
			if i < len(vals)-1 {
				fmt.Fprintf(out, "%s ", toStringInternal(v))
			} else {
				fmt.Fprintf(out, "%s\n", toStringInternal(v))
			}
		}
	}
	return state
}



func keys(a DValue) DValue {
	ret := []DValue{}
	for k := range a.Map {
		ret = append(ret, DValueString(k))
	}
	return DValueSlice(&ret)
}
func setProp(a, b, c DValue) {
	a.Map[toStringInternal(b)] = c
}
func setIndex(a, b, c DValue) {
	theArrPointer := a.Slice
	theArr := *theArrPointer
	theArr[toIntInternal(b)] = c
}
func setPropVKO(v, k, o DValue) {
	o.Map[toStringInternal(k)] = v
}
func getProp(a, b DValue) DValue {
	return a.Map[toStringInternal(b)]
}
func getPropKO(k, o DValue) DValue {
	return o.Map[toStringInternal(k)]
}
func deleteProp(a, b DValue) {
	delete(a.Map, toStringInternal(b))
}

func makeNoop() func(state *State) *State {
	return func(state *State) *State {
		return state
	}
}
func makeBuiltin_0_0(f func()) func(state *State) *State {
	return func(state *State) *State {
		f()
		return state
	}
}
func makeBuiltin_1_0(f func(DValue)) func(state *State) *State {
	return func(state *State) *State {
		a := popT(state.Vals)
		f(a)
		return state
	}
}
func makeBuiltin_2_0(f func(DValue, DValue)) func(state *State) *State {
	return func(state *State) *State {
		b := popT(state.Vals)
		a := popT(state.Vals)
		f(a, b)
		return state
	}
}
func makeBuiltin_3_0(f func(DValue, DValue, DValue)) func(state *State) *State {
	return func(state *State) *State {
		c := popT(state.Vals)
		b := popT(state.Vals)
		a := popT(state.Vals)
		f(a, b, c)
		return state
	}
}
func makeBuiltin_0_1(f func() DValue) func(state *State) *State {
	return func(state *State) *State {
		pushT(state.Vals, f())
		return state
	}
}
func makeBuiltin_1_1(f func(DValue) DValue) func(state *State) *State {
	return func(state *State) *State {
		a := popT(state.Vals)
		pushT(state.Vals, f(a))
		return state
	}
}
func makeBuiltin_2_1(f func(DValue, DValue) DValue) func(state *State) *State {
	return func(state *State) *State {
		b := popT(state.Vals)
		a := popT(state.Vals)
		pushT(state.Vals, f(a, b))
		return state
	}
}
func makeBuiltin_3_1(f func(DValue, DValue, DValue) DValue) func(state *State) *State {
	return func(state *State) *State {
		c := popT(state.Vals)
		b := popT(state.Vals)
		a := popT(state.Vals)
		pushT(state.Vals, f(a, b, c))
		return state
	}
}
func makeBuiltin_4_1(f func(DValue, DValue, DValue, DValue) DValue) func(state *State) *State {
	return func(state *State) *State {
		d := popT(state.Vals)
		c := popT(state.Vals)
		b := popT(state.Vals)
		a := popT(state.Vals)
		pushT(state.Vals, f(a, b, c, d))
		return state
	}
}

func endIf(state *State) *State {
	debug("#darkkhaki if End")
	state.OneLiner = false
	return state
}

func interpolate(a, b DValue) DValue {
	theString := toStringInternal(a)
	theMap := b.Map
	theArgs := make([]string, len(theMap)*2)
	i := 0
	for k, v := range theMap {
		theArgs[i*2] = k
		theArgs[(i*2)+1] = toStringInternal(v)
		i++
	}
	r := strings.NewReplacer(theArgs...)
	return DValueString(r.Replace(theString))
}

var variableRe = regexp.MustCompile(`\$[a-zA-Z_][a-zA-Z0-9_]*`)


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
what about performance, extra hops? the satellites can run arbitrary scripts statellites have a cgi-bin directory and DValuething there can be run as cgi
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
	// TODO: add Icache
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
	evalState.ICache = make([]*ICache, len(stdlib)+2)
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
		evalState.ICache = make([]*ICache, len(code)+2)
		evalState.Machine = state.Machine
		evalState.Vals = state.Vals
		evalState.Vars = state.Vars

		evalState.CallingParent = nil
		evalState.LexicalParent = state
		evalState.Out = w
		evalState.DoneCh = make(chan int)

		state.AddCallback(Callback{
			State:        evalState,
			ReturnValues: []DValue{},
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
    Next() (DValue, DValue, bool)
}

type SliceIterator struct {
    Slice []DValue
    I int // 1 based
}
type MapIterator struct {
    Map map[string]DValue
    Keys []string
    I int // 1 based
}

func makeSliceIterator(theSlice []DValue) (*SliceIterator) {
    return &SliceIterator{
        Slice: theSlice,
        I: 1,
    }
}
func makeMapIterator(theMap map[string]DValue) (*MapIterator) {
    keys := make([]string, len(theMap))
    i := 0
    for k, _ := range theMap {
        keys[i] = k
        i ++
    }
    sort.Strings(keys)
    return &MapIterator{
        Map: theMap,
        Keys: keys,
        I: 1,
    }
}

func (s *SliceIterator) Next() (DValue, DValue, bool) {
    if s.I <= len(s.Slice) {
        ret := s.Slice[s.I-1]
        i := s.I
        s.I++
        return DValueInt(i), ret, true
    }
    return DValueInt(s.I), null, false
}
func (s *MapIterator) Next() (DValue, DValue, bool) {
    if s.I <= len(s.Keys) {
        key := s.Keys[s.I-1]
        s.I++
        value := s.Map[key]
        return DValueString(key), value, true
    }
    return null, null, false
}

func makeIterator(v DValue) (Iterator) {
	switch v.Type {
	case SliceType:
		return makeSliceIterator(*v.Slice)
	case MapType:
		return makeMapIterator(v.Map)
	default:
	    Iterable, ok := v.Any.(Iterable)
	    if !ok {
	        panic("not eachable")
	    }
	    return Iterable.Iterator()
	}
}


func getLoopVars(state *State) (*DString, *DString) {
	things := getArgs(state)
	thingsVal := *things

	var indexVar *DString
	var itemVar *DString

	if len(thingsVal) == 2 {
		indexVar = thingsVal[0].DString
		itemVar = thingsVal[1].DString
	} else if len(thingsVal) == 1 {
		itemVar = thingsVal[0].DString
	}
	return indexVar, itemVar
}

func setLoopVarsInit(state *State, indexVar, itemVar *DString, theIndex, value DValue)  {
	if indexVar != nil {
		state.Vars.SetDString(indexVar, theIndex)
	}
	if itemVar != nil {
		state.Vars.SetDString(itemVar, value)
	}
}
func setLoopVars(state *State, indexVar, itemVar *DString, theIndex, value DValue)  {
	if indexVar != nil {
		state.Vars.SetDString(indexVar, theIndex)
	}
	if itemVar != nil {
		state.Vars.SetDString(itemVar,  value)
	} else {
		// fmt.Println("pushing", value)
		pushT(state.Vals, value)
		state.NewlineSpot = len(*state.Vals)
	}
}

func processLoop(state *State, process func(*State, DValue, DValue), onEnd func(state *State)) *State {
	var theIndex DValue = null // 1 based so we start less than 1
    indexVar, itemVar := getLoopVars(state)

	iterator := makeIterator(popT(state.Vals))
	setLoopVarsInit(state, indexVar, itemVar, theIndex, null)
	var spot = state.I
	var endEach func(state *State) *State
	var value DValue
	var ok bool
	endEach = func(state *State) *State {
        if theIndex.Type == NullType && process != nil {
		    process(state, theIndex, value)
        }
		theIndex, value, ok = iterator.Next()
		if !ok {
			state.OneLiner = false
			if onEnd != nil {
			    onEnd(state)
			}
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
}



// update this code so that instead of using "DValue" everywhere
// it uses a Value type
// Value is defined as
// type Value struct {
//     Type byte // (type tag, 0 for nil, 1 for int etc)
//     Int int
//     Float float64
//     String string
//     DString *DString
//     Reader *Reader
//     Bool bool
//     Map map[string]Value
//     Slice *[]Value
// }
// please give me all changes to make












/*
Do you see DValue low hanging fruit performance optimizations that can be made here?
Specifically with the flow of Eval function

Here are a few small changes you can make today that will measurably speed up your Eval loop without rewriting the whole VM.

1) Hoist hot‐loop fields into locals  
   Every time through your `for` you do a dozen `state.xxx` loads.  The Go compiler can only hoist so much for you.  Pull the really hot ones into locals at the top of the loop and write them back only when they change.  
   
   ```go
   evalLoop:
   for {
     icache    := state.ICache
     vals      := state.Vals
     funcs     := state.CurrFuncTokens
     funcSpots := state.FuncTokenSpots
     // … now use icache, vals, funcs, funcSpots in this iteration
     // when you mutate them write back:
     state.Vals               = vals
     state.CurrFuncTokens     = funcs
     state.FuncTokenSpots     = funcSpots
     // etc.
   }
   ```
   You’ll eliminate a lot of pointer dereferences and bounds‐checks.

2) Don’t return the token name from nextToken  
   You only use the name in debug mode.  Change  
   ```go
   func nextToken(state *State) (DValue, string)
   ```  
   to  
   ```go
   func nextToken(state *State) DValue
   ```  
   and have a separate debug method to peek at the string.  You’ll save an allocation or copy on every token.

3) Collapse the interface type‐switch on token  
   Right now you do  
   ```go
   switch token := token.(type) {
   case immediateToken: …
   case builtinFuncToken: …
   case getVarToken: …
   case getVarFuncToken: …
   default: pushT(...)
   }
   ```  
   That dynamic type switch is fairly expensive.  The easiest “low‐hanging” change is to give each token a small integer opcode.  e.g.  
   ```go
   type Token struct {
     kind byte       // 0=literal,1=immediate,2=builtin,3=getvar,4=getvarfunc
     val  interface{} 
   }
   ```  
   and then your loop is  
   ```go
   tok := nextToken(state)
   switch tok.kind {
   case lit:
     pushT(vals,tok.val)
   case imm:
     state = tok.val.(immediateToken)(state)
   case bfun:
     funcs = append(funcs, tok.val.(builtinFuncToken))
     // …
   }
   ```  
   No more runtime type‐switch on Go’s `interface{}`.

4) Move your deferred recover out of the inner loop  
   A `defer` in a hot loop can interfere with inlining and register allocation.  You only really need to catch panics at the very top.  Instead of  
   ```go
   func Eval(state *State) *State {
     defer func(){ … }()
   evalLoop:
     for { … }
   }
   ```  
   pull your `recover` into the caller of `Eval` (or wrap the whole `for state!=nil` loop in a single defer) so that none of the per‐token logic carries the cost of a deferred closure.

5) Pre‐allocate your stacks to reasonable capacities  
   You know in advance roughly how deep your nested calls, your `EndStack`, and your `Vals` slice will grow.  Right after you `MakeState` do something like  
   ```go
   state.Vals      = &make([]DValue, 0, 128)
   state.EndStack  = make([]func(*State)*State, 0, 32)
   state.ModeStack = make([]string, 0, 16)
   // …
   ```  
   This avoids repeated re‐allocations and heap‐grows in your hot loops.

6) Inline callFunc and doEnd  
   Both of those are tiny wrappers around a few lines of code.  Inlining them by copy/paste into your two “`if InCurrentCall`” and “`if CloseParensAfterLastCall`” branches will remove two function calls per invocation.  

---

Taken together you should see a 10–30% improvement just by removing repeated field dereferences, interface switches, and small call overheads.  The next step beyond that is a single‐pass token‐to‐opcode compilation so that your dispatch in the main loop is a single integer switch or even a threaded‐code jump table.
*/

/* o


7) Consider a custom “stack of untyped values” instead of `[]DValue`  
   Every push/pop allocates an interface box. If you instead use a small struct like  
   ```go
   type Value struct { kind byte; i int64; f float64; p unsafe.Pointer }
   ```
   and keep a `[]Value`, you avoid Go’s boxing and dynamic dispatch. This is a bigger change, but it often pays for all the interface sloshing.

8) Profile and zero in on the real hot spots  
   — fire up `pprof` or `go-torch` and see which functions or lines are burning CPU. Sometimes the biggest gains come from unexpected places (string parsing? indent computation? ICache misses?).

Taken together, these steps alone—hoisting fields, eliminating interface switches, pre-allocating buffers, and inlining a few dozen small calls—will often give you 10–30% better throughput in a byte-code-style VM. If you still need more after that, the next big step is a true two-pass compiler that emits a compact opcode stream, then runs a tight integer‐switch dispatch loop over it.
*/
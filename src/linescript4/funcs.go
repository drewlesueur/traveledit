package main

import (
	"encoding/json"
	"fmt"
	"hash/crc32"
	"math"
	"strconv"
	"strings"
	"time"
	"os/exec"
	"unsafe"
	"os"
)

func callFuncAccessible(state any) any {
	return callFunc(state.(*State))
}

var builtins map[string]func(state *State) *State
var runImmediates map[string]func(state *State) *State

func initBuiltins() {
	runImmediates = map[string]func(state *State) *State{
		"it": nil, // see linescript3 implementation
		"\n": func(state *State) *State {
			if state.Mode == "normal" {
				state = callFunc(state)
			}
			// fmt.Println("calling", state.Vals) // _red
			// fmt.Println("done calling", state.Vals) // _red
			return state
		},
		",": func(state *State) *State {
			if state.Mode == "normal" {
				state = callFunc(state)
			}
			return state
		},
		"|": func(state *State) *State {
			if state.Mode == "normal" {
				state = callFunc(state)
			}
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
			state.ValsStack = append(state.ValsStack, state.Vals)
			state.Vals = &[]any{}
			return state
		},
		"]": func(state *State) *State {
			state.Mode = state.ModeStack[len(state.ModeStack)-1]
			state.ModeStack = state.ModeStack[:len(state.ModeStack)-1]
			myArr := state.Vals
			state.Vals = state.ValsStack[len(state.ValsStack)-1]
			state.ValsStack = state.ValsStack[:len(state.ValsStack)-1]

			push(state.Vals, myArr)
			return state
		},
		"{": func(state *State) *State {
			state.ModeStack = append(state.ModeStack, state.Mode)
			state.Mode = "object"
			state.ValsStack = append(state.ValsStack, state.Vals)
			state.Vals = &[]any{}
			return state
		},
		"}": func(state *State) *State {
			state.Mode = state.ModeStack[len(state.ModeStack)-1]
			state.ModeStack = state.ModeStack[:len(state.ModeStack)-1]
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
	}
	builtins = map[string]func(state *State) *State{
		"now":         makeBuiltin_0_1(now),
		"+":           makeBuiltin_2_1(plus),
		"-":           makeBuiltin_2_1(minus),
		"*":           makeBuiltin_2_1(times),
		"/":           makeBuiltin_2_1(divide),
		"^":           makeBuiltin_2_1(exponent),
		"%":           makeBuiltin_2_1(mod),
		"<":           makeBuiltin_2_1(lt),
		">":           makeBuiltin_2_1(gt),
		"<=":          makeBuiltin_2_1(lte),
		">=":          makeBuiltin_2_1(gte),
		"==":          makeBuiltin_2_1(eq),
		"!=":          makeBuiltin_2_1(neq),
		
		"plus":           makeBuiltin_2_1(plus),
		"minus":      makeBuiltin_2_1(minus),
		"times":      makeBuiltin_2_1(times),
		"divBy":        makeBuiltin_2_1(divide),
		"toThe":      makeBuiltin_2_1(exponent),
		"mod":        makeBuiltin_2_1(mod),
		"lt":          makeBuiltin_2_1(lt),
		"gt":       makeBuiltin_2_1(gt),
		"lte":       makeBuiltin_2_1(lte),
		"gte":    makeBuiltin_2_1(gte),
		"eq":         makeBuiltin_2_1(eq),
		"neq":     makeBuiltin_2_1(neq),
		"is":         makeBuiltin_2_1(eq),
		"isnt":     makeBuiltin_2_1(neq),
		// "is":          makeBuiltin_2_1(is),
		
		
		"not":         makeBuiltin_1_1(not),
		"cc":          makeBuiltin_2_1(cc),
		"indexOf":     makeBuiltin_2_1(indexOf),
		"lastIndexOf": makeBuiltin_2_1(lastIndexOf),
		"split": makeBuiltin_2_1(split),
		"toString":    makeBuiltin_1_1(toString),
		"toInt":       makeBuiltin_1_1(toInt),
		"toFloat":     makeBuiltin_1_1(toFloat),
		"say":         makeBuiltin_1_0(say),
		"put":         makeNoop(),
		"push":        makeBuiltin_2_0(push),
		"pushm":       makeBuiltin_2_0(pushm),
		"pop":         makeBuiltin_1_1(pop),
		"unshift":     makeBuiltin_2_0(unshift),
		"shift":       makeBuiltin_1_1(shift),
		"setIndex":     makeBuiltin_3_0(setIndex),
		"at":          makeBuiltin_2_1(at),
		"sliceFrom":   makeBuiltin_2_1(sliceFrom),
		"slice":       makeBuiltin_3_1(slice),
		"splice":      makeBuiltin_4_1(splice),
		"length":      makeBuiltin_1_1(length),
		"setProp":     makeBuiltin_3_0(setProp),
		"setPropVKO":  makeBuiltin_3_0(setPropVKO),
		"getProp":     makeBuiltin_2_1(getProp),
		"getPropKO":   makeBuiltin_2_1(getPropKO),
		"deleteProp":  makeBuiltin_2_0(deleteProp),
		"keys":        makeBuiltin_1_1(keys),
		"populate":    makeBuiltin_2_1(populateString),
		"fromJson":    makeBuiltin_1_1(func(a any) any {
		    j := a.(string)
		    var r any
		    json.Unmarshal([]byte(j), &r)
		    return r
		}),
		"toJson":    makeBuiltin_1_1(func(a any) any {
		    b, err := json.Marshal(a)
		    if err != nil {
		        panic(err)
		    }
		    return b
		}),
		"toJsonF":    makeBuiltin_1_1(func(a any) any {
		    b, err := json.MarshalIndent(a, "", "    ")
		    if err != nil {
		        panic(err)
		    }
		    return b
		}),
		"exit": func(state *State) *State {
			return nil
		},
		"makeObject": func(state *State) *State {
			push(state.Vals, map[string]any{})
			return state
		},
		"makeArray": func(state *State) *State {
			push(state.Vals, &[]any{})
			return state
		},
		"incr": func(state *State) *State {
			a := pop(state.Vals).(string)
			state.Vars[a] = state.Vars[a].(int) + 1
			return state
		},
		"let": func(state *State) *State {
			b := pop(state.Vals)
			a := pop(state.Vals).(string)
			// if a == "IntA" {
			//     state.IntA = b.(int)
			//     return state
			// }
			state.Vars[a] = b
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
				}
				toSearch := "#" + locText
				newI := strings.LastIndex(state.Code[0:state.I], toSearch)
				state.GoUpCache[state.I] = &newI
				state.I = newI
			}
			// push(state.Vals, state[a])
			return state
		},
		"forever": func(state *State) *State {
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
			        return state
			    } else {
			        state.Vars[indexVar] = theIndex
			        state.I = spot
					state.EndStack = append(state.EndStack, endEach)
			    }
			    return state
			}
			state.EndStack = append(state.EndStack, endEach)
			i := findMatchingBefore(state, []string{"end"})
			state.I = i
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
			i := findMatchingBefore(state, []string{"end"})
			state.I = i
			return state
		},
		"if": func(state *State) *State {
			cond := pop(state.Vals)
			if cond.(bool) == true {
				state.EndStack = append(state.EndStack, endIf)
			} else {
				// fmt.Printf("wanting to find: %q\n", indent + "end")
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
			return state
		},
		"elseif": func(state *State) *State {
			endFunc := state.EndStack[len(state.EndStack)-1]
			state.EndStack = state.EndStack[:len(state.EndStack)-1]
			// don't need to call it cuz it's a noop
			_ = endFunc
			
			cond := pop(state.Vals)
			if cond.(bool) == true {
				state.EndStack = append(state.EndStack, endIf)
			} else {
				// fmt.Printf("wanting to find: %q\n", indent + "end")
				r := findMatchingAfter(state, []string{"end", "else", "elseif"})
				// fmt.Printf("found: %q\n", state.Code[i:])
				if r.Match == "else" {
					state.EndStack = append(state.EndStack, endIf)
				}
				state.I = r.I
			}
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
			return state
		},
		// "loopN":
		"end": func(state *State) *State {
			if len(state.EndStack) == 0 {
				return state.CallingParent
			}

			endFunc := state.EndStack[len(state.EndStack)-1]
			state.EndStack = state.EndStack[:len(state.EndStack)-1]

			return endFunc(state)
		},
		"return": func(state *State) *State {
			return state.CallingParent
		},
		"def": func(state *State) *State {
			params := pop(state.Vals).(*[]any)
			funcName := pop(state.Vals).(string)
			paramStrings := make([]string, len(*params))
			for i, p := range *params {
				paramStrings[i] = p.(string)
			}
			state.Vars[funcName] = &Func{
				FileName:      state.FileName,
				I:             state.I,
				Code:          state.Code,
				CachedTokens:  state.CachedTokens,
				GoUpCache:  state.GoUpCache,
				FindMatchingCache:  state.FindMatchingCache,
				Params:        paramStrings,
				LexicalParent: state,
			}
			// todo you could keep track of indent better
			// fmt.Printf("wanting to find: %q\n", indent + "end")
			r := findMatchingAfter(state, []string{"end"})
			state.I = r.I

			// fmt.Printf("found: %q\n", getCode(state)[i:])
			return state
		},
		// "loop": func(state *State) *State {
		//     // say(state.Vals)
		//     code := pop(state.Vals).(string)
		//     varName := pop(state.Vals).(string)
		//     count := pop(state.Vals).(int)
		//
		//     oldCode := state["__code"]
		//     oldI := state["__i"]
		//     oldFileName := state["__fileName"]
		//     oldCurrFuncToken := state["__currFuncToken"]
		//     oldFuncTokenSpot := state["__funcTokenSpot"]
		//
		//     state["__code"] = code
		//     state["__currFuncToken"] = ""
		//     state["__funcTokenSpot"] = -1
		//
		//     state["__fileName"] = crc32Hash(code)
		//     for i := 0; i < count; i++ {
		//         state["__i"] = 0
		//         state[varName] = i
		//         eval(state)
		//     }
		//     state["__code"] = oldCode
		//     state["__i"] = oldI
		//     state["__fileName"] = oldFileName
		//     state["__currFuncToken"] = oldCurrFuncToken
		//     state["__funcTokenSpot"] = oldFuncTokenSpot
		//
		//     return state
		// },
		"execBash": func(state *State) *State {
    	    val := pop(state.Vals).(string)
    	    cmd := exec.Command("bash", "-c", val)
    	    cmdOutput, err := cmd.Output()
    	    if err != nil {
    	        panic(err)
    	    }
    	    push(state.Vals, string(cmdOutput))
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
    	    return state
    	},
		"loadFile": func(state *State) *State {
    	    fileName := pop(state.Vals).(string)
    	    b, err := os.ReadFile(fileName)
    	    if err != nil {
    	        panic(err)
    	    }
    	    push(state.Vals, string(b))
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
    	    return evalState
    	},
		"dup": func(state *State) *State {
    	    v := pop(state.Vals)
    	    push(state.Vals, v)
    	    push(state.Vals, v)
    	    return state
    	},
		"swap": func(state *State) *State {
    	    a := pop(state.Vals)
    	    b := pop(state.Vals)
    	    push(state.Vals, a)
    	    push(state.Vals, b)
    	    return state
    	},
		"see": func(state *State) *State {
    	    a := pop(state.Vals)
    	    say(a)
    	    push(state.Vals, a)
    	    return state
    	},
	}
}

var evalCache = map[*unsafe.Pointer]*State{}

func now() any {
	return int(time.Now().UnixMilli())
}

func push(slice any, value any) {
	if s, ok := slice.(*[]any); ok {
		*s = append(*s, value)
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

func toString(a any) any {
	switch a := a.(type) {
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
		return ""
	}
	return nil
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

func say(val any) {
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
	case *[]any, []any:
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
		fmt.Printf("error: the type is %T\n", val)
	}
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
		return state
	}
}
func makeBuiltin_1_0(f func(any)) func(state *State) *State {
	return func(state *State) *State {
		a := pop(state.Vals)
		f(a)
		return state
	}
}
func makeBuiltin_2_0(f func(any, any)) func(state *State) *State {
	return func(state *State) *State {
		b := pop(state.Vals)
		a := pop(state.Vals)
		f(a, b)
		return state
	}
}
func makeBuiltin_3_0(f func(any, any, any)) func(state *State) *State {
	return func(state *State) *State {
		c := pop(state.Vals)
		b := pop(state.Vals)
		a := pop(state.Vals)
		f(a, b, c)
		return state
	}
}
func makeBuiltin_0_1(f func() any) func(state *State) *State {
	return func(state *State) *State {
		push(state.Vals, f())
		return state
	}
}
func makeBuiltin_1_1(f func(any) any) func(state *State) *State {
	return func(state *State) *State {
		a := pop(state.Vals)
		push(state.Vals, f(a))
		return state
	}
}
func makeBuiltin_2_1(f func(any, any) any) func(state *State) *State {
	return func(state *State) *State {
		b := pop(state.Vals)
		a := pop(state.Vals)
		push(state.Vals, f(a, b))
		return state
	}
}
func makeBuiltin_3_1(f func(any, any, any) any) func(state *State) *State {
	return func(state *State) *State {
		c := pop(state.Vals)
		b := pop(state.Vals)
		a := pop(state.Vals)
		push(state.Vals, f(a, b, c))
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
		return state
	}
}

func crc32Hash(s string) string {
	table := crc32.MakeTable(crc32.IEEE)
	crc := crc32.Checksum([]byte(s), table)
	return fmt.Sprintf("%x", crc)
}

func endIf(state *State) *State {
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


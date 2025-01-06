package main

import (
    "fmt"
    "strings"
	"encoding/json"
	"math"
	"strconv"
	"time"
)

func callFuncAccessible(state any) any {
    // fmt.Println("ok======", state.(map[string]any)["__currFuncToken"])
    return callFunc(state.(map[string]any))
}
var builtins = map[string]func(state map[string]any) map[string]any {
    "now": makeBuiltin_0_1(now),
    "+": makeBuiltin_2_1(plus),
    "-": makeBuiltin_2_1(minus),
    "*": makeBuiltin_2_1(times),
    "/": makeBuiltin_2_1(divide),
    "^": makeBuiltin_2_1(exponent),
    "%": makeBuiltin_2_1(mod),
    "<": makeBuiltin_2_1(lt),
    ">": makeBuiltin_2_1(gt),
    "<=": makeBuiltin_2_1(lte),
    ">=": makeBuiltin_2_1(gte),
    "==": makeBuiltin_2_1(eq),
    "not": makeBuiltin_1_1(not),
    "cc": makeBuiltin_2_1(cc),
    "indexOf": makeBuiltin_2_1(indexOf),
    "lastIndexOf": makeBuiltin_2_1(lastIndexOf),
    "toString": makeBuiltin_1_1(toString),
    "toInt": makeBuiltin_1_1(toInt),
    "is": makeBuiltin_2_1(is),
    "say": makeBuiltin_1_0(say),
    "put": makeNoop(),
    "push": makeBuiltin_2_0(push),
    "pushm": makeBuiltin_2_0(pushm),
    "pop": makeBuiltin_1_1(pop),
    "unshift": makeBuiltin_2_0(unshift),
    "shift": makeBuiltin_1_1(shift),
    "at": makeBuiltin_2_1(at),
    "sliceFrom": makeBuiltin_2_1(sliceFrom),
    "slice": makeBuiltin_3_1(slice),
    "splice": makeBuiltin_4_1(splice),
    "length": makeBuiltin_1_1(length),
    "setProp": makeBuiltin_3_0(setProp),
    "setPropVKO": makeBuiltin_3_0(setPropVKO),
    "getProp": makeBuiltin_2_1(getProp),
    "getPropKO": makeBuiltin_2_1(getPropKO),
    "deleteProp": makeBuiltin_2_0(deleteProp),
    "keys": makeBuiltin_1_1(keys),
    "exit": func(state map[string]any) map[string]any {
        return nil
    },
    "makeObject": func(state map[string]any) map[string]any {
        push(state["__vals"], map[string]any{})
        return state
    },
    "makeArray": func(state map[string]any) map[string]any {
        push(state["__vals"], &[]any{})
        return state
    },
    "debugS": func(state map[string]any) map[string]any {
        fmt.Println("debugging s", state["s"].(map[string]any)["__vals"])
        return state
    },
    "debug": func(state map[string]any) map[string]any {
        vals := *state["__vals"].(*[]any)
        fmt.Println("debugging", vals[len(vals)-1])
        return state
    },
    // "here": func(state map[string]any) map[string]any {
    //     push(state["__vals"], map[string]any{
    //         "__fileName": state["__fileName"],
    //         "__i": state["__i"],
    //         "__code": state["__code"],
    //         "__lexicalParent": state["__lexicalParent"],
    //     })
    //     return state
    // },
}

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
		sliced := make([]any, endInt - startInt)
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
		sliced := make([]any, len(*s) - startInt)
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

func plus(a, b any) any {
    switch a := a.(type) {
    case int:
        return a + b.(int)
    case float64:
        return a + b.(float64)
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
    return false
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

func is(a, b any) any {
    return a == b
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
    case *[]any:
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

func makeNoop() func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        return state
    }
}
func makeBuiltin_1_0(f func(any)) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        a := pop(state["__vals"])
        f(a)
        return state
    }
}
func makeBuiltin_2_0(f func(any, any)) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        b := pop(state["__vals"])
        a := pop(state["__vals"])
        f(a, b)
        return state
    }
}
func makeBuiltin_3_0(f func(any, any, any)) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        c := pop(state["__vals"])
        b := pop(state["__vals"])
        a := pop(state["__vals"])
        f(a, b, c)
        return state
    }
}
func makeBuiltin_0_1(f func() any) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        push(state["__vals"], f())
        return state
    }
}
func makeBuiltin_1_1(f func(any) any) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        a := pop(state["__vals"])
        push(state["__vals"], f(a))
        return state
    }
}
func makeBuiltin_2_1(f func(any, any) any) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        b := pop(state["__vals"])
        a := pop(state["__vals"])
        push(state["__vals"], f(a, b))
        return state
    }
}
func makeBuiltin_3_1(f func(any, any, any) any) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        c := pop(state["__vals"])
        b := pop(state["__vals"])
        a := pop(state["__vals"])
        push(state["__vals"], f(a, b, c))
        return state
    }
}
func makeBuiltin_4_1(f func(any, any, any, any) any) func(state map[string]any) map[string]any {
    return func(state map[string]any) map[string]any {
        d := pop(state["__vals"])
        c := pop(state["__vals"])
        b := pop(state["__vals"])
        a := pop(state["__vals"])
        push(state["__vals"], f(a, b, c, d))
        return state
    }
}

func optimized() {
    return
    builtins["incr"] = func(state map[string]any) map[string]any {
        a := pop(state["__vals"])
        state[a.(string)] = state[a.(string)].(int) + 1
        // push(state["__vals"], f(a, b))
        return state
    }
    builtins["get"] = func(state map[string]any) map[string]any {
        a := pop(state["__vals"]).(string)
        push(state["__vals"], state[a])
        return state
    }
    builtins["let"] = func(state map[string]any) map[string]any {
        b := pop(state["__vals"])
        a := pop(state["__vals"]).(string)
        state[a] = b
        return state
    }
    builtins["as"] = func(state map[string]any) map[string]any {
        // say(state["__vals"])
        b := pop(state["__vals"]).(string)
        a := pop(state["__vals"])
        state[b] = a
        return state
    }
    builtins["__getVar"] = func(state map[string]any) map[string]any {
        a := pop(state["__vals"]).(string)
        push(state["__vals"], state[a])
        return state
    }
    builtins["goUpIf"] = func(state map[string]any) map[string]any {
        cond := pop(state["__vals"]).(bool)
        locText := pop(state["__vals"]).(string)
    
        toSearch := "#" + locText
        if cond {
            code := state["__code"].(string)
            i := state["__i"].(int)
            newI := strings.LastIndex(code[0:i], toSearch)
            state["__i"] = newI
        }
        // push(state["__vals"], state[a])
        return state
    }
    builtins["loop"] = func(state map[string]any) map[string]any {
        // say(state["__vals"])
        code := pop(state["__vals"]).(string)
        varName := pop(state["__vals"]).(string)
        count := pop(state["__vals"]).(int)

        oldCode := state["__code"]
        oldI := state["__i"]
        oldCurrFuncToken := state["__currFuncToken"]
        oldFuncTokenSpot := state["__funcTokenSpot"]

        state["__code"] = code
        state["__currFuncToken"] = ""
        state["__funcTokenSpot"] = -1
        for i := 0; i < count; i++ {
            state["__i"] = 0
            state[varName] = i
            eval(state)
        }
        state["__code"] = oldCode
        state["__i"] = oldI
        state["__currFuncToken"] = oldCurrFuncToken
        state["__funcTokenSpot"] = oldFuncTokenSpot

        return state
    }
}
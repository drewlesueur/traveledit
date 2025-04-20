package main

import (
    "fmt"
    "strings"
    "os"
    "strconv"
    "encoding/json"
)

// wait?! caching getNextToken can return an index?!
// if it's a string key on an object
// lexical scope tracked when getting next token?


type Record struct {
    Values []RValue
    KeyPositions map[RS]RI
}

func (r *Record) Slice(start, stop RI) *Record {
    if start < 1 {
        start = 1
    }
    if stop > RI(len(r.Values)) {
        stop = RI(len(r.Values))
    }
    if start > stop {
        start = stop + 1
    }
    realStart := int(start - 1)
    realStop := int(stop)
    newValues := make([]RValue, realStop-realStart)
    copy(newValues, r.Values[realStart:realStop])
    return &Record{
        Values:       newValues,
        KeyPositions: map[RS]RValue{},
    }
}


func (v *Record) ToString() RS {
    return ToJson(v)
}

type RValue interface {
    ToString() RS
    Slice(start, stop RI) RValue
}

func NewRecordObj(items ...RValue) *Record {
    r := &Record{KeyPositions: map[RS]RI{}}
    for i := 0; i < len(items) - 1; i += 2 {
        key := items[i].ToString()
        value := items[i+1]
        r.Set(key, value)
    }
    return r
}

func NewRecordArr(items ...RValue) *Record {
    r := &Record{Values: make([]RValue, len(items))}
    for i := 0; i < len(items); i++ {
        value := items[i]
        r.Values[i] = value
    }
    return r
}
func (r *Record) SetIndex(index RI, value RValue) {
    // Optionally: check index bounds
    index = index -1
    if index < 0 || index >= RI(len(r.Values)) {
        panic("index out of range")
    }
    r.Values[index] = value
}

func (r *Record) GetIndex(index RI) RValue {
    index = index -1
    // Optionally: check index bounds
    if index < 0 || index >= RI(len(r.Values)) {
        return rNull
    }
    return r.Values[index]
}

var rNull = &RNull{}

type RF float64
type RI int
type RT byte
type RB bool
type RS string
type RNull struct{}


func (v *RNull) ToString() RS {
    return RS("<null>")
}

// ToString for RF
func (v RF) ToString() RS {
    return RS(strconv.FormatFloat(float64(v), 'f', -1, 64))
}

// ToString for RI
func (v RI) ToString() RS {
    return RS(strconv.Itoa(int(v)))
}

// ToString for RT
func (v RT) ToString() RS {
    return RS(strconv.Itoa(int(v)))
}

// ToString for RB
func (v RB) ToString() RS {
    return RS(strconv.FormatBool(bool(v)))
}

// ToString for RS
func (v RS) ToString() RS {
    return RS(string(v))
}


func (f *Record) Set(key RS, value RValue) RI {
    if pos, exists := f.KeyPositions[key]; exists {
        f.Values[int(pos)] = value
        return pos
    } else {
        f.Values = append(f.Values, value)
        f.KeyPositions[key] = RI(len(f.Values)) // 1 based
        return pos
    }
}

func (f *Record) Get(key RS) (RValue) {
    pos, exists := f.KeyPositions[key]
    if !exists {
        return nil
    }
    return f.Values[pos-1] // because 1 based
}

const stateCode = RI(1)
const stateI = RI(2)
const stateFile = RI(3)
const stateVars = RI(4)
const stateVals = RI(5)

// a token should just be a function on state?

// trying simpler route with more nested states
func main() {
	fileName := os.Args[1]
	data, err := os.ReadFile(fileName)
	if err != nil {
		fmt.Println("Error reading file:", err)
		return
	}
	code := RS(string(data))
    state := NewRecordObj(
        RS("code"), code,
        RS("i"), RI(1),
        RS("filename"), RS(fileName),
        RS("vars"), NewRecordObj(),
        RS("vals"), NewRecordArr(),
    )
  	Eval(state)
}

func Eval(state *Record) {
    fmt.Println(ToJson(state))

    for _i := 0; _i < 1000000; _i++ {
        fmt.Println("i #skyblue", _i+1)
        token := getNextToken(state)
        if token == "" {
            fmt.Println("got to end")
            break
        }
        fmt.Println(token)
    }
}

func ToJson(v any) RS {
    b, _ := json.MarshalIndent(v, "", "    ")
    return RS(b)
}


// foo: "yo man"
// map list
// 
// name: func a b
// 
// end

func getNextToken(state *Record) RS {
    code := state.GetIndex(stateCode).(RS)
    i := int(state.GetIndex(stateI).(RI))

    for {
        fmt.Println("#pink", i)
        pos := strings.IndexAny(string(code[i-1:]), " \n()[]{},|#\"'")
        fmt.Println("#coral", pos+1)
        if pos != -1 {
            token := code[i-1:i-1+pos]
            state.SetIndex(stateI, RI(pos+1))
            return RS(token)
        } else {
            return ""
        }
    }
}

func (v RF) Slice(start, stop RI) RValue {
    return v
}
func (v RI) Slice(start, stop RI) RValue {
    return v
}
func (v RT) Slice(start, stop RI) RValue {
    return v
}
func (v RB) Slice(start, stop RI) RValue {
    return v
}

// For RS (string): return the substring (1-based, like Record)
func (v RS) Slice(start, stop RI) RValue {
    s := string(v)
    n := RI(len(s))
    if start < 1 {
        start = 1
    }
    if stop > n {
        stop = n
    }
    if start > stop {
        start = stop + 1
    }
    realStart := int(start - 1)
    realStop := int(stop)
    if realStart < 0 {
        realStart = 0
    }
    if realStop > len(s) {
        realStop = len(s)
    }
    if realStart > realStop {
        realStart = realStop
    }
    return RS(s[realStart:realStop])
}
// For RNull: return itself
func (v *RNull) Slice(start, stop RI) RValue {
    return v
}


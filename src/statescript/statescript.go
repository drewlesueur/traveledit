package main

import (
    "fmt"
    "strings"
    "os"
    "strconv"
    "encoding/json"
    "time"
)

// wait?! caching getNextToken can return an index?!
// if it's a string key on an object
// lexical scope tracked when getting next token?


type Record struct {
    Values []RValue
    KeyPositions map[RS]RI
}


func (r *Record) Slice(startV, stopV RValue) RValue {
    start := startV.Int()
    stop := stopV.Int()

    n := RI(len(r.Values))

    // Handle negative indices: count from end
    if start < 0 {
        start = n + start + 1
    }
    if stop < 0 {
        stop = n + stop + 1
    }

    // Clamp to [1, n+1]
    if start < 1 {
        start = 1
    }
    if stop > n {
        stop = n
    }

    // If start > stop, return empty (or adjust as you see fit)
    if start > stop+1 {
        start = stop + 1
    }
    if start > stop {
        start = stop + 1
    }

    realStart := int(start - 1)
    realStop := int(stop)
    if realStart < 0 {
        realStart = 0
    }
    if realStop > len(r.Values) {
        realStop = len(r.Values)
    }
    if realStart > realStop {
        realStart = realStop
    }

    newValues := make([]RValue, realStop-realStart)
    copy(newValues, r.Values[realStart:realStop])
    return &Record{
        Values:       newValues,
        KeyPositions: map[RS]RI{},
    }
}

func (v RS) Slice(startV, stopV RValue) RValue {
    start := startV.Int()
    stop := stopV.Int()
    s := string(v)
    n := RI(len(s))

    // Handle negative indices
    if start < 0 {
        start = n + start + 1
    }
    if stop < 0 {
        stop = n + stop + 1
    }

    // Clamp to [1, n+1]
    if start < 1 {
        start = 1
    }
    if stop > n {
        stop = n
    }

    // If start > stop, slice should be empty
    if start > stop+1 {
        start = stop + 1
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


type RValue interface {
    String() RS
    Int() RI
    Float() RF
    Bool() RB
    Byte() RT
    Slice(start, stop RValue) RValue
    At(RValue) RValue
    SetIndex(RValue) RValue
}

func NewRecordObj(items ...RValue) *Record {
    r := &Record{KeyPositions: map[RS]RI{}}
    for i := 0; i < len(items) - 1; i += 2 {
        key := items[i].String()
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
func (r *Record) SetIndex(index RValue, value RValue) {
    // Optionally: check index bounds
    index = index.Int() -1
    if index < 0 || index >= RI(len(r.Values)) {
        panic("index out of range")
    }
    r.Values[index] = value
}


var rNull = &RNull{}

type RF float64
type RI int
type RT byte
type RB bool
type RS string
type RNull struct{}


func (v *Record) String() RS {
    return ToJson(v)
}

func (v *RNull) String() RS {
    return RS("<null>")
}

// String for RF
func (v RF) String() RS {
    return RS(strconv.FormatFloat(float64(v), 'f', -1, 64))
}

// String for RI
func (v RI) String() RS {
    return RS(strconv.Itoa(int(v)))
}

// String for RT
func (v RT) String() RS {
    return RS(strconv.Itoa(int(v)))
}

// String for RB
func (v RB) String() RS {
    return RS(strconv.FormatBool(bool(v)))
}

// String for RS
func (v RS) String() RS {
    return RS(string(v))
}

// For RF (float64)
func (v RF) Int() RI    { return RI(int(v)) }
func (v RF) Float() RF  { return v }
func (v RF) Bool() RB   { return RB(v != 0) }
func (v RF) Byte() RT   { return RT(byte(v)) }

// For RI (int)
func (v RI) Int() RI    { return v }
func (v RI) Float() RF  { return RF(float64(v)) }
func (v RI) Bool() RB   { return RB(v != 0) }
func (v RI) Byte() RT   { return RT(byte(v)) }

// For RT (byte)
func (v RT) Int() RI    { return RI(int(v)) }
func (v RT) Float() RF  { return RF(float64(v)) }
func (v RT) Bool() RB   { return RB(v != 0) }
func (v RT) Byte() RT   { return v }

// For RB (bool)
func (v RB) Int() RI    { if v { return 1 } else { return 0 } }
func (v RB) Float() RF  { if v { return 1.0 } else { return 0.0 } }
func (v RB) Bool() RB   { return v }
func (v RB) Byte() RT   { if v { return 1 } else { return 0 } }

// For RS (string)
func (v RS) Int() RI {
    i, err := strconv.Atoi(string(v))
    if err != nil {
        return 0
    }
    return RI(i)
}
func (v RS) Float() RF {
    f, err := strconv.ParseFloat(string(v), 64)
    if err != nil {
        return 0
    }
    return RF(f)
}
func (v RS) Bool() RB {
    // True if string is "true", "1", or case-insensitive "t"
    s := strings.TrimSpace(string(v))
    if s == "1" || strings.EqualFold(s, "true") || strings.EqualFold(s, "t") {
        return RB(true)
    }
    return RB(false)
}
func (v RS) Byte() RT {
    if len(v) > 0 {
        return RT(v[0])
    }
    return 0
}

// For RNull (struct{})
func (v *RNull) Int() RI    { return 0 }
func (v *RNull) Float() RF  { return 0 }
func (v *RNull) Bool() RB   { return false }
func (v *RNull) Byte() RT   { return 0 }

// this part is not quite right
func (v *Record) Int() RI   { return 1 }        // or some logic for Record-to-int
func (v *Record) Float() RF { return 1 }        // or logic for Record-to-float
func (v *Record) Bool() RB  { return true }    // or logic for Record-to-bool
func (v *Record) Byte() RT  { return 1 }        // or logic for Record-to-byte





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
        time.Sleep(1 * time.Second)
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

func isNumeric(s string) bool {
	return len(s) > 0 && ((s[0] >= '0' && s[0] <= '9') || (s[0] == '-' && len(s) > 1))
}

func getNextToken(state *Record) RS {
    code := state.At(stateCode)
    i := state.At(stateI)
    for {
        v := code.At(i)
        // if v.IsStandaloneToken() {
        if true {
            state.SetIndex(stateI, i.Add(1))
            return v
        }
        // not done yet
    }
}

func (v RF) Slice(start, stop RValue) RValue {
    return v
}
func (v RI) Slice(start, stop RValue) RValue {
    return v
}
func (v RT) Slice(start, stop RValue) RValue {
    return v
}
func (v RB) Slice(start, stop RValue) RValue {
    return v
}

// For RNull: return itself
func (v *RNull) Slice(start, stop RValue) RValue {
    return v
}

func (v RI) At(i RValue) RValue {
    return v
}
func (v RF) At(i RValue) RValue {
    return v
}
func (v RValue) At(i RValue) RValue {
    return v
}
func (v RT) At(i RValue) RValue {
    return v
}
func (v RB) At(i RValue) RValue {
    return v
}
func (v RS) At(i RValue) RValue {
    s := string(v)
    idx := i.Int() - 1
    if idx < 0 || idx >= len(s) {
        return rNull
    }
    return RS(string(s[idx]))
}

func (v *RNull) At(i RValue) RValue {
    return v
}

func (r *Record) At(index RValue) RValue {
    index = index -1
    // Optionally: check index bounds
    if index < 0 || index >= RValue(len(r.Values)) {
        return rNull
    }
    return r.Values[index]
}

func (v RF) SetIndex(i RValue, value RValue) {}
func (v RI) SetIndex(i RValue, value RValue) {}
func (v RT) SetIndex(i RValue, value RValue) {}
func (v RB) SetIndex(i RValue, value RValue) {}
func (v RS) SetIndex(i RValue, value RValue) {}
func (v *RNull) SetIndex(i RValue, value RValue) {}

func (v RF) Set(key RS, value RValue) RValue {
    return RI(0)
}
func (v RI) Set(key RS, value RValue) RValue {
    return RI(0)
}
func (v RT) Set(key RS, value RValue) RValue {
    return RI(0)
}
func (v RB) Set(key RS, value RValue) RValue {
    return RI(0)
}
func (v RS) Set(key RS, value RValue) RValue {
    return RI(0)
}
func (v *RNull) Set(key RS, value RValue) RValue {
    return RI(0)
}

func (v RF) Get(key RS) RValue {
    return v
}
func (v RI) Get(key RS) RValue {
    return v
}
func (v RT) Get(key RS) RValue {
    return v
}
func (v RB) Get(key RS) RValue {
    return v
}
func (v RS) Get(key RS) RValue {
    return v
}
func (v *RNull) Get(key RS) RValue {
    return v
}


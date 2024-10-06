package chompscript

import (
    "fmt"
    "sync"
	"container/heap"
	"time"
)

type Record struct {
    FullPath []string
    ArrayPart  []*Record
    LookupPart map[string]*Record
    ValuePart  string
    KeysPart   []string
    IsNull bool
}
type CodeFile struct {
    FullPath string
    Code string
    EndsCache map[int]int
}

type Func struct {
    Arity int
    Name string // optional
    CodeFile *CodeFile
    Index int
    World: *World
}

type World struct {
    CodeFile *CodeFile
    Index int
    Stack *Record // also has state in lookup part
    Machine *Machine
    FuncStack: []*Func
    Func *Func
    RunAt time.Time
    LexicalParent *World
    RuntimeParent *World
}

// type WorldHeap []*World
// flesh this out to conform to Go's container/heap
// the value to compare is the RunAt (time.Time)
type WorldHeap []*World
func (wh WorldHeap) Len() int {
	return len(wh)
}
func (wh WorldHeap) Less(i, j int) bool {
	return wh[i].RunAt.Before(wh[j].RunAt)
}
func (wh WorldHeap) Swap(i, j int) {
	wh[i], wh[j] = wh[j], wh[i]
}
func (wh *WorldHeap) Push(x interface{}) {
	*wh = append(*wh, x.(*World))
}
func (wh *WorldHeap) Pop() interface{} {
	old := *wh
	n := len(old)
	item := old[n-1]
	*wh = old[0 : n-1]
	return item
}

type Machine struct {
    Mu sync.Mutex
    IdCounter int
    Files map[string]*CodeFile
    World *World
    NextWorlds []*Worlds
    TimedWorlds *WorldHeap
    // also need some sort of parallelism and message passing
}


func NewMachine() *Machine {
    wh := &WorldHeap{}
    heap.Init(wh)

    nextWorlds := []*World{}
    w := &World{
        Stack: &Record{},
        FuncStack: &Func{},
    }
    m := &Machine{
        Files: map[string]*CodeFile{},
        World: w,
        NextWorlds: nextWorlds,
        TimedWorlds: wh,
    }
    w.Machine = m
}

func (m *Machine) AddCodeString(fullPath string, code string) {
    m.Lock()
    defer m.Unlock()
    codeFile := &CodeFile{
        // FullPath: "_eval_" + strconv.Itoa(m.IdCounter),
        FullPath: fullPath,
        Code: code,
        EndsCache: map[int]int{},
    }
    m.Files[fullPath] = codeFile
    m.NextWorlds = append(m.NextWorlds, &World{
        CodeFile: codeFile,
        Stack: m.World.Stack,
        FuncStack: m.World.FuncStack,
    })
}
func (m *Machine) AddCode(fullPath string) error {
    m.Lock()
    defer m.Unlock()

    code, err := io.ReadFile(fullPath)
    if err != nil {
        return err
    }
    m.AddCodeString(fullPath, code)
    return nil
}
func (m *Machine) RunNext(fullPath string, code string) {
    m.Lock()
    defer m.Unlock()

    // dirst check if
}

// a: 10
var code = `
    1 + 2

if {x is 3} {

}, {

}

ages: 1, 2, 3


`


    // var world = {
    //     state: state || {},
    //     stack: stack || [],
    //     // stack: PretendArray(),
    //     tokens: tokens,
    //     i: 0,
    //     parent: null,
    //     indent: 0,
    //     runId: 0,
    //     name: "main",
    //     // cachedLookupWorld: {},
    //     log: [], // for convenience
    //     onEnds: [],
    //     waitingWorlds: [],
    // }
    // world.global = world
    // world.asyncTop = world

    // goroutine
    // var asyncWorld = {
    //     parent: fWorld,
    //     state: {},
    //     // stack: [], // brand new stack
    //     stack: [...world.stack], // copied stack
    //     tokens: fTokens,
    //     i: 0,
    //     dynParent: null, // so it stops
    //     asyncParent: world,
    //     runId: ++thumbscript4.runId,
    //     indent: world.indent + 1,
    //     // cachedLookupWorld: {},
    //     global: world.global,
    //     done: false,
    //     onEnds: [],
    //     waitingWorlds: [],
    //     foofoo: "banana",
    // }

    // calling a function
    // world = {
    //     parent: fWorld,
    //     state: {},
    //     stack: oldWorld.stack,
    //     tokens: fTokens,
    //     i: 0,
    //     dynParent: oldWorld,
    //     runId: ++thumbscript4.runId,
    //     indent: oldWorld.indent + 1,
    //     // cachedLookupWorld: {},
    //     global: oldWorld.global,
    //     asyncTop: oldWorld.asyncTop,
    //     onEnds: [],
    //     waitingWorlds: [],
    // }
    //
    // if (f.dynamic) {
    //     world.parent = oldWorld
    //     // world.cachedLookupWorld = {}
    // }

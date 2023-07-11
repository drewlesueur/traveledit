
var thumbscript3 = {}

// thumbscript2 parser was cool with optional significant indenting
thumbscript3.tokenize = function(code) {
    var state = "out"
    var currentToken = ""
    var tokens = []
    string2OpenCount = 0
    code += "\n" // to simplify last token
    for (var i=0; i < code.length; i++) {
        var chr = code.charAt(i)

        if (state == "out") {
            if ("()[]{}".indexOf(chr) != -1) {
                tokens.push(chr)
            } else if (" \n\t".indexOf(chr) != -1) {
            } else if ("/".indexOf(chr) != -1) {
                state = "slash" // for comments
            } else if ('"'.indexOf(chr) != -1) {
                state = "string"
            } else if ("«".indexOf(chr) != -1) {
                state = "string2"
                string2OpenCount = 1
            } else if ("•@".indexOf(chr) != -1) {
                state = "dot"
                currentToken = chr
            } else {
                state = "in"
                currentToken = chr
            }
        } else if (state == "in") {
            if ("()[]{}".indexOf(chr) != -1) {
                tokens.push(currentToken)
                currentToken = ""
                tokens.push(chr)
                state = "out"
            } else if (" \n\t".indexOf(chr) != -1) {
                tokens.push(currentToken)
                currentToken = ""
                state = "out"
            } else {
                currentToken += chr
            }
        } else if (state == "string") {
            // haven't finished escaping in string
            if (false && "\\".indexOf(chr) != -1) {
                state = "stringEscape"
            } else if ('"'.indexOf(chr) != -1) {
                // we could make every token an object
                // but this is our strong trick for now
                tokens.push("$" + currentToken)
                currentToken = ""
                state = "out"
            } else {
                currentToken += chr
            }
        } else if (state == "string2") {
            if ("«".indexOf(chr) != -1) {
                string2OpenCount++
            } else if ("»".indexOf(chr) != -1) {
                // we could make every token an object
                // but this is our strong trick for now
                string2OpenCount--
                if (string2OpenCount == 0) {
                    tokens.push("$" + currentToken)
                    currentToken = ""
                    state = "out"
                }
            } else {
                currentToken += chr
            }
        } else if (state == "stringEscape") {
            if (" \n\t".indexOf(chr) != -1) {
                state = "string"
            } else {
                // not done here yet
            }
        } else if (state == "slash") {
            if ("/".indexOf(chr) != -1) {
                state = "comment"
            } else {
                // tokens.push("/")
                // state = "out"
                currentToken = "/"
                state = "in"
            }
        } else if (state == "dot") {
            if ("•@".indexOf(chr) != -1) {
                currentToken += chr
            } else {
                i--
                tokens.push(currentToken)
                currentToken = ""
                state = "out"
            }
        } else if (state == "comment") {
            if ("\n".indexOf(chr) != -1) {
                state = "out"
            }
        }
    }
    // showLog()
    // log2(tokens)
    tokens = thumbscript3.squishFuncs(tokens)
    tokens = thumbscript3.desugarAtSign(tokens)
    return tokens
}
thumbscript3.desugarAtSign = function(tokens) {
    var newTokens = []
    var stack = []
    var state = null
    var i = 0

    var consume = function() {
        while (state) {
            // log2("before: " + token + " " + JSON.stringify(state) + ": " + JSON.stringify(stack))
            state.n--
            if (state.n == 0) {
                newTokens.push(state.token)
                state = stack.pop()
            } else {
                // log2("after: " + token + " " + JSON.stringify(state) + ": " + JSON.stringify(stack))
                break
            }
        }
    }
    while (i < tokens.length) {
        var token = tokens[i]

        if (typeof token == "string") {
            var j = 0
            while (j < token.length && "@•".indexOf(token.charAt(j)) != -1) {
                j++
            }
            if (j == 0) {
                // special case for setc
                newTokens.push(token)
                consume()
            } else {
                stack.push(state)
                state = {
                    n: j,
                    token: tokens[++i],
                }
                // log2(token + " " + JSON.stringify(state) + ": " + JSON.stringify(stack))
            }
        } else {
            newTokens.push(token)
            consume()
        }
        i++
    }
    consume()
    return newTokens
}

// ()	[]	{}	<>
thumbscript3.squishFuncs = function(tokens) {
    // function definitions can be turned into an array
    var newTokens = []
    var tokenStack = []
    var i = 0
    while (i < tokens.length) {
        var token = tokens[i]
        if (token == "{") {
            tokenStack.push(newTokens)
            newTokens = []
        } else if (token == "[") {
            tokenStack.push(newTokens)
            newTokens = []
        } else if (token == "(") {
            tokenStack.push(newTokens)
            newTokens = []
        } else if (token == "}") {
            var r = newTokens
            newTokens = tokenStack.pop()
            newTokens.push({
                thumbscript_type: "curly",
                value: thumbscript3.desugarAtSign(r),
            })
        } else if (token == "]") {
            var r = newTokens
            newTokens = tokenStack.pop()
            newTokens.push({
                thumbscript_type: "square",
                value: thumbscript3.desugarAtSign(r),
            })
        } else if (token == ")") {
            var r = newTokens
            newTokens = tokenStack.pop()
            newTokens.push({
                thumbscript_type: "paren",
                value: thumbscript3.desugarAtSign(r),
            })
        } else {
            newTokens.push(token)
        }
        i++
    }
    return newTokens
}

thumbscript3.eval = function(code) {
    var tokens = thumbscript3.tokenize(code)
    // log2(tokens)
    var world = {
        state: {},
        stack: [],
        tokens: tokens,
        i: 0,
        parent: null,
        indent: 0,
        runId: 0,
        name: "main"
    }
    thumbscript3.run(world)

    // window.f99 = makeFile("__output", 0, "")
    // f99.fileMode = "file"
    // f99.cursorLineIndex = 0
    // f99.lines = debugOutput
    // addFileToList(f99)
    // clearTimeout(window.t99)
    // thumbscript3.runAsync(world)
}

thumbscript3.run = function(world) {
    while (true) {
        // log2("\t".repeat(world.indent) + "// token: " + JSON.stringify(world.tokens.slice(world.i, world.i+1)[0]))
        world = thumbscript3.next(world)
        if (!world) {
            break
        }
        // log2("\t".repeat(world.indent) + "// stack: " + JSON.stringify(world.stack))
        // if (world.name) {
        //     log2("\t".repeat(world.indent) + "+ in world " + world.name + "(" +world.runId+") < " + (world.parent?.name || "") )
        // }
    }
}

thumbscript3.runAsync = function(world) {
    world = thumbscript3.next(world)
    if (!world) {
        return
    }
    // log2(Object.keys(world))
    log2("//" + world.tokens.slice(world.i, world.i+1))
    log2("in world " + world.name + "(" +world.runId+") < " + world.parent?.name )
    window.t99 = setTimeout(function() { thumbscript3.runAsync(world) }, 250)
    f99.lines = debugOutput
    render()
    
}

thumbscript3.mathFunc2 = function(f) {
    return function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push(f((a-0), (b-0)))
        return world
    }
}
thumbscript3.genFunc1 = function(f) {
    return function(world) {
        var a = world.stack.pop()
        world.stack.push(f(a))
        return world
    }
}
thumbscript3.genFunc1NoReturn = function(f) {
    return function(world) {
        var a = world.stack.pop()
        f(a)
        return world
    }
}
thumbscript3.genFunc2 = function(f) {
    return function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push(f(a, b))
        return world
    }
}
thumbscript3.genFunc3 = function(f) {
    return function(world) {
        var c = world.stack.pop()
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push(f(a, b, c))
        return world
    }
}
// built in funcs have to have func call last?
thumbscript3.builtIns = {
    say: thumbscript3.genFunc1NoReturn(a => { log2(a) }),
    cc: thumbscript3.genFunc2((a, b) => a + b),
    plus: thumbscript3.mathFunc2((a, b) => a + b),
    minus: thumbscript3.mathFunc2((a, b) => a - b),
    times: thumbscript3.mathFunc2((a, b) => a * b),
    divide: thumbscript3.mathFunc2((a, b) => a * b),
    lt: thumbscript3.mathFunc2((a, b) => a < b),
    gt: thumbscript3.mathFunc2((a, b) => a > b),
    lte: thumbscript3.mathFunc2((a, b) => a <= b),
    gte: thumbscript3.mathFunc2((a, b) => a >= b),
    match: thumbscript3.mathFunc2((a, b) => a == b),
    is: thumbscript3.mathFunc2((a, b) => a == b),
    prop: thumbscript3.genFunc2((a, b) => a[b]),
    at: thumbscript3.genFunc2((a, b) => a[b]),
    props: thumbscript3.genFunc1((a) => {
        var v = a[0]
        for (var i = 1; i < a.length; i++) { v = v[a[i]] }
        return v
    }),
    not: thumbscript3.genFunc1((a) => !!!a),
    "check": thumbscript3.genFunc3((a, b, c) => (a ? b : c) ),
    "if": thumbscript3.genFunc3((a, b, c) => (a ? b : c) ),
    length: thumbscript3.genFunc1((a) => a.length),
    push: thumbscript3.genFunc2((a, b) => a.push(b)),
    pop: thumbscript3.genFunc1((a) => a.pop()),
    unshift: thumbscript3.genFunc2((a, b) => a.unshift(b)),
    shift: thumbscript3.genFunc1((a) => a.shift()),
    split: thumbscript3.genFunc2((a, b) => a.split(b)),
    join: thumbscript3.genFunc2((a, b) => a.join(b)),
    copylist: thumbscript3.genFunc1((a) => [...a]),
    dyn: function(world) {
        var a = world.stack.pop()
        a.dynamic = true
        world.stack.push(a)
        return world
    },
    get: function(world) {
        var a = world.stack.pop()
        var w = null
        for (w = world; w != null; w = w.parent) {
            if (a in w.state) { break }
        }
        if (w == null) {
            world.stack.push(null)
        } else {
            world.stack.push(w.state[a])
        }
        return world
    },
    set: function(world) {
        var a = world.stack.pop()
        var b = world.stack.pop()
        var w = null
        for (w = world; w != null; w = w.parent) {
            if (a in w.state) { break }
        }
        if (w == null) { w = world }
        w.state[a] = b
        return world
    },
    setplus1: function(world) {
    var a = world.stack.pop()
    var w = null
    for (w = world; w != null; w = w.parent) {
        if (a in w.state) { break }
    }
    if (w == null) { w = world }
    w.state[a] -= 0
    w.state[a] += 1
        return world
    },
    setprop: function(world) {
        var k = world.stack.pop()
        var o = world.stack.pop()
        var v = world.stack.pop()
        o[k] = v
        return world
    },
    setc: function(world) {
        // TODO: implement in thumbscript itself
        var a = world.stack.pop()
        var b = world.stack.pop()
        world.stack.push(a.slice(0,-1))
        thumbscript3.builtIns.props(world)
        obj = world.stack.pop()
        obj[a[a.length-1]] = b
        return world
    },
    runid: function(world) {
        world.stack.push(world.runId)
        return world
    },
    nameworld: function(world) {
        var a = world.stack.pop()
        world.name = a
        return world
    },
    call: function(world) {
        var f = world.stack.pop()
        var oldWorld = world
        world = {
            parent: f.world,
            state: {},
            stack: oldWorld.stack,
            tokens: f.tokens,
            i: 0,
            dynParent: oldWorld,
            runId: ++thumbscript3.runId,
            indent: oldWorld.indent + 1
        }

        if (f.dynamic) {
            world.parent = oldWorld
        }
        return world
    },
    "return": function(world) {
        // world = world.dynParent
        if (world.onEnd) world.onEnd(world)
        world = world.parent
        // todo: see onend
        return world
    },
    "exit": function(world) {
        world = null
        // todo: see onend
        return world
    },
    "dump": function(world) {
        while (world) {
            // log2("\t".repeat(world.indent))
            // log2(JSON.stringify(world, "\t".repeat(world.indent)), "   ")
            var printWorld = {
                stack: world.stack,
                tokens: world.tokens.slice(0,20) + "...",
                name: world.name
            }
            log2(JSON.stringify(printWorld, null, "   "))
            log2("----")
            world = world.dynParent
        }
    },
    "breakn": function(world) {
        var a = world.stack.pop()
        a = a-0
        for (var i=0; i<a; i++) {
            // i originally had dynParent but it wasn't right
            // like when I wrapped if
            if (world.onEnd) world.onEnd(world)
            world = world.parent
            // todo: see onend
        }
        return world
    },
    // "break": function(world) {
    //     for (var i=0; i<2; i++) {
    //         world = world.parent
    //     }
    //     return world
    // },
    // "breakid": function(world) {
    //     var a = world.stack.pop()
    //     while (world) {
    //         if (world.runId == a) {
    //             break
    //         }
    //         world = world.dynParent
    //     }
    //     return world
    // },
    repeat: function(world) {
        // tail call!
        if (!world.repeatCount) {
            world.repeatCount = 0
        }
        world.repeatCount++
        if (world.repeatCount === 1_000_000) {
            world = null
            alert("runaway loop")
        }
        world.i = -1 // because same world and will increment
        return world
    },
}
thumbscript3.runId = 0
thumbscript3.next = function(world) {
    do {
        if (!world) {
            return false
        }
        if (world.i >= world.tokens.length) {
            if (world.dynParent) {
                if (world.onEnd) {
                    world.onEnd(world)
                }
                world = world.dynParent
                // the stacks should point to same thing
                return world
            }
            return false
        }
        var newWorld = world
        var token = world.tokens[world.i]
        if (typeof token == "string") {
            var doCall = true

            if (token.startsWith("$")) {
                world.stack.push(token.slice(1))
                break
            }
            if (token.startsWith(":")) {
                world.stack.push(token.slice(1))
                newWorld = thumbscript3.builtIns.set(world)
                break
            }
            if (token.startsWith("#")) {
                world.stack.push(token.slice(1))
                newWorld = thumbscript3.builtIns.nameworld(world)
                break
            }
            if (token.endsWith(":")) {
                world.stack.push(token.slice(0, -1))
                newWorld = thumbscript3.builtIns.set(world)
                break
            }
            if (token.endsWith("++")) {
                world.stack.push(token.slice(0, -2))
                newWorld = thumbscript3.builtIns.setplus1(world)
                break
            }
            if (token.startsWith(".")) {
                world.stack.push(token.slice(1))
                newWorld = thumbscript3.builtIns.prop(world)
                break
            }
            if (token in thumbscript3.builtIns) {
                newWorld = thumbscript3.builtIns[token](world)
                break
            }

            if (token.startsWith("~")) {
                token = token.slice(1)
                doCall = false
            }

            var w = null
            for (w = world; w != null; w = w.parent) {
                if (token in w.state) {
                    break
                }
            }
            if (w == null) {
                world.stack.push(token) // lol
                break
            }
            var x = w.state[token]
            world.stack.push(x)
            if (x && x.thumbscript_type == "closure" && doCall) {
                newWorld = thumbscript3.builtIns.call(world)
            }
            break
        } else if (typeof token == "object") {
            // not calling right away
            if (token.thumbscript_type == "curly") {
                var closure = {
                    thumbscript_type: "closure",
                    tokens: token.value,
                    world: world,
                }
                
                closure.toJSON = function() {
                    return {
                        tokens: token.value,
                        thumbscript_type: "closure",
                        // not world
                    }
                }
                closure.toString = function() {
                    return JSON.stringify(token.value)
                }
                world.stack.push(closure)
            } else if (token.thumbscript_type == "square") {
                newWorld = {
                    parent: world,
                    state: {},
                    stack: [],
                    tokens: token.value,
                    i: 0,
                    dynParent: world,
                    onEnd: function(world) {
                        if (Object.keys(world.state).length) {
                            world.dynParent.stack.push(world.state)
                        } else {
                            world.dynParent.stack.push(world.stack)
                        }
                    },
                    indent: world.indent + 1,
                    runId: ++thumbscript3.runId,
                }
            } else if (token.thumbscript_type == "paren") {
                // world.stack.push({
                //     thumbscript_type: "closure",
                //     tokens: token.value,
                //     world: world,
                //     "dynamic": true,
                // })

                newWorld = {
                    parent: world,
                    state: {},
                    stack: [],
                    tokens: token.value,
                    i: 0,
                    dynParent: world,
                    onEnd: function(world) {
                        for (var i=0; i<world.stack.length; i++) {
                            world.dynParent.stack.push(world.stack[i])
                        }
                    },
                    indent: world.indent + 1,
                    runId: ++thumbscript3.runId,
                }
                
                // newWorld = {
                //     parent: world,
                //     state: {},
                //     stack: [],
                //     tokens: token.value,
                //     i: 0,
                //     dynParent: world,
                //     onEnd: function(world) {
                //         if (Object.keys(world.state).length) {
                //             world.dynParent.stack.push(world.state)
                //         } else {
                //             world.dynParent.stack.push(world.stack)
                //         }
                //     },
                //     indent: world.indent + 1,
                //     runId: ++thumbscript3.runId,
                // }

            // } else if (token.thumbscript_type == "angle") {
            //     world.stack.push({
            //         thumbscript_type: "closure",
            //         tokens: token.value,
            //         world: world,
            //         "dynamic": true,
            //     })
            }
        }
        break
    } while (false)
    world.i++

    world = newWorld
    return world
}

// idea macros?

// `; var code2 = `
// todo closure leakage issue?
var code = `

// 1 2 3 •5 4 6
// foo •(bar baz) biz
// another •"here" two foe


// what (5 •6 4) foobar
// dump
// exit

// 7 •plus (1 •times 2) say

main nameworld

•swap: { :b :a b a }
•drop: { :a }
•loopn: { :n :block 0 :i { i •lt n guard i block i++ repeat } call }
•loopn2: { :n :block 0 :i { i •lt (n •minus 1) guard i block i •plus 2 :i repeat } call }
•range: { :list :block 0 :i list length :theMax •loopn •theMax { :i list •at i i block } }
•ccc: { :l "" :r { drop r swap cc :r } l range r }
•breakcheck: •dyn { { 3 breakn } checkthen }
•guard: •dyn { not { 3 breakn } checkthen }
•loopmax: { :theMax :block 0 :i { block i theMax lt guard i++ repeat } call }
•range2: { :list :block 0 :i list length :theMax •loopn2 •theMax { :i i •plus 1 :i2 list •at i i list •at i2 i2 block } }
•checkthen: { {} check call }
•sayn: { " " join say }
•take: { :n [] :a { drop a swap unshift drop } n loopn a }
•checkn: { :c c length :m { drop :v2 drop :v1 v1 { v2 3 breakn } checkthen } c range2 c •at (m •minus 1) call }
// •shallowcopylist: {
//     [] :n
//     { :i :v n i v set} swap range
// }

["drew" :name] :person
"Drew" person "name" setprop
"Drew2" [person "name"] setc

•setc ("Drew2" [person "name"])
// •setc •[person "name"] "Drew3"

[$hi $my •$is $name $drew] sayn
[$hi $my •"is" $name $drew] sayn
person •at name say



// {
//     "foobar" (1) drop drop
//     dump exit
// } call
// {
//     // "foobar" [1] drop drop
//     // "foobar" 1 drop drop
//     "foobar" (1) drop drop
//     dump exit
// } call
// return

// [ { "hidy hodly" say } { "neighbor" say} ] :mylist
// { :v ~v say } :somefunc
// mylist •at 0 somefunc


// [{ "wohoo" say}] :mylist
// mylist •at 0 call



[
    {x 1 match}
    {"gold"}
    {x 2 match}
    {"green"}
    {x 3 match}
    {"blue"}
    {"pink"}
] :someConds
7 :x
someConds checkn "the color is " swap cc say


"what's going on?" say

20000 say


someConds checkn :color
"the color is " color cc say

2 :x someConds checkn :color
"the color is " color cc say

1 :x someConds checkn :color
"the new color is " color cc say

400 500 600 3 take say


"every day is a new day" " " split :mylist

{
    4 take say
} mylist range2


[] :mylist
•loopn •20 { mylist swap push drop }
mylist sayn


// •loopn •7 {
//     "the number is " swap cc say
// }
// {
//     "the number is " swap cc say
// } 7 loopn

•say "trying again"
1 •plus 100 say

{1 •lt 200} call say
{1 •lt -99} call say
{1 200 lt} call say
{1 -99 lt} call say

{
    0 :i
    i++ "the new i is " i cc say
    i++ "the new i is " i cc say
    i++ "the new i is " i cc say
} call


// this tests static vs dynamic scope
{
    0 :break // for scope
    { funnywrapper nameworld
        // { abstractbreak nameworld 1 breakn } :break
        // ( abstractbreak nameworld 3 breakn ) :break
        { abstractbreak nameworld 3 breakn } dyn :break
        "what is gong on?" say

        // 1 breakn
        return // same as breakn

        // lol we get here if we don't use parens version
        "ok for real" say
    } call
    {
        testwrapper nameworld
        "hello everyone" say
        1 1 match { callingbreak nameworld break } { } check call
        repeat
    } call
    oook say
} :interestingTest
// interestingTest

{ incrfunc nameworld :name
    "the value is " name get cc say
    name get 1 plus name set
} dyn :incr1
{
    testwrapper nameworld
    99 :foo
    $foo incr1
    "after calling incr1, foo is " foo cc say
} call

10 { "yay truthy!" say } checkthen
1 0 match { "should not het here" say } checkthen

"foobar " say





🥶 say
[1 2 "ten"] ccc say
[ one two three four ] ccc say

{
    "the number is " swap cc say
} 7 loopn
"------------" say
{
    :i
    // i •lt 5 guard // that works too
    i •is 6 { 2 breakn } checkthen
    "ok number is " i cc say
} 10 loopn

{
    0 :i {
        i •lt 4 guard
        $looping say
        i++
    } 1000 loopmax
    "i is " i cc say
} call
{
    0 :i {
        i •lt 100 guard
        "looping " i cc say
        i++
    } 10 loopmax
} call

{
    0 :count 0 :i
    {
        i •lt 200 guard i++
        count i plus :count
        repeat
    } call
    "the count is 🧆🧆🧆" count cc say
} call


{
    copylist :theChain
    {
        theChain length 0 match {
            breakn 2
        } { } check call
        theChain length 1 match {
            theChain shift call
            2 breakn
        } {} check call
        theChain shift :cond
        theChain shift :success
        cond {success 2 breakn} {} check call
        repeat
    } call
    // "all done with chain" say
} :ifc

{
    :theChain theChain length :theMax
    {
        :v2 drop :v1 drop
        // v1 { v2 3 breakn } checkthen
        v1 { v2 3 breakn } { } check call
    } theChain range2
    theChain •at (theMax •minus 1) call
} :checkn


[
    {x 1 match}
    {"gold"}
    {x 2 match}
    {"green"}
    {x 3 match}
    {"blue"}
    {"pink"}
] :someConds
7 :x
someConds ifc :color
"the color is " color cc say

2 :x someConds ifc :color
"the color is " color cc say

1 :x someConds ifc :color
"the new color is " color cc say
"----" say
someConds checkn :color
"the color is " color cc say

2 :x someConds checkn :color
"the color is " color cc say

1 :x someConds checkn :color
"the new color is " color cc say

$Drew :name
name say
[999 2 3 4] :mylist

"the first item is " mylist 0 prop cc say
[$blue :eyes $brown :hair] :info

info say
info .eyes say

info $eyes prop say

info $hair prop say

info $ha $ir cc prop say

$ha $ir cc :key
info key prop
say

[
    $Drew :name
    38 :age
    [
        $programming $volleybal $family
    ] :hobbies
    [
        [
            1 :a 500 :b
        ] :main
        [
            2002 :b
        ] :secondary
    ] :work
] :person

person say

1 :x
"The selected b is " [person $work $secondary $b] props cc say


"how on earth??? 🌍" say
2011 [person $work $secondary $b] setc
"The selected b is " [person $work $secondary $b] props cc say
"The selected b is " [person $work x 1 match $main $secondary check $b] props cc say


"hello world" :message

"The message is " message cc say



"The list has " mylist length cc " elements" cc say
«The list has » mylist length cc « elements» cc say


$hi :name2
name2 say



$Why $hello cc name cc
say

3 1 plus say
7 {1 plus} call
say

9 :x 10 :y

x y plus say

{10 plus} :add10
27 add10 say


{ :x { x++ x } } :increr2
20 increr2 :incr2

{ drop incr2 say } 22 loopn

{ $! cc } :exclaim


{say} :sayo
foobar sayo

$hi exclaim
$bye exclaim
cc say

{ cc } :b
$foo $bow b say


{
    $hello say
    $goodbye say
    return
    $goodday say
    $sir say
} :something1
something1

{
    10 :x

    // x 10 match
    // 200
    // 300
    // check

    x 10 match {
        200
        2 breakn
    } { 300 } check call

    500
} :something2
something2
say
`





thumbscript3.eval(code)















/*




*/

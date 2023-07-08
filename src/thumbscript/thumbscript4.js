
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
                tokens.push("/")
                state = "out"
            }
        } else if (state == "comment") {
            if ("\n".indexOf(chr) != -1) {
                state = "out"
            }
        }
    }
    // showLog()
    tokens = thumbscript3.squishFuncs(tokens)
    tokens = thumbscript3.desugarAtSign(tokens)
    // log2(tokens)
    return tokens
}
thumbscript3.desugarAtSign = function(tokens) {
    return tokens
}

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
                thumbscript_type: "func",
                value: thumbscript3.desugarAtSign(r),
            })
        } else if (token == "]") {
            var r = newTokens
            newTokens = tokenStack.pop()
            newTokens.push({
                thumbscript_type: "list",
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
    var world = {
        state: {},
        stack: [],
        tokens: tokens,
        i: 0,
        parent: null
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
        world = thumbscript3.next(world)
        if (!world) {
            break
        }
        // log2("//" + world.tokens.slice(world.i, world.i+1))
        // log2("+ in world " + world.name + "(" +world.runId+") < " + world.parent?.name )
    }
}

thumbscript3.runAsync = function(world) {
    world = thumbscript3.next(world)
    if (!world) {
        return
    }
    // log2(Object.keys(world))
    log2("//" + world.tokens.slice(world.i, world.i+1))
    log2("+ in world " + world.name + "(" +world.runId+") < " + world.parent?.name )
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
    say: thumbscript3.genFunc1NoReturn(a => { log2(a) }),
    cc: thumbscript3.genFunc2((a, b) => a + b),
    add: thumbscript3.mathFunc2((a, b) => a + b),
    plus: thumbscript3.mathFunc2((a, b) => a + b),
    more: thumbscript3.mathFunc2((a, b) => a + b),
    less: thumbscript3.mathFunc2((a, b) => a - b),
    times: thumbscript3.mathFunc2((a, b) => a * b),
    div: thumbscript3.mathFunc2((a, b) => a * b),
    isasc: thumbscript3.mathFunc2((a, b) => a < b),
    isdesc: thumbscript3.mathFunc2((a, b) => a > b),
    isasceq: thumbscript3.mathFunc2((a, b) => a <= b),
    isdesceq: thumbscript3.mathFunc2((a, b) => a >= b),
    match: thumbscript3.mathFunc2((a, b) => a == b),
    prop: thumbscript3.genFunc2((a, b) => a[b]),
    props: thumbscript3.genFunc1((a) => {
        var v = a[0]
        for (var i = 1; i < a.length; i++) { v = v[a[i]] }
        return v
    }),
    index: thumbscript3.genFunc2((a, b) => a[b]),
    "check": thumbscript3.genFunc3((a, b, c) => (a ? b : c) ),
    "return": function(world) {
        // world = world.dynParent
        world = world.parent
        // todo: see onend
        return world
    },
    "breakn": function(world) {
        var a = world.stack.pop()
        a = a-0
        for (var i=0; i<a; i++) {
            // i originally had dynParent but it wasn't right
            // like when I wrapped if
            world = world.parent
            // todo: see onend
        }
        return world
    },
    nameworld: function(world) {
        var a = world.stack.pop()
        world.name = a
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
    "length": function(world) {
        var a = world.stack.pop()
        world.stack.push(a.length)
        return world
    },
    "pop": function(world) {
        var a = world.stack.pop()
        world.stack.push(a.pop())
        return world
    },
    "shift": function(world) {
        var a = world.stack.pop()
        world.stack.push(a.shift())
        return world
    },
    "copylist": function(world) {
        var a = world.stack.pop()
        world.stack.push([...a])
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
            runId: ++thumbscript3.runId
        }

        if (f.paren) {
            world.parent = oldWorld
        }
        return world
    },
    runid: function(world) {
        world.stack.push(world.runId)
        return world
    },
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
        // if (!world) {
        //     return false
        // }
        if (world.i >= world.tokens.length) {
            if (world.dynParent) {
                if (world.onEnd) {
                    world.onEnd(world)
                }
                world = world.dynParent
                // the stacks shoild point to same thing
                return world
            }
            return false
        }
        var newWorld
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
            if (token.startsWith("->")) {
                world.stack.push(token.slice(2))
                newWorld = thumbscript3.builtIns.set(world)
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

            // this tilde thing doesn't work?
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
            if (token.thumbscript_type == "func") {
                world.stack.push({
                    thumbscript_type: "closure",
                    tokens: token.value,
                    world: world,
                })
            } else if (token.thumbscript_type == "list") {
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
                    }
                }
            } else if (token.thumbscript_type == "paren") {
                world.stack.push({
                    thumbscript_type: "closure",
                    tokens: token.value,
                    world: world,
                    "paren": true,
                })
                // newWorld = {
                //     parent: world,
                //     state: {},
                //     stack: [],
                //     tokens: token.value,
                //     i: 0,
                //     dynParent: world,
                //     onEnd: function(world) {
                //         world.dynParent.stack = world.dynParent.stack.concat(world.stack)
                //     }
                // }
            }
        }
        break
    } while (false)
    world.i++

    if (newWorld) {
        world = newWorld
    }
    return world
}

// idea macros?

// `; var code2 = `
// todo closure leakage issue?
var code = `
main nameworld
{
    0 ->break // for scope
    { funnywrapper nameworld
        // { abstractbreak nameworld 1 breakn } ->break
        ( abstractbreak nameworld 3 breakn ) ->break
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
} ->interestingTest
// interestingTest


( incrfunc nameworld ->name
    "the value is " name get cc say
    name get 1 add name set
) ->incr1

{
    testwrapper nameworld
    99 ->foo
    $foo incr
    foo say
} call

{ {} check call } ->checkthen
10 { "yay truthy!" say } checkthen
1 0 match { "should not het here" say } checkthen

"foobar " say

// I don't like this loop
{
    :body :next :checky
    {
        checky {
            body
            next
        } {
            2 breakn
        } check call
        repeat
    } call
} :loopy

0 :count
0 :i {i 100 isasc}{i 1 plus :i} {
    count i plus :count
} loopy

"the count is 🧆🧆🧆" count cc say


{
    ->block
    ->max
    0 ->ii
    {
        block
        "hahah" say
        ii max match { 2 breakn } checkthen
        ii 1 add ->ii
        repeat
    } call
} ->loopmax

{ ->block ->list 0->i list length ->max
  {
    i max match { 2 breakn } checkthen
    1 i add ->i
    i list i prop block
    repeat
  } call
} ->range

{
   ->block
   ->n
   {
       $i incr1
       repeat
   } call
} ->loopn


0 ->i 1000 {
    $looping say
    i 4 match { 2 breakn } checkthen
    i 1 more ->i
} loopmax

"i is " i cc say



// return

// 0 ->count 0 ->i {
//     // i 200 match { 2 breakn } { } check call
//     i 200 match { 2 breakn } checkthen
//     i 1 add ->i
//     count i add ->count
//     repeat
// } call

"the count is 🧆🧆🧆" count cc say

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


{ :x { 1 x plus :x x } } :increr2
20 increr2 :incr2
incr2 say
incr2 say
incr2 say
incr2 say

•increr3: {
    :x
    {
        •x: # 1 •plus x
    }
}

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

n < 100


n 100 isasc
n 100 isdsc





*/

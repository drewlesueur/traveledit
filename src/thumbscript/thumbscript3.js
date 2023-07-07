
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
                state = "slash"
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
    newTokens = thumbscript3.squishFuncs(tokens)
    return newTokens
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
        } else if (token == "}") {
            var r = newTokens
            newTokens = tokenStack.pop()
            newTokens.push({
                thumbscript_type: "func",
                value: r,
            })
        } else if (token == "]") {
            var r = newTokens
            newTokens = tokenStack.pop()
            newTokens.push({
                thumbscript_type: "list",
                value: r,
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
    // 
    // thumbscript3.runAsync(world)
}

thumbscript3.run = function(world) {
    while (true) {
        world = thumbscript3.next(world)
        if (!world) {
            break
        }
        // log2("// " +world.tokens.slice(world.i - 1).join(" "))
    }
}

thumbscript3.runAsync = function(world) {
    world = thumbscript3.next(world)
    if (!world) {
        return
    }
    // log2(Object.keys(world))
    log2("//" + world.tokens.slice(world.i - 1).join(" "))
    setTimeout(function() { thumbscript3.runAsync(world) }, 500)
    f99.lines = debugOutput
    render()
}

thumbscript3.mathFunc = function(f) {
    return function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push(f((a-0), (b-0)))
        return world
    }
}
// built in funcs have to have func call last?
thumbscript3.builtIns = {
    // "(": function(world) {
    //     var oldWorld = world
    //     world = {
    //         parent: oldWorld,
    //         state: {},
    //         stack: [],
    //         tokens: oldWorld.tokens,
    //         i: oldWorld.i,
    //         dynParent: oldWorld
    //     }
    //     return world
    // },
    // ")": function(world) {
    //     newWorld = world.dynParent
    //     newWorld.stack = newWorld.stack.concat(world.stack)
    //     return newWorld
    // },
    
    // we now squish these so we don't need them
    // "[": function(world) {
    //     var oldWorld = world
    //     world = {
    //         parent: oldWorld,
    //         state: {},
    //         stack: [],
    //         tokens: oldWorld.tokens,
    //         i: oldWorld.i+1,
    //         dynParent: oldWorld
    //     }
    //     return world
    // },
    // "]": function(world) {
    //     newWorld = world.dynParent
    //     // also push the state if needed
    //     if (Object.keys(world.state).length) {
    //         newWorld.stack.push(world.state)
    //     } else {
    //         newWorld.stack.push(world.stack)
    //     }
    //     newWorld.i = world.i + 1
    //     return newWorld
    // },
    set: function(world) {
        var a = world.stack.pop()
        var b = world.stack.pop()
        var w = null
        for (w = world; w != null; w = w.parent) {
            if (a in w.state) {
                break
            }
        }
        if (w == null) {
            w = world
        }
        w.state[a] = b
        return world
    },
    setc: function(world) {
        var a = world.stack.pop()
        var b = world.stack.pop()
        world.stack.push(a.slice(0,-1))
        thumbscript3.builtIns.ats(world)
        obj = world.stack.pop()
        obj[a[a.length-1]] = b
        return world
    },
    say: function(world) {
        var a = world.stack.pop()
        log2(a)
        return world
    },
    concat: function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push(a + b)
        return world
    },
    "cc": function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push(a + b)
        return world
    },
    add: function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push((a-0) + (b-0))
        return world
    },
    "+": function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push((a-0) + (b-0))
        return world
    },
    "-": function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push((a-0) - (b-0))
        return world
    },
    "*": function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push((a-0) * (b-0))
        return world
    },
    "/": function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push((a-0) / (b-0))
        return world
    },
    "<": function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push((a-0) < (b-0))
        return world
    },
    ">": function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push((a-0) > (b-0))
        return world
    },
    "is": function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push(a == b)
        return world
    },
    "at": function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push(a[b])
        return world
    },
    "ats": function(world) {
        var a = world.stack.pop()
        var v = a[0]
        for (var i = 1; i < a.length; i++) {
            v = v[a[i]]
        }
        world.stack.push(v)
        return world
    },
    "if": function(world) {
        var c = world.stack.pop()
        var b = world.stack.pop()
        var a = world.stack.pop()
        if (a) {
            world.stack.push(b)
        } else {
            world.stack.push(c)
        }
        return world
    },
    "return": function(world) {
        world = world.dynParent
        return world
    },
    "break": function(world) {
        var a = world.stack.pop()
        a = a-0
        for (var i=0; i<a; i++) {
            world = world.dynParent
        }
        return world
    },
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
            dynParent: oldWorld
        }
        return world
    },
    tailcall: function(world) {
        var f = world.stack.pop()
        world.i = -1 // because same world and will increment
        world.tokens = f.tokens
        return world
    },
    tailcallself: function(world) {
        world.i = -1 // because same world and will increment
        return world
    },
    calld: function(world) {
        var f = world.stack.pop()
        var oldWorld = world
        world = {
            parent: oldWorld,
            state: {},
            stack: oldWorld.stack,
            tokens: f.tokens,
            i: 0,
            dynParent: oldWorld
        }
        return world
    },
}
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
            if (token.startsWith(".")) {
                world.stack.push(token.slice(1))
                newWorld = thumbscript3.builtIns.at(world)
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
            // The only object we have not is an array which means a function definition
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

// todo closure leakage issue?
var code = `
{
    :body :next :check
    {
        check {
            body
            next
        } {
            2 break
        } if call
        tailcallself
    } call
} :loop

0 :count
0 :i {i 4 <}{i 1 add :i} {
    count i add :count
} loop

"the count is " count cc say

{
    copylist :theChain
    {
        theChain length 0 is {
            break 2
        } { } if call
        theChain length 1 is {
            theChain shift call
            2 break
        } {} if call
        theChain shift :cond
        theChain shift :success
        cond {success 2 break} {} if call
        tailcallself
    } call
    // "all done with chain" say
} :ifc


[
    {x 1 is}
    {"gold"}
    {x 2 is}
    {"green"}
    {x 3 is}
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
return



// {incr
//     :body :incr :until :init
//     init
//
//     {
//
//     }
// } :loop
// {
//     :theChain
//     theChain length 1 is {
//         theChain pop
//     } {
//         theChain pop :cond
//         theChain pop :success
//         cond1 call {success} {theChain ifc} if
//     } if call
//
// } :ifc

$Drew :name
name say
$ someone
[999 2 3 4] :mylist

"the first item is " mylist 0 at cc say
[$blue :eyes $brown :hair] :info

info say
info .eyes say

info $eyes at say

info $hair at say

info $ha $ir concat at say

$ha $ir concat :key
info key at
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
"The selected b is " [person $work $secondary $b] ats cc say
2012 [person $work $secondary $b] setc
"The selected b is " [person $work $secondary $b] ats cc say
"The selected b is " [person $work x 1 is $main $secondary if $b] ats cc say





"hello world" :message

"The message is " message concat say



"The list has " mylist length cc " elements" cc say
«The list has » mylist length cc « elements» cc say


$hi :name2
name2 say



$Why $hello concat name concat
say

3 1 add say
7 {1 add} call
say

9 :x 10 :y

x y add say

{10 add} :add10
27 add10 say


{ :x { 1 x add :x x } } :increr2
20 increr2 :incr2

incr2 say
incr2 say
incr2 say
incr2 say

{ $! concat } :exclaim


{say} :sayo
foobar sayo

$hi exclaim
$bye exclaim
concat say

{ concat } :b
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
    
    // x 10 is
    // 200
    // 300
    // if
    
    x 10 is {
        200
        2 break
    } { 300 } if call
    
    500
} :something2
something2
say
`





/*

200 []
9009 (person.work.())
90009 person.work.secondary ::b

9009 person .work . (x 1 eq $main $secondary) at ::b
9009 :person.work.secondary.b
[person $work x 1 eq $main $secondary] @

9009 [person $work x 1 eq {$main} {$secondary} $b] setv

{ {x 1 is} {x 2 is} and }
{ true say }
{ false say } if

[
    {x 1 is}
    { `x is 1` say}
    {x 2 is}
    {"x is 2" say}
] switch

[person $work $secondary $b] get say



90 person.work.secondary.b

x is neg 3

x is (3 neg)

x is 1 and y is 2

x is (7 3 plus)

x is (3 1 add)

foo: 3


name: $Drew
say name
mylist: [999 2 3 4]

say mylist.0
info: [eyes: $blue hair: $brown]
info: [eyes: 1 2 add hair: $brown]
say info


increr2: { :x { x: 1 + x x } }

$Drew ;name
name say
$ someone
[999 2 3 4] ;mylist

mylist 0 . say
[$blue ;eyes $brown ;hair] ;info

info say
info $eyes . say

info $hair at say

info $ha $ir concat at say

$ha $ir concat :key
info key at

x (x plus 1)
say


@name: $Drew
@say name

x @is 1


$Drew :name
name say
$ someone
[999 2 3 4] :mylist


*/
thumbscript3.eval(code)


var thumbscript3 = {}

// todo strings
thumbscript3.tokenize = function(code) {
    var currentIndent = 0
    var lastIndent = 0
    needsClose = []
    // removing empty lines
    code = code
        .split('\n')
        .filter(line => line.trim() !== '')
        .join('\n');

    code = code.replace(/\(/g, " ( ")
    code = code.replace(/\)/g, " ) ")
    code = code.replace(/\{/g, " { ")
    code = code.replace(/\}/g, " } ")
    code = code.replace(/\[/g, " [ ")
    code = code.replace(/\]/g, " ] ")
    code = code.replace(/\./g, " .")
    // code = code.replace(/:/g, " : ")
    // code = code.replace(/\|/g, " | ")
    // code = code.replace(/\*/g, " * ")
    code = code.replace(/^ +/mg, function (x) { return "indent ".repeat(Math.floor(x.length / 4))})
    code = code.replace(/\n/g, " newline ")
    var tokens = code.split(/ +/)
    tokens.push("newline")
    tokens.push("final")
    var newTokens = []
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i]
        if (token == "newline") {
            lastIndent = currentIndent
            currentIndent = 0
        } else if (token == "indent") {
            currentIndent++
        } else {
            // log2(`token: ${token}, currentIndent: ${currentIndent}, lastIndent: ${lastIndent}`)
            if (currentIndent <= lastIndent) {
                while (true) {
                    if (needsClose.length == 0) {
                        break
                    }
                    var n = needsClose.pop()
                    // log2("n is " + n)
                    if (n.n >= currentIndent) {
                        newTokens.push(n.close)
                    } else {
                        needsClose.push(n)
                        break
                    }
                }
            }

            // go to newline
            for (i; i < tokens.length; i++) {
                var tok = tokens[i]
                if (tok == "newline") {
                    i--
                    break
                } else if (tok == ":") {
                    newTokens.push("(")
                    needsClose.push({n: currentIndent, close: ")"})
                } else if (tok == "|") {
                    newTokens.push("{")
                    needsClose.push({n: currentIndent, close: "}"})
                } else if (tok == "*") {
                    newTokens.push("[")
                    needsClose.push({n: currentIndent, close: "]"})
                } else {
                    newTokens.push(tok)
                }
            }
        }
    }
    newTokens = thumbscript3.squishFuncs(newTokens)
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
        } else if (token == "}") {
            var r = newTokens
            newTokens = tokenStack.pop()
            newTokens.push(r)
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
    // log2(world)
    // showLog()
    thumbscript3.run(world)
    // thumbscript3.runAsync(world)
}

thumbscript3.run = function(world) {
    while (true) {
        world = thumbscript3.next(world)
        if (!world) {
            break
        }
    }
}

thumbscript3.runAsync = function(world) {
    world = thumbscript3.next(world)
    if (!world) {
        return
    }
    // log2(Object.keys(world))
    log2(world.tokens.slice(world.i - 1).join(" "))
    showLog()
    setTimeout(function() { thumbscript3.runAsync(world) }, 250)
}

thumbscript3.taker = function(type) {
    return function(world) {
        var a = world.stack.pop()
        if (typeof a != type) {
            world.stack.push(a) // stacks are the same
            world.i--
            var funcWorld = world
            world = world.dynParent
            world.waitingFuncs.push(world.waitingFunc)
            world.waitingFunc = funcWorld
        }
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
    "[": function(world) {
        var oldWorld = world
        world = {
            parent: oldWorld,
            state: {},
            stack: [],
            tokens: oldWorld.tokens,
            i: oldWorld.i+1,
            dynParent: oldWorld
        }
        return world
    },
    "]": function(world) {
        newWorld = world.dynParent
        // also push the state if needed
        if (Object.keys(world.state).length) {
            newWorld.stack.push(world.state)
        } else {
            newWorld.stack.push(world.stack)
        }
        newWorld.i = world.i + 1
        return newWorld
    },
    set: function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
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
    set2: function(world) {
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
    say: function(world) {
        var a = world.stack.pop()
        // alert("hi")
        log2(a)
        return world
    },
    // _print_world: function(world) {
    //     // var world2 = {...world}
    //     // delete world2.parent
    //     // delete world2.dynParent
    //     // delete world2.waitingFunc
    //     // delete world2.waitingFuncs
    //     log2(world.state)
    //     return world
    // },
    // the take stuff not implemented yet
    takeString: thumbscript3.taker("string"),
    takeNumber: thumbscript3.taker("number"),
    takeBoolean: thumbscript3.taker("boolean"),
    takeObject: thumbscript3.taker("object"),
    concat: function(world) {
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
    "length": function(world) {
        var a = world.stack.pop()
        world.stack.push(a.length)
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
}
thumbscript3.next = function(world) {
    do {
        // if (!world) {
        //     return false
        // }
        if (world.i >= world.tokens.length) {
            if (world.dynParent) {
                world = world.dynParent
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
                newWorld = thumbscript3.builtIns.set2(world)
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
            world.stack.push({
                thumbscript_type: "closure",
                tokens: token,
                world: world,
            })
        }
        break
    } while (false)
    
    
    // check call. (breaks if more than one thing pushed to stack at same time)
    // while (world.waitingFunc != null && world.stack.length >= 1) {
    //     var oldWorld = world
    //     world = world.waitingFunc
    //     world.waitingFunc = world.waitingFuncs.pop()
    // }
    world.i++
    
    if (newWorld) {
        world = newWorld
    }
    return world
}

// todo closure leakage issue?
var code = `
$Drew :name
name say

[999 2 3 4] :mylist

mylist.0 say
[$blue :eyes $brown :hair] :info
info.eyes say

info $hair at say





$The_list_has
mylist length 
concat $elements concat say

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

`
/*
*/
thumbscript3.eval(code)

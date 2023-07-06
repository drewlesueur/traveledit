
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
    code = code.replace(/\[/g, " ] ")
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
    thumbscript3.run(world)
}

thumbscript3.run = function(world) {
    while (true) {
        thumbscript3.next(world)
        if (world.i >= world.tokens.length) {
            break
        }
    }
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
    _set: function(world) {
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
    },
    _set2: function(world) {
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
    },
    _say: function(world) {
        var a = world.stack.pop()
        // alert("hi")
        log2(a)
    },
    takeString: thumbscript3.taker("string"),
    takeNumber: thumbscript3.taker("number"),
    takeBoolean: thumbscript3.taker("boolean"),
    takeObject: thumbscript3.taker("object"),
    _concat: function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push(a + b)
    },
    _add: function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push((a-0) + (b-0))
    },
    _call: function(world) {
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
        thumbscript3.run(world)
        world = oldWorld
    },
}
thumbscript3.next = function(world) {
    do {
        var token = world.tokens[world.i]
        if (typeof token == "string") {
            var doCall = true
            
            if (token.startsWith("/")) {
                world.stack.push(token.slice(1))
                break
            }
            if (token in thumbscript3.builtIns) {
                thumbscript3.builtIns[token](world)
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
                thumbscript3.builtIns._call(world)
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
    
    
    // check call.
    // while (world.waitingFunc != null && world.stack.length >= 1) {
    //     var oldWorld = world
    //     world = world.waitingFunc
    //     world.waitingFunc = world.waitingFuncs.pop()
    // }
    world.i++
}

// todo closure leakage issue?
var code = `
name Drew _set
name _say
Why hello _concat name _concat
_say

3 1 _add _say
7 {1 _add} _call
_say


x 9 _set

add10 {10 _add} _set

27 add10 _say

increr {
    /x _set2
    {
        /x 
            1 x _add
        _set
        x 
    }
} _set

incr 100 increr _set

incr _say
incr _say
incr _say
incr _say


/sayo {_say} _set
foobar sayo

/say { takeString _say}





`
thumbscript3.eval(code)

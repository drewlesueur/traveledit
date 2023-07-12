
var thumbscript4 = {}

const stringType = 0;
const numberType = 1;
const squareType = 2;
const curlyType = 3;
const parenType = 4;
const builtInType = 5;
const varType = 6;
const closureType = 7; // runtime only

// thumbscript2 parser was cool with optional significant indenting
thumbscript4.tokenize = function(code) {
    var state = "out"
    var currentToken = ""
    var tokens = []
    string2OpenCount = 0
    var quoteNext = false
    
    code += "\n" // to simplify last token
    var addToken = function(token) {
        if (quoteNext) {
            quoteNext = false
            token = "$" + token
        }
        if (token - 0 == token) {
            addToken2(token-0)
            return
        }
        if (typeof token == "string" && token.endsWith("++")) {
            addToken2("$" + token.slice(0, -2))
            addToken2("setplus1")
            return
        }
        if (typeof token == "string" && token.startsWith("#")) {
            addToken2("$" + token.slice(0, -1))
            addToken2("nameworld")
            return
        }
        // if (token == "->") {
        //     addToken2("•")
        //     addToken2("setc")
        // } else if (token == "->1") {
        //     addToken2("•")
        //     addToken2("set")
        // } else if (token == "1<-") {
        //     addToken2("•")
        //     addToken2("setb")
        // } else if (token == "<-") {
        //     addToken2("•")
        //     addToken2("setcb")
        // } else if (token == ":") {
        //     addToken2("•")
        //     addToken2("setcb")
        // } else {
            addToken2(token)
        // }
    }

    // lol
    var addToken2 = function(token) {
        if (typeof token == "string") {
            // not sure if faster
            if (token.charAt(0) == "$") {
                token = {th_type: stringType, valueString: token.slice(1)}
            } else if (token in thumbscript4.builtIns) {
                token = {th_type: builtInType, valueFunc: thumbscript4.builtIns[token], name: token}
            } else {
                var preventCall = false
                if (token.startsWith("~")) {
                    preventCall = true
                    token = token.slice(1)
                }
                token = {th_type: varType, valueString: token, preventCall: preventCall}
            }
        } else if (typeof token == "number") {
            token = {th_type: numberType, valueNumber: token}
        } else {
            log2("- unknowntoken type")
            log2(token)
        }
        tokens.push(token)
    }
    for (var i=0; i < code.length; i++) {
        var chr = code.charAt(i)

        if (state == "out") {
            if ("()[]{}".indexOf(chr) != -1) {
                addToken(chr)
            } else if (":".indexOf(chr) != -1) {
                // some fancy desugaring here and below
                // x: y means x 1<- y
                // y :x means y ->1 x
                // [w x]: y means [w x] <- y
                // y :[w x] means y -> [w x]
                // more desugaring happens in desugarArrows
                
                var nextChar = code.charAt(i+1)
                if (" \n\t".indexOf(nextChar) != -1) {
                    // [foo bar]: 100
                    addToken("<-")
                } else if ("[".indexOf(nextChar) != -1) {
                     // 500 :[foo bar]
                     addToken("->")
                } else {
                     // 500 :baz
                    addToken("->1")
                    quoteNext = true
                    
                }
                currentToken = ""
                state = "out"
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
                addToken(currentToken) 
                addToken(chr)
                currentToken = ""
                state = "out"
            } else if (":".indexOf(chr) != -1) {
                addToken("$" + currentToken) 
                addToken("1<-")
                currentToken = ""
                state = "out"
            } else if (" \n\t".indexOf(chr) != -1) {
                addToken(currentToken)
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
                addToken("$" + currentToken)
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
                    addToken("$" + currentToken)
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
                // addToken("/")
                // state = "out"
                currentToken = "/"
                state = "in"
            }
        } else if (state == "dot") {
            if ("•@".indexOf(chr) != -1) {
                currentToken += chr
            } else {
                i--
                addToken(currentToken)
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
    tokens = thumbscript4.squishFuncs(tokens)
    // log2(tokens)
    tokens = thumbscript4.desugar(tokens)
    // log2(tokens)
    return tokens
}
thumbscript4.desugar = function(tokens) {
    tokens = thumbscript4.desugarArrows(tokens)
    // log2(tokens)
    tokens = thumbscript4.desugarAtSign(tokens)
    // log2(tokens)
    return tokens
}
thumbscript4.desugarArrows = function(tokens) {
    // return tokens
    var newTokens = []
    var i = 0
    
    var dotToken = {th_type: varType, valueString: "•", preventCall: false}
    var setToken = {th_type: builtInType, valueFunc: thumbscript4.builtIns.set, name: "set"}
    var setcToken = {th_type: builtInType, valueFunc: thumbscript4.builtIns.setc, name: "setc"}

    while (i < tokens.length) {
        var token = tokens[i]
        // this does it in such a way that you can chain the stuff with dots when going backwards
        if (token.th_type === varType) {
            // log2("yay: " + token.valueString)
            switch (token.valueString) {
                case "->":
                    // 100 -> [a $b]
                    // 100 [a $b] setc
                    newTokens.push(dotToken)
                    newTokens.push(setcToken)
                    break
                case "->1":
                    // 100 -> a
                    // 100 a set
                    newTokens.push(dotToken)
                    newTokens.push(setToken)
                    break
                case "<-":
                    // [a $b] <- 100
                    // 100 [a $b] setc
                    var lastToken = newTokens.pop()
                    newTokens.push(dotToken)
                    newTokens.push(setcToken)
                    newTokens.push(dotToken)
                    newTokens.push(lastToken)
                    break
                case "1<-":
                    // a <- 100
                    // 100 a set
                    var lastToken = newTokens.pop()
                    newTokens.push(dotToken)
                    newTokens.push(setToken)
                    newTokens.push(dotToken)
                    newTokens.push(lastToken)
                    break
                default:
                    newTokens.push(token)
                    break
            } 
        } else {
            newTokens.push(token)
        }
        i++
    }
    return newTokens
}
thumbscript4.desugarAtSign = function(tokens) {
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

        if (token.th_type == varType) {
            var j = 0
            while (j < token.valueString.length && "@•".indexOf(token.valueString.charAt(j)) != -1) {
                j++
            }
            if (j == 0) {
                newTokens.push(token)
                // newTokens.push(token)
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
thumbscript4.squishFuncs = function(tokens) {
    // function definitions can be turned into an array
    var newTokens = []
    var tokenStack = []
    var i = 0
    while (i < tokens.length) {
        var token = tokens[i]
        if (token.valueString == "{") {
            tokenStack.push(newTokens)
            newTokens = []
        } else if (token.valueString == "[") {
            tokenStack.push(newTokens)
            newTokens = []
        } else if (token.valueString == "(") {
            tokenStack.push(newTokens)
            newTokens = []
        } else if (token.valueString == "}") {
            var r = newTokens
            newTokens = tokenStack.pop()
            newTokens.push({
                th_type: curlyType,
                valueArr: thumbscript4.desugar(r),
            })
        } else if (token.valueString == "]") {
            var r = newTokens
            newTokens = tokenStack.pop()
            newTokens.push({
                th_type: squareType,
                valueArr: thumbscript4.desugar(r),
            })
        } else if (token.valueString == ")") {
            var r = newTokens
            newTokens = tokenStack.pop()
            newTokens.push({
                th_type: parenType,
                valueArr: thumbscript4.desugar(r),
            })
        } else {
            newTokens.push(token)
        }
        i++
    }
    return newTokens
}

thumbscript4.eval = function(code, state) {
    
    // I tried to pass in the state of the stdlib
    // wasn't working, so just doing this hacky string concat.
    // would be nice to grab the state of the stdlib
    // problem might be some function scope?
    // look later
    code = thumbscript4.stdlib + code
    
    var tokens = thumbscript4.tokenize(code)
    // return
    world = {
        state: state || {},
        stack: [],
        tokens: tokens,
        i: 0,
        parent: null,
        indent: 0,
        runId: 0,
        name: "main",
        cachedLookupWorld: {},
    }
    world.global = world
    thumbscript4.run(world)
    return world

    // window.f99 = makeFile("__output", 0, "")
    // f99.fileMode = "file"
    // f99.cursorLineIndex = 0
    // f99.lines = debugOutput
    // addFileToList(f99)
    // clearTimeout(window.t99)
    // thumbscript4.runAsync(world)
}

thumbscript4.run = function(world) {
    while (true) {
        // log2("\t".repeat(world.indent) + "// token: " + JSON.stringify(world.tokens.slice(world.i, world.i+1)[0]))
        newWorld = thumbscript4.next(world)
        if (!newWorld) {
            return world
        }
        world = newWorld
        // log2("\t".repeat(world.indent) + "// stack: " + JSON.stringify(world.stack))
        // if (world.name) {
        //     log2("\t".repeat(world.indent) + "+ in world " + world.name + "(" +world.runId+") < " + (world.parent?.name || "") )
        // }
    }
}

thumbscript4.runAsync = function(world) {
    world = thumbscript4.next(world)
    if (!world) {
        return
    }
    // log2(Object.keys(world))
    log2("//" + world.tokens.slice(world.i, world.i+1))
    log2("in world " + world.name + "(" +world.runId+") < " + world.parent?.name )
    window.t99 = setTimeout(function() { thumbscript4.runAsync(world) }, 250)
    f99.lines = debugOutput
    render()
    
}

thumbscript4.genFunc0 = function(f) {
    return function(world) {
        world.stack.push(f())
        return world
    }
}
thumbscript4.genFunc1 = function(f) {
    return function(world) {
        var a = world.stack.pop()
        world.stack.push(f(a))
        return world
    }
}
thumbscript4.genFunc1NoReturn = function(f) {
    return function(world) {
        var a = world.stack.pop()
        f(a)
        return world
    }
}
thumbscript4.genFunc2 = function(f) {
    return function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push(f(a, b))
        return world
    }
}
thumbscript4.genFunc3 = function(f) {
    return function(world) {
        var c = world.stack.pop()
        var b = world.stack.pop()
        var a = world.stack.pop()
        world.stack.push(f(a, b, c))
        return world
    }
}
// built in funcs have to have func call last?
thumbscript4.builtIns = {
    say: thumbscript4.genFunc1NoReturn(a => { log2(a) }),
    cc: thumbscript4.genFunc2((a, b) => a + b),
    nowmillis: thumbscript4.genFunc0(() => Date.now()),
    plus: thumbscript4.genFunc2((a, b) => a + b),
    minus: thumbscript4.genFunc2((a, b) => a - b),
    times: thumbscript4.genFunc2((a, b) => a * b),
    divide: thumbscript4.genFunc2((a, b) => a * b),
    lt: thumbscript4.genFunc2((a, b) => a < b),
    gt: thumbscript4.genFunc2((a, b) => a > b),
    lte: thumbscript4.genFunc2((a, b) => a <= b),
    gte: thumbscript4.genFunc2((a, b) => a >= b),
    match: thumbscript4.genFunc2((a, b) => a == b),
    is: thumbscript4.genFunc2((a, b) => a == b),
    eq: thumbscript4.genFunc2((a, b) => a === b),
    ne: thumbscript4.genFunc2((a, b) => a !== b),
    prop: thumbscript4.genFunc2((a, b) => a[b]),
    at: thumbscript4.genFunc2((a, b) => a[b]),
    props: thumbscript4.genFunc1((a) => {
        var v = a[0]
        for (var i = 1; i < a.length; i++) { v = v[a[i]] }
        return v
    }),
    not: thumbscript4.genFunc1((a) => !!!a),
    "check": thumbscript4.genFunc3((a, b, c) => (a ? b : c) ),
    "if": thumbscript4.genFunc3((a, b, c) => (a ? b : c) ),
    length: thumbscript4.genFunc1((a) => a.length),
    push: thumbscript4.genFunc2((a, b) => a.push(b)),
    pop: thumbscript4.genFunc1((a) => a.pop()),
    unshift: thumbscript4.genFunc2((a, b) => a.unshift(b)),
    shift: thumbscript4.genFunc1((a) => a.shift()),
    split: thumbscript4.genFunc2((a, b) => a.split(b)),
    join: thumbscript4.genFunc2((a, b) => a.join(b)),
    copylist: thumbscript4.genFunc1((a) => [...a]),
    dyn: function(world) {
        var a = world.stack.pop()
        a.dynamic = true
        world.stack.push(a)
        return world
    },
    local: function(world) {
        var a = world.stack.pop()
        a.local = true
        world.stack.push(a)
        return world
    },
    get: function(world) {
        var a = world.stack.pop()
        var w = thumbscript4.getWorldForKey(world, a, false, false)
        world.stack.push(w.state[a])
        return world
    },
    set: function(world) {
        var a = world.stack.pop()
        var b = world.stack.pop()
        var w = thumbscript4.getWorldForKey(world, a, false, true)
        w.state[a] = b
        return world
    },
    setb: function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        var w = thumbscript4.getWorldForKey(world, a, false, true)
        w.state[a] = b
        return world
    },
    setplus1: function(world) {
        var a = world.stack.pop()
        var w = thumbscript4.getWorldForKey(world, a, false, true)
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
        thumbscript4.builtIns.props(world)
        obj = world.stack.pop()
        obj[a[a.length-1]] = b
        return world
    },
    setcb: function(world) {
        // TODO: implement in thumbscript itself
        var b = world.stack.pop()
        var a = world.stack.pop()
        // try {
            world.stack.push(a.slice(0,-1))
        // } catch (err) {
        //     log2("error on slice: " + JSON.stringify(a))
        //     log2(world.tokens.slice(0, world.i+1))
        //     // log2(world)
        //     return null
        // }
        thumbscript4.builtIns.props(world)
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
            runId: ++thumbscript4.runId,
            indent: oldWorld.indent + 1,
            cachedLookupWorld: {},
            global: f.world.global,
            local: f.local,
        }

        if (f.dynamic) {
            world.parent = oldWorld
        }
        return world
    },
    call_skipstack: function(world, f) {
        var oldWorld = world
        world = {
            parent: f.world,
            state: {},
            stack: oldWorld.stack,
            tokens: f.tokens,
            i: 0,
            dynParent: oldWorld,
            runId: ++thumbscript4.runId,
            indent: oldWorld.indent + 1,
            cachedLookupWorld: {},
            global: f.world.global,
            local: f.local,
        }

        if (f.dynamic) {
            world.parent = oldWorld
        }
        return world
    },
    call_js_skipstack: function(world, f) {
        var args = []
        for (var i=0; i < f.length; i++) {
            args.unshift(world.stack.pop())
        }
        world.stack.push(f.apply(null, args))
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
    guardb: function(world) {
        // it's a lot faster
        // we can implement this in ths but it's faster here
        var a = world.stack.pop()
        if (!a) {
            world = world.parent
        }
        return world
    },
    guardlt: function(world) {
        // it's a lot faster
        // we can implement this in ths but it's faster here
        var b = world.stack.pop()
        var a = world.stack.pop()
        if (!(a<b)) {
            world = world.parent
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
        if (world.repeatCount === 2_000_000) {
            world = null
            alert("runaway loop")
            return world
        }
        world.i = -1 // because same world and will increment
        return world
    },
}

thumbscript4.getWorldForKey = function(world, key, errOnNotFound, forSetting) {
    // if (world.cachedLookupWorld[key]) {
    //     return world.cachedLookupWorld[key]
    // }
    // if (key.length > 2) {
    //     return world.global
    // }
    var w = null
    for (w = world; w != null; w = w.parent) {
        if (key in w.state) {
            // world.cachedLookupWorld[key] = w
            break
        }
        if (w.local && forSetting) {
            break
        }
    }
    if (w === null) {
        // world.stack.push(token.valueString) // lol
        // throw new Error("unknown variable");
        
        // javascript hack
        // var a = world.stack[world.stack.length-1]
        // if (a && (key in a)) {
        //     return a
        // }
        if (errOnNotFound) {
            log2("-unknown variable: " + key);
        }
        return world
    }
    return w
}
thumbscript4.runId = 0

var typeMap = [
    // stringType
    function(world, token) {
        world.stack.push(token.valueString)
        return world
    },
    // numberType
    function(world, token) {
        world.stack.push(token.valueNumber)
        return world
    },
    // squareType
    function(world, token) {
        var newWorld = {
            parent: world,
            state: {},
            stack: [],
            tokens: token.valueArr,
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
            runId: ++thumbscript4.runId,
            cachedLookupWorld: {},
            global: world.global,
        }
        return newWorld
    },
    // curlyType
    function(world, token) {
        var closure = {
            th_type: closureType,
            tokens: token.valueArr,
            world: world,
        }
        // closure.toJSON = function() {
        //     return {
        //         tokens: closure.tokens,
        //         th_type: closure.th_type,
        //         dynamic: closure.dynamic,
        //         // dynamic: "foobar",
        //         // not world
        //     }
        // }
        // closure.toString = function() {
        //     return JSON.stringify(token.value)
        // }
        world.stack.push(closure)
        return world
    },
    // parenType
    function(world, token) {
        var newWorld = {
            parent: world,
            state: {},
            stack: [],
            tokens: token.valueArr,
            i: 0,
            dynParent: world,
            onEnd: function(world) {
                for (var i=0; i<world.stack.length; i++) {
                    world.dynParent.stack.push(world.stack[i])
                }
            },
            indent: world.indent + 1,
            runId: ++thumbscript4.runId,
            cachedLookupWorld: {},
            global: world.global,
        }
        return newWorld
    },
    // builtInType
    function(world, token) {
        var newWorld = token.valueFunc(world)
        return newWorld
    },
    // varType
    function(world, token) {
        var newWorld = world
        doCall = !token.preventCall
        var w = thumbscript4.getWorldForKey(world, token.valueString, true, false)
        var x = w.state[token.valueString]
        world.stack.push(x)
        if (x && x.th_type === closureType && !token.preventCall) {
            // newWorld = thumbscript4.builtIns.call(world)
            newWorld = thumbscript4.builtIns.call_skipstack(world, x)
        } else {
            if (typeof x === "function") {
                newWorld = thumbscript4.builtIns.call_js_skipstack(world, x)
            } else {
                world.stack.push(x)
            }
        }
        return newWorld
    },
] 
thumbscript4.next = function(world) {
    var newWorld = world
    outer:
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
        var token = world.tokens[world.i]
        
        // that's actually barely slower.
        // newWorld = typeMap[token.th_type](world, token)
        // break
        
        var newWorld = world
        switch (token.th_type) {
            case stringType:
                world.stack.push(token.valueString)
                break outer
            case numberType:
                world.stack.push(token.valueNumber)
                break outer
            case squareType:
                newWorld = {
                    parent: world,
                    state: {},
                    stack: [],
                    tokens: token.valueArr,
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
                    runId: ++thumbscript4.runId,
                    cachedLookupWorld: {},
                    global: world.global,
                }
                break outer
            case curlyType:
                var closure = {
                    th_type: closureType,
                    tokens: token.valueArr,
                    world: world,
                }
                closure.toJSON = function() {
                    return {
                        tokens: closure.tokens,
                        th_type: closure.th_type,
                        dynamic: closure.dynamic,
                        local: closure.local,
                        // dynamic: "foobar",
                        // not world
                    }
                }
                closure.toString = function() {
                    return JSON.stringify(token.value)
                }
                world.stack.push(closure)
                break outer
            case parenType:
                newWorld = {
                    parent: world,
                    state: {},
                    stack: [],
                    tokens: token.valueArr,
                    i: 0,
                    dynParent: world,
                    onEnd: function(world) {
                        for (var i=0; i<world.stack.length; i++) {
                            world.dynParent.stack.push(world.stack[i])
                        }
                    },
                    indent: world.indent + 1,
                    runId: ++thumbscript4.runId,
                    cachedLookupWorld: {},
                    global: world.global,
                }
                break outer 
            case builtInType:
                newWorld = token.valueFunc(world)
                break outer
            case varType:
                var w = thumbscript4.getWorldForKey(world, token.valueString, true, false)
                var x = w.state[token.valueString]
                if (x && x.th_type === closureType && !token.preventCall) {
                    // newWorld = thumbscript4.builtIns.call(world)
                    newWorld = thumbscript4.builtIns.call_skipstack(world, x)
                } else {
                    if (typeof x === "function") {
                        newWorld = thumbscript4.builtIns.call_js_skipstack(world, x)
                    } else {
                        world.stack.push(x)
                    }
                }
                break outer
        }
        break
    } while (false)
    world.i++

    world = newWorld
    return world
}

thumbscript4.stdlib = `
    swap: { :b :a b a }
    drop: { :a }
    loopn: { :n :block 0 :i { i •lt n guardb i block i++ repeat } call }
    loopn2: { :n :block 0 :i { i •lt (n •minus 1) guardb i block i •plus 2 :i repeat } call }
    range: { :list :block 0 :i list length :theMax •loopn •theMax { :i list •at i i block } }
    ccc: { :l "" :r { drop r swap cc :r } l range r }
    guard: ({ not { 3 breakn } checkthen } dyn)
    loopmax: { :theMax :block 0 :i { block i theMax lt guardb i++ repeat } call }
    range2: { :list :block 0 :i list length :theMax •loopn2 •theMax { :i i •plus 1 :i2 list •at i i list •at i2 i2 block } }
    checkthen: { {} check call }
    sayn: { " " join say }
    take: { :n [] :a { drop a swap unshift drop } n loopn a }
    checkn: { :c c length :m { drop :v2 drop :v1 v1 { v2 3 breakn } checkthen } c range2 c •at (m •minus 1) call }
    timeit: { :n :block
        nowmillis :start
        ~block n loopn
        nowmillis :end
        end •minus start :total
        ["it took" total "milliseconds"] sayn
    }
`

// idea macros?
// todo closure leakage issue?
// function timeit(n, f) {
//     var start = Date.now()
//     for (var i=0; i<n; i++) {
//         f(i)
//     }
//     var end = Date.now()
//     var total = end - start
//     log2("js: it took " + (total) + " milliseconds")
// }
// ;(function() {
//     var count = 0
//     timeit(100_000, function(i) {
//         count += i
//     })
//     log2("count is " + count)
// })()
// `; var code2 = `
var code = `
// ["me&you"] encodeURIComponent say
// return
// [yo: { "yo! " swap cc say }] :someobj
// 
// $Drew someobj $yo at call
// 
// "hi"
// 
// return

100 :count
count say
count: 100
count say
person: [
    [score: 10]
]
person say
[person 0 $score] props say

500 :[person 0 $score]
[person 0 $score] props say

[person 0 $score]: 600
[person 0 $score] props say


// 1 2 3 •5 4 6
// foo •(bar baz) biz
// another •"here" two foe


// what (5 •6 4) foobar
// dump
// exit

// 7 •plus (1 •times 2) say
{
    0 :count
    { count plus :count } 100000 timeit
    ["count is" count] sayn
    // h say
} call

// •shallowcopylist: {
//     [] :n
//     { :i :v n i v set} swap range
// }

// ["drew" :name] :person
// "Drew" person "name" setprop
// "Drew2" [person "name"] setc
// "Drew2" : [person "name"]
// 
// "Drew" : name
// •name : "Drew"


[$hi $my •$is $name $drew] sayn
[$hi $my •"is" $name $drew] sayn

{
    "hello! " swap cc say
} 10 loopn
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

"foooooooo" say
2 :x someConds checkn :color
"foooooooo2" say
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
        #testwrapper 
        "hello everyone" say
        1 1 match { callingbreak nameworld break } { } check call
        repeat
    } call
    oook say
} :interestingTest
// interestingTest

{ #incrfunc :name
    "the value is " name get cc say
    name get 1 plus name set
} dyn :incr1
{
    #testwrapper 
    99 :foo
    $foo incr1
    "after calling incr1, foo is " foo cc say
} call

10 { "yay truthy!" say } checkthen
1 0 match { "should not het here" say } checkthen

"foobar " say





"🥶" say
[1 2 "ten"] ccc say
"one two three four" " " split ccc say

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
$foobar sayo

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




// come back to this
// var world = thumbscript4.eval(thumbscript4.stdlib, {})
// thumbscript4.defaultState = world.state
// log2(world.state)


// mid 70 ms for the onenperf check
thumbscript4.eval(code, {})
// showLog()
thumbscript4.eval(`

// this tests the desugaring
bug: {•plus 1}
fix: {•times 100}
foo: [bar: 30]

[foo $bar]: •fix •bug 4
•say foo

foo2: •fix •bug 3
•say foo2

7 bug fix :foo2
•say foo2
8 bug fix :[foo $bar]
•say foo



200 :a
50 :b
{ 900 :a  "b is " b cc say } local :somefunc
202 :a
"the value of a is " a cc say
somefunc
"the value of a is " a cc say






// 200000 say
// "foo@bar" encodeURIComponent say
`, window)
/*




*/

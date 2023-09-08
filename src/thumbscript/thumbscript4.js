
var thumbscript4 = {}

const stringType = 0;
const numberType = 1;
const squareType = 2;
const curlyType = 3;
const parenType = 4;
const builtInType = 5;
const varType = 6;
const closureType = 7; // runtime only, not a token type
const incrType = 8;
const noOpType = 9;
const anchorType = 10;
const interpolateType = 11;

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
        if (typeof token == "string") {
            if (token.endsWith("++")) {
                // another try
                var tk = {th_type: incrType, valueString: token.slice(0, -2)}
                addToken2(tk)
                return

                // for (var i=0; i < 300; i++) {
                //     addToken2({th_type: noOpType})
                // }

                // keeping this old way in comments for reference
                // addToken2("$" + token.slice(0, -2))
                // addToken2("setplus1")
                // return

                // attempt to go faster, but doesn't seem to help.
                var a = token.slice(0, -2)
                var f = function(world) {
                    // var w = world.parent // even  this doesn't seem to help perf
                    var w = thumbscript4.getWorldForKey(world, a, false, true)
                    w.state[a] += 1
                    return world
                }
                f.theName = token
                addToken2(f)
                return
            } else if (token.endsWith("+=")) {
                var a = token.slice(0, -2)
                var f = function(world) {
                    var w = thumbscript4.getWorldForKey(world, a, false, true)
                    // var w = world.parent.parent
                    w.state[a] += world.stack.pop()
                    return world
                }
                f.theName = token
                addToken2(f)
                return
            }
        }
        // if (typeof token == "string" && token.startsWith("#")) {
        //     addToken2("$" + token.slice(0, -1))
        //     addToken2("nameworld")
        //     return
        // }
        addToken2(token)
    }

    // lol
    var addToken2 = function(token) {
        if (typeof token == "string") {
            var preventCall = false
            if (token.startsWith("~")) {
                preventCall = true
                token = token.slice(1)
            }

            // not sure if faster
            if (token.charAt(0) == "$") {
                token = {th_type: stringType, valueString: token.slice(1)}
            } else if (token.charAt(0) == "#") {
                token = {th_type: anchorType, valueString: token.slice(1)}
            } else if (token in thumbscript4.builtIns) {
                token = {th_type: builtInType, valueFunc: thumbscript4.builtIns[token], name: token, preventCall: preventCall}
                if (preventCall) {
                    token.nonPreventCallVersion = {th_type: builtInType, valueFunc: token.valueFunc, name: token.name}
                }
            } else {
                token = {th_type: varType, valueString: token, preventCall: preventCall}
            }
        } else if (typeof token == "number") {
            token = {th_type: numberType, valueNumber: token}
        } else if (typeof token == "function") {
            token = {th_type: builtInType, valueFunc: token, name: token.theName}
        } else {
            // log2("- unknowntoken type")
            // log2(token)
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
            // I might not do it at all, just interpolate if you need
            if (false && "\\".indexOf(chr) != -1) {
                state = "stringEscape"
            } else if ('"'.indexOf(chr) != -1) {
                // we could make every token an object
                // but this is our strong trick for now

                // auto interpolate unless prefixed with "raw"
                // raw is a compiler directive, not function
                var prevToken = tokens.pop()
                if (prevToken.th_type == varType && prevToken.valueString == "raw") {
                    addToken("$" + currentToken)
                } else {
                    tokens.push(prevToken)
                    if (currentToken.indexOf("$") != -1) {
                        tokens.push({th_type: interpolateType, valueString: currentToken})
                    } else {
                        addToken("$" + currentToken)
                    }
                }
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

                    // auto interpolate unless prefixed with "raw"
                    // raw is a compiler directive, not function
                    var prevToken = tokens.pop()
                    if (prevToken.th_type == varType && prevToken.valueString == "raw") {
                        addToken("$" + currentToken)
                    } else {
                        tokens.push(prevToken)
                        if (currentToken.indexOf("$") != -1) {
                            tokens.push({th_type: interpolateType, valueString: currentToken})
                        } else {
                            addToken("$" + currentToken)
                        }
                    }

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
    tokens = thumbscript4.someIfMagic(tokens)
    // log2(tokens.anchors)
    return tokens
}
thumbscript4.someIfMagic = function(tokens) {
    // when if is false, we need to jump to end of the chain
    // makes syntax a little cleaner
    // can accomplish same thing woth wrapper func or array (checkn) but not as pretty
    var i = 0
    var currentIfs = []
    while (i < tokens.length) {
        var token = tokens[i]
        if (token.th_type == builtInType) {
            if (token.name == "?" || token.name == "if") {
                // hmm if I used a linked list for tokens,
                // then it moght be easier to point to thr end node, instead of end index
                // that might make inlining easier.
                token.endOfIfChainI = -1
                currentIfs = []
                currentIfs.push(token)
            } else if (token.name == "??" || token.name == "elseif") {
                token.endOfIfChainI = -1
                for (var j=0; j < currentIfs.length; j++) {
                    currentIfs[j].endOfIfChainI = i
                }
                currentIfs.push(token)
            } else if (token.name == "?." || token.name == "else") {
                for (var j=0; j < currentIfs.length; j++) {
                    currentIfs[j].endOfIfChainI = i
                }
            }
        } else if (token.th_type == anchorType) {
            if (!tokens.anchors) {
                tokens.anchors = {}
            }
            tokens.anchors[token.valueString] = i
        }
        i++
    }
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

// alert("woa!")
thumbscript4.eval = function(code, state) {
    // alert("evaling")
    clearTimeout(window.t99)
    // I tried to pass in the state of the stdlib
    // wasn't working, so just doing this hacky string concat.
    // would be nice to grab the state of the stdlib
    // problem might be some function scope?
    // look later
    code = thumbscript4.stdlib + code

    var tokens = thumbscript4.tokenize(code)
    // log2(tokens)
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
        log: [], // for concenience
    }
    world.global = world

    thumbscript4.run(world)
    return world

}

thumbscript4.displayToken = function(tk) {
    try {
        if (!tk) return "what??"
        switch (tk.th_type) {
            case stringType:
                return `"${tk.valueString}"`
            case numberType:
                return `${tk.valueNumber}`
            case squareType:
                return `[${tk.valueArr.map(thumbscript4.displayToken)}]`
            case curlyType:
                return `{${tk.valueArr.map(thumbscript4.displayToken)}}`
            case parenType:
                return `(${tk.valueArr.map(thumbscript4.displayToken)})`
            case builtInType:
                return `<native ${tk.name}>`
            case varType:
                return `${tk.valueString}`
            case incrType:
                return `<incr ${tk.valueString}>`
            case noOpType:
                return `<noop>`
            case anchorType:
                return `<anchor ${tk.valueString}>`
            case interpolateType:
                return `<interpolate ${tk.valueString}>`
            default:
                return `huh????`
        }
    } catch (e) {
        log2(JSON.stringify(tk))
        log2(typeof tk)
        log2(e.toString())
        return "- huh? "
    }
}
// thumbscript4.async = false
thumbscript4.async = true
thumbscript4.asyncChunk = 500000

thumbscript4.run = function(world) {
    if (world.global.stopped) {
        return
    }
    if (thumbscript4.async) {
        setTimeout(function () {
            thumbscript4.runAsync(world)
        }, 0)
        return
    }
    // var oldPreventRender = preventRender
    // preventRender = true
    while (true) {
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
    // preventRender = oldPreventRender
    render()
}

thumbscript4.runAsync = function(world) {
    if (world.global.stopped) {
        return
    }
    // TODO: rendering was really slow for rendering with log2
    // var oldPreventRender = preventRender
    // preventRender = true
    for (var i = 0; i < thumbscript4.asyncChunk; i++) {
        world = thumbscript4.next(world)
        if (!world) {
            break
        }
        // log2("//" + JSON.stringify(world.tokens.slice(world.i, world.i+1)))
        // log2("in world " + world.name + "(" +world.runId+") < " + world.parent?.name )
    }
    // preventRender = oldPreventRender
    // render()

    if (world) {
        window.t99 = setTimeout(function() { thumbscript4.runAsync(world) }, 0)
    }
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
thumbscript4.genFunc2NoReturn = function(f) {
    return function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        f(a, b)
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
    alert: thumbscript4.genFunc1NoReturn(a => { alert(a) }),
    cc: thumbscript4.genFunc2((a, b) => a + b),
    // nowmillis: thumbscript4.genFunc0(() => Date.now()),
    nowmillis: thumbscript4.genFunc0(() => performance.now()),
    now: thumbscript4.genFunc0(() => (Math.floor(Date.now()/1000))),
    lf: thumbscript4.genFunc0(() => "\n"),
    cr: thumbscript4.genFunc0(() => "\r"),
    plus: thumbscript4.genFunc2((a, b) => a + b),
    minus: thumbscript4.genFunc2((a, b) => a - b),
    mod: thumbscript4.genFunc2((a, b) => a % b),
    times: thumbscript4.genFunc2((a, b) => a * b),
    divide: thumbscript4.genFunc2((a, b) => a * b),
    neg: thumbscript4.genFunc1((a) => -a),
    lt: thumbscript4.genFunc2((a, b) => a < b),
    gt: thumbscript4.genFunc2((a, b) => a > b),
    lte: thumbscript4.genFunc2((a, b) => a <= b),
    gte: thumbscript4.genFunc2((a, b) => a >= b),
    match: thumbscript4.genFunc2((a, b) => a == b),
    is: thumbscript4.genFunc2((a, b) => a == b),
    eq: thumbscript4.genFunc2((a, b) => a === b),
    ne: thumbscript4.genFunc2((a, b) => a !== b),
    chr: thumbscript4.genFunc1((a) => String.fromCharCode(a)),
    ord: thumbscript4.genFunc1((a) => a.charCodeAt(0)),
    at: thumbscript4.genFunc2((a, b) => a[b]),
    props: thumbscript4.genFunc1((a) => {
        var v = a[0]
        for (var i = 1; i < a.length; i++) { v = v[a[i]] }
        return v
    }),
    not: thumbscript4.genFunc1((a) => !!!a),
    "cond": thumbscript4.genFunc3((a, b, c) => (a ? b : c) ),
    length: thumbscript4.genFunc1((a) => a.length),
    len: thumbscript4.genFunc1((a) => a.length),
    push: thumbscript4.genFunc2NoReturn((b, a) => a.push(b)),
    pop: thumbscript4.genFunc1((a) => a.pop()),
    unshift: thumbscript4.genFunc2NoReturn((b, a) => a.unshift(b)),
    shift: thumbscript4.genFunc1((a) => a.shift()),
    join: thumbscript4.genFunc2((a, b) => a.join(b)),
    slice: thumbscript4.genFunc3((a, b, c) => a.slice(b, c)),
    split: thumbscript4.genFunc2((a, b) => a.split(b)),
    trim: thumbscript4.genFunc1((a) => a.trim()),
    indexof: thumbscript4.genFunc2((a, b) => a.indexOf(b)),
    contains: thumbscript4.genFunc2((a, b) => a.indexOf(b) !== -1),
    tonumber: thumbscript4.genFunc1((a) => a - 0),
    tojson: thumbscript4.genFunc1((a) => JSON.stringify(a)),
    tojsonpretty: thumbscript4.genFunc1((a) => JSON.stringify(a, null, "    ")),
    fromjson: thumbscript4.genFunc1((a) => JSON.parse(a)),
    haskey: thumbscript4.genFunc2((a, b) => Object.hasOwn(a, b)),
    keys: thumbscript4.genFunc1((a) => Object.keys(a)),
    copylist: thumbscript4.genFunc1((a) => [...a]),
    typename: thumbscript4.genFunc1((a) => {
        // there's a lot more to do.
        if (typeof a == "object") {
            if (Array.isArray(a)) {
                return "array"
            }
            if (a == null) {
                return "null"
            }
            return "object"
        }
        return typeof a
    }),
    jscall: function (world) {
        var args = world.stack.pop()
        var funcName = world.stack.pop()
        var ret = window[funcName](...args)
        world.stack.push(ret)
        return world
    },
    jscallcb: function (world) {
        var args = world.stack.pop()
        var funcName = world.stack.pop()
        args.push(function (err, ret) {
            thumbscript4.outstandingCallbacks--
            world.stack.push(ret)
            world.stack.push(err)
            thumbscript4.run(world)
        })
        window[funcName](...args)
        thumbscript4.outstandingCallbacks++
        return null // this suspends the execution
    },
    jscallpromise: function (world) {
        var args = world.stack.pop()
        var funcName = world.stack.pop()
        try {
            var p = window[funcName](...args)
        } catch (e) {
            alert(funcName)
            alert(args)
            alert(e)
        }
        var returned = false
        p.then(function (r) {
            if (!returned) {
                try {
                    returned = true
                    thumbscript4.outstandingCallbacks--
                    world.stack.push(r)
                    world.stack.push(null)
                    thumbscript4.run(world)
                } catch (e) {
                    alert(e)
                }
            }
        }).catch(function (err) {
            if (!returned) {
                returned = true
                thumbscript4.outstandingCallbacks--
                world.stack.push(null)
                world.stack.push(err)
                thumbscript4.run(world)
            }
        })
        return null // this suspends the execution
    },
    dyn: function(world) {
        var a = world.stack.pop()
        a.dynamic = true
        world.stack.push(a)
        return world
    },
    log: function(world) {
        var a = world.stack.pop()
        world.global.log.push(a)
        return world
    },
    clearlog: function(world) {
        world.global.splice(0, debugOutput.length)
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
        var a = world.stack.pop()
        var b = world.stack.pop()
        world.stack.push(a.slice(0,-1))
        thumbscript4.builtIns.props(world)
        obj = world.stack.pop()
        obj[a[a.length-1]] = b
        return world
    },
    setcb: function(world) {
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
    jsloopn: function(world) {
        // for some reason this doesn't work unless you preventRender
        // see preventRender assignment
        var f = world.stack.pop()
        var n = world.stack.pop()
        var newWorld = {
            parent: f.world,
            state: {},
            stack: world.stack,
            tokens: f.tokens,
            i: 0,
            dynParent: null,
            runId: ++thumbscript4.runId,
            indent: world.indent + 1,
            cachedLookupWorld: {},
            global: f.world.global,
            local: f.local,
        }
        for (var i=0; i<n; i++) {
            newWorld.stack.push(i)
            thumbscript4.run(newWorld)
            newWorld.i = 0
        }
        return world
    },
    call: function(world) {
        var f = world.stack.pop()
        return thumbscript4.builtIns.call_skipstack(world, f)
    },
    call_skipstack: function(world, f) {
        var oldWorld = world
        
        // used fo have f.callWorld hack here
        world = {
            parent: f.world,
            state: {},
            stack: oldWorld.stack,
            tokens: f.tokens,
            i: 0,
            dynParent: oldWorld,
            runId: ++thumbscript4.runId,
            indent: oldWorld.indent + 1,
            // cachedLookupWorld: {},
            global: f.world.global,
            local: f.local,
        }

        if (f.dynamic) {
            world.parent = oldWorld
            world.cachedLookupWorld = {}
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
    "break": function(world) {
        if (world.onEnd) world.onEnd(world)
        world = world.parent
        return world
    },
    "breakp": function(world) {
        for (var i=0; i<2; i++) {
            // i originally had dynParent but it wasn't right
            // like when I wrapped if
            if (world.onEnd) world.onEnd(world)
            world = world.parent
            // todo: see onend
        }
        return world
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
    "goto": function(world) {
        var loc = world.stack.pop()
        var w = world
        while (!w.tokens.anchors || !w.tokens.anchors.hasOwnProperty(loc)) {
            w = w.parent
        }
        w.i = w.tokens.anchors[loc]
        return w
    },
    "return": function(world) {
        // basically same as continue?
        // you could just go to end of tokens ?
        // world = world.dynParent
        if (world.onEnd) world.onEnd(world)
        // TODO: other places need onend too
        world = world.dynParent
        // todo: see onend
        return world
    },
    "continue": function(world) {
        // same as return, but I like better
        world.i = world.tokens.length
        return world
    },
    "continuen": function(world) {
        var a = world.stack.pop()
        a = a-1
        for (var i=0; i<a; i++) {
            // i originally had dynParent but it wasn't right
            // like when I wrapped if
            // if (world.onEnd) world.onEnd(world)
            world = world.parent
            // todo: see onend
        }
        world.i = world.tokens.length
        return world
    },
    "continuep": function(world) {
        for (var i=0; i<1; i++) {
            // i originally had dynParent but it wasn't right
            // like when I wrapped if
            // if (world.onEnd) world.onEnd(world)
            world = world.parent
            // todo: see onend
        }
        world.i = world.tokens.length
        return world
    },
    "exit": function(world) {
        world = null
        // todo: see onend
        return world
    },
    guardb: function(world) {
        // it's a lot faster
        // we can implement this in ths but it's faster here
        // see onend
        var a = world.stack.pop()
        if (!a) {
            if (world.onEnd) world.onEnd(world)
            world = world.parent
        }
        return world
    },
    guardlt: function(world) {
        // test this again
        var b = world.stack.pop()
        var a = world.stack.pop()
        if (!(a<b)) {
            if (world.onEnd) world.onEnd(world)
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
        //if (world.repeatCount === 100_000_000) {
        if (world.repeatCount === 1_000_000) {
            world = null
            alert("runaway loop")
            return world
        }
        world.i = -1 // because same world and will increment
        return world
    },
    // if
    "?": function(world, token) {
        var block = world.stack.pop()
        var cond = world.stack.pop()
        if (cond) {
            if (token.endOfIfChainI != -1) {
                world.i = token.endOfIfChainI
            }
            world = thumbscript4.builtIns.call_skipstack(world, block)
        }
        return world
    },
    // elseif (same as if, but token name needs to be different, see someIfMagic)
    "??": function(world, token) {
        var block = world.stack.pop()
        var cond = world.stack.pop()
        if (cond) {
            if (token.endOfIfChainI != -1) {
                world.i = token.endOfIfChainI
            }
            world = thumbscript4.builtIns.call_skipstack(world, block)
        }
        return world
    },
    // else
    "?.": function(world, token) {
        var block = world.stack.pop()
        world = thumbscript4.builtIns.call_skipstack(world, block)
        return world
    },
    interpolate: function(world) {
        var a = world.stack.pop()
        var r = a.replace(/\$[\w]+/g, function(x) {
            x = x.slice(1)
            var w = thumbscript4.getWorldForKey(world, x, true, false)
            return w.state[x]
        })
        world.stack.push(r)
        return world
    },
    sleepms: function(world) {
        var a = world.stack.pop()
        setTimeout(function() {
            thumbscript4.outstandingCallbacks--
            thumbscript4.run(world)
        }, a)
        thumbscript4.outstandingCallbacks++
        return null // lol
    },
    sleep: function(world) {
        var a = world.stack.pop()
        setTimeout(function() {
            thumbscript4.outstandingCallbacks--
            thumbscript4.run(world)
        }, Math.floor(a * 1000))
        thumbscript4.outstandingCallbacks++
        return null // lol
    },
    runshell: function(world) {
        var a = world.stack.pop()
        runQuickShellCommand(a, function(err, text) {
            thumbscript4.outstandingCallbacks--
             // log2("debug: " + text)
             world.stack.push(text)
             world.stack.push(err)
             thumbscript4.run(world)
        })
        thumbscript4.outstandingCallbacks++
        return null // lol
    },
}
thumbscript4.builtIns["if"] = thumbscript4.builtIns["?"]
thumbscript4.builtIns["elseif"] = thumbscript4.builtIns["??"]
thumbscript4.builtIns["else"] = thumbscript4.builtIns["?."]

thumbscript4.getWorldForKey = function(world, key, errOnNotFound, forSetting) {
    // the cachedLookupWorld seems noticeably faster when running jsloopn
    // 19ms vs 38ms on a loopn with somevar+= for 100k loops

    if (world.local && forSetting) {
        return world
    }
    // if (world.cachedLookupWorld[key]) {
    //     return world.cachedLookupWorld[key]
    // }
    for (var w = world; w != null; w = w.parent) {
        // perf doesn't seem to matter here
        if (Object.hasOwn(w.state, key)) {
            // world.cachedLookupWorld[key] = w
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
            // log2("-unknown variable: " + key);
            log2("-unknown variable: " + JSON.stringify(key));
        }
        return world
    }
    return w
}
thumbscript4.runId = 0

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
        // logging token to debug
        // log2("\t".repeat(world.indent) + "// token: " + thumbscript4.displayToken(token)) // lime marker
        // log2("\t".repeat(world.indent) + "// stack length: " + world.stack.length)

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
                    local: true,
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
                if (!token.preventCall) {
                    newWorld = token.valueFunc(world, token)
                } else {
                    world.stack.push({
                        th_type: closureType,
                        tokens: [token.nonPreventCallVersion],
                        world: world,
                    })
                }
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
            case incrType:
                var w = thumbscript4.getWorldForKey(world, token.valueString, true, false)
                w.state[token.valueString]++
                break outer
            case noOpType:
                window.xyzzy++
                break outer
            case anchorType:
                world.name = token.valueString
                break outer
            case interpolateType:
                var r = token.valueString.replace(/\$[\w]+/g, function(x) {
                    x = x.slice(1)
                    var w = thumbscript4.getWorldForKey(world, x, true, false)
                    return w.state[x]
                })
                world.stack.push(r)
                break outer
        }
        break
    } while (false)
    world.i++

    world = newWorld
    return world
}


// c b a 
thumbscript4.stdlib = `
    swap: •local { :b :a ~b ~a }
    drop: •local { :a }
    dup: •local { :a ~a ~a }
    // todo: look at what's slow with not inlining (object creation? and fix)
    // that said jsloopn is fastest
    loopn: •local { 
        :block :n 0 :i
        {
            i •lt n not ~breakp ?
            i block
            i++
            repeat
        } call
    }
    loopn2: •local {
        :block :n 0 :i
        {
            i •lt (n •minus 1) guard
            i block
            i •plus 2 :i
            repeat
        } call
    }
    range: •local {
        :block :list

        list typename "object" is {
            list :obj
            obj keys :theKeys
            theKeys length :theMax
            theMax {
                theKeys swap at :key
                obj key at :value
                value key block
            } loopn
            continuep
        } ?

        list length :theMax
        theMax {
            :i list •at i i block
        } loopn
    }
    guard: •local •dyn { not { 3 breakn } ? }
    loopmax: •local {
        :theMax :block 0 :i
        {
            i theMax lt guard
            block
            i++
            repeat
        } call
    }
    range2: •local {
        :block :list 0 :i
        list len :theMax
        theMax {
            :i
            i •plus 1 :i2
            list •at i i list •at i2 i2 block
        } loopn2
    }
    sayn: •local { " " join say }
    take: •local {
        :n9 [] :a9
        n9 {
            :i 
            a9 unshift
        } loopn
        a9
    }
    cases: •local {
        :c
        c length :m
        c {
            "looping" say
            drop :v2 drop :v1
            v1 { v2 3 breakn } ?
        } range2
        c •at (m •minus 1) call
    }
    timeit: •local {
        :block :n
        nowmillis :start
        n ~block loopn
        // n ~block jsloopn
        nowmillis :end
        end •minus start :total
        "it took $total ms" say
    }
    and: •local {
        :b :a
        a :firstValue
        firstValue not { firstValue 2 continuen } ?
        b
    }
    or: •local {
        :b :a
        a :firstValue
        firstValue { firstValue 2 continuen } ?
        b
    }
    loop: •local {
       :block
       {
           block
           repeat
       } call
    }
    filter: •local {
        :func :list 
        [] :ret
        list {
            drop :v
            v func {
                v ret push
            } ?
        } range
        ret
    }
    map: •local {
        :func :list 
        [] :output
        list {
            drop func output push
        } range
        output
    }
    trimPrefix: •local {
        :prefix :str
        str 0 prefix len slice prefix is {
            prefix len undefined str slice
            continuep
        } ?
        str
    }
`


// idea macros?
// todo closure leakage issue?
// function jstimeit(n, f) {
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
//     jstimeit(100_000, function(i) {
//         count += i
//     })
//     log2("count is " + count)
// })()
// `; var code2 = `
window.xyzzy = 0
var code = `

$yo say

    
3 { :i
    5 { :j
        "$i: $j" say
        1 sleepms
    } loopn
} loopn



// 10 {
//     drop
//     400 600 2 take say
// } loopn

// {
//     now say
//     1 sleep
// } loop
 


// [100 200 300 400] {
//     :i :v
//     "the i is $i" say
//     "the v is $v" say
// } swap range


[100 200 300 400] {
    :i :v
    "$i: $v" say
} range
"" say
[100 :a 200 :b 300 :c 400 :d] {
    :k :v
    "$k: $v" say
}  range



"yo" say
// 0 :i
// {
//     // { breakp } i 100 gt if
//     ~breakp i 100 gt if
//     i++
//     "number is $i" say
// } loop

// exit

// { say } :saything
// ~saything 20 loopn
// "all done" say
// exit

// 200 alert

10 {
  say
} loopn

{ -1 } { 0 } and :a
"value of a is $a" say

{ 0 } { 100 } or :b
"value of b is $b" say

// person: [a: 1 friend: [b: 1]]

foo: [bar: [baz: 3]]
// foo say
[foo $bar $baz] props say

10 :[foo "bar" "baz"]
[foo $bar $baz] props say

[foo "bar" "baz"]: 30
[foo $bar $baz] props say

// person say

// "woa" : [person "a" "friend" "c"]

"Drew" :name
"the name is $name" say
•say "the name is $name"


{
    0 :count
    // { count plus :count } 5000000 timeit
    // { count plus :count } 100 timeit
    // { count+= } 100 timeit
    // { count+= } 100000 timeit

    // with jsloopn 18 ms
    // with loopn inline sub 60ms
    // { count+= } 100000 timeit
    100000 { count plus :count } timeit
    "count is $count" say


    // 70 :count2
    // { count2+= } 100 timeit
    //
    // ["count2 is" count2] sayn
    // h say
} call


// {
//     someVal1 say
//     20 :someVal1
// } :doThing
// ~doThing 10 loopn
// exit

// {
//     :x
//     { "one" say } x •is 1 if
//     { "other" say } else
// } 5 loopn


// {
//     :x
//     { "one" say } "checking 1" say x •is 1 if
//     { "other" say } "checking else" say else
// } 5 loopn
// exit

"before goto" say
"yoman" goto
"slipped over this!" say
"slipped over this!" say
"slipped over this!" say
#yoman
"after goto" say


// {
//     99 :x
//     { "one" say } "checking 1" say x •is 1 if
//     { "two" say } "checking 2" say x •is 2 elseif
//     { "three" say } "checking 3" say x •is 3 elseif
//     { "other" say } "running else" say else
// } 5 loopn




"that was cool" say

"----" say

5 {
    :x
    "+value is $x" say
    ("checking 0" say x •is 0) { "zero" say } ?
    ("checking 1" say x •is 1) { "one" say } ??
    ("checking 2" say x •is 2) { "two" say } ??
    ("checking 3" say x •is 3) { "three" say } ??
    ("running else" say) { "other" say } ?.
    "--------" say
} loopn
"++++that was cool1" say
"" say
"" say
5 {
    :x
    "+value is $x" say
    ("checking 0" say x •is 0) { "zero" say } if
    ("checking 1" say x •is 1) { "one" say } elseif
    ("checking 2" say x •is 2) { "two" say } elseif
    ("checking 3" say x •is 3) { "three" say } elseif
    ("running else" say) { "other" say } else
    "--------" say
} loopn
"that was cool2" say





"Drew" :name
"hello $name" say
raw "hello $name" say
«hello $name» say
raw «hello $name» say

{
    :n
    1 :result
    {
        n 1 gte guard
        result n times :result
        n 1 minus :n
        repeat
    } call
    result
} :factorial

10 factorial say

// 1 1 plus 3 4 plus times

// "what is your name?" prompt :name

"Hello " name cc say


20 :n
n 1 plus
say




// {
//     "Hi Hi Hi Hi Hi Hi Hi Hi Hi" say
//     100 sleepms
//     repeat
// } call

// {
//     "Hi Hi Hi Hi Hi Hi Hi Hi Hi" say
//     0 sleepms
// } 35 loopn

// "I'll wait" say
// 1 sleep
// "I waited" say


10 {
   :j
   "j number is $j" say
   25 sleepms
} local loopn


window $xyzzy at "xyzzy is " swap cc say

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
"🍅" say
"🍅" encodeURIComponent say

// 1 2 3 •5 4 6
// foo •(bar baz) biz
// another •"here" two foe


// what (5 •6 4) foobar
// dump
// exit

7 •plus (1 •times 2) say



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

10 {
    "hello! " swap cc say
} loopn

[100 200 300 400 500] {
    :i2 :v2 :i1 :v1
    "range: $i1: $v1" say
    "range: $i2: $v2" say
} range2

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

someConds cases "the color is " swap cc say
"yo!!!!" say

"what's going on?" say

20000 say


someConds cases :color
"the color is " color cc say

"foooooooo" say
2 :x someConds cases :color
"foooooooo2" say
"the color is " color cc say

1 :x someConds cases :color
"the new color is " color cc say

400 500 600 3 take say
" " "every day is a new day" split :mylist

mylist {
    4 take say
} range2


[] :mylist
// •loopn •20 { mylist push drop }
mylist sayn

// yellow marker

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
        1 1 match { callingbreak nameworld break } { } cond call
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

10 { "yay truthy!" say } ?
1 0 match { "should not het here" say } ?

"foobar " say





"🥶" say

{
    "the number is " swap cc say
} 7 loopn
"------------" say
{
    :i
    // i •lt 5 guard // that works too
    i •is 6 { 2 breakn } ?
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

"the first item is " mylist 0 at cc say
[$blue :eyes $brown :hair] :info

info say

info $eyes at say

info $hair at say

info $ha $ir cc at say

$ha $ir cc :key
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
"The selected b is " [person $work $secondary $b] props cc say


"how on earth??? 🌍" say
2011 [person $work $secondary $b] setc
"The selected b is " [person $work $secondary $b] props cc say
"The selected b is " [person $work x 1 match $main $secondary cond $b] props cc say

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
    } { 300 } cond call

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
// thumbscript4.eval(code, {})
thumbscript4.eval(code, window)
// window makes my test a bit slower (in 80s) interesting
// actuallt down to sub 60 ms now. with inlining
// was mis 60s before.
// showLog()
false && thumbscript4.eval(`

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


// setTimeout(function() {
//     showLog()
// }, 1001)

/*




*/

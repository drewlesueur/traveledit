thumbscript2 = {
    lookup: function(a, state) {
        if (a - 0 == a) {
            return a
        }
        if (a.startsWith(":")) {
            return a.slice(1)
        }
        return state[a]
    },
    builtinFuncs: {
        add: function(a, b, state) {
            return ((a - 0) + (b - 0)).toString()
        },
        str: function(a, state) {
            return a
        },
        is: function(a, b, state) {
            a == b ? "true" : "false"
        },
        greet: function(a, state) {
            log2("hello, " + a)
        },
        uppercase: function(a, state) {
            return a.toUpperCase()
        },
        lowercase: function(a, state) {
            return a.toLowerCase()
        },
        as: function(a, b, state) {
            // todo: allow $ for variable sets?
            state[b] = a
        },
        print: function(a, state) {
            console.log(a)
        }
    },
    customFuncs: {
    }
}

thumbscript2.builtinFuncs.as.passRaw = true
thumbscript2.builtinFuncs.str.passRaw = true

// sub program
// goto

// log2("        x a b c ".replace(/^ +/g, function (x) { return "indent ".repeat(Math.floor(x.length / 4))}))
// passnin string to be evaled

// : syntax
// () syntax. eval in place
// { } syntax. sub program.
// named arguments to be able to change order

// do sub programs run from oroginal token list, or are they created? and run?
// let's go with created and run.
// sub probrams vs go back to old function pointer
// closures?

// some funcs are indent oriented

// table
//     a b
//     c d
// done
// comments go to next indent
// newlines with only one indent don't count

// in javascript can i have the ^ match each start after newlines too?
// 
// Yes, in JavaScript, you can use the `^` anchor to match the start of a string after newlines. To achieve this, you need to use the `m` flag (multiline) in your regular expression. 
// For example:
// ```javascript
// const regex = /^your_pattern/m;
// ```
// This will make the `^` anchor match the start of each line, instead of only the start of the whole input string.
thumbscript2.tokenize = function(code) {
    // code = code.replace(/\(/g, "leftParen")
    // code = code.replace(/\)/g, "rightParen")
    code = code.replace(/^ +/mg, function (x) { return "indent ".repeat(Math.floor(x.length / 4))})
    code = code.replace(/\n/g, " newline ")
    var tokens = code.split(/ +/)
    return tokens
}

thumbscript2.eval = function(code) {
    var tokens = thumbscript2.tokenize(code)
    return thumbscript2.run(tokens)
}

// add ability to pass parent state?
thumbscript2.run = function(tokens) {
    var tokens = thumbscript2.tokenize(code)
    var i = 0
    var state = {}
    var stack = []
    var funcStack = []
    var currentFunc = null
    var currentIndent = 0
    var locations = {
    }
    
    var quicks = {
        elsejump: function(name) {
            // jump to it on line with same indent lol
            var val = stack.pop()
            if (val != "true") {
                var loc = "_".repeat(currentIndent) + token.slice(1)
                if (loc in locations) {
                    i = locations[loc] // maybe -1
                    return
                }
                mode = "findJump"
                return
            }
        },
        label: function(name) {
        },
        jumpback: function(name) {
        }
    }
    
    var mode = "run"
    // tokens different from stack
    while (i < tokens.length) {
        var token = tokens[i]
        if (token == "indent") {
            currentIndent++
        } else if (token == "newline") {
            currentIndent = 0
        // } else if (token.endsWith(":")) {
        //     // todo: don't need to set if we've seen before
        //     locations["_".repeat(currentIndent) + token.slice(0, -1)] = i
        //     if (mode == "findJump") {
        //         mode = "run"
        //         continue
        //     }
        } else if (mode == "run" && token in quicks) {
            funcStack.push(currentFunc)
            currentFunc = quicks[token]
            currentFunc._name = token
        } else if (mode == "run" && token in thumbscript2.builtinFuncs) {
            funcStack.push(currentFunc)
            currentFunc = thumbscript2.builtinFuncs[token]
            currentFunc._name = token
        } else if (mode == "run" && token == "") {
            i++
            continue
        } else if (mode == "run") {
            if (currentFunc && currentFunc.passRaw) {
                stack.push(token)
            } else {
                stack.push(thumbscript2.lookup(token, state))
            }
        }
        // check call.
        while (currentFunc != null && stack.length >= currentFunc.length-1) {
            // log2("calling " + currentFunc._name)
            // log2("stack was: " + JSON.stringify(stack))

            var args = stack.splice(stack.length - (currentFunc.length-1), currentFunc.length - 1)

            // log2("args are: " + JSON.stringify(args))
            // log2("stack is: " + JSON.stringify(stack))
            // log2("state is: " + JSON.stringify(state))

            args.push(state) // something like this.
            var ret = currentFunc.apply(null, args)

            // log2("ret is: " + JSON.stringify(ret))

            if (typeof ret != "undefined") {
                stack.push(ret)
            }

            // log2("stack after return is: " + JSON.stringify(stack))
            // log2("state after return is: " + JSON.stringify(state))

            currentFunc = funcStack.pop()
        }
        i++
    }
    return {
        stack: stack,
        state: state,
    }

}

var code = `    
str Dude greet
str Drew as name1
name1 greet

# some suff
    and other studd


str Alex as name2
greet name2
`
// :mike greet
// :foo :bar :baz :biz :boz
// :drew as :yo1
// :alex as :yo2
// greet yo1
// yo2 greet

var a = thumbscript2.tokenize(code)
log2(a)

var b = thumbscript2.eval(code)
log2("----")
log2(b)





thumbscript2 = {
    lookup: function(a, state) { 
        // maybe add more complex variables
        if (a - 0 == a) {
            return a
        }
        if (a.startsWith(":")) {
            return a.slice(1)
        }
        return state[a]
    },
    builtinFuncs: {
        plus: function(a, b, state) {
            return ((a - 0) + (b - 0)).toString()
        },
        minus: function(a, b, state) {
            return ((a - 0) - (b - 0)).toString()
        },
        times: function(a, b, state) {
            return ((a - 0) * (b - 0)).toString()
        },
        divided_by: function(a, b, state) {
            return ((a - 0) / (b - 0)).toString()
        },
        log: function(a, state) {
            log2(a)
        },
        say: function(a, state) {
            log2(a)
        },
        space: function(state) {
            return " "
        },
        concat: function(a, b, state) {
            return a + b
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
                    if (n >= currentIndent) {
                        newTokens.push(")")
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
                    needsClose.push(currentIndent)
                } else {
                    newTokens.push(tok)
                }
            }
        }
    }
    return newTokens
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
    var stacks = []
    var stack = []
    var funcStack = []
    var currentFunc = null
    var currentIndent = 0
    var lastIndent = 0
    
    var inColon = false
    var inColonStack = []
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
        label: function(name, state) {
            //     // todo: don't need to set if we've seen before
            //     locations["_".repeat(currentIndent) + token.slice(0, -1)] = i
            //     if (mode == "findJump") {
            //         mode = "run"
            //         continue
            //     }
        },
        jumpback: function(name, state) {
        },
        ":": function() {
            stacks.push(stack)
            stack = []
        },
        "(": function(state) {
            stacks.push(stack)
            stack = []
        },
        ")": function(state) {
            stack = stacks.pop().concat(stack)
            // stacks pop concat stack as stack
        }
    }
    
    var mode = "run"
    // tokens different from stack
    while (i < tokens.length) {
        var token = tokens[i]
        if (mode == "run" && token in quicks) {
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
            if (false && token == ",") {
                stacks.push(stack)
                stack = []
            } else if (currentFunc && currentFunc.passRaw) {
                stack.push()
            } else {
                stack.push(thumbscript2.lookup(token, state))
            }
        }
        
        // check call.
        while (currentFunc != null && stack.length >= currentFunc.length-1) {
            if (thumbscript2.verbose) {
                log2("calling " + currentFunc._name)
                log2("stack was: " + JSON.stringify(stack))
            }

            var args = stack.splice(stack.length - (currentFunc.length-1), currentFunc.length - 1)

            if (thumbscript2.verbose) {
                log2("args are: " + JSON.stringify(args))
                log2("stack is: " + JSON.stringify(stack))
                log2("state is: " + JSON.stringify(state))
            }

            args.push(state) // something like this.
            var ret = currentFunc.apply(null, args)

            if (thumbscript2.verbose) {
                log2("ret is: " + JSON.stringify(ret))
            }

            if (typeof ret != "undefined") {
                stack.push(ret)
            }

            if (thumbscript2.verbose) {
                log2("stack after return is: " + JSON.stringify(stack))
                log2("state after return is: " + JSON.stringify(state))
            }

            currentFunc = funcStack.pop()
        }
        i++
    }
    return {
        stack: stack,
        state: state,
    }

}

thumbscript2.verbose = false
// thumbscript2.verbose = true

var code = ` 
hi :
    yo
    : forever
    young
    : and
        : you
            : have
                : this
        ok
            not this
        or this
yay
`
// hi (
//     yo
//     ( forever )
//     young
//     ( and
//         ( you
//             ( have
//                 ( this )
//             )
//         )
//         ok
//             not this
//         or this
//     )
// )
// yay
// hi :
//    yo :
//       foo :
//          bar
//    biz : baz
// hello world : foo
//     bar baz
//         bore bear : and
//             something
//             : something else
//             : and else
//             other
//     else
// biz
// 5  plus (10 divided_by 2) 
// say
// 
// 5 plus (10 divided_by (1 plus 1) plus (2 plus 3))
// say
// 
// 
// 5 plus : 10 divided_by
//     : 1 plus 1
//     plus 3
//         plus 5
//     plus 4
//     plus : 2
//         plus 3
//         
//     plus 4
//         plus  5
//             : plus 6
//     plus 2
//         
// say
// 5 plus ( 10 divided_by
//     ( 1 plus 1 )
//     plus (
//         2
//         plus 3
//         minus 3
//         plus 3
//     )
// )
// say

// 5 plus : 10 divided_by 2
// say
// :hello space concat :world concat say
// 5  plus (10 divided_by 2) 
// say
// 
// 5 plus : 10 divided_by 2
//     minus 2
//     times 3
//     times : 3 plus 4
// say
// 
// str Hello str world concat log
// str Dude greet
// str Drew as name1
// name1 greet
// 
// str Alex as name2
// greet name2

// :mike greet
// :foo :bar :baz :biz :boz
// :drew as :yo1
// :alex as :yo2
// greet yo1
// yo2 greet

var a = thumbscript2.tokenize(code)
log2(a)

// var b = thumbscript2.eval(code)
// log2("----")
// log2(b)





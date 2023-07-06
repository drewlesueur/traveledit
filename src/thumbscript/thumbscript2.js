
thumbscript2 = {
    lookup: function(a, state) {
        // maybe add more complex variables
        if (a - 0 == a) {
            return a
        }

        if (typeof a == "object") {
            return a
        }

        if (a.startsWith(".")) {
            return a.slice(1)
        }
        return state[a]
    },
    builtinFuncs: {
        give: function(who, what, howMany, state) {
            return `You just gave ${who} ${howMany} ${what}s`
        },
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
        // take: function(list, state) {
        //     state[b] = a
        // },
        var: function(a, b, state) {
            // todo: allow $ for variable sets?
            state[a] = thumbscript2.lookup(b, state)
        },
        is: function(a, b, state) {
            if (a == b) {
                return "true"
            }
            return "false"
        },
        sumList: function(list, state) {
            let sum = 0;
            for (let i = 0; i < list.length; i++) {
              sum += list[i] - 0;
            }
            return sum
        },
        record: function(list, state) {
            var r = {}
            for (let i = 0; i < list.length; i+=2) {
                r[list[i]] = list[i+1]
            }
            return r
        },
        print: function(a, state) {
            console.log(a)
        },
        json_encode: function(a, state) {
            return JSON.stringify(a, "", "    ")
        },
    },
    customFuncs: {
    }
}

thumbscript2.builtinFuncs.as.passRaw = true
thumbscript2.builtinFuncs.str.passRaw = true
thumbscript2.builtinFuncs.var.passRaw = true

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
    code = code.replace(/\{/g, " { ")
    code = code.replace(/\}/g, " } ")
    code = code.replace(/\[/g, " [ ")
    code = code.replace(/\]/g, " ] ")
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
    newTokens = thumbscript2.squishFuncs(newTokens)
    return newTokens
}

thumbscript2.squishFuncs = function(tokens) {
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

thumbscript2.eval = function(code) {
    var tokens = thumbscript2.tokenize(code)
    return thumbscript2.run(tokens)
}

// add ability to pass parent state?
thumbscript2.run = function(tokens, state, stack) {
    // var tokens = thumbscript2.tokenize(code)
    var i = 0
    var state = state || {}
    var stack = stack || []
    var stacks = []
    var funcStack = []
    var funcStackStack = []
    var currentFunc = null
    var currentIndent = 0
    var lastIndent = 0

    var inColon = false
    var inColonStack = []
    var locations = {
    }
    var mode = "run"

    // move these to builtinFuncs, instead of just taking state,
    // take an object that represents all
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
        "(": function(state) {
            stacks.push(stack)
            stack = []

            funcStack.push(currentFunc)
            funcStackStack.push(funcStack)
            funcStack = []
            currentFunc = null
        },
        ")": function(state) {
            stack = stacks.pop().concat(stack)
            // stacks pop concat stack as stack

            funcStack = funcStackStack.pop()
            currentFunc = funcStack.pop()
        },
        "[": function(state) {
            stacks.push(stack)
            stack = []
            funcStack.push(currentFunc)
            funcStackStack.push(funcStack)
            funcStack = []
            currentFunc = null
        },
        "]": function(state) {
            var list = stack
            stack = stacks.pop()
            stack.push(list)
            funcStack = funcStackStack.pop()
            currentFunc = funcStack.pop()
        },
        "if": function(a, b, state) {
            if (a == "true") {
                // todo: early return
                // you could also potentially splice b onto tokens ?
                state.lastIf = "true"
                thumbscript2.run(b, state, stack)
            } else {
                state.lastIf = "false"
            }
        },
        "else": function(a, state) {
            if (state.lastIf != "true") {
                state.lastIf = "true"
                thumbscript2.run(a, state, stack)
            } else {
                state.lastIf = "false"
            }
        },
        "switch": function(list, state) {
            for (var i=0; i < list.length - 1; i += 2) {
                var cond = list[i]
                var action = list[i+1]
                thumbscript2.run(cond, state, stack)
                var ret = stack.pop()
                if (ret == "true") {
                    thumbscript2.run(action, state, stack)
                    return;
                }
            }

            if (list.length % 2 == 1) {
                thumbscript2.run(list[list.length-1], state, stack)
            }

        },
        clear: function(state) {
            stack = []
        },
        "final": function(state) {
        },

    }

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
                stack.push(token)
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

// thumbscript2.verbose = false
// thumbscript2.verbose = true


/*
var greet { #1
    takes 2
    as name
    .hello
    concat space
    concat name
    say
}
var greet | as name
    .hello
    concat space
    concat name
    say 

if 1 is 1 | say .hi
var a 10
say a


record *
    .age: 12 plus 1
    .color: .brown
    .height: 2 times (3 plus 4)
    .height2: 2 times : 3 plus 4
    .yo: record *
        .howdy 200
json_encode say



switch *
    | 1 is 2
    | .green
    | 1 is 3
    | .yellow
    | 1 is 4
    | .blue
    | .solid
say  


record *
    .age: 12 plus 1
    .color: .brown
    .height: 2 times (3 plus 4)
    

clear
(20 plus 30) say
say (20 plus 35)

switch *
    | 1 is 2
    | .green
    | 1 is 3
    | .yellow
    | 1 is 1
    | .blue
    | 1 is 1
    | .solid
say

say (20 plus 30)


sumList
* 10 20 30
say

* 10 20 30
sumList
say

say

var b * 10 20 30



.foox as bar

if bar is .foo {
    say .yay_bar
} else if bar is .foo2 {
    say .yay_bar2
} else {
    say .nay_bar
}

if bar is .foo {
    say .yay_bar
    .couch
} else {
    say .nay_bar
    .banana
}
as drew

{ add 1 } as add1
hi :
    yo
    : forever
    young
    : and
        : you
            | have
                : this
        ok
            not this
        or this
yay


*/

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

/*

if (x is 3)
if (x is 3)

x is 3
| say yo
| say no


1 plus {2 minus 3}


say, 1 plus (2 minus, 5 divided_by, 2 plus 3)


1 plus, 2 minus, 5 divided_by, 2 plus 3
say

1 plus (2 minus  (5 divided_by 5))
say

set foo | bar baz | biz boz
*/


var code = `








`
var a = thumbscript2.tokenize(code)
log2(a)
log2("----")
log2("")
log2("")
log2("")
var b = thumbscript2.eval(code)
log2("----")
log2(b)





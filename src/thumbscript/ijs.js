// todo: not slicing as much would prob be faster
// template strings, just the basics
// rename run function



// how would I write this js without the sugar?
// [...a]
// 
// Without using the ES6 spread syntax `[...a]`, you can use the slice() method of arrays:
// ```javascript
// var newArray = a.slice();
// ```
// The slice method will create a new array 
// that is a shallow copy of `a`. 
// Bear in mind that because it creates a shallow copy, 
// deep objects will be referenced 
// and not fully copied. 
// This means if you modify a deep object 
// in `newArray`, 
// it will also modify `a`.




// how would I write this js without the sugar?
// {...a}

// Sure! If you want to manually spread the properties of an object in JavaScript without using the spread syntax (`{...a}`), you can use `Object.assign()`. This method can be used to copy the values of all enumerable own properties from one or more source objects to a target object. Here's how you can do it:
// ```javascript
// Object.assign({}, a);
// ```
// So the Javascript object spread `{...a}` is simply a "sugar" for `Object.assign({}, a)`.

var ijs = {}
// TODO: ignore : , ;
// TOODO: interpolation? (template literals)
ijs.tokenize = function (code) {
    var backslash = "\\"
    code = code + "\n"
    var i = 0
    var state = "out"
    var currentToken = ""
    var quoteType = ""
    var tokens = []

    var pushToken = function (x) {
        if (x == ",") {
            return
        }
        // if (x == ":") {
        //     return
        // }
        if (x == ";") {
            return
        }

        if (x == "true") {
            tokens.push(true)
            return
        }

        if (x == "false") {
            tokens.push(false)
            return
        }
        if (x == "null") {
            tokens.push(null)
            return
        }
        if (x == "undefined") { // lol
            tokens.push(void 0)
            return
        }
        
        var sinUnderscores = x.replaceAll("_", "")
        if (sinUnderscores - 0 == sinUnderscores) {
            tokens.push(sinUnderscores - 0)
            return
        }
        tokens.push(x)
    }

    var isVar = function (chr) {
        var a = chr.charCodeAt(0)
        return (
            (a >= 65 && a <= 90) ||  // A-Z
            (a >= 97 && a <= 122) || // a-z
            (a >= 48 && a <= 57) ||  // 0-9
            (a == 95)            ||    // _
            (a == 16)                  // $
        )
    }

    while (i < code.length) {
        var chr = code.charAt(i)
        if (state == "out") {
            if (" \t\n\r".indexOf(chr) != -1) {
            } else if ("/".indexOf(chr) != -1) {
                state = "firstSlash"
            } else if ("()".indexOf(chr) != -1) {
                // if (i != 0 && "(".indexOf(chr) != -1 && " \t\n".indexOf(code.charAt(i-1)) == -1 ) {
                //     tokens.push("<callFunc>")
                // }
                if ("(".indexOf(chr) != -1) {
                    if (i != 0 && " \t\n\r\(\[".indexOf(code.charAt(i-1)) == -1) {
                        tokens.push("<callFunc>")
                    } else {
                        tokens.push("<group>")
                    }
                }
                tokens.push(chr)
            } else if ("[]".indexOf(chr) != -1) {
                if (i != 0 && "[".indexOf(chr) != -1) {
                    if (" \t\n\r(".indexOf(code.charAt(i-1)) == -1 ) {
                        tokens.push("<computedMemberAccess>")
                    } else {
                        tokens.push("<array>")
                    }
                }
                tokens.push(chr)
            } else if ("{}".indexOf(chr) != -1) {
                if (i != 0 && "{".indexOf(chr) != -1) {
                    tokens.push("<object>")
                }
                tokens.push(chr)
            } else if ('"'.indexOf(chr) != -1) {
                state = "quote"
                quoteType = '"'
                currentToken = chr
            } else if ("'".indexOf(chr) != -1) {
                state = "quote"
                quoteType = "'"
                currentToken = '"'
            } else if ("`".indexOf(chr) != -1) {
                state = "quote"
                quoteType = "`"
                currentToken = '"'
            } else if (isVar(chr)) {
                state = "in"
                currentToken = chr
            } else {
                state = "in_symbol"
                currentToken = chr
            }
        } else if (state == "in") {
            if (" \t\n\r".indexOf(chr) != -1) {
                pushToken(currentToken)
                // special case for return
                if (currentToken == "return" && ("\r\n\r".indexOf(chr) != -1)) {
                    pushToken("undefined")
                }
                currentToken = ""
                state = "out"
            } else if ("()".indexOf(chr) != -1) {
                if (currentToken) {
                    pushToken(currentToken)
                    currentToken = ""
                }
                // if (i != 0 && "(".indexOf(chr) != -1 && " \t\n".indexOf(code.charAt(i-1)) == -1 ) {
                //     tokens.push("<callFunc>")
                // }
                if ("(".indexOf(chr) != -1) {
                    if (i != 0 && " \t\n\r\(\[".indexOf(code.charAt(i-1)) == -1) {
                        tokens.push("<callFunc>")
                    } else {
                        tokens.push("<group>")
                    }
                }
                tokens.push(chr)
                state = "out"
            } else if ("[]".indexOf(chr) != -1) {
                if (currentToken) {
                    pushToken(currentToken)
                    currentToken = ""
                }
                if (i != 0 && "[".indexOf(chr) != -1 && " \t\n\r(".indexOf(code.charAt(i-1)) == -1 ) {
                    tokens.push("<computedMemberAccess>")
                }
                tokens.push(chr)
                state = "out"
            } else if ("{}".indexOf(chr) != -1) {
                if (currentToken) {
                    pushToken(currentToken)
                    currentToken = ""
                }
                tokens.push(chr)
                state = "out"
            } else if (isVar(chr)) {
                currentToken += chr
            } else {
                if (currentToken - 0 == currentToken && chr == ".") {
                    currentToken += "."
                } else {
                    pushToken(currentToken)
                    currentToken = chr
                    state = "in_symbol"
                }
            }
        } else if (state == "in_symbol") {
            if (" \t\n\r".indexOf(chr) != -1) {
                pushToken(currentToken)
                currentToken = ""
                state = "out"
            } else if ("()".indexOf(chr) != -1) {
                if (currentToken) {
                    pushToken(currentToken)
                    currentToken = ""
                }
                // if (i != 0 && "(".indexOf(chr) != -1 && " \t\n".indexOf(code.charAt(i-1)) == -1 ) {
                //     tokens.push("<callFunc>")
                // }
                if ("(".indexOf(chr) != -1) {
                    if (i != 0 && " \t\n\r\(\[".indexOf(code.charAt(i-1)) == -1) {
                        tokens.push("<callFunc>")
                    } else {
                        tokens.push("<group>")
                    }
                }
                tokens.push(chr)
                state = "out"
            } else if ("[]".indexOf(chr) != -1) {
                if (currentToken) {
                    pushToken(currentToken)
                    currentToken = ""
                }
                if (i != 0 && "[".indexOf(chr) != -1 && " \t\n\r(".indexOf(code.charAt(i-1)) == -1 ) {
                    tokens.push("<computedMemberAccess>")
                }
                tokens.push(chr)
                state = "out"
            } else if ("{}".indexOf(chr) != -1) {
                if (currentToken) {
                    pushToken(currentToken)
                    currentToken = ""
                }
                tokens.push(chr)
                state = "out"
            } else if ('"'.indexOf(chr) != -1) {
                pushToken(currentToken)
                state = "quote"
                quoteType = '"'
                currentToken = chr
            } else if ("'".indexOf(chr) != -1) {
                pushToken(currentToken)
                state = "quote"
                quoteType = "'"
                currentToken = '"'
            } else if ("`".indexOf(chr) != -1) {
                pushToken(currentToken)
                state = "quote"
                quoteType = "single"
                currentToken = '"'
            } else if (isVar(chr)) {
                pushToken(currentToken)
                currentToken = chr
                state = "in"
            } else {
                currentToken += chr
            }
        } else if (state == "quote") {
            if (backslash.indexOf(chr) != -1) {
                // currentToken += chr
                state = "escape"
            } else if ('"'.indexOf(chr) != -1 && quoteType != '"') {
                currentToken += '\\"'
            } else if (quoteType.indexOf(chr) != -1) {
                currentToken += '"'
                if (quoteType == "`") {
                    // todo: make $ escapable
                    // log2("current token is ")
                    // log2(currentToken)
                    // return
                    tokens.push(["<interpolate>", JSON.parse(currentToken.replaceAll("\n", "\\n"))])
                } else {
                    tokens.push("#" + JSON.parse(currentToken))
                }
                // tokens.push("#" + currentToken)
                currentToken = ""
                state = "out"
            } else {
                currentToken += chr
            }
        } else if (state == "escape") {
            if ('"\\/bfnrtu'.indexOf(chr) != -1) {
                currentToken += backslash + chr
            } else {
                currentToken += chr
            }
            state = "quote"
        } else if (state == "firstSlash") {
            if ("/".indexOf(chr) != -1) {
                state = "comment"
            } else {
                state = "out"
                i--
            }
        } else if (state == "comment") {
            if ("\n\r".indexOf(chr) != -1) {
                state = "out"
            }
        }
        i++
    }
    // return tokens

    // logging pre tokens
    // log2(tokens)
    var newTokens = []
    var tokenStack = []
    // squish funcs
    // TODO, what if you processed all the operators linearly here first?
    for (var i=0; i<tokens.length; i++) {
        var token = tokens[i]
        if (token == "(") {
            tokenStack.push(newTokens)
            // var prevToken = newTokens.pop()
            // if (prevToken == "<callFunc>") {
            //     var prevPrevToken = newTokens.pop()
            //     newTokens = [prevPrevToken]
            // } else {
            //     newTokens.push(prevToken)
                newTokens = []
            // }
        } else if (token == "{") {
            tokenStack.push(newTokens)
            newTokens = []
        } else if (token == "[") {
            tokenStack.push(newTokens)
            newTokens = []
        } else if (")]}".indexOf(token) != -1) {
            // log2("+newTokens")
            // log2(newTokens)
            var list = newTokens
            // log2("+closing")
            // log2(newTokens)
            var operated = ijs.operatorate(list)
            // log2("+operated")
            // log2(operated)
            newTokens = tokenStack.pop()
            newTokens.push(operated)


            if ("]".indexOf(token) != -1) {
                var t = newTokens.pop()
                var prev = newTokens.pop()
                newTokens.push(prev) // lol
                if (prev == "<computedMemberAccess>") {
                    // t = t[0] || [] // TODO: why this?
                    t = t[0]
                }
                newTokens.push(t)
            }
        } else {
            newTokens.push(token)
        }
    }
    // return tokenStack
    // log2(newTokens)
    return ijs.operatorate(newTokens)
}
// var operators = {
//      "var": {
//          "associatitivity": "ltr",
//          "fix": "pre",
//          "order": ["var", "$a", "=", $b"],
//          "precedence": 19,
//      }
// }

// write a javascript function that parses operators
//
// for example
// ["a", "b", "+", "c", "d"]
// would evaluate to
// ["a", ["+", "b", "c"], "d"]

// write some code to parse javascript template strings
// that doesn't use eval or `new Function`
// and doesn't use template strings itself.
// You don't need to evaluate, just parse
ijs.templateRegex = /\$\{([^}]+)\}/g;

function parseTemplateString (templateString, state) {
    // won't allow object literal in templste this way.
    var regex = /\$\{([^}]+)\}/g;
    return templateString.replace(regex, function (x, y) {
        return state[y]
    });
}
// var ret = parseTemplateString("foo${xyz}bar${abc}", {
//     xyz: "hi",
//     abc: "bye"
// })
// log2(ret)



ijs.operatorate = function(tokens) {
    tokens = ijs.infixate(tokens, false, true, -1, 0)
    return tokens
}

ijs.infixes = {
     "?": {
         "associatitivity": 1,
         "precedence": 2,
     },
     ":": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "=>": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "+=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "-=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "**=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "*=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "/=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "%=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "<<=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     ">>=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     ">>>=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "&=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "^=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "|=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "&&=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "||=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "??=": {
         "associatitivity": 1,
         "precedence": 2,
     },
     "??": {
         "associatitivity": 0,
         "precedence": 3,
     },
     "||": {
         "associatitivity": 0,
         "precedence": 3,
     },
     "&&": {
         "associatitivity": 0,
         "precedence": 4,
     },
     "|": {
         "associatitivity": 0,
         "precedence": 5,
     },
     "^": {
         "associatitivity": 0,
         "precedence": 6,
     },
     "&": {
         "associatitivity": 0,
         "precedence": 7,
     },
     "!==": {
         "associatitivity": 0,
         "precedence": 8,
     },
     "===": {
         "associatitivity": 0,
         "precedence": 8,
     },
     "!=": {
         "associatitivity": 0,
         "precedence": 8,
     },
     "==": {
         "associatitivity": 0,
         "precedence": 8,
     },
     "instanceof": {
         "associatitivity": 0,
         "precedence": 9,
     },
     "in": {
         "associatitivity": 0,
         "precedence": 9,
     },
     "of": {
         "associatitivity": 0,
         "precedence": 9,
     },
     ">=": {
         "associatitivity": 0,
         "precedence": 9,
     },
     ">": {
         "associatitivity": 0,
         "precedence": 9,
     },
     "<=": {
         "associatitivity": 0,
         "precedence": 9,
     },
     "<": {
         "associatitivity": 0,
         "precedence": 9,
     },
     ">>>": {
         "associatitivity": 0,
         "precedence": 10,
     },
     ">>": {
         "associatitivity": 0,
         "precedence": 10,
     },
     "<<": {
         "associatitivity": 0,
         "precedence": 10,
     },
     "+": {
         "associatitivity": 0,
         "precedence": 11,
     },
     "-": {
         "associatitivity": 0,
         "precedence": 11,
     },
     "*": {
         "associatitivity": 0,
         "precedence": 12,
     },
     "/": {
         "associatitivity": 0,
         "precedence": 12,
     },
     "%": {
         "associatitivity": 0,
         "precedence": 12,
     },
     "**": {
         "associatitivity": 1,
         "precedence": 13,
     },
     "<callFunc>": {
         "associatitivity": 0,
         "precedence": 17,
     },
     "<computedMemberAccess>": {
         "associatitivity": 0,
         "precedence": 17,
     },
     ".": {
         "associatitivity": 0,
         "precedence": 17,
     },
     "?.": {
         "associatitivity": 0,
         "precedence": 17,
     },
     "else": {
         "associatitivity": 1,
         "precedence": 0.5,
     },
}


ijs.prefixes = {
     "...": {
         "associatitivity": 1,
         "precedence": 17,
         "arity": 1,
         "fix": "pre",
     },
     "!": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
     },
     "~": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
     },
     "+": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
     },
     "-": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
     },
     "++": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
     },
     "--": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
     },
     "typeof": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
     },
     "void": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
     },
     "delete": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
     },
     "await": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
     },
     "new": {
         "associatitivity": 1,
         "precedence": 16,
         "arity": 1,
         "fix": "pre",
     },
     "<array>": {
         "associatitivity": 1,
         "precedence": 99,
         "arity": 1,
         "fix": "pre",
     },
     "<object>": {
         "associatitivity": 1,
         "precedence": 99,
         "arity": 1,
         "fix": "pre",
     },
     "async": {
         "associatitivity": 1,
         "precedence": 0,
         "arity": 1,
         "fix": "pre",
     },
     "function": {
         "associatitivity": 1,
         "precedence": 0,
         "arity": 2,
         "fix": "pre",
     },
     "while": {
         "associatitivity": 1,
         "precedence": 0,
         "arity": 2,
         "fix": "pre",
     },
     "do": {
         "associatitivity": 1,
         "precedence": 0,
         "arity": 4,
         "fix": "pre",
     },
     "var": {
         "associatitivity": 1,
         "precedence": 9,
         "arity": 1,
         "fix": "pre",
     },
     "let": {
         "associatitivity": 1,
         "precedence": 9,
         "arity": 1,
         "fix": "pre",
     },
     "const": {
         "associatitivity": 1,
         "precedence": 9,
         "arity": 1,
         "fix": "pre",
     },
     "for": {
         "associatitivity": 1,
         "precedence": 0,
         "arity": 2,
         "fix": "pre",
     },
     "return": {
         "associatitivity": 1,
         "precedence": 0,
         "arity": 1,
         "fix": "pre",
     },
     "if": {
         "associatitivity": 1,
         "precedence": 1,
         "arity": 2,
         "fix": "pre",
     },
     "try": {
         "associatitivity": 1,
         "precedence": 1,
         "arity": 4,
         "fix": "pre",
     },
     "do": {
         "associatitivity": 1,
         "precedence": 1,
         "arity": 3,
         "fix": "pre",
     },
     "<group>": {
         "associatitivity": 0,
         "precedence": 17,
     },
}
ijs.postfixes = {
     "++": {
         "associatitivity": 1,
         "precedence": 15,
         "arity": 1,
         "fix": "post",
     },
     "--": {
         "associatitivity": 1,
         "precedence": 15,
         "arity": 1,
         "fix": "post",
     },
}

function logIndent(indent, msg, obj) {
    // log2("    ".repeat(indent) + msg + ": " + JSON.stringify(obj))
}
function logCurr(indent, msg, obj) {
    // log2("    ".repeat(indent) + msg + ": " + JSON.stringify(obj))
}







// pre2 megapre2 2 1 

// - + 3
// ijs.nextTokenGroup = function (tokens, lastOpDef, lastGroup) {
//     var group = []
//     var token = tokens.shift()
//     if (!lastGroup) { // we're first!
//         if (ijs.prefixes.hasOwnProperty(token)) {
//             var opDef = ijs.prefixes[token]
//             group = [token + "_pre"]
//             for (var i=0; i<(opDef.arity || 1); i++) {
//                 var nextTerm = ijs.nextTokenGroup(tokens, null, null)
//                 group.push(nextTerm)
//             }
//             return group
//         }
//         return token
//     } else {
//         if (ijs.infixes.hasOwnProperty(token)) {
//             var opDef = ijs.infixes[token]
//             if (!lastOpDef) {
//                 var g = [token, lastGroup]
//                 g.push(ijs.nextTokenGroup(tokens, opDef, g))
//                 // return g
//                 return null
//             } else if (opDef.precedence < lastOpDef.precedence || (opDef.precedence == lastOpDef.precedence && !opDef.associatitivity)) {
//                 copiedLastGroup = JSON.parse(JSON.stringify(lastGroup))
//                 lastGroup[0] = token
//                 lastGroup[1] = copiedLastGroup
//                 lastGroup[2] = ijs.nextTokenGroup(tokens, opDef, lastGroup)
//                 // return lastGroup
//                 // return ijs.nextTokenGroup()
//                 return null
//             } else if (opDef.precedence > lastOpDef.precedence || (opDef.precedence == lastOpDef.precedence && opDef.associatitivity)) {
//                 var lastRight
//                 if (typof lastGroup == "object") {
//                     var lastRight = lastGroup[lastGroup.length - 1]
//                     var newGroup = [token, lastRight, ijs.nextTokenGroup(tokens, opDef, lastGroup)]
//                     lastGroup[lastGroup.length - 1] = newGroup
//                 } else {
//                     lastRight = lastGroup
//                     var newGroup = [token, lastRight, ijs.nextTokenGroup(tokens, opDef, lastGroup)]
//                     lastGroup[lastGroup.length - 1] = newGroup
//                 }
//                 // return newGroup
//                 return null
//             }
//         }
//     }
//     return token
// }

// ijs.infixate = function (tokens) {
//     var newTokens = []
//     var lastGroup = null
//     while (true) {
//         if (tokens.length == 0) {
//             return newTokens
//         }
//         var curGroup = ijs.nextTokenGroup(tokens, null, lastGroup)
//         if (curGroup != null) {
//             newTokens.push(curGroup)
//             lastGroup = curGroup
//         }
//     }
// }
        // if (tokens.length == 0) {
        //     if (newTokens.length == 0) {
        //         return (void 0)
        //     }
        //     return newTokens
        // }
        // var token = tokens.shift()

// var prefixes = ijs.prefixes
// var infixes = ijs.infixes
ijs.infixate2 = function(tokens) {
    
}




    // tokens = ijs.infixate(tokens, false, true, -1, 0)
ijs.infixate = function(tokens, stopAfter, skipInfix, lastPrecedence, iter, forAsync) {
    logIndent(iter, "infixate called", tokens)
    if (iter == 500) {
        alert("oops")
        return
    }
    var newTokens = []
    logCurr(iter, "start", newTokens)
    var stack = []
    var d = null
    // a b c x + y * 3 ** 4
    // 3 ** 4 * y + c
    // 3 ** 4 ** 5
    // x + y z c b
    // (+ x (* y 3))
    // x + 3 + 4 + 5
    // y * 3 + 2
    // y ** 3 ** 4.bar
    // (** (** y 3) 4)

    // y + 3 + 4.bar
    // (+ (+ y 3) 4)

    // x + 3 * 4.a
    // 4.a * 3 + x


    // 3 ** 4 * 2
    // (** 3 4)
    // (* (** 3 4) 2)

    // 1 + 2 * 3 ** 4
    // (+ 1 2)
    // (+ 1 (* 2 3))

    // 3 - -2
    // = 3 + +7
    // = 3 + +7++

    // 3 + 4 ----7
    // 3 + 4 - -7  + 5


    // 2 + 3 * !c.a
    // 2 + 3 * !c + a
    // 2 + 3 * !!c + a

    // 2 * 3 + 4
    // (* 2 3)
    // (+ (* 2 3) 4)
    // !3 + 4

    // !a.b + c
    // (! a)
    // (! (. a b))


    var currPrecedence = -1
    var lastGroup = null
    while (true) {
        if (tokens.length == 0) {
            if (newTokens.length == 0) {
                return (void 0)
            }
            return newTokens
        }
        var token = tokens.shift()
        // log2("+ token: " + JSON.stringify(token))
        if (!skipInfix && (ijs.infixes.hasOwnProperty(token))) {
        // if (token in ijs.infixes) {
            var opDef = ijs.infixes[token]
            currPrecedence = opDef.precedence
            currAssociatitivity = opDef.associatitivity
            // log2(JSON.stringify([token, currPrecedence, lastPrecedence]))
            var oldLastGroup = lastGroup
            if (lastPrecedence == -1) {
                lastGroup = [token, newTokens.pop(), ijs.infixate(tokens, true, true, currPrecedence, iter+1)]
                // lastGroup = [token, newTokens.pop(), ijs.infixate(tokens, true, false, currPrecedence, iter+1)]
                newTokens.push(lastGroup)
                logCurr(iter, "a", newTokens)
                oldLastGroup = lastGroup
            } else if (currPrecedence < lastPrecedence || (currPrecedence == lastPrecedence && !currAssociatitivity)) {
                // log2("-here")
                copiedLastGroup = JSON.parse(JSON.stringify(lastGroup))
                lastGroup[0] = token
                lastGroup[1] = copiedLastGroup
                lastGroup[2] = ijs.infixate(tokens, true, true, currPrecedence, iter + 1)
                lastGroup = lastGroup // lol
                logCurr(iter, "b", newTokens)
            } else if (currPrecedence > lastPrecedence || (currPrecedence == lastPrecedence && currAssociatitivity)) {
                var lastRight = lastGroup[lastGroup.length - 1]
                var newGroup = [token, lastRight, ijs.infixate(tokens, true, true, currPrecedence, iter + 1)]
                lastGroup[lastGroup.length - 1] = newGroup
                lastGroup = newGroup
                logCurr(iter, "c", newTokens)
            }
            if (stopAfter) {
                if (forAsync) {
                    // alert("stopping1: " + JSON.stringify(lastGroup))
                }
                // wait maybe just return lastGroup?
                logIndent(iter, "infix return", lastGroup)
                // return lastGroup
                return oldLastGroup
            }
            lastPrecedence = currPrecedence
        } else if (ijs.prefixes.hasOwnProperty(token)) {
            var opDef = ijs.prefixes[token]
            currPrecedence = opDef.precedence
            len = opDef.len
            lastGroup = [token + "_pre"]
            for (var i=0; i<(opDef.arity || 1); i++) {
                if (token == "async") {
                    // alert("trying to grab for async: " + JSON.stringify(tokens))
                    var grabbed = ijs.infixate(tokens, true, true, currPrecedence, iter + 1, true)
                } else {
                    // alert("trying to grab for " + token + ":"  + JSON.stringify(tokens))
                    var grabbed = ijs.infixate(tokens, true, true, currPrecedence, iter + 1, false)
                }
                if (token == "async") {
                    // alert("for "+token+" i grabbed: " + JSON.stringify(grabbed))
                }
                lastGroup.push(grabbed)
            }
            logCurr(iter, "d", newTokens)
            lastPrecedence = currPrecedence
            if (stopAfter) {
                if (forAsync) {
                    // alert("stopping2: " + JSON.stringify(lastGroup))
                }
                // alert("returning: " + JSON.stringify(lastGroup))
                // wait maybe just return lastGroup?
                logIndent(iter, "prefix return", lastGroup)
                // return lastGroup
                
                var next = ""
                if (tokens.length) {
                    var next = tokens.shift()
                    tokens.unshift(next)
                }
                if (next in ijs.infixes) {
                    var opDef = ijs.infixes[next]
                    currPrecedence = opDef.precedence
                    currAssociatitivity = opDef.associatitivity
                    if (currPrecedence < lastPrecedence || (currPrecedence == lastPrecedence && !currAssociatitivity)) {
                        return lastGroup
                    } else {
                        lastPrecedence = currPrecedence
                    }
                } else if (next in ijs.postfixes) {
                    tokens.shift()
                    if (forAsync) {
                        // alert("stopping4: " + JSON.stringify([next + "_post", token]))
                    }
                    return [next + "_post", lastGroup]
                } else {
                    return lastGroup
                }
                
            }
            // lastPrecedence = currPrecedence
            newTokens.push(lastGroup)
            logCurr(iter, "e", newTokens)
        // } else if (token in ijs.postfixes) {
        //     lastGroup = [token + "_postfix", lastGroup]
        } else {
            if (stopAfter) {
                if (forAsync) {
                    // alert("got here for async")
                }
                var next = ""
                if (tokens.length) {
                    var next = tokens.shift()
                    tokens.unshift(next)
                }
                if (next in ijs.infixes) {
                    var opDef = ijs.infixes[next]
                    currPrecedence = opDef.precedence
                    currAssociatitivity = opDef.associatitivity
                    if (currPrecedence < lastPrecedence || (currPrecedence == lastPrecedence && !currAssociatitivity)) {
                        logIndent(iter, "token return a", token)
                        if (forAsync) {
                            // alert("stopping3: " + JSON.stringify(token))
                        }
                        return token
                    }
                } else if (next in ijs.postfixes) {
                    tokens.shift()
                    if (forAsync) {
                        // alert("stopping4: " + JSON.stringify([next + "_post", token]))
                    }
                    return [next + "_post", token]
                } else {
                    logIndent(iter, "token return b", token)
                    if (forAsync) {
                        // alert("stopping5: " + JSON.stringify(token))
                    }
                    return token
                }
            }
            lastPrecedence = -1
            // a little duplication here
            var next = ""
            if (tokens.length) {
                var next = tokens.shift()
                tokens.unshift(next)
            }
            if (next in ijs.postfixes) {
                tokens.shift()
                newTokens.push([next + "_post", token])
                logCurr(iter, "f", newTokens)
            } else {
                newTokens.push(token)
                logCurr(iter, "g", newTokens)
            }
        }
        skipInfix = false // we only want it on the first one
        logIndent(iter, "iterating", newTokens)
    }
    logIndent(iter, "normal return", newTokens)

    if (newTokens.length == 0) {
        return void 0
    }
    return newTokens

}


// var tokens = "3 ** 4 * 2 + 1".split(" ")
// log2(ijs.infixate(tokens))
// var tokens = "1 + 2 * 3 ** 4".split(" ")
// log2(ijs.infixate(tokens))
// var tokens = "a b c 1 + 2 + 3 + 4 5 6 7".split(" ")
// log2(ijs.infixate(tokens))
// var tokens = "a b c 1 ** 2 ** 3 ** 4 5 6 7".split(" ")
// log2(ijs.infixate(tokens))
// var tokens = "a + - ! b".split(" ")
// var tokens = "~ ! ++ b ++ c".split(" ")
// var tokens = "7 - - 2 * 3".split(" ")
// log2(ijs.infixate(tokens))


ijs.run = function(code, world) {
    // var oldPreventRender = preventRender
    // preventRender = true
    var tokens = ijs.tokenize(code)
    log2(tokens)
    // return
    
    if (!world) {
        var globalObject
        if (typeof window != "undefined") {
            globalObject = window
        } else if (typeof self != "undefined") {
            globalObject = self
        }
        var globalWorld = {
            state: globalObject,
            // cachedLookupWorld: {},
            parent: null,
        }
        world = {
            parent: globalWorld,
            state: {},
            // cachedLookupWorld: {},
            global: globalWorld
        }
    }
    var f = ijs.makeFunc([], tokens, world)
    var ret
    // try {
        ret = f()
    // } catch (e) {
    //     log2("-error: " + e)
    // }
    // var preventRender = oldPreventRender
    // log2("+state")
    // log2(f.world.state)
    // log2("+return value")
    // log2(ret)
    return ret
}

// TODO: numbers

ijs.makeAsyncFunc = function(params, body, world) {
    body = body || []
    // body = ["run", ...body]
    // body.unshift("run")
    var world = {
        parent: world,
        state: {},
        // cachedLookupWorld: {},
        global: world.global,
        async: true,
    }

    // Hoist!
    var hoisted = []
    var nonHoisted = []
    for (var i = 0; i < body.length; i++) {
        if (body[i][0] == "function_pre") {
            hoisted.push(body[i])
        } else if (body[i][0] == "async_pre" && body[i][1][0] == "function_pre") {
            hoisted.push(body[i])
        } else {
            nonHoisted.push(body[i])
        }
    }
    if (hoisted.length) {
        body = [...hoisted, ...nonHoisted]
    }

    var f = async function(...args) {
        if (params) {
            // only handling spread if it's the only argument for bow
            if (params.length == 1 && params[0][0] == "..._pre") {
                world.state[params[0][1]] = args
            } else {
                for (var i=0; i<args.length; i++) {
                    var arg = args[i]
                    var paramName = params[i]
                    if (typeof params[i] == "object") {
                        // for default args
                        paramName = params[i][1]
                    }
                    world.state[paramName] = args[i]
                }
                // default args
                for (var i=args.length; i<params.length; i++) {
                    world.state[params[i][1]] = ijs.exec(params[i][2], world)
                }
            }
        }
        // var ret = ijs.exec(body, world)
        var ret = ijs.builtins["<runAsync>"](body, world)
        // just a unique indicator for special return value
        if (ijs.isSpecialReturn(ret)) {
            return ret.returnValue
        }
        return ret
    }
    f.world = world // lol
    return f
    // todo default args?
}

ijs.makeFunc = function(params, body, world) {
    body = body || []
    // body = ["run", ...body]
    // body.unshift("run")
    // alert(JSON.stringify(body, null, "    "))
    var world = {
        parent: world,
        state: {},
        // cachedLookupWorld: {},
        global: world.global,
        async: false
    }
    // log2("+params are")
    // log2(params)
    
    // Hoist!
    var hoisted = []
    var nonHoisted = []
    for (var i = 0; i < body.length; i++) {
        if (body[i][0] == "function_pre") {
            hoisted.push(body[i])
        } else if (body[i][0] == "async_pre" && body[i][1][0] == "function_pre") {
            hoisted.push(body[i])
        } else {
            nonHoisted.push(body[i])
        }
    }
    if (hoisted.length) {
        body = [...hoisted, ...nonHoisted]
    }
    var f = function(...args) {
        if (params) {
            // only handling spread if it's the only argument for bow
            if (params.length == 1 && params[0][0] == "..._pre") {
                world.state[params[0][1]] = args
            } else {
                for (var i=0; i<args.length; i++) {
                    var arg = args[i]
                    var paramName = params[i]
                    if (typeof params[i] == "object") {
                        // for default args
                        paramName = params[i][1]
                    }
                    world.state[paramName] = args[i]
                }
                // default args
                for (var i=args.length; i<params.length; i++) {
                    world.state[params[i][1]] = ijs.exec(params[i][2], world)
                }
            }
        }
        // var ret = ijs.exec(body, world)
        var ret = ijs.builtins["<run>"](body, world)
        // just a unique indicator for special return value
        if (ijs.isSpecialReturn(ret)) {
            return ret.returnValue
        }
        return ret
    }
    f.world = world // lol
    return f
    // todo default args?
}
// ijs.breakMessage = {"break": true}
// ijs.continueMessage = {"continue":true}

ijs.assinmentOps = {
    "+=": (o, k, v) => { return o[k] += v },
    "-=": (o, k, v) => { return o[k] -= v },
    "**=": (o, k, v) => { return o[k] **= v },
    "*=": (o, k, v) => { return o[k] *= v },
    "/=": (o, k, v) => { return o[k] /= v },
    "%=": (o, k, v) => { return o[k] %= v },
    "<<=": (o, k, v) => { return o[k] <<= v },
    ">>=": (o, k, v) => { return o[k] >>= v },
    ">>>=": (o, k, v) => { return o[k] >>>= v },
    "&=": (o, k, v) => { return o[k] &= v },
    "^=": (o, k, v) => { return o[k] ^= v },
    "|=": (o, k, v) => { return o[k] |= v },
    "&&=": (o, k, v) => { return o[k] &&= v },
    "||=": (o, k, v) => { return o[k] ||= v },
    "??=": (o, k, v) => { return o[k] ??= v },
}
ijs.makeAssignmentBuiltin = function (opFunc) {
    return function (args, world) {
        if (typeof args[0] === "object") {
            if (args[0][0] == ".") {
                var obj = ijs.exec(args[0][1], world) 
                varName = args[0][2]
                // obj[varName] += ijs.exec(args[1], world)
                opFunc(obj, varName, ijs.exec(args[1], world))
            } else if (args[0][0] == "<computedMemberAccess>") {
                var obj = ijs.exec(args[0][1], world) 
                var varName = ijs.exec(args[0][2], world) 
                // obj[varName] += ijs.exec(args[1], world)
                opFunc(obj, varName, ijs.exec(args[1], world))
            }
            return
        }
        var w = ijs.getWorldForKey(world, args[0])
        // w.state[args[0]] += ijs.exec(args[1], world)
        opFunc(w.state, args[0], ijs.exec(args[1], world))
    }
}
ijs.getRunFunc = function (isAsync) {
    if (isAsync) {
        return "<runAsync>"
    }
    return "<run>"
}
ijs.builtins = {
    // todo: might conflict with a variable named run
    // call it "<run>"
    "<runAsync>": async function (args, world, inBlock) {
        // var last = void 0;
        for (var i=0; i<args.length; i++) {
            var arg = args[i]
            // some special cases
            // log2("-running: "+JSON.stringify(arg))
            if (typeof arg == "object") {
                if (arg[0] == "return_pre") {
                    var ret
                    if (typeof arg[1] == "undefined") {
                        ret = arg[1]
                    } else {
                        ret = ijs.exec(arg[1], world)
                    }
                    if (inBlock) {
                        var ret2 = ijs.makeSpecialReturn()
                        ret2.returnMessage = true
                        ret2.returnValue = ret
                        return ret2
                    }
                    return ret
                } else if (arg[0] == "await_pre") {
                    await ijs.exec(arg[1], world)
                    continue
                } else if (arg[0] == "=" && arg[2][0] == "await_pre") {
                    // special case for var a = await smthbg()
                    await ijs.callFunc("=_await", arg.slice(1), world)
                    continue
                // instead of doing this here, I handle in exec
                // then await here, a bit kludgy
                // } else if (arg[0] == "if_pre") {
                //     // control structures need to be awaited
                //     await ijs.builtins.if_pre_await(arg.slice(1), world)
                //     continue
                // } else if (arg[0] == "for_pre") {
                //     // control structures need to be awaited
                //     await ijs.builtins.for_pre_await(arg.slice(1), world)
                //     continue
                }
                // log2("the thing to run is " + JSON.stringify(arg))
            }
            if (arg == "break") {
                var ret = ijs.makeSpecialReturn()
                ret.breakMessage = true
                return ret
            }
            if (arg == "continue") {
                var ret = ijs.makeSpecialReturn()
                ret.continueMessage = true
                return ret
            }
            var pRet = ijs.exec(arg, world)
            var ret
            if (arg[0] in ijs.asyncVersions) {
                ret = await pRet
            } else {
                ret = pRet
            }
            if (ijs.isSpecialReturn(ret)) {
                if (ret.breakMessage || ret.returnMessage) {
                    return ret
                }
            }
        }
    },
    "<run>": function(args, world, inBlock) {
        // var last = void 0;
        for (var i=0; i<args.length; i++) {
            var arg = args[i]
            // some special cases
            // log2("-running: "+JSON.stringify(arg))
            if (typeof arg == "object") {
                if (arg[0] == "return_pre") {
                    var ret
                    if (typeof arg[1] == "undefined") {
                        ret = arg[1]
                    } else {
                        ret = ijs.exec(arg[1], world)
                    }
                    if (inBlock) {
                        var ret2 = ijs.makeSpecialReturn()
                        ret2.returnMessage = true
                        ret2.returnValue = ret
                        return ret2
                    }
                    return ret
                }
            }
            if (arg == "break") {
                var ret = ijs.makeSpecialReturn()
                ret.breakMessage = true
                return ret
            }
            if (arg == "continue") {
                var ret = ijs.makeSpecialReturn()
                ret.continueMessage = true
                return ret
            }
            var ret = ijs.exec(arg, world)
            if (ijs.isSpecialReturn(ret)) {
                if (ret.breakMessage || ret.returnMessage) {
                    return ret
                }
            }
        }
    },
    "=": function (args, world) {
        // alert("= " + JSON.stringify(args))
        // TODO: wrangle these
        // not doing destructuring yet
        // lol maybe destructuring can be handled at the parser level?
        // like it turns it into the more verbose syntax
        // that way the core is smaller.
        // gotta figure out let vs if
        var varName = args[0]
        var assignType = "global"
        if (typeof args[0] == "object") {
            if (args[0][0] == "var_pre") {
                varName = args[0][1]
                assignType = "var"
                // var w = ijs.getWorldForKey(world, varName) || world
                var w = world
                while (w.blockScope) {
                    w = w.parent
                }
                w.state[varName] = ijs.exec(args[1], world)
            } else if (args[0][0] == "let_pre") {
                varName = args[0][1]
                assignType = "let"
                var w = world
                w.state[varName] = ijs.exec(args[1], world)
            } else if (args[0][0] == "const_pre") {
                varName = args[0][1]
                assignType = "const"
                var w = world
                w.state[varName] = ijs.exec(args[1], world)
            } else if (args[0][0] == ".") {
                var obj = ijs.exec(args[0][1], world) 
                varName = args[0][2]
                obj[varName] = ijs.exec(args[1], world)
            } else if (args[0][0] == "<computedMemberAccess>") {
                var obj = ijs.exec(args[0][1], world) 
                var varName = ijs.exec(args[0][2], world) 
                obj[varName] = ijs.exec(args[1], world)
            }
        } else {
            var w = ijs.getWorldForKey(world, varName) || world.global
            w.state[varName] = ijs.exec(args[1], world)
        }
    },
    "=_await": async function (args, world) {
        // alert("=_await")
        // TODO: wrangle these
        // not doing destructuring yet
        // lol maybe destructuring can be handled at the parser level?
        // like it turns it into the more verbose syntax
        // that way the core is smaller.
        // gotta figure out let vs if
        var varName = args[0]
        var assignType = "global"
        if (typeof args[0] == "object") {
            if (args[0][0] == "var_pre") {
                varName = args[0][1]
                assignType = "var"
                // var w = ijs.getWorldForKey(world, varName) || world
                var w = world
                while (w.blockScope) {
                    w = w.parent
                }
                w.state[varName] = await ijs.exec(args[1], world)
            } else if (args[0][0] == "let_pre") {
                varName = args[0][1]
                assignType = "let"
                var w = ijs.getWorldForKey(world, varName) || world
                w.state[varName] = await ijs.exec(args[1], world)
            } else if (args[0][0] == "const_pre") {
                varName = args[0][1]
                assignType = "const"
                var w = ijs.getWorldForKey(world, varName) || world
                w.state[varName] = await ijs.exec(args[1], world)
            } else if (args[0][0] == ".") {
                var obj = ijs.exec(args[0][1], world) 
                varName = args[0][2]
                obj[varName] = await ijs.exec(args[1], world)
            } else if (args[0][0] == "<computedMemberAccess>") {
                var obj = ijs.exec(args[0][1], world) 
                var varName = ijs.exec(args[0][2], world) 
                obj[varName] = await ijs.exec(args[1], world)
            }
        } else {
            var w = ijs.getWorldForKey(world, varName)
            world.global.state[varName] = await ijs.exec(args[1], world)
        }
    },
    "+=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["+="]),
    "-=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["-="]),
    "**=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["**="]),
    "*=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["*="]),
    "/=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["/="]),
    "%=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["%="]),
    "<<=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["<<="]),
    ">>=": ijs.makeAssignmentBuiltin(ijs.assinmentOps[">>="]),
    ">>>=": ijs.makeAssignmentBuiltin(ijs.assinmentOps[">>>="]),
    "&=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["&="]),
    "^=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["^="]),
    "|=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["|="]),
    "&&=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["&&="]),
    "||=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["||="]),
    "??=": ijs.makeAssignmentBuiltin(ijs.assinmentOps["??="]),

    "??": function (args, world) {
        return ijs.exec(args[0], world) ?? ijs.exec(args[1], world)
    },
    "||": function (args, world) {
        return ijs.exec(args[0], world) || ijs.exec(args[1], world)
    },
    "&&": function (args, world) {
        return ijs.exec(args[0], world) && ijs.exec(args[1], world)
    },
    "|": function (args, world) {
        return ijs.exec(args[0], world) | ijs.exec(args[1], world)
    },
    "^": function (args, world) {
        return ijs.exec(args[0], world) ^ ijs.exec(args[1], world)
    },
    "&": function (args, world) {
        return ijs.exec(args[0], world) & ijs.exec(args[1], world)
    },
    "!==": function (args, world) {
        return ijs.exec(args[0], world) !== ijs.exec(args[1], world)
    },
    "===": function (args, world) {
        return ijs.exec(args[0], world) === ijs.exec(args[1], world)
    },
    "!=": function (args, world) {
        return ijs.exec(args[0], world) != ijs.exec(args[1], world)
    },
    "==": function (args, world) {
        return ijs.exec(args[0], world) == ijs.exec(args[1], world)
    },
    "instanceof": function (args, world) {
        return ijs.exec(args[0], world) instanceof ijs.exec(args[1], world)
    },
    // "of": function (args, world) {
    //     return ijs.exec(args[0], world) of ijs.exec(args[1], world)
    // },
    "in": function (args, world) {
        return ijs.exec(args[0], world) in ijs.exec(args[1], world)
    },
    ">=": function (args, world) {
        return ijs.exec(args[0], world) >= ijs.exec(args[1], world)
    },
    ">": function (args, world) {
        return ijs.exec(args[0], world) > ijs.exec(args[1], world)
    },
    "<=": function (args, world) {
        return ijs.exec(args[0], world) <= ijs.exec(args[1], world)
    },
    "<": function (args, world) {
        return ijs.exec(args[0], world) < ijs.exec(args[1], world)
    },
    ">>>": function (args, world) {
        return ijs.exec(args[0], world) >>> ijs.exec(args[1], world)
    },
    ">>": function (args, world) {
        return ijs.exec(args[0], world) >> ijs.exec(args[1], world)
    },
    "<<": function (args, world) {
        return ijs.exec(args[0], world) << ijs.exec(args[1], world)
    },
    "+": function (args, world) {
        return ijs.exec(args[0], world) + ijs.exec(args[1], world)
    },
    "-": function (args, world) {
        return ijs.exec(args[0], world) - ijs.exec(args[1], world)
    },
    "*": function (args, world) {
        return ijs.exec(args[0], world) * ijs.exec(args[1], world)
    },
    "/": function (args, world) {
        return ijs.exec(args[0], world) / ijs.exec(args[1], world)
    },
    "%": function (args, world) {
        return ijs.exec(args[0], world) % ijs.exec(args[1], world)
    },
    "**": function (args, world) {
        return ijs.exec(args[0], world) ** ijs.exec(args[1], world)
    },
    ".": function (args, world) {
        var o = ijs.exec(args[0], world)
        var ret = o[args[1]]
        if (typeof ret == "function") {
            return ret.bind(o)
        }
        return ret
    },
    "?.": function (args, world) {
        var o = ijs.exec(args[0], world)
        if (o === null) {
            return undefined
        }
        if (o === undefined) {
            return undefined
        }
        var ret = o[args[1]]
        if (typeof ret == "function") {
            return ret.bind(o)
        }
        return ret
    },
    "<computedMemberAccess>": function (args, world) {
        var o = ijs.exec(args[0], world)
        var ret = o[ijs.exec(args[1], world)]
        if (typeof ret == "function") {
            return ret.bind(o)
        }
        return ret
    },
    ".?": function (args, world) {
        var first = ijs.exec(args[0], world)
        if (first == null || typeof first == "undefined") {
            return void 0
        }
        return first[args[1]]
    },
    "!_pre": function (args, world) {
        return !ijs.exec(args[0], world)
    },
    "~_pre": function (args, world) {
        return ~ijs.exec(args[0], world)
    },
    "+_pre": function (args, world) {
        return +ijs.exec(args[0], world)
    },
    "-_pre": function (args, world) {
        return -ijs.exec(args[0], world)
    },
    "++_pre": function (args, world) {
        var w = ijs.getWorldForKey(world, args[0])
        return ++w.state[args[0]]
    },
    "--_pre": function (args, world) {
        var w = ijs.getWorldForKey(world, args[0])
        return --w.state[args[0]]
    },
    "typeof_pre": function (args, world) {
        return typeof ijs.exec(args[0], world)
    },
    "void_pre": function (args, world) {
        return void ijs.exec(args[0], world)
    },
    "delete_pre": function (args, world) {
        // TODO: finish this.
        // delete foo.bar
        // delete foo["bar"]
        // var arg = args[0]
        // // assuming (. x y)
        // var o = ijs.exec(arg[1], world)
        // delete(o, )
        // return delete ijs.exec(args[0], world)
    },
    "await_pre": async function (args, world) {
        return await ijs.exec(args[0], world)
    },
    "new_pre": function (args, world) {
        // https://stackoverflow.com/questions/3871731/dynamic-object-construction-in-javascript
        // log2("+args for new")
        var theClass = ijs.exec(args[0][1], world)
        var theArgs = args[0].slice(2)[0]
        var evaledArgs = []
        if (typeof theArgs == 'object' && theArgs) {
            var evaledArgs = theArgs.map(function(t) {
                return ijs.exec(t, world)
            })
        }
        var ret = new (Function.prototype.bind.apply(theClass, [null].concat(evaledArgs)))
        return ret
    },
    "++_post": function (args, world) {
        var w = ijs.getWorldForKey(world, args[0])
        return w.state[args[0]]++
    },
    "--_post": function (args, world) {
        var w = ijs.getWorldForKey(world, args[0])
        return w.state[args[0]]--
    },
    "<array>_pre": function(args, world) {
        var computed = args[0].map(function(t) {
            return ijs.exec(t, world)
        })
        return computed
    },
    "<object>_pre": function(args, world) {
        var o = {}
        args = args[0]
        if (!args) {
            return o
        }
        for (var i=0; i<args.length; i++) {
            var kv = args[i]
            var key = kv[1]
            var value = kv[2]
            if (key.charAt(0) == "#") {
                key = key.slice(1)
            }
            o[key] = ijs.exec(value, world)
        }
        return o
    },
    "async_pre": function(args, world) {
        args = args[0].slice(1)
        var name = ""
        var params
        var paramsAndName = args[0]
        if (paramsAndName && paramsAndName[0] == "<callFunc>") {
            params = paramsAndName[2]
            name = paramsAndName[1]
        } else {
            params = args[0]
            if (typeof params == "object") {
                params = params[1]
            } else {
                params = [params]
            }
        }
        var body = args[1][1]
        var f = ijs.makeAsyncFunc(params, body, world)
        if (name) {
            ijs.set(name, f, world, "var")
        }
        return f
    },
    "function_pre": function(args, world) {
        var name = ""
        var params
        var paramsAndName = args[0]
        if (paramsAndName && paramsAndName[0] == "<callFunc>") {
            params = paramsAndName[2]
            name = paramsAndName[1]
        } else {
            params = args[0][1]
        }
        var body = args[1][1]
        var f = ijs.makeFunc(params, body, world, false)
        if (name) {
            ijs.set(name, f, world, "var")
        }
        return f
    },
    "=>": function(args, world) {
        var name = ""
        var params = args[0]
        // var body = args[1][1]
        var body = args[1]
        if (typeof params == "object") {
            params = params[1]
        } else {
            params = [params]
        }
        if (body[0] == "<object>_pre") {
            body = body[1]
        } else {
            body = [["return_pre", body]]
        }
        var f = ijs.makeFunc(params, body, world, false)
        return f
    },
    "<group>_pre": function(args, world) {
        return ijs.exec(args[0][0], world)
    },
    "<callFunc>": function(args, world) {
        // (foo bar baz)
        // is the same as
        // (<callfunc> bar baz)
        // alternate
        return ijs.callFunc(args[0], args[1], world)
    },
    "while_pre": function (args, world) {
        var condition = args[0][1][0]
        var body = args[1][1] || []

        // body.unshift("run")
        // body = ["run", ...body]

        var wrapperWorld = {
            parent: world,
            state: {},
            // cachedLookupWorld: {},
            global: world.global,
            blockScope: true,
            async: world.async
        }
        var i = 0
        while (ijs.exec(condition, wrapperWorld)) {
            let loopWorld = {
                parent: wrapperWorld,
                state: {...wrapperWorld.state},
                // cachedLookupWorld: {},
                global: wrapperWorld.global,
                blockScope: true,
                async: wrapperWorld.async
            }
            i++
            // var ret = ijs.exec(body, world)
            var ret = ijs.builtins[ijs.getRunFunc(loopWorld.async)](body, loopWorld, true)
            if (ijs.isSpecialReturn(ret)) {
                if (ret.breakMessage) {
                    // we stop here and don't return the breakMessage
                    // if we implemented
                    break
                }
                if (ret.returnMessage) {
                    return ret
                }
            }
            if (i == 40) {
                break
            }
        }
    },
    "while_pre_await": async function (args, world) {
        var condition = args[0][1][0]
        var body = args[1][1] || []

        // body.unshift("run")
        // body = ["run", ...body]

        var wrapperWorld = {
            parent: world,
            state: {},
            // cachedLookupWorld: {},
            global: world.global,
            blockScope: true,
            async: world.async
        }
        var i = 0
        while (ijs.exec(condition, wrapperWorld)) {
            let loopWorld = {
                parent: wrapperWorld,
                state: {...wrapperWorld.state},
                // cachedLookupWorld: {},
                global: wrapperWorld.global,
                blockScope: true,
                async: wrapperWorld.async
            }
            i++
            // var ret = ijs.exec(body, world)
            var ret = await ijs.builtins[ijs.getRunFunc(loopWorld.async)](body, loopWorld, true)
            if (ijs.isSpecialReturn(ret)) {
                if (ret.breakMessage) {
                    // we stop here and don't return the breakMessage
                    // if we implemented
                    break
                }
                if (ret.returnMessage) {
                    return ret
                }
            }
            if (i == 40) {
                break
            }
        }
    },
    "for_pre": function (args, world) {
        let wrapperWorld = {
            parent: world,
            state: {},
            // cachedLookupWorld: {},
            global: world.global,
            blockScope: true,
            async: world.async
        }
        var body = args[1][1] || []
        if (args[0][1].length == 1) {
            // not doing destructuring,
            // dang js is complex.
            // for in, for of
            var list = ijs.exec(args[0][1][0][2], world)
            var assignType = args[0][1][0][1][0]
            var varName = args[0][1][0][1][1]
            if (args[0][1][0][0] == "of") {
                for (var val of list) {
                    let loopWorld = {
                        parent: wrapperWorld,
                        // state: {...wrapperWorld.state},
                        state: {...wrapperWorld.state},
                        // cachedLookupWorld: {},
                        global: wrapperWorld.global,
                        blockScope: true,
                        async: wrapperWorld.async
                    }
                    // not allowing global
                    if (assignType == "var_pre") {
                        world.state[varName] = val
                    } else if (assignType == "let_pre" || assignType == "const_pre") {
                        loopWorld.state[varName] = val
                    }
                    var ret = ijs.builtins[ijs.getRunFunc(loopWorld.async)](body, loopWorld, true)
                    if (ijs.isSpecialReturn(ret)) {
                        if (ret.breakMessage) {
                            break
                        }
                        if (ret.returnMessage) {
                            return ret
                        }
                    }
                }
                return
            } else if (args[0][1][0][0] == "in") {
                for (var val in list) {
                    let loopWorld = {
                        parent: wrapperWorld,
                        // state: {...wrapperWorld.state},
                        state: {...wrapperWorld.state},
                        // cachedLookupWorld: {},
                        global: wrapperWorld.global,
                        blockScope: true,
                        async: wrapperWorld.async
                    }
                    // not allowing global
                    if (assignType == "var_pre") {
                        world.state[varName] = val
                    } else if (assignType == "let_pre" || assignType == "const_pre") {
                        loopWorld.state[varName] = val
                    }
                    var ret = ijs.builtins[ijs.getRunFunc(loopWorld.async)](body, loopWorld, true)
                    if (ijs.isSpecialReturn(ret)) {
                        if (ret.breakMessage) {
                            break
                        }
                        if (ret.returnMessage) {
                            return ret
                        }
                    }
                }
                return
            }
            return
        }
        var init = args[0][1][0]
        var cond = args[0][1][1]
        var next = args[0][1][2]

        // var i = 0
        ijs.exec(init, wrapperWorld)
        while (ijs.exec(cond, wrapperWorld)) {
            let loopWorld = {
                parent: wrapperWorld,
                // state: {...wrapperWorld.state},
                state: {...wrapperWorld.state},
                // cachedLookupWorld: {},
                global: wrapperWorld.global,
                blockScope: true,
                async: wrapperWorld.async,
            }
            // log2("the call is: " + ijs.getRunFunc(loopWorld.async))
            var ret = ijs.builtins[ijs.getRunFunc(loopWorld.async)](body, loopWorld, true)
            if (ijs.isSpecialReturn(ret)) {
                if (ret.breakMessage) {
                    break
                }
                if (ret.returnMessage) {
                    return ret
                }
            }
            ijs.exec(next, wrapperWorld)
        }
    },
    "for_pre_await": async function (args, world) {
        let wrapperWorld = {
            parent: world,
            state: {},
            // cachedLookupWorld: {},
            global: world.global,
            blockScope: true,
            async: world.async
        }
        var body = args[1][1] || []
        if (args[0][1].length == 1) {
            // not doing destructuring,
            // dang js is complex.
            // for in, for of
            var list = ijs.exec(args[0][1][0][2], world)
            var assignType = args[0][1][0][1][0]
            var varName = args[0][1][0][1][1]
            if (args[0][1][0][0] == "of") {
                for (var val of list) {
                    let loopWorld = {
                        parent: wrapperWorld,
                        // state: {...wrapperWorld.state},
                        state: {...wrapperWorld.state},
                        // cachedLookupWorld: {},
                        global: wrapperWorld.global,
                        blockScope: true,
                        async: wrapperWorld.async
                    }
                    // not allowing global
                    if (assignType == "var_pre") {
                        world.state[varName] = val
                    } else if (assignType == "let_pre" || assignType == "const_pre") {
                        loopWorld.state[varName] = val
                    }
                    var ret = await ijs.builtins[ijs.getRunFunc(loopWorld.async)](body, loopWorld, true)
                    if (ijs.isSpecialReturn(ret)) {
                        if (ret.breakMessage) {
                            break
                        }
                        if (ret.returnMessage) {
                            return ret
                        }
                    }
                }
                return
            } else if (args[0][1][0][0] == "in") {
                for (var val in list) {
                    let loopWorld = {
                        parent: wrapperWorld,
                        // state: {...wrapperWorld.state},
                        state: {...wrapperWorld.state},
                        // cachedLookupWorld: {},
                        global: wrapperWorld.global,
                        blockScope: true,
                        async: wrapperWorld.async
                    }
                    // not allowing global
                    if (assignType == "var_pre") {
                        world.state[varName] = val
                    } else if (assignType == "let_pre" || assignType == "const_pre") {
                        loopWorld.state[varName] = val
                    }
                    var ret = await ijs.builtins[ijs.getRunFunc(loopWorld.async)](body, loopWorld, true)
                    if (ijs.isSpecialReturn(ret)) {
                        if (ret.breakMessage) {
                            break
                        }
                        if (ret.returnMessage) {
                            return ret
                        }
                    }
                }
                return
            }
            return
        }
        var init = args[0][1][0]
        var cond = args[0][1][1]
        var next = args[0][1][2]

        ijs.exec(init, wrapperWorld)
        while (ijs.exec(cond, wrapperWorld)) {
            let loopWorld = {
                parent: wrapperWorld,
                // state: {...wrapperWorld.state},
                state: {...wrapperWorld.state},
                // cachedLookupWorld: {},
                global: wrapperWorld.global,
                blockScope: true,
                async: wrapperWorld.async,
            }
            // log2("the call is: " + ijs.getRunFunc(loopWorld.async))
            var ret = await ijs.builtins[ijs.getRunFunc(loopWorld.async)](body, loopWorld, true)
            if (ijs.isSpecialReturn(ret)) {
                if (ret.breakMessage) {
                    break
                }
                if (ret.returnMessage) {
                    return ret
                }
            }
            ijs.exec(next, wrapperWorld)
        }
    },
    "try_pre": function (args, world) {
        var tryWorld = {
            parent: world,
            // TODO: perf
            state: {},
            // cachedLookupWorld: {},
            global: world.global,
            async: world.async,
            blockScope: true,
        }
        var catchWorld = {
            parent: world,
            // TODO: perf
            state: {},
            // cachedLookupWorld: {},
            global: world.global,
            async: world.async,
            blockScope: true,
        }
        var tryBody = args[0][1] || []
        var catchBody = args[3][1] || []
        
        try {
            var ret = ijs.builtins[ijs.getRunFunc(tryWorld.async)](tryBody, tryWorld, true)
            // log2("ret from try is: " + JSON.stringify(ret))
            if (ijs.isSpecialReturn(ret)) {
                return ret
            }
        } catch (e) {
            catchWorld.state[args[2][1][0]] = e
            var ret = ijs.builtins[ijs.getRunFunc(catchWorld.async)](catchBody, catchWorld, true)
            // log2("ret from catch is: " + JSON.stringify(ret))
            if (ijs.isSpecialReturn(ret)) {
                return ret
            }
        }
    },
    "try_pre_await": async function (args, world) {
        var tryWorld = {
            parent: world,
            // TODO: perf
            state: {},
            // cachedLookupWorld: {},
            global: world.global,
            async: world.async,
            blockScope: true,
        }
        var catchWorld = {
            parent: world,
            // TODO: perf
            state: {},
            // cachedLookupWorld: {},
            global: world.global,
            async: world.async,
            blockScope: true,
        }
        var tryBody = args[0][1] || []
        var catchBody = args[3][1] || []
        
        try {
            var ret = await ijs.builtins[ijs.getRunFunc(tryWorld.async)](tryBody, tryWorld, true)
            // log2("ret from if is: " + JSON.stringify(ret))
            if (ijs.isSpecialReturn(ret)) {
                return ret
            }
        } catch (e) {
            catchWorld.state[args[2][1][0]] = e
            var ret = await ijs.builtins[ijs.getRunFunc(catchWorld.async)](catchBody, catchWorld, true)
            // log2("ret from if is: " + JSON.stringify(ret))
            if (ijs.isSpecialReturn(ret)) {
                return ret
            }
        }
    },
    "if_pre": function (args, world) {
        world = {
            parent: world,
            // TODO: perf
            state: {},
            // cachedLookupWorld: {},
            global: world.global,
            async: false,
            blockScope: true,
            async: world.async,
        }
        var condition = args[0][1][0]
        var body = args[1][1] || []
        // body.unshift("run")
        // body = ["run", ...body]
        var condRet = ijs.exec(condition, world)
        if (condRet) {
            // var ret = ijs.exec(body, world)
            var ret = ijs.builtins[ijs.getRunFunc(world.async)](body, world, true)
            // log2("ret from if is: " + JSON.stringify(ret))
            if (ijs.isSpecialReturn(ret)) {
                return ret
            }
        }
        return condRet // hack so else works
    },
    "if_pre_await": async function (args, world, extra) {
        var ifWorld = {
            parent: world,
            // TODO: perf
            state: {},
            // cachedLookupWorld: {},
            global: world.global,
            async: false,
            blockScope: true,
            async: world.async,
        }
        var condition = args[0][1][0]
        var body = args[1][1] || []
        // body.unshift("run")
        // body = ["run", ...body]
        var condRet = ijs.exec(condition, ifWorld)
        if (condRet) {
            // var ret = ijs.exec(body, ifWorld)
            var ret = await ijs.builtins[ijs.getRunFunc(ifWorld.async)](body, world, true)
            // log2("ret from if is: " + JSON.stringify(ret))
            if (ijs.isSpecialReturn(ret)) {
                return ret
            }
        }
        return condRet // hack so else works
    },
    "else": function (args, world) {
        // var ret = ijs.exec(args[0], world)
        var ret = ijs.exec(args[0], world)
        var elseRet
        if (!ret) {
            var body = args[1]
            if (body[0] == "<object>_pre") {
                body = body[1]
                // body.unshift("run")
                // body = ["run", ...body]
                elseRet = ijs.builtins[ijs.getRunFunc(world.async)](body, world, true)
            } else {
                elseRet = ijs.exec(body, world)
            }
            // ijs.exec(body, world)
            if (ijs.isSpecialReturn(elseRet)) {
                return elseRet
            }
        }
    },
    "else_await": async function (args, world) {
        // var ret = ijs.exec(args[0], world)
        var ret = await ijs.exec(args[0], world)
        var elseRet
        if (!ret) {
            var body = args[1]
            if (body[0] == "<object>_pre") {
                body = body[1]
                // body.unshift("run")
                // body = ["run", ...body]
                elseRet = await ijs.builtins[ijs.getRunFunc(world.async)](body, world, true)
            } else {
                // This isn't awaited bug?
                // elseRet = ijs.exec(body, world)
                elseRet = await ijs.exec(body, world)
            }
            // ijs.exec(body, world)
            if (ijs.isSpecialReturn(elseRet)) {
                return elseRet
            }
        }
    },
    "<interpolate>": function (args, world) {
        return args[0].replace(ijs.templateRegex, function (x, y) {
            // using runninstead of exec because run also parses
            y = "return " + y
            // y = "return 2 + 4"
            var value = ijs.run(y, world)
            return value
        });
    }
}
ijs.set = function(key, value, world, setType) {
    var w
    if (setType == "") { // global
        w = world.globalWorld
    } else if (setType == "var") {
        w = world
    }
    w.state[key] = value
}
ijs.getWorldForKey = function(world, key) {
    // the cachedLookupWorld seems noticeably faster when running jsloopn
    // 19ms vs 38ms on a loopn with somevar+= for 100k loops

    // if (world.local && forSetting) {
    //     return world
    // }
    
    // not sure why exactly, but this causes problems with async
    // if (world.cachedLookupWorld[key]) {
    //     return world.cachedLookupWorld[key]
    // }
    for (var w = world; w != null; w = w.parent) {
        if (w.state.hasOwnProperty(key)) {
            // world.cachedLookupWorld[key] = w
            break
        }
    }
    return w
}
ijs.exec = function(tokens, world) {
    if (tokens === null) {
        return null
    }
    if (typeof tokens == "number") {
        return tokens
    }
    if (typeof tokens == "boolean") {
        return tokens
    }
    if (tokens.length == 0) {
        return void 0;
    }
    // state = state || {}
    // simplify lexical rules?
    // anuthing in a function shares state.
    // no nested var.

    // if (typeof tokens == "function") {
    //     return tokens
    // }

    if (typeof tokens != "object") {
        // string encoding
        var token = tokens
        if (token.charAt(0) == "#") {
            return token.slice(1)
        }

        var w = ijs.getWorldForKey(world, token)
        if (w == null) {
            alert("can't find: " + token)
            // log2("-can't find world for " + token)
        }
        return w.state[token]

        // if (token in window) {
        //     return window[token]
        // }

        // or throw?
        return undefined
    }
    return ijs.callFunc(tokens[0], tokens.slice(1), world)
}

ijs.asyncVersions = {
    "if_pre": true,
    "else": true,
    "for_pre": true,
    "while_pre": true,
    "try_pre": true,
    
    // not doing this because of initialization assignments in for loops?
    // "=": true,
}
ijs.callFunc = function(funcAccessor, theArgs, world) {
    if (funcAccessor in ijs.builtins) {
        if (world.async && (funcAccessor in ijs.asyncVersions)) {
            funcAccessor = funcAccessor + "_await"
        }
        func = ijs.builtins[funcAccessor]
        var ret = func(theArgs, world)
        return ret
    }
    func = ijs.exec(funcAccessor, world)
    if (!func) {
        alert("no func: " + funcAccessor)
    }
    theArgs = theArgs || []
    var ret = func.apply(null, theArgs.map(function (t) {
        return ijs.exec(t, world)
    }))
    return ret
}

ijs.isSpecialReturn = function (ret) {
    return typeof ret == "object" && ret && ret.ijs == 12332
}

ijs.makeSpecialReturn = function () {
    return {
        "ijs": 12332,
    }
}

// not implementing (yet?)
// labels for breaks (maybe we should)
// comma operator

// to implement
// lexical scope
// simple assignment

// window.testObj = {
//     name: "Drew2"
// }
// var start = Date.now()
// var i = 0
// var total = 0
// while (true) {
//     i++
//     if (i == 100000) {
//         break
//     }
//     total += i
// }
// var end = Date.now()
// log2("it took " + (end - start) + " milliseconds " + total)

// async function foo(a) {
//     return 1
// }
// alert(foo(10))

// async function test10() {
//     var sleep = function (ms) {
//         return new Promise(function (resolve, reject) {
//             setTimeout(function () {
//                 resolve()
//             }, ms)
//         })
//     }
// 
//     alert("hi")
//     await sleep(1000)
//     alert("bye")
//     // var foo = async function (a) {
//     //     return 1
//     // }
//     // log2(foo.toString())
//     // var v = await foo(20)
//     // // var v = foo(20)
//     // alert(v)
// }
// test10()

// Need
// async await for try catch let

// var p = new Promise(function (resolve, reject) {
//     resolve("poo")
// })
// p.then(function (x) {
//     alert("resolved: " + x)
// })

// var start = Date.now()
// var total = 0
// for (let i = 0; i < 1000000; i++) {
//     total += i
// }
// var end = Date.now()
// log2("for loop took " + (end - start) + " milliseconds " + total)


// var i = 0
// while (i < 10) {
//     i++
//     var i2 = i
//     setTimeout(() => {
//         log2("hey " + i2)
//     }, 100)
// }




// function lol() {
// /*
// this is a test lol
// how this work?
// `yo`
// */
// }
// alert(lol.toString())

ijs.exampleCode = function () {
/*


// async function wrapper() {
//     checkHoist()
//     async function checkHoist() {
//         alert("rubbage")
//     }
// }
// wrapper()


// function checkIt() {
//     // if (true) {
//     //     return "yo!"
//     // }
//     try {
//         return "yay"
//     } catch (e) {
//         return "caught"
//     }
// }
// alert(checkIt())

// alert(1_000)

// laziness works
// a = x => { alert(x) return true }
// b = x => { alert(x) return false }
// if (a(17) || b(23)) {
//     alert("yay!")
// }
// if (b(17) || a(23)) {
//     alert("yay!")
// }
// if (a(17) && b(23)) {
//     alert("yay!")
// }
// if (b(17) && a(23)) {
//     alert("yay!")
// }


// f = x == 3 || y == 4 && a == b

// log2(encodeURIComponent("yo=man"))
// function foo(...args) {
//     log2(args)
// }
// 
// foo(3, 4, 212)

// alert(a.foo)
// async function foo(a, b=27 c = [123]) {
//     alert(a + " " + b + " " + c)
// }
// 
// foo(1)
// var name = "Drew"
// var x = 20
// // var greeting = `Hello ${name}, is your number ${x + 1}?`
// var greeting = `Hello ${name}, is your number ${x + 1}?
// and your uppercase name is ${name.toUpperCase()}
// `
// log2(greeting)

// var b = 3.1
// var b = -300.5
// alert(b)
// return

// 
// if (false) {
//     log2(0)
// } else if (1 == 1) {
//     log2(300)
// }
// if (false) {
//     log2(1)
// } else if (1 == 1) {
//     log2(1.1)
// }

// return

// function sleep(ms) {
//     return new Promise(function (resolve, reject) {
//         setTimeout(function () {
//             resolve()
//         }, ms)
//     })
// }

// function getStuff() {
//     return new Promise(function (resolve, reject) {
//         sleep(100).then(function () {
//             resolve(13)
//         })
//     })
// }
// 
// async function foo2() {
//     var a = await getStuff()
//     alert(a)
// }
// foo2()
// 
// return

// var progressBasEl = null
 // if (
   // progressBasEl &&
   // progressBasEl.length > 0 &&
   // progressBasEl[0].innerText === "100%"
   // progressBasEl[0].innerText === "100%"
   // progressBasEl[0]
   // progressBasEl.0
 // ) {

// red marker
// +7 * 2
// +7 || 2
// -3 + 4 * 2 

// +1 + 2 * 4
// alert(+1 + 2 * 4)


// a 7 b 2 c 9
// (a 7) b 2 c 9
// (((a 7) b 2) c 9)
// 
// 
// 
// b 7 a 2 c 9
// (b 7) a 2 c 9
// (b (7 a 2)) c 9
// 
// c 7 b 2 a 9
// (c 7) b 2 a 9
// (c (7 b 2)) a 9
// 
// 
// (c (7 b (2 a 9)))
// 
// a b c 7 d 8
// c b a 7 d 8 9
// c b a (7 d 8) 9


 // - + 7 + 8
 // -7 8 4 + 2 * 3
// + 7 * 2 + pre3 4 5 a.b


// 4 + 2 + 3
// 2 = 3 = 4
// 2 + 3 + 4 5


// pre3 foo + bar biz * baz + yo scuba
// pre foo + bar biz * baz + yo scuba
// 2 = 3 = 4


//    [
//       "=",
//       2,
//       [
//          "=",
//          3,
//          4
//       ]
//    ],
//    [
//       "+",
//       [
//          "+",
//          2,
//          3
//       ],
//       4
//    ]
// ]
// foo = async (b) => z
// foo = async function (b) z
// foo = async function (b) z
// async (b) => z
// foo = async + b => z
// foo = async var b => z
// foo = async b => z

// 1 + 2 + 3

// if (x == 1) {
// }
// [
//    "foo",
//    "=",
//    "async",
//    "<group>",
//    [
//       "b"
//    ],
//    "=>",
//    "z"
// ]

// [
//    "foo",
//    "=",
//    "async",
//    "b",
//    "=>",
//    "z"
// ]

// +3*4
// var f = null
// 
// if (f && f.wowzuh) {
//     alert("yay")
// } else {
//     alert("nay")
// }

// function doIt(fn) {
//     fn(10, 11)
// }
// doIt(async x => {
//     alert(x)
// })
// doIt(async function (x) {
//     alert(x)
// })
// doIt((x, y) => {
//     alert(x + ", " + y)
// })

// blue marker
// function sleep(ms) {
//     return new Promise(function (resolve, reject) {
//         setTimeout(function () {
//             resolve()
//         }, ms)
//     })
// }
// // async function foo() {
// var foo = async () => {
//     log2("what?")
//     if (false) {
//         log2(1)
//         await sleep(200)
//         log2(2)
//     } else if (false) {
//         log2(1.1)
//         await sleep(200)
//         log2(2.1)
//     } else {
//         log2(1.2)
//         await sleep(200)
//         log2(2.2)
//     }
//     for (var i = 0; i < 5; i++) {
//         log2(i)
//         await sleep(100)
//     }
//     log2("=====")
//     var i = 0
//     while (i < 10) {
//         i++
//         log2(i)
//         await sleep(100)
//     }
//     
//     var colors = ["red", "yellow", "blue"]
//     for (let color of colors) {
//         log2(color)
//         await sleep(100)
//     }
//     var stuff = {a: 1, b: 2, c: 3}
//     for (let key in stuff) {
//         log2(key)
//         await sleep(100)
//     }
//     log2("done")
// }
// foo("yoyoy")
// log2("hey")



// function foo() {
//     if (true) {
//         log2("hey")
//         log2("yo")
//         return
//     }
//     log2("whaaaat???")
// }
// log2(foo())

// return

// var person = {
//     eyes: {
//         left: {
//             color: "blue"
//         },
//         right: {
//             color: "green"
//         },
//     }
// }
// 
// var p2 = 10
// let p3 = 11
// p4 = 12
// 
// person.eyes.left.color = 10
// person.eyes.left.color += 100
// person.eyes["right"].color = 300
// person.eyes["right"].color += 3
// person.eyes["right"].color -= 1
// log2(person)

// document.body.style.backgroundColor = 'pink'
// document.body["style"].backgroundColor = 'pink'


// alert(window.sss)
// x = 7
// 
// y = x ? "yay" : "nay"
// y = x ? (true ? "yay1" : "yay2") : "nay"

// alert(y)

// var nums = [2 19 23 14 15]
// for (let x of nums) {
//     // log2("the number is " + x)
//     setTimeout(() => {
//         log2("x is " + x)
//     }, 10)
// }
// 
// var someObj = {z:99, a: 1, b:2 , c:3}
// for (let key in someObj) {
//     // log2("the number is " + x)
//     setTimeout(() => {
//         log2("key is " + key + ", value is " + someObj[key])
//     }, 10)
// }

// for (let i = 0; i < 10; i++) {
//     setTimeout(() => {
//         log2("i is " + i)
//     })
// }

// var foo = {}
// alert(foo.a.b)
// alert(foo?.a?.b)
// try {
//     // alert(wombat)
//     // foo = 1
//     // foo.bar.baz
// } catch (e) {
//     alert("woops")
//     // alert("woops: ")
// }
// var a = x => x + 1
// var b = (x) => x + 1
// var c = (x) => { return x + 1 }
// var d = (x, y) => { return x + y }
// var e = () => 200
// 
// 
// log2([
//     a(2)
//     b(2)
//     c(2)
//     d(2, 1)
//     e()
// ])

// p = {a: 10, b: 20 c: {hey: 20, "yo": 21}}
// log2(p)

// while (true) {
//     let letty1 = 1
//     alert(letty1)
//     var letty2 = 2
//     alert(letty2)
//     break
// }
// alert(letty2)
// alert(letty1) // error

// function foo() {
//     var fooXYZZY = 10
//     alert(fooXYZZY)
// }
// foo()
// alert(fooXYZZY)
// for (var i = 0; i < 15; i++) {
//     log2("i is " + i)
// }

// var i = "lol"
// for (let i = 0; i < 15; i++) {
//     log2("i is " + i)
// }
// alert(i)

// function increr(x) {
//     return function () {
//         x++
//         return x
//     }
// }
// 
// var incr = increr(10)
// for (let i = 0; i < 20; i++) {
//     log2("incremented " + incr())
// }






// something().yo()
// var hi = 2 * (3 + 1)
// var hi2 = 2 * 3 + 1

// var p = new Promise(function (resolve, reject) {
//     resolve("poo")
// })
// p.then(function (x) {
//     alert("resolved: " + x)
// })


// var a = new Date(foo)
// foo.baz.bar()


// alert("yo")
// setTimeout(function () {
//     alert("yo2")
// }, 1000)


// var a = function () {
//     alert("yay")
// }


// setTimeout(function () {
//     alert("yay")
// }, 1000)
// async function test10() {
//     var sleep = function (ms) {
//         return new Promise(function (resolve, reject) {
//             log2("doing the setTimeout " + ms)
//             setTimeout(function () {
//                 resolve()
//             }, ms)
//         })
//     }
//     alert("hi")
//     await sleep(1000)
//     alert("bye")
//     
//     var foo = async function (a) {
//         // return 200
//         return new Promise(function (resolve, reject) {
//             resolve(99)
//         })
//     }
//     var v = await foo(20)
//     alert(v)
// }
// test10()

// var start = Date.now()
// var total = 0
// for (let i = 0; i < 100_000; i++) {
//     total += i
// }
// var end = Date.now()
// log2("for loop took " + (end - start) + " milliseconds " + total)


// see difference with var
// var i = 0
// while (i < 10) {
//     i++
//     let i2 = i
//     setTimeout(() => {
//         log2("hey " + i2)
//     }, 100)
// }

// var start = Date.now()
// var i = 0
// var total = 0
// while (true) {
//     i++
//     if (i == 10) {
//         break
//     }
//     total += i
// }
// var end = Date.now()
// log2("while loop took " + (end - start) + " milliseconds " + total)

// var x = 3 + 4
// return

// if (a == 0) {
//     log2("+it's 0")
// // } else if (bleep) {
// //
// // } else if (bloop) {
// //
// // } else {
//
// }

// var a = 9
// if (a == 0) {
//     log2("+it's 0")
// } else if (a == 1) {
//    log2("+it's 1")
// } else if (a == 2) {
//    log2("+it's 2")
// } else {
//     log2("+it's something else")
// }


// var f = function () {
//     var i = 0
//     while (true) {
//         i++
//         if (i == 30) {
//             return 3
//             // break
//         }
//         log2("the value is " + i)
//     }
//     log2("yo ok!")
// }

// var f = function () {
//     var i = 0
//     while (true) {
//         i++
//         if (i == 15) {
//             return 3
//             // break
//         }
//         log2("the i value is " + i)
//         var j = 0
//         while (true) {
//             j++
//             if (j == 10) {
//                 if (1 == 1) {
//                     return 400
//                 }
//                 // break
//             }
//             log2("the j value is " + j)
//         }
//     }
//     log2("yo ok!")
// }
// var x = f()
// alert(x)

// var start = Date.now()
// var i = 0
// while (true) {
//     i++
//     if (i == 30) {
//         break
//     }
//     log2("the value is " + i)
// }
// var end = Date.now()
// log2("+diff: " + (end - start))

// var i = 0
// while (true) {
//     i++
//     if (i < 30) {
//     } else {
//         break
//     }
//     log2("the value is " + i)
// }

// var i = 0
// while (true) {
//     i++
//     if (i == 30) {
//         break
//     }
//     log2("the value is " + i)
//     var j = 0
//     while (true) {
//         j++
//         if (j == 3) {
//             break
//         }
//         log2("    the j value is " + j)
//     }
// }

// log2("hello world")

// a = 1

// arguments.length > 2 ? [].slice.call(arguments, 2) : vnode.children
// [].slice.call(arguments, 2) : vnode.children
// function (a, b) { return a + b }
// alert(testMe(1,2))


// log2("+++++")
// log2(testObj)
// log2(testObj)
// log2(testObj.name)
// log2(100)
// g = function (a, b) { return a + b }
// b = [1 2 ...c n]
// c = {a: 1, ...d, f:2}
// a = b
// var [a, b] = [1, 2]

// var testValue = testMe(1,2)
// function testMe(a, b) { return a + b }
// var testValue = testMe(1,2)

// var i = 0
// while (true) {
//     i++
//     if (i == 50) {
//         break
//     }
// }

// var x = 2
// x++
// log2(x)
// var testMe2 = function (a, b) { return a * b }
// var testValue2 = testMe2(100, 7)
//
// var incerer = function (x) {
//     // return 6
//     return function () {
//         x++
//         return x
//     }
// }

// var incerer = function () {
//     return 18
// }
// var f = incerer(70)
// log2(f())
// log2(f())
// log2(f())
// log2(f())



// log2(y())
// log2(y())
// log2(y())

// log2(testValue)
// var drew1 = 1
// log2(drew1)

// a = 1
// var foo = async function () {
//    return 1
// }
// var foo = async () => {
//    return 1
// }
//
// try {
//     biz baz
// } catch (e) {
//     borz buzz
// }

// (function () {})()
//
// function () {}
//
// do {
//     alert(100)
// } while (yoyo + 1)
// !foo.bar
// a + b * !c
//
// 1 + !foo.bar
// 1 + !foo + bar
//
// 1 + 2 + 3


// 1 = 2 = 3
// 1 = !2 = 3
//
// 1 + 2 + 3
// 1 + !2 + 3

// !foo.bar + 3 * 4
// !foo.bar + 3 * 4
// !foo.bar
// !foo+bar

// function x(bar baz) {
//     okie dokie
// }

// var x = 1
// var x = 0
//
//
// 1 + +3++

// 1 + x++ + 4

// x=0 x < 20 x+=1
// x=0 x < 20 x++ foo



// var x = 0

// for (var x = 0; x < 20; x += 1) {
//     crazy stuff
// }
//
// for (var x=0; x < 20; x++) {
//     crazy stuff
// }

// function (a, b, c) {
//
// }
// function y(a, b, c) {
//
// }

// a = y => y + 1
// a = y => y + 1
// a = (a, b) => a + 1
// a = (a, b) => { a + 1; return; x + 1}
// bar

// x = 1 ? 2 : 3
// x = 1 ? (a ? b : c) : 3
// log2(a(12))

// a = {
//     foo: bar+1
//     "biz": baz
// }

// for (const i of something) {
//
// }

// let a = 3

// a = "foob\"ar"
// a = 'foob"ar'
//
// b = [1 2 ...c n]
// if (x == 1) {
//     "one"
// } else if (x == 2) {
//     "two"
// } else if (x == 3) {
//     "three"
// } else if (x == 4) {
//     "four"
// } else {
//     "other"
// }


// switch (f) {
//     case bar + q:
//         yo+1
//         bar
//         break
//     case other * + foo:
//         donthing
//         break
// }

// setTimeout(function () {
//   document.getElementsByName("_eventId_continue")[0].click()
// }, 0)



// !a b c * f.d

// 5 - -3 + 4 * 6
// 5 - -3.bar



// !true

// b = [1 2 3]
// c = [1 2*1+2 3]
//
// d = [1, 2, 3]
//
// e = d[1*1]
//
// g = {bar: "baz", "other" 27}

// function upper(x) {
//     return x.toUpperCase()
// }
// lower = function () {
//     return x.toUpperCase()
// }

// c = [1 2 * 1 + 2 3]
// name = "Drew"
// log2("what?".toUpperCase())
// log2(name.toUpperCase())

// log2(testObj["na"+"me"])

// s = testObj["na"+"me"].toUpperCase()
// log2(s)




// x = testObj["name"]
// x = testObj[foo(biz(baz))]
// x = testObj["name"]
// y = testObj["name"].toUpperCase()
// log2(name.toUpperCase())
// log2("yo".toUpperCase())
// log2(testObj.name)
// log2(testObj.name.toLowerCase())
// log2("hi".toUpperCase())


// [ foo.bar [ biz.baz + 1] ]

// name = "drew"
// log2(name)
//
// bar = 2 + 3 * 4
// log2(bar)
//
// function upper(a) {
//     return a.toUpperCase()
// }
//
// upperName = upper(name)
// log2(upperName)
// return name




// var name "Drew"
// log2(name)
// //
// // JSON.stringify
// // set json[foo]
// var name "drew \" lesueur"
// var name2 "Hi"
// var person obj(name "Drew" age 38)
// // return(name2)
// var name3 prop("yay" "toUpperCase")()
// // var name3 "yay".toUpperCase()
// var name4 "hello dave"
//
// func doThing(a) {
//     // return(a)
//     // alert("doThing called")
//     // a.toUpperCase()
//     return prop(a "toUpperCase")()
//     // return a.toUpperCase()
// }
// // alert(-2)
// var name5 doThing(name)
//
// setTimeout(func yo() {
//     log2("what?")
// } 1000)

// func incerer(x) {
//     return func incr() {
//         set x (plus 1 x)
//         return x
//     }
// }



// set foo (add 2 4)
// log2(concat(" the addition is " foo))
//
// return name5

// todo: ignore comma
// var(name2 call(access(yay "toUpperCase")
// var(name3 access(yay "toUpperCase")())


// func(myFunc (a "b") (
//     set(a b)
// ))
// func(returnInputValue (element index (child false) (childIndex 0))
//     trycatch(
//         run(
//
//         )
//
//         run(
//
//         )
//     )
// )
// if( neq(element, "undefined")
//     code(
//
//     )
// )

// log2(123)
*/
}

// var code = String.raw``
var code = ijs.exampleCode.toString().split("\n").slice(2, -2).join("\n")
ijs.run(code)

// alert("weird")
// ijs.builtins.if_pre_await([], {foo: "bar"})
// ok([], {foo: "bar"})
// if_pre_await([], {foo: "bar"})


// function ok(args, world) {
//     alert("ok world")
//     alert(world)
// }


// async function if_pre_await(args, world2, extra) {
//     alert("got here0?? ")
//     alert(world2)
    // world2 = extra
    // var world2 = {
    //     parent: world2,
    //     // TODO: perf
    //     state: {},
    //     cachedLookupWorld: {},
    //     global: world2.global,
    //     async: false,
    //     blockScope: true,
    //     async: world2.async,
    // }
    // alert("got here1?")
    // var condition = args[0][1][0]
    // var body = args[1][1] || []
    // // body.unshift("run")
    // // body = ["run", ...body]
    // alert("got here2?")
    // var condRet = ijs.exec(condition, world2)
    // if (condRet) {
    //     // var ret = ijs.exec(body, world2)
    //     var ret = await ijs.builtins[ijs.getRunFunc(world2.async)](body, world, true)
    //     // log2("ret from if is: " + JSON.stringify(ret))
    //     if (ijs.isSpecialReturn(ret)) {
    //         return ret
    //     }
    // }
    // return condRet // hack so else works
// }
// TODO:
// return await
// [5, -2] ambiguity
// !(foo) should not have <callFunc> token
// !!


if (typeof log2 === "undefined") {
   log2 = function (x) {
       console.log(x)
   }
}
// handle void 0

// todo: not slicing as much would prob be faster
// template strings, just the basics
// rename run function
// destructuring in for of
// var hoisting isues


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

ijs.getPrevNonSpaceChar = function (code, i) {
     for (i = i - 1; i >= 0; i--) {
         var prev = code[i]
         if (" \t\n\r".indexOf(prev) != -1) {
             continue
         }
         return prev
     }
}

// var line = "?  s"
// alert(ijs.getPrevNonSpaceChar(line, line.indexOf("?")))


// TODO: ignore : , ;
// TOODO: interpolation? (template literals)
ijs.tokenize = function (code, debug) {
    var backslash = "\\"
    code = code + "\n"
    var i = 0
    var state = "out"
    var currentToken = ""
    var currentRegExpFlags = ""
    var quoteType = ""
    var tokens = []
    var pushToken = function (x) {
        // if (x == ",") {
        //     return
        // }
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
                    if (i != 0 && " \t\n\r\(\[\-\!\+".indexOf(code.charAt(i-1)) == -1) {
                        tokens.push("<callFunc>")
                    } else {
                        tokens.push("<group>")
                    }
                }
                tokens.push(chr)
            } else if ("[]".indexOf(chr) != -1) {
                if (i != 0 && "[".indexOf(chr) != -1) {
                    if (" \t\n\r({[".indexOf(code.charAt(i-1)) == -1 ) {
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
                    if (i != 0 && " \t\n\r\(\[\-\!\+".indexOf(code.charAt(i-1)) == -1) {
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
                if (i != 0 && "[".indexOf(chr) != -1 && " \t\n\r({[".indexOf(code.charAt(i-1)) == -1 ) {
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
                    if (i != 0 && " \t\n\r\(\[\-\!\+".indexOf(code.charAt(i-1)) == -1) {
                        tokens.push("<callFunc>")
                    } else {
                        tokens.push("<group>")
                    }
                }
                tokens.push(chr)
                state = "out"
            } else if ("[]".indexOf(chr) != -1) {
                let pushed = false
                if (currentToken) {
                    pushToken(currentToken)
                    currentToken = ""
                    pushed = true
                }
                if (i != 0 && "[".indexOf(chr) != -1 && " \t\n\r({[".indexOf(code.charAt(i-1)) == -1 ) {
                    if (pushed) {
                        let lastToken = tokens.pop()
                        if (lastToken == "?.") {
                            tokens.push("<optionallyChainedComputedMemberAccess>") // lol
                        } else {
                            tokens.push(lastToken)
                            tokens.push("<computedMemberAccess>")
                        }
                    } else {
                        tokens.push("<computedMemberAccess>")
                    }
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
            } else if ("!".indexOf(chr) != -1) {
                // special case for !!
                pushToken(currentToken)
                currentToken = chr
            } else if (",".indexOf(chr) != -1) {
                // special case for ,
                pushToken(currentToken)
                currentToken = chr
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
        } else if (state == "in_regexp") {
            if ('/'.indexOf(chr) != -1) {
                state = "after_regexp"
                currentRegExpFlags = ""
            } else {
                currentToken += chr
            }
        } else if (state == "after_regexp") {
            if (!isVar(chr)) {
                tokens.push("new")
                tokens.push("RegExp")
                tokens.push("<callFunc>")
                tokens.push("(")
                tokens.push("#" + currentToken)
                tokens.push(",")
                tokens.push("#" + currentRegExpFlags)
                tokens.push(")")
                state = "out"
                currentRegExpFlags = ""
                currentToken = ""
                // tokens.push([
                //     "<callFunc>",
                //     [
                //         "new_pre",
                //         "RegExp"
                //     ],
                //     [
                //         "#bar",
                //         "#i"
                //     ]
                // ])
            } else {
                currentRegExpFlags += chr
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
                // total Hack
                let prev = ijs.getPrevNonSpaceChar(code, i-1)
                // if (prev == undefined || ";:,=({[".indexOf(prev) != -1) {
                if (false) {
                    state = "in_regexp"
                    currentToken = chr
                } else {
                    currentToken = "/"
                    state = "in_symbol"
                    i--
                }
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
    // log2(tokens) // deeppink marker
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
            var operated = ijs.operatorate(list, debug)
            // log2("+operated")
            // log2(operated)
            newTokens = tokenStack.pop()
            newTokens.push(operated)


            if ("]".indexOf(token) != -1) {
                var t = newTokens.pop()
                var prev = newTokens.pop()
                newTokens.push(prev) // lol
                if (prev == "<computedMemberAccess>" || prev ==  "<optionallyChainedComputedMemberAccess>") {
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
    return ijs.operatorate(newTokens, debug)
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



ijs.operatorate = function(tokens, debug) {
    // tokens = ijs.infixateOld(tokens, false, true, -1, 0)
    tokens = ijs.infixate(tokens, debug)
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
     "<optionallyChainedComputedMemberAccess>": {
         "associatitivity": 0,
         "precedence": 17,
     },
     ".": {
         "associatitivity": 0,
         "precedence": 17,
         squish: true,
     },
     "?.": {
         "associatitivity": 0,
         "precedence": 17,
         squish: true,
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
         squish: true,
     },
     "!": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
         squish: true,
     },
     "~": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
         squish: true,
     },
     "+": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
         squish: true,
     },
     "-": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
         squish: true,
     },
     "++": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
         squish: true,
     },
     "--": {
         "associatitivity": 1,
         "precedence": 14,
         "arity": 1,
         "fix": "pre",
         squish: true,
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
         // "precedence": 16,
         "precedence": 17,
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
     // stronger than of and in, and also =
     // "var": {
     //     "associatitivity": 1,
     //     "precedence": 9.5,
     //     "arity": 1,
     //     "fix": "pre",
     // },
     "var": {
         "associatitivity": 1,
         "precedence": 9,
         "arity": 1,
         "fix": "pre",
     },
     "let": {
         "associatitivity": 1,
         "precedence": 9.5,
         "arity": 1,
         "fix": "pre",
     },
     "const": {
         "associatitivity": 1,
         "precedence": 9.5,
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
         "arity": 1,
         "fix": "pre",
     },
}
ijs.postfixes = {
     "++": {
         "associatitivity": 1,
         "precedence": 15,
         "arity": 1,
         "fix": "post",
         squish: true,
     },
     "--": {
         "associatitivity": 1,
         "precedence": 15,
         "arity": 1,
         "fix": "post",
         squish: true,
     },
}

function logIndent(indent, msg, obj) {
    // log2("    ".repeat(indent) + msg + ": " + JSON.stringify(obj))
}
function logCurr(indent, msg, obj) {
    // log2("    ".repeat(indent) + msg + ": " + JSON.stringify(obj))
}


        // # simple expression
        // 2 + 3 * 4 ** 5 + 5 2
        // # expected
        // [["+",2,["*",3,["+",["**",4,5],5]]]]


        // 2 + 3 * 4 ** 5 + 5 2
        // 3 * 4 ** 5 + 5 2
        // 3 * 4 ** 5 + 2

        // you need to do prefix with operator precedence
        // - foo.bar
        // -foo * bar

        // # prefix debug
        // +2
        // # expected
        // []
        // (-2)

        // # prefix
        // -foo.bar baz boz 2 * 3
        // # expected
        // []

        // x + ! 3
        // x + - - 3

        // x = 1 != 2 ? "yay" : false ? "yay2" : "nay"
        // foo = async (b) => z
        // foo = async function (b) z
        // foo = async function (b) z
        // async (b) => z
        // foo = async + b => z
        // foo = async var b => z
        // foo = async b => z
        // await r.text()
        // a = await r.text()
        // var r1 = await r.text()
        // new Date().getTime()
        // x = new Date().getTime()


        // # check
        // do x if a do aa bb cc y z 1 2 3
        // # expected
        // []

        // try nested infix


        // if ! (x) y
        // yo
        // if (x == 3) {
        //     return 27
        // }
        // do x if a do aa bb cc y 1 2 3

        // do x else
        // # check
        // a = [5, -2]
        // # expected
        // async function w3() {
        //     for (var {name, age} of people) {
        //         log2(name + ":" + age)
        //         log2(name + ":" + age)
        //     }
        // }
        // w3()

        // # check
        // var {a, b} of y
        // // let x in stuff
        // # expected

ijs.testInfixate = function () {

    // note some of these tests don't work as actual javascript
    // some are just testing arity and precedence
    var casesString = `
        # check #debug #onl
        a++
        window.foo++
        console.log(bar)
        # expected
        [["++_post",[".","window","foo"]],["<callFunc>",[".","console","log"],["bar"]]]

        # check #onl
        window.foo++
        console.log(bar)
        # expected
        [["++_post",[".","window","foo"]],["<callFunc>",[".","console","log"],["bar"]]]

        # check #onl
        keys?.[1*2]
        # expected
        [["<optionallyChainedComputedMemberAccess>","keys",["*",1,2]]]

        # check
        a = [3++, 4, ++5]
        # expected
        [["=","a",["<array>_pre",[["++_post",3],4,["++_pre",5]]]]]

        # check
        x + (y) + z
        # expected
        [["+",["+","x",["<group>_pre",["y"]]],"z"]]

        # check
        !x+bar
        # expected
        [["+",["!_pre","x"],"bar"]]

        # check
        !(x)+bar
        # expected
        [["+",["!_pre",["<group>_pre",["x"]]],"bar"]]

        # check
        !x+bar
        # expected
        [["+",["!_pre","x"],"bar"]]

        # check
        a = b = c
        # expected
        [["=","a",["=","b","c"]]]

        # check #onl
        var x of y
        # expected
        [["of",["var_pre","x"],"y"]]

        # check #onl
        var {a, b} of y
        # expected
        [["of",["var_pre",["<object>_pre",["a","b"]]],"y"]]

        # check
        function w3() { }
        # expected
        [["function_pre",["<callFunc>","w3",null],["<object>_pre",null]]]

        # check
        async function y x // works
        async function w3(y z) xyzzy
        async function w3(y z) xyzzy
        # expected
        [["async_pre",["function_pre","y","x"]],["async_pre",["function_pre",["<callFunc>","w3",["y","z"]],"xyzzy"]],["async_pre",["function_pre",["<callFunc>","w3",["y","z"]],"xyzzy"]]]

        # check
        a = [5, ++i, 27]
        # expected
        [["=","a",["<array>_pre",[5,["++_pre","i"],27]]]]

        # check
        a = [5, -2]
        # expected
        [["=","a",["<array>_pre",[5,["-_pre",2]]]]]

        # postfix
        for (var i = 0; i < 100; i++) {

        }
        # expected
        [["for_pre",["<group>_pre",[["=",["var_pre","i"],0],["<","i",100],["++_post","i"]]],["<object>_pre",null]]]

        # postfix
        i++
        # expected
        [["++_post","i"]]

        # check
        if (x == 3) {
            yo()
            return 27
        }
        # expected
        [["if_pre",["<group>_pre",[["==","x",3]]],["<object>_pre",[["<callFunc>","yo",null],["return_pre",27]]]]]

        # check
        do x if do aa bb cc a y 1 2 3
        # expected
        [["do_pre","x",["if_pre",["do_pre","aa","bb","cc"],"a"],"y"],1,2,3]

        # check
        do if a b x y z
        # expected
        [["do_pre",["if_pre","a","b"],"x","y"],"z"]

        # check
        if !!x y
        yo
        # expected
        [["if_pre",["!_pre",["!_pre","x"]],"y"],"yo"]

        # check
        do x y if a do aa bb cc 1 2 3
        # expected
        [["do_pre","x","y",["if_pre","a",["do_pre","aa","bb","cc"]]],1,2,3]

        # check
        do x y if a b 1 2 3
        # expected
        [["do_pre","x","y",["if_pre","a","b"]],1,2,3]

        # check
        x = 1 != 2 ? "yay" : false ? "yay2" : "nay"
        # expected
        [["=","x",["?",["!=",1,2],[":","#yay",["?",false,[":","#yay2","#nay"]]]]]]

        # check
        1 != 2 ? "yay" : false ? "yay2" : "nay"
        # expected
        [["?",["!=",1,2],[":","#yay",["?",false,[":","#yay2","#nay"]]]]]

        # new operator
        x = new Date().getTime()
        # expected
        [["=","x",["<callFunc>",[".",["<callFunc>",["new_pre","Date"],null],"getTime"],null]]]

        # new operator
        x = new Date().getTime()
        # expected
        [["=","x",["<callFunc>",[".",["<callFunc>",["new_pre","Date"],null],"getTime"],null]]]

        # new operator
        new Date().getTime()
        # expected
        [["<callFunc>",[".",["<callFunc>",["new_pre","Date"],null],"getTime"],null]]

        # stuff #onl #group1
        await r.text()
        # expected
        [["await_pre",["<callFunc>",[".","r","text"],null]]]

        # stuff
        a = await r.text()
        # expected
        [["=","a",["await_pre",["<callFunc>",[".","r","text"],null]]]]

        # double prefix
        foo = async (b) => z
        # expected
        [["=","foo",["async_pre",["=>",["<group>_pre",["b"]],"z"]]]]

        # double prefix
        foo = async b => z
        # expected
        [["=","foo",["async_pre",["=>","b","z"]]]]

        # double prefix
        x + - - - - 3
        # expected
        [["+","x",["-_pre",["-_pre",["-_pre",["-_pre",3]]]]]]

        # double prefix
        x + - - 3
        # expected
        [["+","x",["-_pre",["-_pre",3]]]]

        # double prefix
        x + - 3
        # expected
        [["+","x",["-_pre",3]]]

        # prefix
        x + if x y z
        # expected
        [["+","x",["if_pre","x","y"]],"z"]

        # prefix
        if x y * 2 ** 3 + 4 z x
        # expected
        [["if_pre","x",["+",["*","y",["**",2,3]],4]],"z","x"]

        # prefix
        if x y * 2 ** 3 z x
        # expected
        [["if_pre","x",["*","y",["**",2,3]]],"z","x"]

        # prefix
        if x y z
        # expected
        [["if_pre","x","y"],"z"]

        # prefix
        -foo.bar baz boz
        # expected
        [["-_pre",[".","foo","bar"]],"baz","boz"]

        # prefix
        -foo.bar baz
        # expected
        [["-_pre",[".","foo","bar"]],"baz"]

        # prefix #onl #group1
        -foo.bar + 1
        # expected
        [["+",["-_pre",[".","foo","bar"]],1]]

        # prefix
        -2 + 3
        # expected
        [["+",["-_pre",2],3]]

        # prefix
        yo !bar
        # expected
        ["yo",["!_pre","bar"]]

        # prefix
        +2
        # expected
        [["+_pre",2]]

        # terms
        3 + 4 5 + 6
        # expected
        [["+",3,4],["+",5,6]]

        # simple expression
        3 * 4 ** 5 + 2 ** 3
        # expected
        [["+",["*",3,["**",4,5]],["**",2,3]]]

        # simple expression
        3 * 4 ** 5 + 2
        # expected
        [["+",["*",3,["**",4,5]],2]]

        # simple expression
        5 ** 2 * 1 + 3
        # expected
        [["+",["*",["**",5,2],1],3]]

        # simple expression
        c = d = 4 * 3 + 2
        # expected
        [["=","c",["=","d",["+",["*",4,3],2]]]]

        # simple expression
        a + b c d
        # expected
        [["+","a","b"],"c","d"]

        # simple expression
        a + b c d * 2
        # expected
        [["+","a","b"],"c",["*","d",2]]

        # op
        a + b * d
        # expected
        [["+","a",["*","b","d"]]]

        # right to left
        a = b = d
        # expected
        [["=","a",["=","b","d"]]]

        # simple expression
        a + b
        # expected
        [["+","a","b"]]

        # simple expression
        a + b + c
        # expected
        [["+",["+","a","b"],"c"]]

        # single token
        a
        # expected
        ["a"]

        # multiple tokens, no operators
        a b c
        d
        # expected
        ["a","b","c","d"]
    `

    var lines = casesString.split("\n")
    var cases = []
    var theCase
    var state = ''
    for (var line of lines) {
        var trimmed = line.trim()
        if (trimmed.startsWith("# expected")) {
            state = "expected"
        } else if (trimmed.startsWith("#")) {
            theCase = {
                name: trimmed,
                code: "",
                expected: ""
            }
            cases.push(theCase)
            state = "code"
        } else if (state == 'code') {
            var prefix = "\n"
            if (theCase.code == "") {
                prefix = ""
            }
            theCase.code = theCase.code + prefix + line.slice(8)
        } else if (state == 'expected') {
            var prefix = "\n"
            if (theCase.expected == "") {
                prefix = ""
            }
            theCase.expected = theCase.expected + prefix + line.slice(8)
        }
    }
    var failureCount = 0
    // log2(cases)

    var limitedCases = []
    for (var theCase of cases) {
        var only = theCase.name.indexOf("#only") != -1
        if (only) {
            limitedCases.push(theCase)
        }
    }

    if (limitedCases.length) {
        log2("-cases are filtered")
        cases = limitedCases
    }


    for (var theCase of cases) {
        log2("")
        log2("+running test: " + theCase.name)
        log2("code:")
        log2(theCase.code)
        log2("actual:")
        var debug = theCase.name.indexOf("#debug") != -1
        // var actual = JSON.stringify(ijs.tokenize(theCase.code), null, "    ") + "\n"

        var actualRaw = ijs.tokenize(theCase.code, debug)
        var actual = JSON.stringify(actualRaw) + "\n"
        log2(actual)
        if (actual != theCase.expected) {
            log2("actual indented:")
            log2(JSON.stringify(actualRaw, null, "    "))
            log2("-they don't match")
            log2("-expected:")
            log2(theCase.expected)
            log2("-fail")
            failureCount++
        } else {
            log2("+pass")
        }
        log2("----------------------------------------------------")
    }
    if (failureCount == 0) {
        log2("+All Tests Passed")
    } else {
        log2("- There were " + failureCount + "/" +cases.length+" failures")
    }
}
setTimeout(ijs.testInfixate, 1)

// hacked but tested
// if I were to redo, I'd pop the stack as soon as you csn after push to group
// it eaits until the next inNonOp to do so sometimes?

function s(x) {
    return JSON.stringify(x)
}
ijs.infixate = function(tokens, debug) {
    if (debug) {
        log2("raw tokens: " + JSON.stringify(tokens))
    }
    // after stack of operators
    // like after you group the prev operator is now the current operator again?

    var newTokens = []
    var stack = []
    var state = {
         name: "before",
         opDef: null,
         group: null,
    }
    var token
    var unwind = function() {
        while (true) {
            // blue marker
            // we are here because the next operator doesn't compete
            // with state.opDef, but what about the parent?
            var next = tokens[0]
            // var nextOpDef = null
            var nextOpDef = {precedence: 0}
            if (Object.hasOwn(ijs.infixes, next)) {
                nextOpDef = ijs.infixes[next]
            }
            // var parentOpdef = null
            var parentOpdef = {precedence: 0}
            var parentState = stack[stack.length - 1]
            if (parentState && parentState.opDef) {
                parentOpdef = parentState.opDef
            }
            
            if (parentOpdef && nextOpDef) {
                if (nextOpDef.precedence > parentOpdef.precedence || (nextOpDef.precedence == parentOpdef.precedence && nextOpDef.associatitivity)) {
                    state.name = "inNonOp"
                    break
                }
            }
            if (state.opDef && (state.opDef.arity || 2 ) == state.group.length - 1) {
                // state = stack.pop()
                var parentState = stack[stack.length - 1]
                if (parentState) {
                    stack.pop()

                    // checking postfix here is also a hack I think
                    if (typeof parentState.group != "object" || (parentState.group[0].indexOf("_post") != -1)) {
                        // alert("yay")
                        newTokens.push(parentState.group)
                        // state.group = token
                    } else {
                        // alert(next)
                        // alert(parentState.group)
                        parentState.group.push(state.group)
                        state = parentState

                    }
                } else {
                    let next = tokens[0]
                    if (Object.hasOwn(ijs.postfixes, next)) {
                        // these are hacked in
                        state.group = [next + "_post", state.group]
                        tokens.shift()
                    }
                    newTokens.push(state.group)
                    state = {
                         name: "before",
                         opDef: null,
                         group: null,
                    }
                    break
                }
            } else {
                break
            }
        }
    }

    var addOrWait = function() {
        var next = tokens[0]
        if (Object.hasOwn(ijs.infixes, next)) {
            var opDef = state.opDef || {precedence: 0}
            var nextOpDef = ijs.infixes[next]
            // alert(nextOpDef.precedence + " >? " + opDef.precedence)
            if (nextOpDef.precedence > opDef.precedence || (nextOpDef.precedence == opDef.precedence && nextOpDef.associatitivity)) {
                stack.push(state)
                state = {
                     name: "inNonOp",
                     group: token
                }
            } else {
                // alert("pushing " + token)
                state.group.push(token)
                state.name = "inNonOp"
                unwind() // blue marker
            }
        } else {
            if (typeof state.group != "object") {
                newTokens.push(state.group)
                state.group = token
            } else  {
                state.group.push(token)
                state.name = "inNonOp"
                unwind()
            }
        }
    }


    var oldStateName
    while (true) {
        var oldStateName = state.name
        if (tokens.length == 0) {
            var prevState
            while (prevState = stack.pop()) {
                prevState.group.push(state.group)
                state = prevState
            }
            if (state.name != "before") { // ?? red marker
                newTokens.push(state.group)
            }

            if (newTokens.length == 0) {
                return (void 0)
            }
            return newTokens
        }

        token = tokens.shift()
        if (state.name == "before") {
            if (Object.hasOwn(ijs.prefixes, token)) {
                // stack.push(state)
                state = {}
                state.group = [token + "_pre"]
                state.opDef = ijs.prefixes[token]
                state.name = "inPre"
            } else if (token == ",") {
                // lol
            } else {
                // stack.push(state)
                state = {}
                state.name = "inNonOp"
                state.group = token
            }
        } else if (state.name == "inPre") {
            if (Object.hasOwn(ijs.prefixes, token)) {
                stack.push(state)
                state = {}
                state.group = [token + "_pre"]
                state.opDef = ijs.prefixes[token]
                state.name = "inPre"
            } else {
                addOrWait()
            }
        } else if (state.name == "inNonOp") {
            // todo: postfix
            if (Object.hasOwn(ijs.postfixes, token)) {
                // these are hacked in
                state.group = [token + "_post", state.group]
            } else if (token == ",") {
                var parentState = stack.pop()
                if (parentState) {
                    parentState.group.push(state.group)
                    state = parentState
                } else {
                   newTokens.push(state.group)
                    state = {
                         name: "before",
                         opDef: null,
                         group: null,
                    }
                }
            } else if (Object.hasOwn(ijs.infixes, token)) {
                var parentState = stack[stack.length-1]
                state.opDef = ijs.infixes[token]
                state.group = [token, state.group]
                state.name = "inInfix"
            } else if (Object.hasOwn(ijs.prefixes, token)) {
                // if (state.opDef && state.opDef.arity) {
                    stack.push(state)
                // }
                state = {}
                state.group = [token + "_pre"]
                state.opDef = ijs.prefixes[token]
                state.name = "inPre"
            } else {
                addOrWait()
            }
        } else if (state.name == "inInfix") {
            if (Object.hasOwn(ijs.prefixes, token)) {
                stack.push(state)
                state = {}
                state.group = [token + "_pre"]
                state.opDef = ijs.prefixes[token]
                state.name = "inPre"
            } else {
                addOrWait()
            }
        }

        if (debug) {
            // alert("state is ")
            // alert(state)
            log2("# from: " + oldStateName)
            log2("# token: " + token + " ("+tokens[0]+")")
            // for (let i=stack.length-1; i>=0; i--) {
            for (let i=0; i < stack.length; i++) {
                // log2(" ".repeat(i) + JSON.stringify(stack[i], null, "    ").split("\n").map(x => "#" + x).join("\n"))
                log2("    #" + "  ".repeat(stack.length - i) + JSON.stringify(stack[i]))
            }
            log2(JSON.stringify(state, null, "    ").split("\n").map(x => "    #" + x).join("\n"))
            log2("    # newTokens: ")
            log2(JSON.stringify(newTokens, null, "    ").split("\n").map(x => "    #" + x).join("\n"))
            log2("    # ------")
        }
    }
    return newTokens
}




    // tokens = ijs.infixate(tokens, false, true, -1, 0)
ijs.infixateOld = function(tokens, stopAfter, skipInfix, lastPrecedence, iter, forAsync) {
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
        if (token == ",") {
            continue
        }
        // log2("+ token: " + JSON.stringify(token))
        if (!skipInfix && (ijs.infixes.hasOwnProperty(token))) {
        // if (token in ijs.infixes) {
            var opDef = ijs.infixes[token]
            currPrecedence = opDef.precedence
            currAssociatitivity = opDef.associatitivity
            // log2(JSON.stringify([token, currPrecedence, lastPrecedence]))
            var oldLastGroup = lastGroup
            if (lastPrecedence == -1) {
                lastGroup = [token, newTokens.pop(), ijs.infixateOld(tokens, true, true, currPrecedence, iter+1)]
                // lastGroup = [token, newTokens.pop(), ijs.infixateOld(tokens, true, false, currPrecedence, iter+1)]
                newTokens.push(lastGroup)
                logCurr(iter, "a", newTokens)
                oldLastGroup = lastGroup
            } else if (currPrecedence < lastPrecedence || (currPrecedence == lastPrecedence && !currAssociatitivity)) {
                // log2("-here")
                copiedLastGroup = JSON.parse(JSON.stringify(lastGroup))
                lastGroup[0] = token
                lastGroup[1] = copiedLastGroup
                lastGroup[2] = ijs.infixateOld(tokens, true, true, currPrecedence, iter + 1)
                lastGroup = lastGroup // lol
                logCurr(iter, "b", newTokens)
            } else if (currPrecedence > lastPrecedence || (currPrecedence == lastPrecedence && currAssociatitivity)) {
                var lastRight = lastGroup[lastGroup.length - 1]
                var newGroup = [token, lastRight, ijs.infixateOld(tokens, true, true, currPrecedence, iter + 1)]
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
                // return oldLastGroup // red marker
                lastGroup = oldLastGroup

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
            lastPrecedence = currPrecedence
        } else if (ijs.prefixes.hasOwnProperty(token)) {
            var opDef = ijs.prefixes[token]
            currPrecedence = opDef.precedence
            len = opDef.len
            lastGroup = [token + "_pre"]
            for (var i=0; i<(opDef.arity || 1); i++) {
                if (token == "async") {
                    // alert("trying to grab for async: " + JSON.stringify(tokens))
                    var grabbed = ijs.infixateOld(tokens, true, true, currPrecedence, iter + 1, true)
                } else {
                    // alert("trying to grab for " + token + ":"  + JSON.stringify(tokens))
                    var grabbed = ijs.infixateOld(tokens, true, true, currPrecedence, iter + 1, false)
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
                // return lastGroup // red marker


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
    // log2(tokens)  // pink marker
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


ijs.hoist = function (body) {
    // Hoist!
    if (!body) {
        return body
    }
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
    return body
}

ijs.makeAsyncFunc = function(params, body, world, name) {
    body = body || []
    // body = ["run", ...body]
    // body.unshift("run")
    // alert(JSON.stringify(body, null, "    "))
    var world = {
        parent: world,
        state: {},
        // cachedLookupWorld: {},
        global: world.global,
        async: true,
    }
    // log2("+params are")
    // log2(params)

    var origBody = body
    body = ijs.hoist(body)
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
                        if (params[i][0] == "=") {
                            paramName = params[i][1]
                            world.state[paramName] = args[i]
                        } else if (params[i][0] == "<array>_pre") {
                            for (var j = 0; j < params[i][1].length; j++) {
                                var paramName = params[i][1][j]
                                world.state[paramName] = args[i][j]
                            }
                        } else if (params[i][0] == "<object>_pre") {
                            for (var j = 0; j < params[i][1].length; j++) {
                                var paramName = params[i][1][j]
                                world.state[paramName] = args[i][paramName]
                            }
                        }
                    } else {
                        world.state[paramName] = args[i]
                    }
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
    f.toString = function() {
        return ijs.generateFunctionString(true, name, params, origBody, 0)
    }
    return f
}

ijs.makeFunc = function(params, body, world, name) {
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
    var origBody = body
    body = ijs.hoist(body)
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
                        if (params[i][0] == "=") {
                            paramName = params[i][1]
                            world.state[paramName] = args[i]
                        } else if (params[i][0] == "<array>_pre") {
                            for (var j = 0; j < params[i][1].length; j++) {
                                var paramName = params[i][1][j]
                                world.state[paramName] = args[i][j]
                            }
                        } else if (params[i][0] == "<object>_pre") {
                            for (var j = 0; j < params[i][1].length; j++) {
                                var paramName = params[i][1][j]
                                world.state[paramName] = args[i][paramName]
                            }
                        }
                    } else {
                        world.state[paramName] = args[i]
                    }
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
    f.toString = function() {
        return ijs.generateFunctionString(false, name, params, origBody, 0)
    }
    return f
}

ijs.exprStringMap = {
    ".": function (args, indent) {
        return ijs.generateExprString(args[0], indent) + "." + ijs.generateExprString(args[1], indent)
    },
    "function_pre": function (args, indent) {
        return "function " + ijs.generateExprString(args[0], indent)
    }
}
ijs.tab = "    "
ijs.generateExprString = function (expr, indent, parentOperator) {
    // TODO: interpolate

    if (expr === null) {
        return "null"
    }
    if (typeof expr == "number") {
        return expr
    }
    if (typeof expr == "boolean") {
        return expr ? "true" : false
    }

    if (typeof expr == "undefined") {
        return "undefined"
    }

    if (typeof expr != "object") {
        // string encoding
        var token = expr
        if (token.charAt(0) == "#") {
            return JSON.stringify(token.slice(1))
        }

        return token
    }


    var operator = expr[0]
    if (!operator.endsWith) {
        alert(JSON.stringify(expr))
    }
    var oMap = ijs.infixes
    if (operator.endsWith("_pre")) {
        oMap = ijs.prefixes
        operator = operator.slice(0, -4)
    } else if (operator.endsWith("_post")) {
        oMap = ijs.postfixes
        operator = operator.slice(0, -5)
    }
    if (Object.hasOwn(oMap, operator)) {
        var ret = []
        var opDef = oMap[operator]
        if (oMap == ijs.prefixes) {
            if (operator == "<group>") {
                var joinChr = ", "
                if (parentOperator == "for") {
                    joinChr = "; "
                }
                if (expr[1]) {
                    var genedValues = expr[1].map(arg => {
                        return ijs.generateExprString(arg, indent, operator)
                    }).join(joinChr)
                } else {
                    var genedValues = ""
                }
                ret.push("(" + genedValues + ")")
            } else if (operator == "<object>") {
                var joinChr = ",\n"
                if (parentOperator == "while" || parentOperator == "function" || parentOperator == "for" || parentOperator == "if" || parentOperator == "=>" || parentOperator == "try" || parentOperator == "catch" || parentOperator == "else") {
                    joinChr = "\n"
                }
                if (expr[1]) {
                    var genedValues = expr[1].map(arg => {
                        return ijs.tab.repeat(indent+1) + ijs.generateExprString(arg, indent+1, operator)
                    }).join(joinChr)
                } else {
                    var genedValues = ""
                }

                ret.push("{\n")
                ret.push(genedValues)
                ret.push("\n" + ijs.tab.repeat(indent) +"}")
            } else if (operator == "<array>") {
                var joinChr = ",\n"
                if (expr[1]) {
                    var genedValues = expr[1].map(arg => {
                        return ijs.tab.repeat(indent+1) + ijs.generateExprString(arg, indent+1, operator)
                    }).join(joinChr)
                } else {
                    var genedValues = ""
                }

                ret.push("[\n")
                ret.push(genedValues)
                ret.push("\n" + ijs.tab.repeat(indent) +"]")
            } else {
                ret.push(operator)
                var spacer = " "
                if (opDef.squish) {
                    spacer = ""
                }
                for (var i = 0; i < opDef.arity; i++) {
                    ret.push(spacer + ijs.generateExprString(expr[i + 1], indent, operator))
                }
            }
        } else if (oMap == ijs.postfixes) {
            ret.push(ijs.generateExprString(expr[1], indent, operator) + operator)
        } else if (oMap == ijs.infixes) {
            // special cases
            if (operator == "<callFunc>") {
                if (expr[2]) {
                    var genedArgs = expr[2].map(arg => {
                        return ijs.generateExprString(arg, indent, operator)
                    }).join(", ")
                } else {
                    var genedArgs = ""
                }
                ret.push(ijs.generateExprString(expr[1], indent, operator) + "(" + genedArgs + ")")
            } else if (operator == "<computedMemberAccess>") {
                ret.push(ijs.generateExprString(expr[1], indent, operator) + "[" + ijs.generateExprString(expr[2], indent, operator) + "]")
            } else if (operator == "<optionallyChainedComputedMemberAccess>") {
                ret.push(ijs.generateExprString(expr[1], indent, operator) + "?.[" + ijs.generateExprString(expr[2], indent, operator) + "]")
            } else {
                var spacer = " "
                if (opDef.squish) {
                    spacer = ""
                }
                ret.push(ijs.generateExprString(expr[1], indent, operator))
                ret.push(spacer)
                ret.push(operator)
                ret.push(spacer)
                ret.push(ijs.generateExprString(expr[2], indent, operator))
            }
        }
        return ret.join("")
    }

    if (expr && expr[0] == "<interpolate>") {
        return "`" + JSON.stringify(expr[1]).slice(1, -1) + "`"
    }
    // should not get here?
    return expr[0] + "(" + expr.slice(1).map(x => ijs.exprStringMap[x]) + ")"

    // serializer: ijs $exprStringMap at expr 0 at at
    // if serializer: {
    //     slice expr 1 se
    //     break
    // }
}
ijs.generateFunctionString = function (isAsync, name, params, body, indent) {
    if (params) {
        var genedParams = params.map(arg => {
            return ijs.generateExprString(arg, indent, "")
        }).join(", ")
    } else {
        var genedParams = ""
    }
    var asyncText = ""
    if (isAsync) {
        asyncText = "async "
    }

    ret = [ijs.tab.repeat(indent) + asyncText + "function "+name+"("+genedParams+") {"]
    for (expr of body) {
        ret.push(ijs.tab.repeat(indent+1) + ijs.generateExprString(expr, indent+1, "function"))
    }
    ret.push(ijs.tab.repeat(indent) + "}")
    return ret.join("\n")

}
// ijs.breakMessage = {"break": true}
// ijs.continueMessage = {"continue":true}

ijs.assinmentOps = {
    "++_pre": (o, k, v) => { return ++o[k] },
    "++_post": (o, k, v) => { return o[k]++ },
    "--_pre": (o, k, v) => { return --o[k] },
    "--_post": (o, k, v) => { return o[k]++ },
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
        // alert("running async")
        if (!args) {
            return
        }
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
                } else if (arg[0] == "=" && arg[2] && (typeof arg[2] == "object") && arg[2][0] == "await_pre") {
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
            if (arg == "debugger") {
                debugger
            } else {
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
        }
    },
    "<run>": function(args, world, inBlock) {
        // var last = void 0;
        if (!args) {
            return
        }
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
            if (arg == "debugger") {
                debugger
            } else {
                var ret = ijs.exec(arg, world)
                if (ijs.isSpecialReturn(ret)) {
                    if (ret.breakMessage || ret.returnMessage) {
                        return ret
                    }
                }
            }
        }
    },
    "var_pre": function (args, world) {
        varName = args[0]
        assignType = "var"
        var w = world
        while (w.blockScope) {
            w = w.parent
        }
        w.state[varName] = undefined
    },
    "let_pre": function (args, world) {
        varName = args[0]
        assignType = "var"
        var w = world
        w.state[varName] = undefined
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
        if (typeof args[0] == "object") {
            if (args[0][0] == "var_pre" || args[0][0] == "let_pre" || args[0][0] == "const_pre") {
                var w = world
                if (args[0][0] == "var_pre") {
                    while (w.blockScope) {
                        w = w.parent
                    }
                }
                if (typeof args[0][1] == "object") {
                    if (args[0][1][0] == "<object>_pre") {
                        var varNames = args[0][1][1]
                        var valuesObj = ijs.exec(args[1], world)
                        for (var varName of varNames) {
                            w.state[varName] = valuesObj[varName]
                        }
                    } else if (args[0][1][0] == "<array>_pre") {
                        var varNames = args[0][1][1]
                        var valuesArray = ijs.exec(args[1], world)
                        for (var i=0; i<varNames.length; i++) {
                            var varName = varNames[i]
                            w.state[varName] = valuesArray[i]
                        }
                    }
                } else {
                    varName = args[0][1]
                    w.state[varName] = ijs.exec(args[1], world)
                }
            } else if (args[0][0] == ".") {
                var obj = ijs.exec(args[0][1], world)
                varName = args[0][2]
                obj[varName] = ijs.exec(args[1], world)
            } else if (args[0][0] == "<computedMemberAccess>") {
                var obj = ijs.exec(args[0][1], world)
                var varName = ijs.exec(args[0][2], world)
                obj[varName] = ijs.exec(args[1], world)
            } else if (args[0][0] == "<array>_pre") {
                var varNames = args[0][1]
                valuesArray = ijs.exec(args[1], world)
                for (var i=0; i<varNames.length; i++) {
                    var varName = varNames[i]
                    var w = ijs.getWorldForKey(world, varName) || world.global
                    w.state[varName] = valuesArray[i]
                }
            } else if (args[0][0] == "<object>_pre") {
                var varNames = args[0][1]
                var valuesObj = ijs.exec(args[1], world)
                for (var varName of varNames) {
                    w.state[varName] = valuesObj[varName]
                }
            }
        } else {
            var w = ijs.getWorldForKey(world, varName) || world.global
            w.state[varName] = ijs.exec(args[1], world)
        }
    },
    "=_await": async function (args, world) {
        var varName = args[0]
        if (typeof args[0] == "object") {
            if (args[0][0] == "var_pre" || args[0][0] == "let_pre" || args[0][0] == "const_pre") {
                var w = world
                if (args[0][0] == "var_pre") {
                    while (w.blockScope) {
                        w = w.parent
                    }
                }
                if (typeof args[0][1] == "object") {
                    if (args[0][1][0] == "<object>_pre") {
                        var varNames = args[0][1][1]
                        var valuesObj = await ijs.exec(args[1], world)
                        for (var varName of varNames) {
                            w.state[varName] = valuesObj[varName]
                        }
                    } else if (args[0][1][0] == "<array>_pre") {
                        var varNames = args[0][1][1]
                        var valuesArray = await ijs.exec(args[1], world)
                        for (var i=0; i<varNames.length; i++) {
                            var varName = varNames[i]
                            w.state[varName] = valuesArray[i]
                        }
                    }
                } else {
                    varName = args[0][1]
                    w.state[varName] = await ijs.exec(args[1], world)
                }
            } else if (args[0][0] == ".") {
                var obj = ijs.exec(args[0][1], world)
                varName = args[0][2]
                obj[varName] = await ijs.exec(args[1], world)
            } else if (args[0][0] == "<computedMemberAccess>") {
                var obj = ijs.exec(args[0][1], world)
                var varName = ijs.exec(args[0][2], world)
                obj[varName] = await ijs.exec(args[1], world)
            } else if (args[0][0] == "<array>_pre") {
                var varNames = args[0][1]
                valuesArray = await ijs.exec(args[1], world)
                for (var i=0; i<varNames.length; i++) {
                    var varName = varNames[i]
                    var w = ijs.getWorldForKey(world, varName) || world.global
                    w.state[varName] = valuesArray[i]
                }
            } else if (args[0][0] == "<object>_pre") {
                var varNames = args[0][1]
                var valuesObj = await ijs.exec(args[1], world)
                for (var varName of varNames) {
                    w.state[varName] = valuesObj[varName]
                }
            }
        } else {
            var w = ijs.getWorldForKey(world, varName) || world.global
            w.state[varName] = await ijs.exec(args[1], world)
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
    // !!!!
    // TODO: every time you bind for function, also do this!
    // var ts = ret.toString.bind(ret)
    // ret = ret.bind(a)
    // ret.toString = ts

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
    "<optionallyChainedComputedMemberAccess>": function (args, world) {
        var o = ijs.exec(args[0], world)
        if (o === null) {
            return undefined
        }
        if (o === undefined) {
            return undefined
        }
        var ret = o[ijs.exec(args[1], world)]
        if (typeof ret == "function") {
            return ret.bind(o)
        }
        return ret
    },
    // wait is that used?? .? looks like a bug
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
    "++_pre": ijs.makeAssignmentBuiltin(ijs.assinmentOps["++_pre"]),
    "--_pre": ijs.makeAssignmentBuiltin(ijs.assinmentOps["--_pre"]),
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

        // this is now handled as special case of callFunc
        // i guess it's the way the operator precedence hacking landed
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
    "++_post": ijs.makeAssignmentBuiltin(ijs.assinmentOps["++_post"]),
    "--_post": ijs.makeAssignmentBuiltin(ijs.assinmentOps["--_post"]),
    "<array>_pre": function(args, world) {
        var computed = []
        if (!args[0]) {
            return computed
        }
        for (var i=0; i<args[0].length; i++) {
            var expr = args[0][i]
            if (expr && expr[0] == "..._pre") {
                var varName = expr[1]
                var subArray = ijs.exec(varName, world)
                // alert(JSON.stringify(subArray, null, "    "))
                for (var j = 0; j < subArray.length; j++) {
                    computed.push(subArray[j])
                }
            } else {
                var v = ijs.exec(expr, world)
                computed.push(v)
            }
        }
        return computed

        // var computed = args[0].map(function(t) {
        //     return ijs.exec(t, world)
        // })
        // return computed
    },
    "<object>_pre": function(args, world) {
        var o = {}
        args = args[0]
        if (!args) {
            return o
        }
        for (var i=0; i<args.length; i++) {
            var kv = args[i]
            if (kv.length == 2 && kv[0] == "..._pre") {
                var otherObj = ijs.exec(kv[1], world)
                for (var key in otherObj) {
                    if (Object.hasOwn(otherObj, key)) {
                        o[key] = otherObj[key]
                    }
                }
            } else {
                var key = kv[1]
                var value = kv[2]
                if (key.charAt(0) == "#") {
                    key = key.slice(1)
                }
                o[key] = ijs.exec(value, world)
            }
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
        var f = ijs.makeAsyncFunc(params, body, world, name)
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
        var f = ijs.makeFunc(params, body, world, name)
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
        var f = ijs.makeFunc(params, body, world, "")
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
                    var worldToSet
                    if (assignType == "var_pre") {
                        worldToSet = world
                        while (worldToSet.blockScope) {
                            worldToSet = worldToSet.parent
                        }
                    } else if (assignType == "let_pre" || assignType == "const_pre") {
                        worldToSet = loopWorld
                    }
                    if (typeof varName == "object") {
                        if (varName[0] == "<object>_pre") {
                            var varNames = varName[1]
                            for (let subVarName of varNames) {
                                worldToSet.state[subVarName] = val[subVarName]
                            }
                        } else if (varName[0] == "<array>_pre") {
                            var varNames = varName[1]
                            for (var i=0; i<varNames.length; i++) {
                                let subVarName = varNames[i]
                                worldToSet.state[subVarName] = val[i]
                            }
                        }
                    } else {
                        worldToSet.state[varName] = val
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
                    var worldToSet
                    if (assignType == "var_pre") {
                        worldToSet = world
                        while (worldToSet.blockScope) {
                            worldToSet = worldToSet.parent
                        }
                    } else if (assignType == "let_pre" || assignType == "const_pre") {
                        worldToSet = loopWorld
                    }
                    if (typeof varName == "object") {
                        if (varName[0] == "<object>_pre") {
                            var varNames = varName[1]
                            for (let subVarName of varNames) {
                                worldToSet.state[subVarName] = val[subVarName]
                            }
                        } else if (varName[0] == "<array>_pre") {
                            var varNames = varName[1]
                            for (var i=0; i<varNames.length; i++) {
                                let subVarName = varNames[i]
                                worldToSet.state[subVarName] = val[i]
                            }
                        }
                    } else {
                        worldToSet.state[varName] = val
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
        tryBody = ijs.hoist(tryBody)
        var catchBody = args[3][1] || []
        catchBody = ijs.hoist(catchBody)

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
        tryBody = ijs.hoist(tryBody)
        var catchBody = args[3][1] || []
        catchBody = ijs.hoist(catchBody)

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
        // var body = args[1][1] || []

        var body = args[1]
        if (body[0] == "<object>_pre") {
            body = body[1]
            // todo: there may be a better place to do this, like at compile time?
            // or a deeper check in makeFunc
            body = ijs.hoist(body)
        } else {
            body = [body]
        }

        var condRet = ijs.exec(condition, world)
        if (condRet) {
            // var ret = ijs.exec(body, world)
            var ret = ijs.builtins[ijs.getRunFunc(world.async)](body, world, true)
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
        // var body = args[1][1] || []
        var body = args[1]
        if (body[0] == "<object>_pre") {
            body = body[1]
            // todo: there may be a better place to do this, like at compile time?
            // or a deeper check in makeFunc
            body = ijs.hoist(body)
        } else {
            body = [body]
        }

        var condRet = ijs.exec(condition, ifWorld)
        if (condRet) {
            // var ret = ijs.exec(body, ifWorld)
            var ret = await ijs.builtins[ijs.getRunFunc(world.async)](body, world, true)
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
                body = ijs.hoist(body)
            } else {
                // elseRet = ijs.exec(body, world)
                body = [body]
            }
            elseRet = ijs.builtins[ijs.getRunFunc(world.async)](body, world, true)
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
                body = ijs.hoist(body)
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
    },
    "?": function (args, world) {
        var testingValue = ijs.exec(args[0], world)
        // alert("testing " + args[0] + " and it's " + testingValue)
        if (testingValue) {
            return ijs.exec(args[1][1], world)
        }
        return ijs.exec(args[1][2], world)

    },
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

    if (typeof tokens == "undefined") {
        return undefined
    }
    if (tokens.length == 0) {
        return undefined
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
            // alert("can't find: " + token)
            return undefined // let's pretend it's hoisted
            // TODO: if you add var hoisting, you can undo this
            // debugger
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
    // special case for new

    if (typeof funcAccessor == "object") {
        if (funcAccessor[0] == "new_pre") {
            var theClass = ijs.exec(funcAccessor[1], world)
            var evaledArgs = []
            if (typeof theArgs == 'object' && theArgs) {
                var evaledArgs = theArgs.map(function(t) {
                    return ijs.exec(t, world)
                })
            }
            var ret = new (Function.prototype.bind.apply(theClass, [null].concat(evaledArgs)))
            return ret
        }
    }

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


// function checkHoist() {
//     alert(hoisted)
//     var hoisted = 27
// }
// checkHoist()
// var b = false ? "yay" : false ? "yayy" : "nayy"
// alert(b)



// async function w2() {
//     var r = await fetch("https://taptosign.com:9000/teproxydev/tepublic/thumbscript4.js")
//     var r1 = await r.text()
//     alert(r1)
// }
// w2()


// alert(new String("yo").toString() == new String("yo").toString())

// function w1() {
//     if (false) {
//         var d = 1
//     }
//     alert(d)
// }
// w1(1)



// alert("yo".match(/y/))
// var x = new RegExp("y", "")
// alert(x)

// alert("yo".match())

ijs.exampleCode = function () {
/*
var d = {a: 0}
d.a++
log2(d.a)
// var x = new RegExp("t.d", "g")


// https://github.com/Siubaak/sval/issues/94
// broken with  sval
[[1,2,3]].forEach(([a,b,c]) => log2(a+b+c)) // 6


var computer = {keyboard: {keys: [null, {letter: "b"}]}}
// var keys = [undefined, {letter: "b"}]
// broken with  sval
// alert(keys?.[0])
alert(computer?.keyboard?.keys?.[1]?.letter)
alert(foobar?.[0])

var BuyerAddressArray = [
    {AddressStatusId: 0, B: "not this"},
    {AddressStatusId: 1, B: "yea this one"},
    {AddressStatusId: 0, B: "nor this"},
]
var buyerCurrentAddress = BuyerAddressArray.find(
  (a) => a.AddressStatusId == 1
);

log2(buyerCurrentAddress)

return
var a = 100

// function foo() {
//     
//     if (true) {
//         let x
//         // var x
//         x = 100
//         alert(x)
//     }
//     alert(x)
// }
// foo()


// var x = /t.d/g


// var str = "tod ted bob bill tad"
// alert(JSON.stringify(str.match(x)))

// alert("tod ted bob bill tad".match(x))
// alert("tod ted bob bill tad".match(/t.d/g))
// alert("tod ted bob bill tad".match(new RegExp("t.d", "g")))
// alert("tod ted bob bill tad".slice(4))



// they should match
// x = /\d.+\d/i
// x = new RegExp('\\d.+\\d', "i")

// alert("yo".match(/y/))
// var str = "7 whatever 8 ok!!"
// var x = str.match(/\d.+\d/i)
// var x = "what"
// var x = "7 whatever 8 ok!!".match(/\d.+\d/i)
// alert(x)

// function w2() {
//     if (false) {
//         var d = 1
//     }
//     alert(d)
// }
// w2(1)
//

// var x = (1 != 2
//    ? "yay"
//    : "nay")
// alert(x)


// 3 + 4 * 2
// a b c + 7

// a b 3 4 + 5
//
// x = 1 != 2 ? "yay" : false ? "yay2" : "nay"
// foo = async (b) => z
// foo = async function (b) z
// foo = async function (b) z
// async (b) => z
// foo = async + b => z
// foo = async var b => z
// foo = async b => z
// await r.text()
// a = await r.text()
// var r1 = await r.text()
// new Date().getTime()
// x = new Date().getTime()






// function foo() {
//     a.b
//     1
//     true
// }

// var x = 1/2
// var strokeVal = parseInt((466 * progressVal) / totalPercentageVal)

// var d = x => x
// alert(d.toString())

// async function w1(a, [x, y], b = 4, ...z) {
// async function w1() {
var w1 = (a, [x, y], b = 4, ...z) => {
    while (1 > 100) {
        log2(i)
        log2(10)
    }

    for (let i = 0; i < -10; i++) {
        log2(i)
        log2(10)
    }

    var a = function (a, b, c) {
        log2(a, b, c)
        log2(10)
        var b = function ([x, y]) {
            log2(1)
            log2(2)
        }
    }
    var a = (a, b, c) => {
        log2(a, b, c)
        log2(10)
    }
    
    function foo(x, y, z) {
        alert("yo", bar)
        log2(10)
    }
    
    if (x == 1) {
        log2(1)
        log2(2)
    }

    if (x == 1) {
        log2(1)
        log2(2)
    } else if (false) {
        log2(1)
        log2(2)
    } else {
        log2(1)
        log2(2)
    }
    
    var i = 0
    while (i < 10) {
        i++
        let i2 = i
        setTimeout(() => {
            log2("hey " + i2)
        }, 100)
    }
    
    var x = `${i + 1} yo`
    b = c = d
    3 + 4 + 5
    
    [1,2,3].map(x => x)
    
    y = await foo.baz()
    var t = new Date(x, y, z).getTime()
    
    {foo, bar} = yoyo
    typeof x == "undefined"
    if (a) doThing()
    
    if (b) {
        break
        continue
        return
        return 27
        if (b) {
            break
            continue
            return
            return 27
        }
    }
    
    for (let x of foobar) {
        alert(x)
    }

    let c = 20
    let d = {a: 100, "b": 300, c: {x: 20}}
    
    foo.bar.baz()
    bar()
}

log2(w1.toString())


// alert(foo.toString())

// 1 + 2 + 3
// 1 = 2 = 3
// if (true) {
//     log2("yay1")
// } else if (false) {
//     log2("yay2")
// }
//
// var people = [["dude", "man"], ["mr", "person"]]
// for (let p of people) {
//     log2(p)
// }
// for (let [a, b] of people) {
//     log2(a + ":" + b)
// }

// async function xy() {
//     alert("foo")
// }
// xy()
// var people = [{name: "D", age: 40}, {name: "C", age: 30}]
// // red marker
// function w399() {
//     for (let {name, age} of people) {
//         alert(name + ":" + age)
//     }
// }
// w399()
// alert(w399.toString())


// function b() {
//     return function () {
//         return 98
//     }
// }
// alert(b()())

// var ab = new Date().getTime()
// alert(new Date(ab))
// new Date().getTime()
// var ab = new Date("2012")
// var a = "yoo"
// alert(ab)
// chunks = []
// alert(chunks)
//
// var objj = {}
// alert(objj)
// await r.text()
// a = await r.text()
// fetch("https://taptosign.com:9000/teproxydev/tepublic/thumbscript4.js").then(r => r.text()).then(async r => {
//     alert(r)
// })

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
// async function foo2() {
//     var a = await getStuff()
//     alert(a)
// }
// foo2()


// async function w2() {
//     // log2("hi")
//     // await sleep(1000)
//     // log2("bye")
//     // await sleep(1000)
//     // log2("again")
//     // for (var i=0; i<10; i++) {
//     //     log2("the " + i)
//     //     await sleep(200)
//     // }
//     var r = await fetch("https://taptosign.com:9000/teproxydev/tepublic/thumbscript4.js")
//     // var r1 = await r.text()
//     var r1 = await r.text()
//     alert(r1)
// }
// w2()

// switch (foo) {
//     case 2+40:
//         doSomething()
//         x = 1
//         break
// }
// var b = false ? "yay" : false ? "yayy" : "nayy"
// alert(b)
// function foo(...args) {
//     log2(args)
// }
// foo(3, 4, 212)

// async function x([a, b]) {
//     alert(a + " " + b)
// }
// x([1, 2])
// async function x2({a, b}) {
//     alert(a + " " + b)
// }
// x2({a: 100, b: 200})

// function foo(...args) {
//     log2(args)
// }
//
// foo(3, 4, 212)

// alert(a.foo)
// async function foo(a, b=27 c = [123,45]) {
//     alert(a + " " + b + " " + c)
// }
// foo(1)
// var a = {foo: "hi foo", bar: "hi bar"}
// var {foo, bar} = a
//
// alert(foo + " " + bar)


// function w1() {
//     // if (true) return 30
//
//     if (false) {
//
//     } else if (false) {
//         return 99
//     } else if (false) { return 100 }
//     else return 988
// }
//
// log2(w1())
// return
//
// for (var i = 0; i < 100; i++) {
//     log2(i)
//     // if (i == 20) { break }
//     if (i < 20) {
//
//     } else break
// }


// values = [1,2]
// var [a, b] = values
// alert(a + " " + b)




// var ret = "abcdefghijklmnop".split("g")[0]
// .split("d")[0]
// .split("b")[0]
// alert(ret)

// var a = {}
// a.b = undefined
// alert("b" in a)
// alert("c" in a)


// if (true) alert("what")
// var a
// alert(typeof a)
// values = [1,2]
// [a, b] = values
// alert(a + " " + b)


// var a = {foo: "bar", biz: "baz"}
// b = {...a, yo: 100}
// log2(b)

// var b = ["yo", "world"]
// var a = [1, ...b, 1, ...b]
// log2(a)

// if (true) {
// try {
//   garbage.bad
// } catch (e) {
//     async function wrapper() {
//         checkHoist()
//         async function checkHoist() {
//             alert("rubbage")
//         }
//     }
//     wrapper()
// }


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

for (let i = 0; i < 10; i++) {
    setTimeout(() => {
        log2("i is " + i)
    })
}

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
// deeppink marker
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
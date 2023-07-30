
// TODO: true, false
// 

// how to dynamically call new in javascript
// 
// There are a few ways to dynamically call constructors in JavaScript. You could use the "new" keyword directly, or you might use the "apply" or "call" method of the Function prototype. Here's how to do it:
// 1. Using the `new` keyword directly:
// ```javascript
//     var MyClass = function(arg1, arg2) {
//       this.arg1 = arg1;
//       this.arg2 = arg2;
//     };
//     var obj = new MyClass('x', 'y');
// ```
// 2. Using `apply`:
// ```javascript
//     var MyClass = function(arg1, arg2) {
//       this.arg1 = arg1;
//       this.arg2 = arg2;
//     };
//     var obj = Object.create(MyClass.prototype);
//     MyClass.apply(obj, ['x', 'y']);
// ```
// 3. Using `call`:
// ```javascript
//     var MyClass = function(arg1, arg2) {
//       this.arg1 = arg1;
//       this.arg2 = arg2;
//     };
//     var obj = Object.create(MyClass.prototype);
//     MyClass.call(obj, 'x', 'y');
// ```
// In all these cases, `MyClass` is the constructor that you're calling with the `new` keyword or functionally invoking with `apply`/`call`. Your new object `obj` will have the properties arg1 and arg2 set to 'x' and 'y' respectively.

// interpreted js
// things are the same at function level
// inside a function no guarantees
// own if, own loop.
// needs to work with
// async, addEventListener setTimeout
// closures, lexical scope?
// bit maybe lexical scope on one known variable?
// cuz that's  all we can do?
// declare funcs wiith optional arguments.
// the interpreter should just take a parsed representstion?
// try/catch
// async await
// new
// math operators
// lazy eval?
// this

// all javascript operators

// JavaScript supports several types of operators:
// 1. **Arithmetic Operators**: Perform mathematical operations
//    * Addition: `+`
//    * Subtraction: `-`
//    * Multiplication: `*`
//    * Division: `/`
//    * Modulus (Remainder): `%`
//    * Increment: `++`
//    * Decrement: `--`
// 2. **Assignment Operators**: Assign values to JavaScript variables
//    * Assign: `=`
//    * Add and assign: `+=`
//    * Subtract and assign: `-=`
//    * Multiply and assign: `*=`
//    * Divide and assign: `/=`
//    * Modulus and assign: `%=`
// 3. **Comparison Operators**: Compare two values
//    * Equal to: `==`
//    * Not equal to: `!=`
//    * Greater than: `>`
//    * Less than: `<`
//    * Greater than or equal to: `>=`
//    * Less than or equal to: `<=`
//
// 4. **Logical Operators**: Determine the logic between variables or values
//    * Logical AND: `&&`
//    * Logical OR: `||`
//    * Logical NOT: `!`
// 5. **Bitwise Operators**: Handle binary data
//    * AND: `&`
//    * OR: `|`
//    * XOR: `^`
//    * NOT: `~`
//    * Left shift: `<<`
//    * Right shift: `>>`
//    * Zero fill right shift: `>>>`
// 6. **String Operators**: JavaScript uses the `+` operator to concatenate strings.
// 7. **Ternary/Conditional Operator**: Assign a value to a variable based on some condition.
//    * `? :`
// 8. **Type Operators**: JavaScript provides two operators for getting an object's type.
//    * `typeof`
//    * `instanceof`
// 9. **Delete Operator**: Used to delete properties from an object.
//    * `delete`
// 10. **In Operator**: Returns `true` if the specified property is in the specified object.
//     * `in`
// 11. **Void Operator**: Evaluates the given expression and then returns `undefined`.
//     * `void`
// Each operator has different syntax and behavior characteristics.

// list all the operators in javascript (including es6)
// don't  explain them, just list them

// Sure, here are all the JavaScript operators including ES6:
// 1. Arithmetic Operators: +, -, *, /, %, ++, --, **
// 2. Assignment Operators: =, +=, -=, *=, /=, %=, **=
// 3. String Operators: +
// 4. Comparison Operators: ==, ===, !=, !==, >, <, >=, <=
// 5. Logical Operators: &&, ||, !
// 6. Bitwise Operators: &, |, ~, ^, <<, >>
// 7. Ternary Operator (Conditional): ?
// 8. typeof Operator: typeof
// 9. delete Operator: delete
// 10. in Operator: in
// 11. instanceof Operator: instanceof
// 12. void Operator: void
// 13. new Operator: new
// 14. Spread Operator: ...
// 15. yield Operator: yield
// 16. await Operator: await
// Please note that this list includes operators from ES6 and earlier versions.

// Sure, here’s a comprehensive list of JavaScript operators:
// - Assignment operators: `=, +=, -=, *=, /=, %=, **=`
// - Comparison operators: `==, ===, !=, !==, >, <, >=, <=`
// - Arithmetic operators: `+, -, *, /, %, ++, --`
// - Bitwise operators: `&, |, ^, ~, <<, >>, >>>`
// - Logical operators: `&&, ||, !`
// - String operators: `+, +=`
// - Conditional (ternary) operator: `? :`
// - Type operators: `typeof, instanceof`
// - Spread operator: `...`
// - Rest parameter: `...`
// - Destructuring assignment: `[a, b] = [1, 2], {a, b} = {a:1, b:2}`
// - Arrow function `=>`
// - Yield: `yield`
// - Await: `await`
// - Nullish coalescing operator `??`
// - Optional chaining `.?`
// laziness? and, or.
// not worrying about let.
// interpolation





var ijs = {}
// TODO: ignore : , ;
// TOODO: interpolation? (template literals)
ijs.tokenize = function(code) {
    var backslash = "\\"
    code = code + "\n"
    var i = 0
    var state = "out"
    var currentToken = ""
    var quoteType = ""
    var tokens = []
    
    var pushToken = function(x) {
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
            tokens.push(true)
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
        if (x - 0 == x) {
            tokens.push(x - 0)
            return
        }
        tokens.push(x)
    }
    
    var isVar = function(chr) {
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
            if (" \t\n".indexOf(chr) != -1) {
            } else if ("/".indexOf(chr) != -1) {
                state = "firstSlash"
            } else if ("()".indexOf(chr) != -1) {
                if (i != 0 && "(".indexOf(chr) != -1 && " \t\n".indexOf(code.charAt(i-1)) == -1 ) {
                    tokens.push("<callFunc>")
                }
                tokens.push(chr)
            } else if ("[]".indexOf(chr) != -1) {
                if (i != 0 && "[".indexOf(chr) != -1) {
                    if (" \t\n".indexOf(code.charAt(i-1)) == -1 ) {
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
            if (" \t\n".indexOf(chr) != -1) {
                pushToken(currentToken)
                currentToken = ""
                state = "out"
            } else if ("()".indexOf(chr) != -1) {
                if (currentToken) {
                    pushToken(currentToken)
                    currentToken = ""
                }
                if (i != 0 && "(".indexOf(chr) != -1 && " \t\n".indexOf(code.charAt(i-1)) == -1 ) {
                    tokens.push("<callFunc>")
                }
                tokens.push(chr)
                state = "out"
            } else if ("[]".indexOf(chr) != -1) {
                if (currentToken) {
                    pushToken(currentToken)
                    currentToken = ""
                }
                if (i != 0 && "[".indexOf(chr) != -1 && " \t\n".indexOf(code.charAt(i-1)) == -1 ) {
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
                log2("+in symbol")
                pushToken(currentToken)
                currentToken = chr
                state = "in_symbol"
            }
        } else if (state == "in_symbol") {
            if (" \t\n".indexOf(chr) != -1) {
                pushToken(currentToken)
                currentToken = ""
                state = "out"
            } else if ("()".indexOf(chr) != -1) {
                if (currentToken) {
                    pushToken(currentToken)
                    currentToken = ""
                }
                if (i != 0 && "(".indexOf(chr) != -1 && " \t\n".indexOf(code.charAt(i-1)) == -1 ) {
                    tokens.push("<callFunc>")
                }
                tokens.push(chr)
                state = "out"
            } else if ("[]".indexOf(chr) != -1) {
                if (currentToken) {
                    pushToken(currentToken)
                    currentToken = ""
                }
                if (i != 0 && "[".indexOf(chr) != -1 && " \t\n".indexOf(code.charAt(i-1)) == -1 ) {
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
                    tokens.push(["<interpolate>", JSON.parse(currentToken)])
                } else {
                    tokens.push("#" + JSON.parse(currentToken))
                }
                log2("+" + currentToken)
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
            if ("\n".indexOf(chr) != -1) {
                state = "out"
            }
        }
        i++
    }
    // return tokens


    log2(tokens)
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
                    t = t[0]
                }
                newTokens.push(t)
            }
        } else {
            newTokens.push(token)
        }
    }
    // return tokenStack
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
function parseTemplateString (templateString, state) {
    var regex = /\$\{([^}]+)\}/g;
    return templateString.replace(regex, function (x, y) {
        return state[y]
    });
}
var ret = parseTemplateString("foo${xyz}bar${abc}", {
    xyz: "hi",
    abc: "bye"
})
log2(ret)



ijs.operatorate = function(tokens) {
    tokens = ijs.infixate(tokens, false, true, -1, 0)
    return tokens
    
    var newTokens = []
    var token
    while (token = tokens.shift()) {
        if (token == "var") {
            var name = tokens.shift()
            var value = tokens.shift()
            newTokens.push(["var", name, value])
            continue
        }
        if (token == "set") {
            var name = tokens.shift()
            var value = tokens.shift()
            newTokens.push(["set", name, value])
            continue
        }
        if (token == "func") {
            var nameAndArgs = tokens.shift()
            var body = tokens.shift()
            var body = tokens.shift()
            newTokens.push(["func", nameAndArgs, body])
            continue
        }
        if (token == "return") {
            var value = tokens.shift()
            newTokens.push(["return", value])
            continue
        }
        
        newTokens.push(token)
    }
    
    return newTokens
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
     ".?": {
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

ijs.infixate = function(tokens, stopAfter, skipInfix, lastPrecedence, iter) {
    logIndent(iter, "infixate called", tokens)
    if (iter == 500) {
        alert("oops")
        return
    }
    var newTokens = []
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
        token = tokens.shift()
        // log2("+ token: " + JSON.stringify(token))
        if (!skipInfix && (ijs.infixes.hasOwnProperty(token))) {
        // if (token in ijs.infixes) {
            var opDef = ijs.infixes[token]
            currPrecedence = opDef.precedence
            currAssociatitivity = opDef.associatitivity
            // log2(JSON.stringify([token, currPrecedence, lastPrecedence]))
            if (lastPrecedence == -1) {
                lastGroup = [token, newTokens.pop(), ijs.infixate(tokens, true, true, currPrecedence, iter+1)]
                newTokens.push(lastGroup)
            } else if (currPrecedence < lastPrecedence || (currPrecedence == lastPrecedence && !currAssociatitivity)) {
                // log2("-here")
                copiedLastGroup = JSON.parse(JSON.stringify(lastGroup))
                lastGroup[0] = token
                lastGroup[1] = copiedLastGroup
                lastGroup[2] = ijs.infixate(tokens, true, true, currPrecedence, iter + 1)
                lastGroup = lastGroup // lol
            } else if (currPrecedence > lastPrecedence || (currPrecedence == lastPrecedence && currAssociatitivity)) {
                var lastRight = lastGroup[lastGroup.length - 1]
                var newGroup = [token, lastRight, ijs.infixate(tokens, true, true, currPrecedence, iter + 1)]
                lastGroup[lastGroup.length - 1] = newGroup
                lastGroup = newGroup
            }
            if (stopAfter) {
                // wait maybe just return lastGroup?
                logIndent(iter, "infix return", lastGroup)
                return lastGroup
                // return newTokens
            }
            lastPrecedence = currPrecedence
        } else if (ijs.prefixes.hasOwnProperty(token)) {
            var opDef = ijs.prefixes[token]
            currPrecedence = opDef.precedence
            len = opDef.len
            lastGroup = [token + "_pre"]
            for (var i=0; i<(opDef.arity || 1); i++) {
                lastGroup.push(ijs.infixate(tokens, true, true, currPrecedence, iter + 1))
            }
            lastPrecedence = currPrecedence
            if (stopAfter) {
                // wait maybe just return lastGroup?
                logIndent(iter, "prefix return", lastGroup)
                return lastGroup
                // return newTokens
            }
            newTokens.push(lastGroup)
        // } else if (token in ijs.postfixes) {
        //     lastGroup = [token + "_postfix", lastGroup]
        } else {
            if (stopAfter) {
                var next = ""
                if (tokens.length) {
                    var next = tokens.shift()
                    tokens.unshift(next)
                }
                if (next in ijs.infixes) {
                    var opDef = ijs.infixes[next]
                    currPrecedence = opDef.precedence
                    currAssociatitivity = opDef.associatitivity
                    // if (currPrecedence < lastPrecedence) {
                    if (currPrecedence < lastPrecedence || (currPrecedence == lastPrecedence && !currAssociatitivity)) {
                        logIndent(iter, "token return a", token)
                        return token
                    }
                } else if (next in ijs.postfixes) {
                    tokens.shift()
                    return [next + "_post", token]
                } else {
                    logIndent(iter, "token return b", token)
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
            } else {
                newTokens.push(token)
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


ijs.run = function(code) {
    var tokens = ijs.tokenize(code)
    log2(tokens)
    var globalWorld = {
        state: window,
        cachedLookupWorld: {},
        parent: null,
    }
    var world = {
        parent: globalWorld,
        state: {},
        cachedLookupWorld: {},
        global: globalWorld
    }
    var f = ijs.makeFunc([], tokens, world)
    var ret
    // try {
        ret = f()
    // } catch (e) {
    //     log2("-error: " + e)
    // }
    log2("+state")
    log2(f.world.state)
    log2("+return value")
    log2(ret)
}

// TODO: numbers

ijs.makeFunc = function(params, body, world) {
    body = body || []
    body = ["run", ...body]
    // body.unshift("run")
    var world = {
        parent: world,
        state: {},
        cachedLookupWorld: {},
        global: world.global
    }
    var f = function(...args) {
        if (params) {
            for (var i=0; i<args.length; i++) {
                var arg = args[i]
                world.state[params[i]] = args[i]
            }
        }
        var ret = ijs.exec(body, world)
        return ret
    }
    f.world = world // lol
    return f
    // todo default args?
}
ijs.breakMessage = {}
ijs.continueMessage = {}

ijs.builtins = {
    "run": function(args, world) {
        // var last = void 0;
        for (var i=0; i<args.length; i++) {
            var arg = args[i]
            // some special cases
            // log2("-running: "+JSON.stringify(arg))
            if (typeof arg == "object") {
                if (arg[0] == "return_pre") {
                    var ret = ijs.exec(arg[1], world)
                    return ret
                }
            }
            if (arg == "break") {
                return ijs.breakMessage
            }
            if (arg == "continue") {
                return ijs.continueMessage
            }
            ijs.exec(arg, world)
        }
    },
    "=": function (args, world) {
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
                var w = ijs.getWorldForKey(world, varName) || world
                w.state[varName] = ijs.exec(args[1], world)
            } else if (args[0][0] == "let_pre") {
                varName = args[0][1]
                assignType = "let"
                world.state[varName] = ijs.exec(args[1], world)
            } else if (args[0][0] == "const_pre") {
                varName = args[0][1]
                assignType = "const"
                // lol
                world.state[varName] = ijs.exec(args[1], world)
            }
        } else {
            var w = ijs.getWorldForKey(world, varName)
            world.global.state[varName] = ijs.exec(args[1], world)
        }
    },
    "+=": function (args, world) {
        world.state[args[0]] += ijs.exec(args[1], world)
    },
    "-=": function (args, world) {
        world.s[args[0]] -= ijs.exec(args[1], world)
    },
    "**=": function (args, world) {
        world[args[0]] **= ijs.exec(args[1], world)
    },
    "*=": function (args, world) {
        world[args[0]] *= ijs.exec(args[1], world)
    },
    "/=": function (args, world) {
        world[args[0]] /= ijs.exec(args[1], world)
    },
    "%=": function (args, world) {
        world[args[0]] %= ijs.exec(args[1], world)
    },
    "<<=": function (args, world) {
        world[args[0]] <<= ijs.exec(args[1], world)
    },
    ">>=": function (args, world) {
        world[args[0]] >>= ijs.exec(args[1], world)
    },
    ">>>=": function (args, world) {
        world[args[0]] >>>= ijs.exec(args[1], world)
    },
    "&=": function (args, world) {
        world[args[0]] &= ijs.exec(args[1], world)
    },
    "^=": function (args, world) {
        world[args[0]] ^= ijs.exec(args[1], world)
    },
    "|=": function (args, world) {
        world[args[0]] |= ijs.exec(args[1], world)
    },
    "&&=": function (args, world) {
        world[args[0]] &&= ijs.exec(args[1], world)
    },
    "||=": function (args, world) {
        world[args[0]] ||= ijs.exec(args[1], world)
    },
    "??=": function (args, world) {
        world[args[0]] ??= ijs.exec(args[1], world)
    },
    "??": function (args, world) {
        return ijs.exec(args[0], world) ??= ijs.exec(args[1], world)
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
        return ++ijs.exec(args[0], world)
    },
    "--_pre": function (args, world) {
        return --ijs.exec(args[0], world)
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
        var theClass = ijs.exec(args[0], world)
        var obj = Object.create(theClass.prototype);
        theClass.apply(obj, args.slice(1));
        return obj
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
        for (var i=0; i<args.length-1; i+=2) {
            if (args[i].charAt(0) == "#") {
                args[i] = args[i].slice(1)
            }
            o[args[i]] = ijs.exec(args[i+1], world)
        }
        return o
    },
    "function_pre": function(args, world) {
        // [
        //    "function_pre",
        //    [
        //       "<callFunc>",
        //       "testMe",
        //       [
        //          "a",
        //          "b"
        //       ]
        //    ],
        //    [
        //       "<object>_pre",
        //       [
        //          [
        //             "return_pre",
        //             [
        //                "+",
        //                "a",
        //                "b"
        //             ]
        //          ]
        //       ]
        //    ]
        // ]
        var name = ""
        var params
        var paramsAndName = args[0]
        if (paramsAndName && paramsAndName[0] == "<callFunc>") {
            params = paramsAndName[2]
            name = paramsAndName[1]
        } else {
            params = args[0]
        }
        var body = args[1][1]
        var f = ijs.makeFunc(params, body, world)
        if (name) {
            ijs.set(name, f, world, "var")
        }
        return f
    },
    "<callFunc>": function(args, world) {
        // (foo bar baz)
        // is the same as
        // (<callfunc> bar baz)
        // alternate
        return ijs.callFunc(args[0], args[1], world)
    },
    "while_pre": function (args, world) {
        var condition = args[0][0]
        var body = args[1][1] || []
        
        // body.unshift("run")
        body = ["run", ...body]
        // log2("+while body")
        // log2(body)
        // ijs.exec(body, world)
        log2("+while condition")
        log2(condition)
        
        var i = 0
        while (ijs.exec(condition, world)) {
            i++
            // ijs.exec(body, world)
            var ret = ijs.exec(body, world)
            if (ret == ijs.breakMessage) {
                break
            }
            if (i == 40) {
                break
            }
        }
    },
    "if_pre": function (args, world) {
        var condition = args[0][0]
        var body = args[1][1] || []
        // body.unshift("run")
        body = ["run", ...body]
        var condRet = ijs.exec(condition, world)
        if (condRet) {
            var ret = ijs.exec(body, world)
        }
        return condRet // hack so else works
    },
    "else": function (args, world) {
        // var ret = ijs.exec(args[0], world)
        var ret = ijs.exec(args[0], world)
        if (!ret) {
            var body = args[1]
            if (body[0] == "<object>_pre") {
                body = body[1]
                // body.unshift("run")
                body = ["run", ...body]
            }
            ijs.exec(body, world)
        }
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
ijs.getWorldForKey = function(world, key, errOnNotFound, forSetting) {
    // the cachedLookupWorld seems noticeably faster when running jsloopn
    // 19ms vs 38ms on a loopn with somevar+= for 100k loops

    // if (world.local && forSetting) {
    //     return world
    // }
    if (world.cachedLookupWorld[key]) {
        return world.cachedLookupWorld[key]
    }
    for (var w = world; w != null; w = w.parent) {
        // perf doesn't seem to matter here
        // if (key in w.state) {
        if (w.state.hasOwnProperty(key)) {
        // if (typeof w.state[key] !== "undefined") {
            world.cachedLookupWorld[key] = w
            break
        }
    }
    // if (w === null) {
    //     if (errOnNotFound) {
    //         // log2("-unknown variable: " + key);
    //         log2("-unknown variable: " + JSON.stringify(key));
    //     }
    //     return world
    // }
    return w
}
ijs.exec = function(tokens, world) {
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
            alert("can't find world for " + token)
        }
        // alert("typeof w is " + typeof w)
        return w.state[token]

        // if (token in window) {
        //     return window[token]
        // }

        // or throw?
        return undefined
    }
    return ijs.callFunc(tokens[0], tokens.slice(1), world)
}

ijs.callFunc = function(funcAccessor, theArgs, world) {
    if (funcAccessor in ijs.builtins) {
        func = ijs.builtins[funcAccessor]
        var ret = func(theArgs, world)
        return ret
    }
    func = ijs.exec(funcAccessor, world)
    if (!func) {
        alert("no func: " + funcAccessor)
    }
    theArgs = theArgs || []
    return func.apply(null, theArgs.map(function(t) {
        return ijs.exec(t, world)
    }))
}

// not implementing (yet?)
// labels for breaks (maybe we should)
// comma operator

// to implement
// lexical scope
// simple assignment

window.testObj = {
    name: "Drew2"
}
var code = String.raw`


// if (a == 0) {
//     log2("+it's 0")
// // } else if (bleep) {
// // 
// // } else if (bloop) {
// // 
// // } else {
// 
// }

var a = 9
if (a == 0) {
    log2("+it's 0")
} else if (a == 1) {
   log2("+it's 1")
} else if (a == 2) {
   log2("+it's 2")
} else {
    log2("+it's something else")
}


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


log2("hello world")

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
// log2([a, b])
// log2({a, b})
// const { done, value } = await reader.read()
// const [ done, value ] = await reader.read()
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
`
// log2(JSON.parse('"\\`"'))
// code = 'yo = `foob${lol}ar\\${ok}\\`r`'
// code = "yo = `foob${lol}ar\\`r`"
ijs.run(code)
log2(0 in ijs.infixes)

/*

var(name "drew")
var(person obj(name "Drew" age 38))
// var(name2 call(access(yay "toUpperCase")()))

// call("log2", ("lol logs"))
// func(myFunc (a b) (
//     set(a b)
//     call("log2", "somemlogs")
// ))


["var", []]


func(returnInputValue (element index (child false) (childIndex 0))
    trycatch(
        run(

        )

        run(

        )
    )
)


if( neq(element, "undefined")
    code(

    )
)

  function returnInputValue(element, index, child = false, childIndex = 0) {
    try {
      if (element != "undefined") {
        if (element.length > index) {
          if (child) {
            if (element[index].children.length > childIndex) {
              return element[index].children[childIndex].value
            }
          } else {
            return element[index].value
          }
        }
      }
      return ""
    } catch (e) {
      console.log("error ", e)
      return ""
    }
  }
  
@[ ]
chrome.storage.local.set(
    %{
        page1 false
        page2 false
        page3 false
    }
)
    await new Promise(function (resolve, reject) {
      chrome.storage.local.set(
        {
          iterateServiceArizona: {
            page1: false,
            page2: false,
            page3: false,
            page4: false,
            page5: false,
            page6: false,
            page7: false,
            page8: false,
            page9: false,
            page10: false,
            page11: false,
            page12: false,
          },
        },
        function () {
          console.log("Resolving page1 here")
          resolve()
        }
      )
    })

*/
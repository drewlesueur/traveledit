
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
    var tokens = []
    
    var pushToken = function(x) {
        if (x == ",") {
            return
        }
        if (x == ":") {
            return
        }
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
                currentToken = chr
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
                currentToken = chr
            } else if (isVar(chr)) {
                pushToken(currentToken)
                currentToken = chr
                state = "in"
            } else {
                currentToken += chr
            }
        } else if (state == "quote") {
            if (backslash.indexOf(chr) != -1) {
                currentToken += chr
                state = "escape"
            } else if ('"'.indexOf(chr) != -1) {
                currentToken += chr
                // tokens.push(currentToken)
                tokens.push("#" + JSON.parse(currentToken))
                currentToken = ""
                state = "out"
            } else {
                currentToken += chr
            }
        } else if (state == "escape") {
            currentToken += chr
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


ijs.processTouching = function(tokens) {
   // return tokens
   // [
   //    "<callFunc>",
   //    "log2",
   //    [
   //       [
   //          ".",
   //          "testObj",
   //          "name"
   //       ]
   //    ]
   // ],
   //
   // [
   //    "log2",
   //   [
   //      ".",
   //      "testObj",
   //      "name"
   //   ]
   // ],
   
    // log2("+process callFunc! " + JSON.stringify(tokens))
    
    for (var i=0; i<tokens.length; i++) {
        var token = tokens[i]
        if (typeof token == "object") {
            var first = token[0]
            log2("+first " + first)
            if (first == "<callFunc>") {
                token.shift()
                if (token[1].length) {
                    token[1] = token[1][0]
                } else {
                    token.pop()
                }
            }
        }
    }
    
    return tokens
}

ijs.operatorate = function(tokens) {
    tokens = ijs.infixate(tokens)
    // tokens = ijs.processTouching(tokens)
    // TODO: some precendence?
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
         "precedence": 16,
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
     // "!": {
     //     "associatitivity": 1,
     //     "precedence": 14,
     //     "arity": 1,
     //     "fix": "pre",
     // },
     // "function": {
     //     "associatitivity": 1,
     //     "precedence": 0,
     //     "arity": 3,
     //     "fix": "pre",
     // },
}

ijs.prefixes = {
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
     // "function": {
     //     "associatitivity": 1,
     //     "precedence": 99,
     //     "arity": 1,
     //     "fix": "pre",
     // },
}
ijs.forcedPrefixes = {
    "function": {
        len: 3,
    }
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
// -!a
ijs.unaryHack = function(tokens) {
    // return tokens.shift()
    
    var token = tokens.shift()
    log2("+ checking unary with (" + token + ")")
    // if (token in ijs.forcedPrefixes) {
    //     log2("yay!!")
    //     log2(tokens)
    //     var ret = [token]
    //     for (var i=0; i<ijs.forcedPrefixes[token].len; i++) {
    //         ret.push(tokens.shift())
    //     }
    //     log2("+ret is")
    //     log2(ret)
    //     return ret
    // }
    if (token in ijs.prefixes && ijs.prefixes[token].fix == "pre") {
        return [token + "_unary_pre", ijs.unaryHack(tokens)]
    }
    var next = tokens.shift()
    if (next in ijs.postfixes) {
        return [next + "_unary_post", token]
    }
    tokens.unshift(next)
    return token
    
    
    // while (token = tokens.shift()) {
    //     if (token in ijs.infixes && ijs.infixes[token].fix == "pre") {
    //         group = [token]
    //     } else {
    //         return token
    //     }
    // } 
}
ijs.infixate = function(tokens, stopAfter, iter) {
    log2("infixate called: " + JSON.stringify(tokens))
    iter = iter || 0
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
    
    // !a.b
    // (! a)
    // (! (. a b))
    
    
    var lastPrecedence = -1
    var currPrecedence = -1
    var lastGroup = null
    while (token = tokens.shift()) {
        if (token in ijs.infixes) {
            var opDef = ijs.infixes[token]
            currPrecedence = opDef.precedence
            currAssociatitivity = opDef.associatitivity
            // log2(JSON.stringify([token, currPrecedence, lastPrecedence]))
            if (lastPrecedence == -1) {
                lastGroup = [token, newTokens.pop(), ijs.infixate(tokens, true, iter+1)]
                newTokens.push(lastGroup)
            } else if (currPrecedence < lastPrecedence || (currPrecedence == lastPrecedence && !currAssociatitivity)) {
                // log2("-here")
                copiedLastGroup = JSON.parse(JSON.stringify(lastGroup))
                lastGroup[0] = token
                lastGroup[1] = copiedLastGroup
                lastGroup[2] = ijs.infixate(tokens, true)
                lastGroup = lastGroup // lol
            } else if (currPrecedence > lastPrecedence || (currPrecedence == lastPrecedence && currAssociatitivity)) {
                var lastRight = lastGroup[lastGroup.length - 1]
                var newGroup = [token, lastRight, ijs.infixate(tokens, true, iter + 1)]
                lastGroup[lastGroup.length - 1] = newGroup
                lastGroup = newGroup
            }
            lastPrecedence = currPrecedence
        } else if (token in ijs.prefixes) {
            var opDef = ijs.prefixes[token]
            currPrecedence = opDef.precedence
            len = opDef.len
            lastGroup = [token]
            for (var i=0; i<(opDef.len || 1); i++) {
                lastGroup.push(ijs.infixate(tokens, true, iter + 1))
            }
            lastPrecedence = currPrecedence
            if (stopAfter) {
                // wait maybe just return lastGroup?
                return newTokens
            }
            newTokens.push(lastGroup)
        } else {
            // log2(JSON.stringify([token, -1, lastPrecedence]))
            if (stopAfter) {
                // tokens.unshift(token)
                // return newTokens
                return token
            }
            lastPrecedence = -1
            tokens.unshift(token)
            newTokens.push(ijs.infixate(tokens, true, iter+1))
        }
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
    // return
    var state = {
        add: (x, y) => x + y,
        substract: (x, y) => x - y,
        multiply: (x, y) => x * y,
        divide: (x, y) => x / y,
        concat: (x, y) => x + y,
    }
    var f = ijs.makeFunc([[], tokens], state, "main")
    var ret
    try {
        ret = f()
    } catch (e) {
        log2("-error: " + e)
    }
    log2("+state")
    log2(state)
    
    log2("+return value")
    log2(ret)
}

// TODO: numbers

ijs.makeFunc = function(funcDefArgs, state, name) {
    var params = funcDefArgs[0]
    var body = funcDefArgs[1]
    body.unshift("run")
    // log2("+ making func with")
    // log2(body)
    var f = function(...args) {
        // log2("+calling func: " + name + " with: " + JSON.stringify(args))
        for (var i=0; i<args.length; i++) {
            var arg = args[i]
            state[params[i]] = args[i]
        }
        // log2("+set the state to")
        // log2(state)
        var ret = ijs.exec(body, state)
        // log2("+done func: " + name)
        return ret
    }
    return f
    // todo default args?
}

ijs.builtins = {
    "var": function(args, state) {
        try {
            state[args[0]] = ijs.exec(args[1], state)
        } catch (e) {
            log2("-- error with args " + e)
            log2(args)
        }
    },
    "run": function(args, state) {
        // var last = void 0;
        for (var i=0; i<args.length; i++) {
            var arg = args[i]
            // some special cases
            if (typeof arg == "object") {
                if (arg[0] == "return") {
                    var ret =  ijs.exec(arg[1], state)
                    // log2("1 returning " + ret)
                    return ret
                }
            }
            ijs.exec(arg, state)
        }
    },
    "obj": function(args, state) {
        var o = {}
        for (var i=0; i<args.length-1; i+=2) {
            o[args[i]] = ijs.exec(args[i+1], state)
        }
        return o
    },
    "arr": function(args, state) {
        var arr = args.map(function(a) {
            return a.exec(a)
        })
        return arr
    },
    // "new": function(args, state) {
    //     var theClass = ijs.exec(args[i], state)
    //     var obj = Object.create(theClass.prototype);
    //     theClass.apply(obj, args.slice(1));
    //     return obj
    // },
    "prop": function(args, state) {
        var obj = ijs.exec(args[0], state)
        var oldObj = null
        var props = args.slice(1).map(function(arg) {
            return ijs.exec(arg, state)
        })
        props.forEach(function(p) {
            oldObj = obj
            obj = obj[p]
        })
        if (typeof obj == "function") {
            return obj.bind(oldObj)
        }
        return obj
    },
    // "func": function(args, state) {
    //     // log2("+func: " + JSON.stringify(args))
    //     var funcName = args[0][0]
    //     log("+ making func with: ")
    //     log([args[0].slice(1), args[1]])
    //     var f = ijs.makeFunc([args[0].slice(1), args[1]], state, funcName)
    //     if (funcName) {
    //         state[args[0][0]] = f
    //     }
    //     return f
    // },
    // "function": function(args, state) {
    //     // log2("+func: " + JSON.stringify(args))
    //     var funcName = args[0][0]
    //     log("+ making func with: ")
    //     log([args[0].slice(1), args[1]])
    //     var f = ijs.makeFunc([args[0].slice(1), args[1]], state, funcName)
    //     if (funcName) {
    //         state[args[0][0]] = f
    //     }
    //     return f
    // },
    "=": function (args, state) {
        state[args[0]] = ijs.exec(args[1], state)
    },
    "+=": function (args, state) {
        state[args[0]] += ijs.exec(args[1], state)
    },
    "-=": function (args, state) {
        state[args[0]] -= ijs.exec(args[1], state)
    },
    "**=": function (args, state) {
        state[args[0]] **= ijs.exec(args[1], state)
    },
    "*=": function (args, state) {
        state[args[0]] *= ijs.exec(args[1], state)
    },
    "/=": function (args, state) {
        state[args[0]] /= ijs.exec(args[1], state)
    },
    "%=": function (args, state) {
        state[args[0]] %= ijs.exec(args[1], state)
    },
    "<<=": function (args, state) {
        state[args[0]] <<= ijs.exec(args[1], state)
    },
    ">>=": function (args, state) {
        state[args[0]] >>= ijs.exec(args[1], state)
    },
    ">>>=": function (args, state) {
        state[args[0]] >>>= ijs.exec(args[1], state)
    },
    "&=": function (args, state) {
        state[args[0]] &= ijs.exec(args[1], state)
    },
    "^=": function (args, state) {
        state[args[0]] ^= ijs.exec(args[1], state)
    },
    "|=": function (args, state) {
        state[args[0]] |= ijs.exec(args[1], state)
    },
    "&&=": function (args, state) {
        state[args[0]] &&= ijs.exec(args[1], state)
    },
    "||=": function (args, state) {
        state[args[0]] ||= ijs.exec(args[1], state)
    },
    "??=": function (args, state) {
        state[args[0]] ??= ijs.exec(args[1], state)
    },
    "??": function (args, state) {
        return ijs.exec(args[0], state) ??= ijs.exec(args[1], state)
    },
    "||": function (args, state) {
        return ijs.exec(args[0], state) || ijs.exec(args[1], state)
    },
    "&&": function (args, state) {
        return ijs.exec(args[0], state) && ijs.exec(args[1], state)
    },
    "|": function (args, state) {
        return ijs.exec(args[0], state) | ijs.exec(args[1], state)
    },
    "^": function (args, state) {
        return ijs.exec(args[0], state) ^ ijs.exec(args[1], state)
    },
    "&": function (args, state) {
        return ijs.exec(args[0], state) & ijs.exec(args[1], state)
    },
    "!==": function (args, state) {
        return ijs.exec(args[0], state) !== ijs.exec(args[1], state)
    },
    "===": function (args, state) {
        return ijs.exec(args[0], state) === ijs.exec(args[1], state)
    },
    "!=": function (args, state) {
        return ijs.exec(args[0], state) != ijs.exec(args[1], state)
    },
    "==": function (args, state) {
        return ijs.exec(args[0], state) == ijs.exec(args[1], state)
    },
    "instanceof": function (args, state) {
        return ijs.exec(args[0], state) instanceof ijs.exec(args[1], state)
    },
    "in": function (args, state) {
        return ijs.exec(args[0], state) in ijs.exec(args[1], state)
    },
    ">=": function (args, state) {
        return ijs.exec(args[0], state) >= ijs.exec(args[1], state)
    },
    ">": function (args, state) {
        return ijs.exec(args[0], state) > ijs.exec(args[1], state)
    },
    "<=": function (args, state) {
        return ijs.exec(args[0], state) <= ijs.exec(args[1], state)
    },
    "<": function (args, state) {
        return ijs.exec(args[0], state) < ijs.exec(args[1], state)
    },
    ">>>": function (args, state) {
        return ijs.exec(args[0], state) >>> ijs.exec(args[1], state)
    },
    ">>": function (args, state) {
        return ijs.exec(args[0], state) >> ijs.exec(args[1], state)
    },
    "<<": function (args, state) {
        return ijs.exec(args[0], state) << ijs.exec(args[1], state)
    },
    "+": function (args, state) {
        return ijs.exec(args[0], state) + ijs.exec(args[1], state)
    },
    "-": function (args, state) {
        return ijs.exec(args[0], state) - ijs.exec(args[1], state)
    },
    "*": function (args, state) {
        return ijs.exec(args[0], state) * ijs.exec(args[1], state)
    },
    "/": function (args, state) {
        return ijs.exec(args[0], state) / ijs.exec(args[1], state)
    },
    "%": function (args, state) {
        return ijs.exec(args[0], state) % ijs.exec(args[1], state)
    },
    "**": function (args, state) {
        return ijs.exec(args[0], state) ** ijs.exec(args[1], state)
    },
    ".": function (args, state) {
        var o = ijs.exec(args[0], state)
        var ret = o[args[1]]
        if (typeof ret == "function") {
            return ret.bind(o)
        }
        return ret
    },
    "<computedMemberAccess>": function (args, state) {
        var o = ijs.exec(args[0], state)
        var ret = o[ijs.exec(args[1], state)]
        if (typeof ret == "function") {
            return ret.bind(o)
        }
        return ret
    },
    ".?": function (args, state) {
        var first = ijs.exec(args[0], state)
        if (first == null || typeof first == "undefined") {
            return void 0
        }
        return first[args[1]]
    },
    "!_unary_pre": function (args, state) {
        return !ijs.exec(args[0], state)
    },
    "~_unary_pre": function (args, state) {
        return ~ijs.exec(args[0], state)
    },
    "+_unary_pre": function (args, state) {
        return +ijs.exec(args[0], state)
    },
    "-_unary_pre": function (args, state) {
        return -ijs.exec(args[0], state)
    },
    "++_unary_pre": function (args, state) {
        return ++ijs.exec(args[0], state)
    },
    "--_unary_pre": function (args, state) {
        return --ijs.exec(args[0], state)
    },
    "typeof_unary_pre": function (args, state) {
        return typeof ijs.exec(args[0], state)
    },
    "void_unary_pre": function (args, state) {
        return void ijs.exec(args[0], state)
    },
    "delete_unary_pre": function (args, state) {
        // TODO: finish this.
        // delete foo.bar
        // delete foo["bar"]
        // var arg = args[0]
        // // assuming (. x y)
        // var o = ijs.exec(arg[1], state)
        // delete(o, )
        // return delete ijs.exec(args[0], state)
    },
    "await_unary_pre": async function (args, state) {
        return await ijs.exec(args[0], state)
    },
    "new_unary_pre": function (args, state) {
        var theClass = ijs.exec(args[0], state)
        var obj = Object.create(theClass.prototype);
        theClass.apply(obj, args.slice(1));
        return obj
    },
    "++_unary_post": function (args, state) {
        return ++ijs.exec(args[0], state)
    },
    "--_unary_post": function (args, state) {
        return ++ijs.exec(args[0], state)
    },
    "<array>_unary_pre": function(args, state) {
        var computed = args[0].map(function(t) {
            return ijs.exec(t, state)
        })
        return computed
    },
    "<object>_unary_pre": function(args, state) {
        var o = {}
        args = args[0]
        log2(args)
        for (var i=0; i<args.length-1; i+=2) {
            log2(args[i])
            if (args[i].charAt(0) == "#") {
                args[i] = args[i].slice(1)
            }
            o[args[i]] = ijs.exec(args[i+1], state)
        }
        return o
    },
    "<callFunc>": function(args, state) {
        // (foo bar baz)
        // is the same as
        // (<callfunc> bar baz)
        // alternate
        if (args[0] in ijs.builtins) {
            try {
                func = ijs.builtins[args[1]]
                var ret = func(args[2], state)
                return ret
            } catch (e) {
                log2("-builtin error: " + e)
            }
        }
        var func = ijs.exec(args[0], state)
        var computedArgs = args[1].map(function(t) {
            return ijs.exec(t, state)
        })
        try {
            var ret = func.apply(null, computedArgs)
            return ret
        } catch (e) {
            log2("-apply error: " + e)
            log2(args)
        }
    }
}
ijs.exec = function(tokens, state) {
    if (typeof tokens == "number") {
        return tokens
    }
    if (typeof tokens == "boolean") {
        return tokens
    }
    if (tokens.length == 0) {
        return void 0;
    }
    state = state || {}
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

        if (token in state) {
            return state[token]
        }

        if (token in window) {
            return window[token]
        }

        // or throw?
        return undefined
    }
    
    if (tokens[0] in ijs.builtins) {
        func = ijs.builtins[tokens[0]]
        var ret = func(tokens.slice(1), state)
        // log2("return value from "+tokens[0]+" is: " + ret)
        // log2("2 returning " + ret)
        return ret
    }
    func = ijs.exec(tokens[0], state)
    // log2("+getting: " + tokens[0])
    // log2("+from: ")
    // log2(tokens)
    // log2("+applying: ")
    return func.apply(null, tokens.slice(1).map(function(t) {
        return ijs.exec(t, state)
    }))
    
}

window.testObj = {
    name: "Drew2"
}
var code = String.raw`

// !foo.bar
// a + b * !c

// !foo.bar
// !foo+bar
// !a b c * f.d

// 5 - -3 + 4 * 6
5 - -3



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

ijs.run(code)

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
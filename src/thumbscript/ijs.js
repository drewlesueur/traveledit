

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

ijs.tokenize = function(code) {
    var backslash = "\\"
    code = code + "\n"
    var i = 0
    var state = "out"
    var currentToken = ""
    var tokens = []
    var checkNumber = function(x) {
        if (x - 0 == x) {
            return x - 0
        }
        return x
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
                if (i != 0 && "([{".indexOf(chr) != -1 && " \t\n".indexOf(code.charAt(i-1)) == -1 ) {
                    tokens.push("<touching>")
                }
                tokens.push(chr)
            } else if ("[]{}".indexOf(chr) != -1) {
                tokens.push(chr)
            } else if ('"'.indexOf(chr) != -1) {
                state = "quote"
                currentToken = chr
            } else if (isVar(chr) || true) {
                state = "in"
                currentToken = chr
            } else {
                state = "in_symbol"
                currentToken = chr
            }
        } else if (state == "in") {
            if (" \t\n".indexOf(chr) != -1) {
                tokens.push(checkNumber(currentToken))
                currentToken = ""
                state = "out"
            } else if ("()".indexOf(chr) != -1) {
                if (currentToken) {
                    tokens.push(checkNumber(currentToken))
                    currentToken = ""
                }
                if (i != 0 && "([{".indexOf(chr) != -1 && " \t\n".indexOf(code.charAt(i-1)) == -1 ) {
                    tokens.push("<touching>")
                }
                tokens.push(chr)
                state = "out"
            } else if ("[]{}".indexOf(chr) != -1) {
                if (currentToken) {
                    tokens.push(checkNumber(currentToken))
                    currentToken = ""
                }
                tokens.push(chr)
                state = "out"
            } else if (isVar(chr) || true) {
                currentToken += chr
            } else {
                tokens.push(currentToken)
                currentToken = chr
                state = "in_symbol"
            }
        } else if (state == "in_symbol") {
            if (" \t\n".indexOf(chr) != -1) {
                tokens.push(checkNumber(currentToken))
                currentToken = ""
                state = "out"
            } else if ("()".indexOf(chr) != -1) {
                if (currentToken) {
                    tokens.push(checkNumber(currentToken))
                    currentToken = ""
                }
                if (i != 0 && "([{".indexOf(chr) != -1 && " \t\n".indexOf(code.charAt(i-1)) == -1 ) {
                    tokens.push("<touching>")
                }
                tokens.push(chr)
                state = "out"
            } else if ("[]{}".indexOf(chr) != -1) {
                if (currentToken) {
                    tokens.push(checkNumber(currentToken))
                    currentToken = ""
                }
                tokens.push(chr)
                state = "out"
            } else if (isVar(chr) || true) {
                tokens.push(currentToken)
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


    // log2(tokens)
    var newTokens = []
    var tokenStack = []
    // squish funcs
    for (var i=0; i<tokens.length; i++) {
        var token = tokens[i]
        if (token == "(") {
            tokenStack.push(newTokens)
            var prevToken = newTokens.pop()
            if (prevToken == "<touching>") {
                var prevPrevToken = newTokens.pop()
                newTokens = [prevPrevToken]
            } else {
                newTokens.push(prevToken)
                newTokens = []
            }
            // newTokens = [prevToken]
            
            // tokenStack.push(newTokens)
            // newTokens = []
        } else if (token == "{") {
            tokenStack.push(newTokens)
            newTokens = []
        } else if (token == "[") {
            tokenStack.push(newTokens)
            newTokens = []
        } else if (")]}".indexOf(token) != -1) {
            var list = newTokens
            newTokens = tokenStack.pop()
            newTokens.push(ijs.operatorate(list))
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


ijs.operatorate = function(tokens) {
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
    
    // return ijs.infixate(newTokens)
    return newTokens
}

ijs.infixes = {
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
     ".": {
         "associatitivity": 0,
         "precedence": 17,
     },
     "": {
         "associatitivity": 0,
         "precedence": 17,
     },
}
ijs.infixate = function(tokens) {
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
    var lastPrecedence = -1
    var lastAssociativity = -
    var currPrecedence = -1
    var lastGroup = null
    while (token = tokens.shift()) {
        if (token in ijs.infixes) {
            currPrecedence = ijs.infixes[token].precedence
            // log2(JSON.stringify([token, currPrecedence, lastPrecedence]))
            if (lastPrecedence == -1) {
                lastGroup = [token, newTokens.pop(), tokens.shift()]
                tokens.push(lastGroup)
            } else if (currPrecedence < lastPrecedence) {
                // log2("-here")
                var lastOp = lastGroup[0]
                var lastLeft = lastGroup[1]
                var lastRight = lastGroup[2]
                lastGroup[0] = token
                lastGroup[1] = [lastOp, lastLeft, lastRight]
                lastGroup[2] = tokens.shift()
                lastGroup = lastGroup
            } else if (currPrecedence > lastPrecedence) {
                var lastOp = lastGroup[0]
                var lastLeft = lastGroup[1]
                var lastRight = lastGroup[2]
                var newGroup = [token, lastRight, tokens.shift()]
                lastGroup[2] = newGroup
                lastGroup = newGroup
            }
            lastPrecedence = currPrecedence
        } else {
            // log2(JSON.stringify([token, -1, lastPrecedence]))
            lastPrecedence = -1
            newTokens.push(token)
        }
    }
    return newTokens
    
}


// var tokens = "4 ** 3 * 2 + 1".split(" ")
// log2(ijs.infixate(tokens))
var tokens = "1 + 2 * 3 ** 4".split(" ")
log2(ijs.infixate(tokens))


ijs.run = function(code) {
    var tokens = ijs.tokenize(code)
    // log2(tokens)
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
        log2("+calling func: " + name + " with: " + JSON.stringify(args))
        for (var i=0; i<args.length; i++) {
            var arg = args[i]
            state[params[i]] = args[i]
        }
        // log2("+set the state to")
        // log2(state)
        var ret = ijs.exec(body, state)
        log2("+done func: " + name)
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
    "set": function(args, state) {
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
    "new": function(args, state) {
        var theClass = ijs.exec(args[i], state)
        var obj = Object.create(theClass.prototype);
        theClass.apply(obj, args.slice(1));
        return obj
    },
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
    "func": function(args, state) {
        // log2("+func: " + JSON.stringify(args))
        var funcName = args[0][0]
        log("+ making func with: ")
        log([args[0].slice(1), args[1]])
        var f = ijs.makeFunc([args[0].slice(1), args[1]], state, funcName)

        if (funcName) {
            state[args[0][0]] = f
        }
        return f
    },
}
ijs.exec = function(tokens, state) {
    if (typeof tokens == "number") {
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

var code = String.raw`

var name "Drew"
log2(name)
// 
// JSON.stringify
// set json[foo] 
var name "drew \" lesueur"
var name2 "Hi"
var person obj(name "Drew" age 38)
// return(name2)
var name3 prop("yay" "toUpperCase")()
var name4 "hello dave"

func doThing(a) {
    // return(a)
    // alert("doThing called")
    // a.toUpperCase()
    return prop(a "toUpperCase")()
}
// alert(-2)
var name5 doThing(name)

setTimeout(func yo() {
    log2("what?")
} 1000)

// func incerer(x) {
//     return func incr() {
//         set x (plus 1 x)
//         return x
//     }
// }



set foo (add 2 4)
log2(concat(" the addition is " foo))

return name5

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



*/
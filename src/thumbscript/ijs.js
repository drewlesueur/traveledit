
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
    while (i < code.length) {
        var chr = code.charAt(i)
        if (state == "out") {
            if (" \t\n".indexOf(chr) != -1) {
            } else if ("/".indexOf(chr) != -1) {
                state = "firstSlash"
            } else if ("()".indexOf(chr) != -1) {
                tokens.push(chr)
            } else if ('"'.indexOf(chr) != -1) {
                state = "quote"
                currentToken = chr
            } else {
                state = "in"
                currentToken = chr
            }
        } else if (state == "in") {
            if (" \t\n".indexOf(chr) != -1) {
                tokens.push(currentToken)
                currentToken = ""
                state = "out"
            } else if ("()".indexOf(chr) != -1) {
                if (currentToken) {
                    tokens.push(currentToken)
                    currentToken = ""
                }
                tokens.push(chr)
                state = "out"
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

    // log2(tokens)
    var newTokens = []
    var tokenStack = []
    // squish funcs
    for (var i=0; i<tokens.length; i++) {
        var token = tokens[i]
        if (token == "(") {
            var prevToken = newTokens.pop()
            tokenStack.push(newTokens)
            newTokens = [prevToken]
        } else if (token == ")") {
            var list = newTokens
            newTokens = tokenStack.pop()
            newTokens.push(list)
        } else {
            newTokens.push(token)
        }
    }
    // return tokenStack
    return newTokens
}

ijs.run = function(code) {
    var tokens = ijs.tokenize(code)
    tokens.unshift("run")
    // log2(tokens)
    
    // return
    var state = {}
    var f = ijs.makeFunc([[], tokens], state)
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

ijs.makeFunc = function(funcDefArgs, state) {
    var params = funcDefArgs[0]
    var body = funcDefArgs[1]
    var f = function(...args) {
        for (var i=0; i<args.length; i++) {
            var arg = args[i]
            state[params[i]] = args[i]
        }
        return ijs.exec(body, state)
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
                    return ijs.exec(arg[1], state)
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
    // "call":
    //     // do auto binding?
    //     var func = ijs.exec(args[0], state)
    //     var lookedUpArgs = args.slice(1).map(function(arg) {
    //         return ijs.exec(arg, state)
    //     })
    //     return func.apply(null, args)
    //     break
    // },
    "access": function(args, state) {
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
        var funcName = ""
        var funcDefArgs = args
        if (args.length == 3) {
            funcName = args[0]
            funcDefArgs = args.slice(1)
        }
        var f = ijs.makeFunc(funcDefArgs, state)

        if (funcName) {
            state[args[0]] = f
        }
    },
}
ijs.exec = function(tokens, state) {
    if (tokens.length == 0) {
        return void 0;
    }
    state = state || {}
    // simplify lexical rules?
    // anuthing in a function shares state.
    // no nested var.

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
        return ret
    }
    func = ijs.exec(tokens[0])
    return func.apply(null, tokens.slice(1).map(function(t) {
        return ijs.exec(t, state)
    }))
    
}

var code = String.raw`



var(name "drew \" lesueur")
var(name2 "Hi")
var(person obj(name "Drew" age 38))
return(name2)
var(name3 access("yay" "toUpperCase")())
var(name4 "hello dave")


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
var thumbscript4 = {}

// TODO: only parse stdlib once!
// then keep the state of it

// comments are busted when they aren't first thing
// headerLine: lines[0] CC " " // add extra space

// because of terms, you can get rid of storefunc and callstored

// func(a b): { } syntax, maybe. not

// a: 10 1 plus b: 30
// a = 10
// foo.bar < 300
// 10 1 plus :b 30 1 plus :c
// allow foo["bar"]: 20

/*
Maybe ok but inconsistent

    these work
        foo. "hi" "yo"
        "hi" .foo "yo"
        1 add1
     these don't
        foo.bar. "hi" "yo"
        "hi" .foo.bar "yo"
        1 funcs.add1
*/


// idea for perf. after desugaring, you can remove the parens

var globalVar
if (typeof global != "undefined") {
    globalVar = global
} else {
    globalVar = window
}

if (typeof log2 == "undefined"){
    globalVar.log2 = function (...x) {
        console.log(...x)
    }
}
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
const boolType = 12;
const nullType = 13;
const propAccessType = 14;

function j(x) {
    return JSON.stringify(x, null, "    ")
}

thumbscript4.isNumeric = function (x) {
    if (x === "") {
        return false
    }
    return x.replaceAll("_", "") - 0 == x
}


thumbscript4.dots = ".•-"
// thumbscript2 parser was cool with optional significant indenting
thumbscript4.tokenize = function(code, debug) {
    var leftAssignSugar = true // count: count 1 plus
    var funcFirstWithDotSugar = true // say. "hello world" or .say "hi"
    var funcFirstWithUpper = false // Say "hello world" or .say "hi"
    var allUpperSugar = false // 1 PLUS 2
    // var funcFirstSugar = true // say "hello world"
    var funcFirstSugar = false // say "hello world"
    var parensCallSugar = true // str slice(2 3)
    // var propAccessSugar = false // foo[bar]
    var propAccessSugar = true // foo[bar]

    var freshLine = true
    var currentTokenOnFreshLine = true
    var state = "out"
    var currentToken = ""
    var tokens = []
    var string2OpenCount = 0
    var quoteNext = false
    var preventWrapper = false // 🥑 green marker
    var addClosingParensStack = []
    var addClosingParensOnNewLine = 0
    
    var addClosingParensOnEndTermStack = []
    var addClosingParensOnEndTerm = false
    
    
    code += "\n" // to simplify last token
    var addToken = function(token) {
        // because of the wrapper parens around terms, this doesn't apply anymore
        // see #makeItAString
        // if (token == "=" || token == "<") {
        //     let prevToken = tokens[tokens.length - 1]
        //     if (prevToken.th_type == varType && ")]}".indexOf(prevToken.valueString) == -1) {
        //         prevToken.th_type = stringType
        //     }
        // }
        if (quoteNext) {
            if ("([{".indexOf(token) == -1 && token.charAt(0) != "@") {
                token = "@" + token
            }
            quoteNext = false
        }
        // if (!token) {
        //     log2(tokens)
        //     return
        // }
        
        // see also thumbscript4.isNumeric
        var sinUnderscores = token.replaceAll("_", "")
        if (sinUnderscores - 0 == sinUnderscores) {
            addToken2(sinUnderscores-0)
            return
        }
        if (token == "true") {
            addToken2(true)
            return
        }
        if (token == "false") {
            addToken2(false)
            return
        }
        if (token == "null") {
            addToken2(null)
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
                // addToken2("@" + token.slice(0, -2))
                // addToken2("setplus1")
                // return

                // attempt to go faster, but doesn't seem to help.
                var a = token.slice(0, -2)
                var f = function(world) {
                    // var w = world.parent // even  this doesn't seem to help perf
                    var w = thumbscript4.getWorldForKey(world, a, false, true, false)
                    w.state[a] += 1
                    return world
                }
                f.theName = token
                addToken2(f)
                return
            } else if (token.endsWith("+=")) {
                // lime #color
                var a = token.slice(0, -2)
                var f = function(world) {
                    var w = thumbscript4.getWorldForKey(world, a, false, true)
                    w.state[a] += world.stack.pop()
                    return world
                }
                f.theName = token
                addToken2(f)
                return
                // end #color
            }
        }
        // if (typeof token == "string" && token.startsWith("#")) {
        //     addToken2("@" + token.slice(0, -1))
        //     addToken2("nameworld")
        //     return
        // }
        addToken2(token)
        if (currentTokenOnFreshLine) {
            tokens[tokens.length - 1].onFreshLine = true
            // alert(j(tokens[tokens.length - 1]))
            currentTokenOnFreshLine = false
        }
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
            if (token.charAt(0) == "@") {
                token = {th_type: stringType, valueString: token.slice(1)}
            } else if (token.charAt(0) == "#") {
                token = {th_type: anchorType, valueString: token.slice(1)}
            } else if (token in thumbscript4.builtIns) {
                token = {th_type: builtInType, valueFunc: thumbscript4.builtIns[token], name: token, preventCall: preventCall}
                
                // todo: don't need this?
                if (preventCall) {
                    token.nonPreventCallVersion = {th_type: builtInType, valueFunc: token.valueFunc, name: token.name}
                }
            } else {
                token = {th_type: varType, valueString: token, preventCall: preventCall}
                token.isFunc = Object.hasOwn(thumbscript4.knownFuncs, token.valueString)
            }
        } else if (typeof token == "number") {
            token = {th_type: numberType, valueNumber: token}
        } else if (typeof token == "function") {
            token = {th_type: builtInType, valueFunc: token, name: token.theName}
        } else if (typeof token == "boolean") {
            token = {th_type: boolType, valueBool: token, name: token + ""}
        } else if (token === null) {
            token = {th_type: nullType, name: "null"}
        } else {
            // log2("- unknowntoken type")
            // log2(token)
        }
        tokens.push(token)
    }
    for (var i=0; i < code.length; i++) {
        var chr = code.charAt(i)
        var nextChar = code.charAt(i+1)
        var prevChar = code.charAt(i-1)

        if (state == "out") {
            // log2("+yay state is out and char is " + JSON.stringify(chr))
            if ("()[]{}".indexOf(chr) != -1) {
                freshLine = false // orange marker
                let added = false
                // justsugar for empty object
                if (code.substr(i, 3) == "[:]") {
                    i+=3
                    addToken("newobj")
                } else {
                    if (leftAssignSugar) {
                        if ("([{".indexOf(chr) != -1) {
                            if (")]}".indexOf(prevChar) == -1) {
                                addToken("(") // 🥑 green marker
                            }
                            addClosingParensStack.push(addClosingParensOnNewLine)
                            addClosingParensOnNewLine = 0
                        } else if (")]}".indexOf(chr) != -1) {
                            // attempt!
                            // end any existing ones if we are done with group
                            if (addClosingParensOnNewLine) {
                                for (let i = 0; i < addClosingParensOnNewLine; i++) {
                                    addToken(")") // addedClosingParen pink marker
                                }
                                addClosingParensOnNewLine = 0
                            }

                            if ("([{.".indexOf(nextChar) == -1) {
                            // if ("([{".indexOf(nextChar) == -1) {
                                addToken(chr)
                                added = true
                                addToken(") closing term on brace") // 🥑 green marker
                            }

                            // This is needed
                            addClosingParensOnNewLine = addClosingParensStack.pop()
                            addClosingParensOnEndTerm = addClosingParensOnEndTermStack.pop()
                        }
                    }
                    if (!added) {
                        addToken(chr)
                    }

                    if (")]}".indexOf(prevChar) != -1) {
                        if (parensCallSugar && "(".indexOf(chr) != -1) {
                            let leftParen = tokens.pop()
                            // kinda hacky but fits with flow.
                            var storefunc = {th_type: builtInType, valueFunc: thumbscript4.builtIns["storefunc"], name: "storefunc", preventCall: false}
                            var callstored = {th_type: builtInType, valueFunc: thumbscript4.builtIns["callstored"], name: "callstored", preventCall: false}
                            var dotToken = {th_type: varType, valueString: "•", preventCall: false}
                            tokens.push(storefunc)
                            tokens.push(dotToken)
                            tokens.push(callstored)
                            tokens.push(leftParen)
                        } else if (propAccessSugar && "[".indexOf(chr) != -1) {
                            let leftSquareBracket = tokens.pop()
                            leftSquareBracket.propAccess = true
                            var dotToken = {th_type: varType, valueString: "•", preventCall: false}
                            var atToken = {th_type: builtInType, valueFunc: thumbscript4.builtIns["at"], name: "at", preventCall: false}
                            tokens.push(dotToken)
                            tokens.push(atToken)
                            tokens.push(leftSquareBracket)
                        }
                    }
                }
            } else if (".".indexOf(chr) != -1 && ")]}".indexOf(code.charAt(i-1)) != -1) {
            // } else if (".".indexOf(chr) != -1) {
                
                // this broken
                // yellow #color
                // let prev = tokens.pop()
                // addToken("(")
                // addClosingParensOnEndTerm = true
                // tokens.push(word)
                // end #color
                
                var dotToken = {th_type: varType, valueString: "•", preventCall: false}
                var atToken = {th_type: builtInType, valueFunc: thumbscript4.builtIns["at"], name: "at", preventCall: false}
                tokens.push(dotToken)
                tokens.push(atToken)
                quoteNext = true
                preventWrapper = true
            } else if (":".indexOf(chr) != -1) {
                freshLine = false // orange marker
                

                var nextChar = code.charAt(i+1)
                if (" \n\t".indexOf(nextChar) != -1) {
                    // x[foo]: 100
                    // addToken(") rih") // 🥑 green marker
                    // yellow #color
                    // if (addClosingParensOnEndTerm) {
                    //     addClosingParensOnEndTerm = false
                    //     addToken(")")
                    // }
                    // end #color
                    
                    addToken("<=")
                    freshLine = true // darkorange marker
                    // not checking fresh line
                    if (leftAssignSugar) {
                        addToken("(") // addLeftParen
                        addClosingParensOnNewLine++
                    }
                } else {
                     // 500 :baz
                    // TODO: this is copy-pasted
                    if (addClosingParensOnNewLine) {
                        for (let i = 0; i < addClosingParensOnNewLine; i++) {
                            addToken(")") // addedClosingParen pink marker
                        }
                        addClosingParensOnNewLine = 0
                    }
                    addToken("=>1")
                    quoteNext = true
                    
                    // added fresh crimson #color
                    // if (leftAssignSugar) {
                    //     addToken("(")
                    //     addClosingParensOnNewLine++
                    // }
                    // end #color
                }
                currentToken = ""
                state = "out"
            } else if ("=".indexOf(chr) != -1) {
                
                // compare with above block
                freshLine = false // orange marker
                if (addClosingParensOnNewLine) {
                    for (let i = 0; i < addClosingParensOnNewLine; i++) {
                        addToken(")") // addedClosingParen pink marker
                    }
                    addClosingParensOnNewLine = 0
                }
                addToken("=")
                quoteNext = true
                
                // added fresh crimson #color
                if (leftAssignSugar) {
                    addToken("(")
                    addClosingParensOnNewLine++
                }
                // end #color
                currentToken = ""
                state = "out"
            } else if ("<".indexOf(chr) != -1) {
                // compare with above block
                freshLine = false // orange marker
                if (addClosingParensOnNewLine) {
                    for (let i = 0; i < addClosingParensOnNewLine; i++) {
                        addToken(")") // addedClosingParen pink marker
                    }
                    addClosingParensOnNewLine = 0
                }
                addToken("<")
                quoteNext = true
                
                // added fresh crimson #color
                if (leftAssignSugar) {
                    addToken("(")
                    addClosingParensOnNewLine++
                }
                // end #color
                currentToken = ""
                state = "out"
            } else if (">".indexOf(chr) != -1) {
                // compare with above block
                freshLine = false // orange marker
                if (addClosingParensOnNewLine) {
                    for (let i = 0; i < addClosingParensOnNewLine; i++) {
                        addToken(")") // addedClosingParen pink marker
                    }
                    addClosingParensOnNewLine = 0
                }
                addToken(">")
                quoteNext = true
                
                // with extra parens, not needed
                // added fresh crimson #color
                // if (leftAssignSugar) {
                //     addToken("(")
                //     addClosingParensOnNewLine++
                // }
                // end #color
                currentToken = ""
                state = "out"
            } else if (" \n\t;".indexOf(chr) != -1) {
                
                var prevChar = code.charAt(i-1)
                
                // the symbol dance
                if (" \n\t:=<>{}[]()\"«»".indexOf(prevChar) == -1) { // pink marker
                    // addToken(")") // 🥑 green marker
                }
                // yellow #color
                // if (addClosingParensOnEndTerm) {
                //     addClosingParensOnEndTerm = false
                //     addToken(")")
                // }
                // end #color
                
                // TODO: this is copy-pasted
                if (leftAssignSugar && addClosingParensOnNewLine && "\n;".indexOf(chr) != -1) {
                    // TODO: I check for close too much
                    // also should not check leftAssignSugar just addClosingParensOnNewLine
                    for (let i = 0; i < addClosingParensOnNewLine; i++) {
                        addToken(")") // addedClosingParen pink marker
                    }
                    addClosingParensOnNewLine = 0
                }
                if (leftAssignSugar && "\n;".indexOf(chr) != -1) {
                    freshLine = true
                }
            } else if ("/".indexOf(chr) != -1) {
                freshLine = false // orange marker
                state = "slash" // for comments
            } else if ('"'.indexOf(chr) != -1) {
                freshLine = false // orange marker
                state = "string"
            } else if ("«".indexOf(chr) != -1) {
                freshLine = false // orange marker
                state = "string2"
                string2OpenCount = 1
            } else if (thumbscript4.dots.indexOf(chr) != -1) {
                freshLine = false // orange marker
                state = "dot"
                currentToken = chr
            } else {
                if (!preventWrapper) {
                    addToken("(") // 🥑 green marker
                } else {
                    preventWrapper = false
                }
                state = "in"
                currentToken = chr
                if (freshLine) {
                    freshLine = false
                    currentTokenOnFreshLine = true
                }
            }
        } else if (state == "in") {
            // log2("+yay state is in and char is " + JSON.stringify(chr))
            if ("()[]{}".indexOf(chr) != -1) {
                let added = false
                freshLine = false // orange marker
                addToken(currentToken)
                
                if (leftAssignSugar) {
                    if ("([{".indexOf(chr) != -1) {
                        // not adding wrapper here green marker
                        // this more relates to the parensCallSugar below?
                        addClosingParensStack.push(addClosingParensOnNewLine)
                        addClosingParensOnNewLine = 0
                    } else if (")]}".indexOf(chr) != -1) {
                        // close out the word token
                        addToken(") close word") // 🥑 green marker
                        
                        // attempt!
                        // end any existing ones if we are done with group
                        if (addClosingParensOnNewLine) {
                            for (let i = 0; i < addClosingParensOnNewLine; i++) {
                                addToken(")") // addedClosingParen pink marker
                            }
                            addClosingParensOnNewLine = 0
                        }
                        
                        if ("([{.".indexOf(nextChar) == -1) {
                            addToken(chr)
                            added = true
                            addToken(") closey posey") // 🥑 green marker
                        }
                        
                        // this is needed at least
                        addClosingParensOnNewLine = addClosingParensStack.pop()
                        addClosingParensOnEndTerm = addClosingParensOnEndTermStack.pop()
                    }
                }
                if (!added) {
                    addToken(chr)
                }
                currentToken = ""
                state = "out"
                if (parensCallSugar && "(".indexOf(chr) != -1) {
                    
                    // let leftParen = tokens.pop()
                    // let t = tokens.pop()
                    // // TODO: make constant
                    // var dotToken = {th_type: varType, valueString: "•", preventCall: false}
                    // tokens.push(dotToken)
                    // tokens.push(t)
                    // tokens.push(leftParen)

                    let leftParen = tokens.pop()
                    let t = tokens.pop()
                    t.preventCall = true


                    // yellow #color
                    // let word = tokens.pop()
                    // addToken("(")
                    // addClosingParensOnEndTerm = true
                    // addClosingParensOnEndTermStack.push(addClosingParensOnEndTerm)
                    // addClosingParensOnEndTerm = false
                    // tokens.push(word)
                    // end #color


                    tokens.push(t)
                    var storefunc = {th_type: builtInType, valueFunc: thumbscript4.builtIns["storefunc"], name: "storefunc", preventCall: false}
                    var callstored = {th_type: builtInType, valueFunc: thumbscript4.builtIns["callstored"], name: "callstored", preventCall: false}
                    var dotToken = {th_type: varType, valueString: "•", preventCall: false}
                    
                    tokens.push(storefunc)
                    tokens.push(dotToken)
                    tokens.push(callstored)
                    tokens.push(leftParen)


                } else if (propAccessSugar && "[".indexOf(chr) != -1) {
                    let leftSquareBracket = tokens.pop()
                    leftSquareBracket.propAccess = true


                    // yellow #color
                    // let word = tokens.pop()
                    // addToken("(")
                    // addClosingParensOnEndTerm = true
                    // addClosingParensOnEndTermStack.push(addClosingParensOnEndTerm)
                    // addClosingParensOnEndTerm = false
                    // tokens.push(word)
                    // end #color


                    // TODO:
                    var dotToken = {th_type: varType, valueString: "•", preventCall: false}
                    var atToken = {th_type: builtInType, valueFunc: thumbscript4.builtIns["at"], name: "at", preventCall: false}
                    tokens.push(dotToken)
                    tokens.push(atToken)
                    tokens.push(leftSquareBracket)
                }
            } else if (".".indexOf(chr) != -1 && !thumbscript4.isNumeric(currentToken) && "\n ".indexOf(nextChar) == -1) {
                
                // yellow #color
                // let word = tokens.pop()
                // addToken("(")
                // addClosingParensOnEndTerm = true
                // tokens.push(word)
                // end #color
                
                
                addToken(currentToken)
                currentToken = ""
                var dotToken = {th_type: varType, valueString: "•", preventCall: false}
                var atToken = {th_type: builtInType, valueFunc: thumbscript4.builtIns["at"], name: "at", preventCall: false}
                tokens.push(dotToken)
                tokens.push(atToken)
                quoteNext = true
                preventWrapper = true
                state = "out"
                
            } else if (":".indexOf(chr) != -1) {
                freshLine = false // orange marker
                var nextChar = code.charAt(i+1)
                if (true) {
                    // yellow #color
                    // if (addClosingParensOnEndTerm) {
                    //     addClosingParensOnEndTerm = false
                    //     addToken(")")
                    // }
                    // end #color
                    
                    // close out
                    // a: [b: 1 2 plus c: 40 3 minus]
                    // weirdly this may not be needed but it's more understandable
                    
                    // funkiness requiring colon only for single vars if multiple on oew line
                    // example
                    // this is ok
                    //     say. "hi" b: 10
                    // This is not
                    //     say. "hi" a.b: 10
                    
                    let t = tokens.pop() // will be a "("
                    
                    if (addClosingParensOnNewLine) {
                        for (let i = 0; i < addClosingParensOnNewLine; i++) {
                            addToken(")") // addedClosingParen pink marker
                        }
                        addClosingParensOnNewLine = 0
                    }
                    tokens.push(t) // funkiness

                    addToken("@" + currentToken)
                    addToken(")") // 🥑 green marker
                    addToken("1<=")
                    freshLine = true // darkorange marker
                    // if (leftAssignSugar && tokens[tokens.length - 2]?.onFreshLine) {
                    if (leftAssignSugar) {
                        addToken("(") // addLeftParen
                        addClosingParensOnNewLine++
                    }
                }
                currentToken = ""
                state = "out"
            } else if (" \n\t;".indexOf(chr) != -1) {
                let addedToken = currentToken
                var oldQuoteNext = quoteNext // basically if a "." is before
                addToken(currentToken)
                currentToken = ""
                state = "out"
                addToken(")") // 🥑 green marker
                if (addedToken == "stopparsing") {
                    break
                }

                // yellow #color
                // if (addCl
                //     addClosingParensOnEndTerm = false
                //     addToken(")")
                // }
                // end #color

                // TODO: check the types?
                if (funcFirstSugar && " ".indexOf(chr) != -1 && tokens[tokens.length-1]?.onFreshLine && (tokens[tokens.length-1]?.th_type == builtInType || tokens[tokens.length-1]?.isFunc)) { // red marker
                    addToken("<>")
                    addToken("(")
                    addClosingParensOnNewLine++
                } else if (funcFirstSugar && addClosingParensOnNewLine && "\n;".indexOf(chr) != -1) {
                    for (let i = 0; i < addClosingParensOnNewLine; i++) {
                        addToken(")") // addedClosingParen pink marker
                    }
                    addClosingParensOnNewLine = 0
                }


                if (funcFirstWithDotSugar && " \n".indexOf(chr) != -1 && (addedToken[addedToken.length-1] == ".")) { // red marker
                    let tokenName
                    if (addedToken.endsWith(".")) {
                        tokenName = addedToken.slice(0, -1)
                    }
                    tokens.pop() // 🥑 green marker
                    tokens.pop()
                    tokens.pop() // 🥑 green marker

                    // for if else chain?
                    // if (addClosingParensOnNewLine) {
                    //     // close out the previous one if you start a new one
                    //     addToken(")") // addedClosingParen pink marker
                    //     addClosingParensOnNewLine = false
                    // }

                    // #orangered unfinished experiment
                    if (tokenName == "elif") {
                        addToken("beforeelse")
                    }

                    addToken(tokenName)
                    addToken("<>")
                    addToken("(")
                    addClosingParensOnNewLine++
                } else if (
                    allUpperSugar &&
                    " \n".indexOf(chr) != -1 &&
                    (addedToken.toUpperCase() == addedToken && addedToken.toLowerCase() != addedToken) &&
                    !oldQuoteNext
                ) { // red marker
                    let tokenName
                    tokenName = addedToken.toLowerCase()
                    tokens.pop() // 🥑 green marker
                    tokens.pop()
                    tokens.pop() // 🥑 green marker
                    addToken("•")
                    addToken(tokenName)
                } else if (
                    // this breaks on foo.Bar = 2
                    funcFirstWithUpper && 
                    " \n".indexOf(chr) != -1 &&
                    (addedToken[0].toUpperCase() == addedToken[0] && addedToken[0].toLowerCase() != addedToken[0]) &&
                    !oldQuoteNext
                ) { // red marker
                    // log2(tokens)
                    // log2(`the token is ${addedToken} and quoteNext is ${quoteNext} oldQuoteNext is ${oldQuoteNext} #cyan`)
                    let tokenName
                    tokenName = addedToken[0].toLowerCase() + addedToken.substr(1)
                    // log2(`token name went from ${addedToken} to ${tokenName}`)
                    tokens.pop() // 🥑 green marker
                    tokens.pop()
                    tokens.pop() // 🥑 green marker


                    addToken(tokenName)
                    addToken("<>")
                    addToken("(")
                    addClosingParensOnNewLine++
                } else if (funcFirstWithDotSugar && addClosingParensOnNewLine && "\n;".indexOf(chr) != -1) {
                    for (let i = 0; i < addClosingParensOnNewLine; i++) {
                        addToken(")") // addedClosingParen pink marker
                    }
                    addClosingParensOnNewLine = 0
                }

                if (leftAssignSugar && addClosingParensOnNewLine && "\n;".indexOf(chr) != -1) {
                    for (let i = 0; i < addClosingParensOnNewLine; i++) {
                        addToken(")") // addedClosingParen pink marker
                    }
                    addClosingParensOnNewLine = 0
                }
                if (leftAssignSugar && "\n;".indexOf(chr) != -1) {
                    freshLine = true
                }
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
                for (let s=0; s<1; s++) {
                    // if (false && tokens.length >= 3) {
                    if (tokens.length >= 3) {
                        var prevToken = tokens.pop() // 🥑
                        var prevToken1 = tokens.pop()
                        var prevToken2 = tokens.pop() // 🥑
                        // 3 tokens because of automatic parens insertion: ( raw )

                        if (prevToken1.th_type == varType && prevToken1.valueString == "raw") {
                            addToken("@" + currentToken)
                            break
                        } else if (prevToken1.th_type == varType && prevToken1.valueString == "indented") {
                            currentToken = thumbscript4.dedent(currentToken)
                        } else if (prevToken1.th_type == varType && prevToken1.valueString == "rawindented") {
                            addToken("@" + thumbscript4.dedent(currentToken))
                            break
                        } else {
                            tokens.push(prevToken2)
                            tokens.push(prevToken1)
                            tokens.push(prevToken)
                        }
                    }
                    if (currentToken.indexOf("$") != -1) {
                        tokens.push({th_type: interpolateType, valueString: currentToken})
                    } else {
                        addToken("@" + currentToken)
                    }
                }
                // var prevToken = tokens.pop()
                // if (prevToken?.th_type == varType && prevToken.valueString == "raw") {
                //     addToken("@" + currentToken)
                // } else {
                //     if (prevToken) {
                //         tokens.push(prevToken)
                //     }
                //     if (currentToken.indexOf("@") != -1) {
                //         tokens.push({th_type: interpolateType, valueString: currentToken})
                //     } else {
                //         addToken("@" + currentToken)
                //     }
                // }
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

                    for (let s=0; s<1; s++) {
                        // if (false && tokens.length >= 3) {
                        if (tokens.length >= 3) {
                            var prevToken = tokens.pop() // 🥑
                            var prevToken1 = tokens.pop()
                            var prevToken2 = tokens.pop() // 🥑
                            // 3 tokens because of automatic parens insertion: ( raw )

                            if (prevToken1.th_type == varType && prevToken1.valueString == "raw") {
                                addToken("@" + currentToken)
                                break
                            } else if (prevToken1.th_type == varType && prevToken1.valueString == "indented") {
                                currentToken = thumbscript4.dedent(currentToken)
                            } else if (prevToken1.th_type == varType && prevToken1.valueString == "rawindented") {
                                addToken("@" + thumbscript4.dedent(currentToken))
                                break
                            } else {
                                tokens.push(prevToken2)
                                tokens.push(prevToken1)
                                tokens.push(prevToken)
                            }
                        }
                        if (currentToken.indexOf("$") != -1) {
                            tokens.push({th_type: interpolateType, valueString: currentToken})
                        } else {
                            addToken("@" + currentToken)
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
            if (thumbscript4.dots.indexOf(chr) != -1) {
                currentToken += chr
            } else {
                if (thumbscript4.isNumeric(chr)) {
                    // -4 etc
                    // this little conditiion started when we allowed minus sign as skip prefix (.•-)
                    addToken("(") // 🥑
                    currentToken += chr
                    state = "in"
                } else {
                    i--
                    addToken(currentToken)
                    currentToken = ""
                    state = "out"
                }
            }
        } else if (state == "comment") {
            if ("\n".indexOf(chr) != -1) {
                freshLine = true // darkorange marker
                state = "out"
            }
        }
    }
    // showLog()
    if (debug) {
        log2("+first pass tokens")
        log2(tokens) // red marker
    }
    tokens = thumbscript4.squishFuncs(tokens)
    if (debug) {
        log2("+squished funcs")
        log2(tokens) // red marker
    }
    tokens = thumbscript4.desugar(tokens, debug)
    if (debug) {
        log2("+desugared")
        log2(tokens) // red marker
    }
    return tokens
}
thumbscript4.dedent = function(str) {
    var lines = str.split("\n")
    lines = lines.slice(1,-1)
    var minIndent = Infinity
    for (let line of lines) {
        let indent = thumbscript4.getIndent(line).length
        if (indent < minIndent) {
            minIndent = indent
        }
    }
    for (let i=0; i<lines.length; i++) {
        lines[i] = lines[i].slice(minIndent)
    }
    
    return lines.join("\n")
}
thumbscript4.getIndent = function (line) {
    var theIndent = ""
    for (var i=0; i<line.length; i++) {
        var theChar = line.charAt(i)
        if (theChar == " " || theChar == "\t") {
            theIndent += theChar
        } else {
            return theIndent
        }
    }
    return theIndent
}


thumbscript4.desugar = function(tokens, debug) {
    tokens = thumbscript4.desugarDot(tokens)
    // if (debug) {
    //     log2("+desugared (before parens)")
    //     log2(tokens)
    // }
    
    // Do it after first desugarDot asomwe can check the at sign
    tokens = thumbscript4.desugarArrows(tokens) // white marker
    if (debug) {
        log2("+desugared (arrows)")
        log2(tokens)
    }
    
    
    tokens = thumbscript4.desugarDot(tokens)
    // if (debug) {
    //     log2("+desugared (before parens)")
    //     log2(tokens)
    // }
    
    tokens = thumbscript4.desugarParens(tokens) // white marker
    // log2(tokens)
    tokens = thumbscript4.someIfMagic(tokens)
    // log2(tokens.anchors)
    return tokens
}

thumbscript4.desugarParens = function(tokens) {
    // because parens don't matter at runtime
    // they are only used to group things for sugar reasons
    // return tokens
    var newTokens = []
    for (let t of tokens) {
        if (t.th_type == parenType) {
            if (!t.valueArr) {
                continue
                log2("what??!!")
                log2(t)
            }
            // is this recursion needed?
            // I added it for "(parens) but like prop access"
            let arr = thumbscript4.desugarParens(t.valueArr)
            // for (let t2 of t.valueArr) {
            for (let t2 of arr) {
                newTokens.push(t2)
            }
        } else {
            newTokens.push(t)
        }
    }
    return newTokens
}
thumbscript4.removeExtraParens = function(token) {
    // log2("+incoming =====================")
    // log2(token)
    while (true) {
        // if (!token) {
        //     return token
        // }
        if (token.th_type != parenType) {
            // log2(token)
            return token
        }

        if (token.valueArr.length != 1) {
            // log2(token)
            return token
        }
        token = token.valueArr[0]
    }
}
thumbscript4.someIfMagic = function(tokens) {
    // when if is false, we need to jump to end of the chain
    // makes syntax a little cleaner
    // can accomplish same thing with wrapper func or array (cases) but not as pretty
    var i = 0
    var currentIfs = []
    
    
    // #orangered unfinished experiment
    var currentIfso = null
    var ifsoStack = []
    var final = []
    
    
    while (i < tokens.length) {
        var token = tokens[i]
        if (token.th_type == builtInType) {
            if (token.name == "?" || token.name == "if" || token.name == "?!" || token.name == "ifnot") {
                // hmm if I used a linked list for tokens,
                // then it moght be easier to point to thr end node, instead of end index
                // that might make inlining easier.
                token.endOfIfChainI = -1
                currentIfs = []
                currentIfs.push(token)
            } else if (token.name == "??" || token.name == "elseif" || token.name == "??!" || token.name == "elseifnot") {
                token.endOfIfChainI = -1
                for (var j=0; j < currentIfs.length; j++) {
                    currentIfs[j].endOfIfChainI = i
                }
                currentIfs.push(token)
            } else if (token.name == "?;" || token.name == "else") {
                for (var j=0; j < currentIfs.length; j++) {
                    currentIfs[j].endOfIfChainI = i
                }

            // #orangered unfinished experiment
            } else if (token.name == "ifso") {
                ifsoStack.push(currentIfso)
                currentIfso = {
                    ifso: token,
                    beforeelses: []
                }
                token.theSubEnd = -1
            } else if (token.name == "elif") {
                currentIfso.ifso = token
                token.theSubEnd = -1
            } else if (token.name == "beforeelse" || token.name == "otherwise") {
                currentIfso.ifso.theSubEnd = i
                currentIfso.beforeelses.push(token)
            } else if (token.name == "endif") {
                if (currentIfso.theSubEnd == -1) {
                    currentIfso.theSubEnd = 1
                }
                currentIfso = ifsoStack.pop()
                for (let beforeelse of currentIfso.beforeelses) {
                    beforeelse.theEnd = i
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

thumbscript4.handleDashPoints = function(tokens) {
    var i = 0
    while (i < tokens.length) {
        var token = tokens[i]
    }
    return tokens
}
thumbscript4.desugarArrows = function(tokens) {
    // return tokens
    var newTokens = []
    var i = 0

    var dotToken = {th_type: varType, valueString: "•", preventCall: false}
    var dot2Token = {th_type: varType, valueString: "••", preventCall: false}
    var setToken = {th_type: builtInType, valueFunc: thumbscript4.builtIns.set, name: "set"}
    var setlocalToken = {th_type: builtInType, valueFunc: thumbscript4.builtIns.setlocal, name: "setlocal"}
    var setbToken = {th_type: builtInType, valueFunc: thumbscript4.builtIns.setb, name: "setb"}
    var setblocalToken = {th_type: builtInType, valueFunc: thumbscript4.builtIns.setblocal, name: "setblocal"}
    
    
    var setPropToken = {th_type: builtInType, valueFunc: thumbscript4.builtIns.setprop, name: "setprop"}
    var setProp2Token = {th_type: builtInType, valueFunc: thumbscript4.builtIns.setprop2, name: "setprop2"}
    var setcToken = {th_type: builtInType, valueFunc: thumbscript4.builtIns.setc, name: "setc"}

    while (i < tokens.length) {
        var token = tokens[i]
        // this does it in such a way that you can chain the stuff with dots when going backwards
        if (token.th_type === varType) {
            // log2("yay: " + token.valueString)
            switch (token.valueString) {
                case "<>":
                    // if <> (stuff here)
                    // (stuff here) if
                    var lastToken = newTokens.pop()
                    newTokens.push(dotToken)
                    newTokens.push(lastToken)
                    break
                case ">":
                case "=>1":
                    // 100 => a
                    // 100 a set
                    // newTokens.push(dotToken)
                    // newTokens.push(setToken)
                    // break
                    let theTokenForSet = setlocalToken
                    if (token.valueString == ">") {
                        theTokenForSet = setToken
                    }
                    
                    // crimson #color
                    var dotTokenForRightAssign = {
                        th_type: varType,
                        valueString: "•",
                        onProcess: function (ts) {
                            // log2("+we added set and the token before is: ")
                            // log2(ts[ts.length - 1])
                            var path = ts[ts.length - 1]
                            if (!path.valueArr) {
                                ts.push(theTokenForSet)
                            } else if (path.valueArr.length > 1 && path.valueArr[path.valueArr.length - 1].name == "at") {
                                path.valueArr.pop()
                                // path.valueArr[path.valueArr.length - 1].th_type = stringType
                                ts.push({th_type: builtInType, valueFunc: thumbscript4.builtIns.setpropKOV, name: "setpropKOV"})
                            } else {
                                if (path.valueArr && path.valueArr[0]) {
                                    path.valueArr[0].th_type = stringType
                                    ts.push(theTokenForSet)
                                }
                            }
                        }
                    }
                    newTokens.push(dotTokenForRightAssign)
                    // end #color

                    break
                case "<":
                case "=":
                case "<=":
                    var tokenForSet = setbToken
                    if (token.valueString == "<=") {
                        tokenForSet = setblocalToken
                    }

                    // same as 1<= for now
                    var lastToken = newTokens[newTokens.length - 1]
                    lastToken = thumbscript4.removeExtraParens(lastToken)
                    if (false && lastToken && lastToken.name == "at") {
                        newTokens.pop()
                        newTokens.push(dotToken)
                        newTokens.push({th_type: builtInType, valueFunc: thumbscript4.builtIns.setpropVKO, name: "setpropVKO"})
                    } else {
                        if (lastToken && lastToken.name == "[obj]") {
                            lastToken.th_type = parenType
                            lastToken.name = "(parens) but like prop access"
                            newTokens.push(dotToken)
                            newTokens.push(tokenForSet)
                        } else if (lastToken && lastToken.th_type == parenType) {
                            // assuming this last one is "at"
                            lastToken.valueArr.pop()
                            newTokens.push(dotToken)
                            newTokens.push({th_type: builtInType, valueFunc: thumbscript4.builtIns.setpropVKO, name: "setpropVKO"})
                        } else {
                            // log2("+yay last token")
                            // log2(lastToken)
                            // #makeItAString
                            if (lastToken.th_type != stringType) {
                                lastToken.th_type = stringType
                            }
                            newTokens.push(dotToken)
                            newTokens.push(tokenForSet)
                        }
                    }
                    break
                case "1<=":
                    // a 1<= 100
                    // 100 a set

                    var lastToken = newTokens[newTokens.length - 1]
                    lastToken = thumbscript4.removeExtraParens(lastToken)
                    if (false && lastToken && lastToken.name == "at") {
                        newTokens.pop()
                        newTokens.push(dotToken)
                        newTokens.push({th_type: builtInType, valueFunc: thumbscript4.builtIns.setpropVKO, name: "setpropVKO"})
                    } else if (lastToken.th_type == parenType) {
                        // assuming this last one is "at"
                        lastToken.valueArr.pop()
                        newTokens.push(dotToken)
                        newTokens.push({th_type: builtInType, valueFunc: thumbscript4.builtIns.setpropVKO, name: "setpropVKO"})
                    } else {
                        newTokens.push(dotToken)
                        newTokens.push(setblocalToken)
                    }
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
thumbscript4.desugarDot = function(tokens) {
    var newTokens = []
    var stack = []
    var state = null
    var i = 0

    var consume = function() {
        while (state) {
            // log2("before: " + token + " " + JSON.stringify(state) + ": " + JSON.stringify(stack))
            state.n--
            if (state.n == 0) {
                if (state.onProcess) {
                    state.onProcess(newTokens)
                } else {
                    newTokens.push(state.token)
                }
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
            if (!thumbscript4.isNumeric(token.valueString.replaceAll("-", ""))) {
                // case where -1 etc doesn't mean •1
                while (j < token.valueString.length && thumbscript4.dots.indexOf(token.valueString.charAt(j)) != -1) {
                    j++
                }
            }
            if (j == 0) {
                newTokens.push(token)
                // newTokens.push(token)
                consume()
            } else {
                stack.push(state)
                state = {
                    n: j,
                }
                if (token.onProcess) {
                    state.onProcess = token.onProcess
                } else {
                    state.token = tokens[++i]
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
        if (!token) {
            log2("-whaaaat token: " + j(tokens))
            log2([tokens.length, i])
            return []
        }
        if (token.th_type == varType && token.valueString?.[0] == "{") {
            tokenStack.push(newTokens)
            newTokens = []
        } else if (token.th_type == varType && token.valueString?.[0] == "[") {
            tokenStack.push(newTokens)
            newTokens = []
            if (token.propAccess) {
                newTokens.propAccess = true
            }
        } else if (token.th_type == varType && token.valueString?.[0] == "(") {
            tokenStack.push(newTokens)
            newTokens = []
        } else if (token.th_type == varType && token.valueString?.[0] == "}") {
            var r = newTokens
            newTokens = tokenStack.pop()
            newTokens.push({
                name: "{block}",
                th_type: curlyType,
                valueArr: thumbscript4.desugar(r),
            })
        } else if (token.th_type == varType && token.valueString?.[0] == "]") {
            var r = newTokens
            newTokens = tokenStack.pop()
            if (r.propAccess) {
                // newTokens.push({
                //     name: "[propAccess]",
                //     th_type: propAccessType,
                //     valueArr: thumbscript4.desugar(r),
                // })
                newTokens.push({
                    name: "(parens)",
                    th_type: parenType,
                    valueArr: thumbscript4.desugar(r),
                })
            } else {
                newTokens.push({
                    name: "[obj]",
                    th_type: squareType,
                    valueArr: thumbscript4.desugar(r),
                })
            }
        } else if (token.th_type == varType && token.valueString?.[0] == ")") {
            var r = newTokens
            newTokens = tokenStack.pop()

            newTokens.push({
                name: "(parens)",
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
// Todo pre-compile stdlib
thumbscript4.evalQuick = function(code, oldWorld, state) {
    var tokens
    if (!oldWorld) {
        code = thumbscript4.stdlib + "\n" + code + "\n" // red marker
    }
    tokens = thumbscript4.tokenize(code)
    var world = {
        parent: oldWorld?.parent,
        state: oldWorld?.state || state || {},
        stack: oldWorld?.stack || [],
        tokens: tokens,
        i: 0,
        dynParent: null, // so it stops
        runId: ++thumbscript4.runId,
        indent: (oldWorld?.indent || 0) + 1,
        // cachedLookupWorld: {},
        global: oldWorld?.global,
        asyncTop: oldWorld?.asyncTop,
        onEnds: [],
        waitingWorlds: [],
    }
    if (!world.global) {
        world.global = world
    }
    if (!world.asyncTop) {
        world.asyncTop = world
    }
    while (true) {
        var newWorld = thumbscript4.next(world)
        if (!newWorld) {
            // return world.stack[world.stack.length - 1]
            let ret = world.stack.pop()
            return ret
        }
        world = newWorld
    }
}

setTimeout(function () {
    // alert(thumbscript4.evalQuick("plus 1 30"))
}, 0)

var PretendArray = function () {
    var ret = new Array(10000)
    ret._i = 0
    ret.push = function (x) {
        // log2("// pushing")
        ret[ret._i] = x
        ret._i++
        return ret._i
    }
    ret.pop = function () {
        // log2("// popping")
        var r = ret[ret._i-1]
        ret._i--
        return r
    }
    return ret
    // javascript initialize array of specified size
    // Sure, you can initialize an array of a specified size in JavaScript using the Array constructor. Here's how:
    // ```javascript
    // var arraySize = 5; // specify your array size
    // var myArray = new Array(arraySize).fill(null);
    // ```
    // In this example, `new Array(arraySize)` will initialize an array with 5 undefined elements. The `fill(null)` function will fill the array with `null` values.
    // If you want to fill with different values or initialize with values based on the index, you can use `Array.from`:
    // ```javascript
    // var myOtherArray = Array.from({length: arraySize}, (v, i) => i);
    // ```
    // This will create an array `[0, 1, 2, 3, 4]` as it uses the current index value (`i`) for each element.
}
thumbscript4.eval = function(code, state, stack, opts) {
    opts = opts || {}
    // alert("evaling")
    clearTimeout(globalVar.t99)
    // I tried to pass in the state of the stdlib
    // wasn't working, so just doing this hacky string concat.
    // would be nice to grab the state of the stdlib
    // problem might be some function scope?
    // look later
    // TODO: uncomment the stdlib addition!!!!
    code = thumbscript4.stdlib + "\n" + code // red marker
    // log2(code)

    var tokens = thumbscript4.tokenize(code)
    // log2(tokens)
    // return
    var world = {
        state: state || {},
        stack: stack || [],
        // stack: PretendArray(),
        tokens: tokens,
        i: 0,
        parent: null,
        indent: 0,
        runId: 0,
        name: "main",
        // cachedLookupWorld: {},
        log: [], // for concenience
        onEnds: [],
        waitingWorlds: [],
    }
    world.global = world
    world.asyncTop = world

    thumbscript4.run(world, opts)
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
            case boolType:
                return `${tk.valueBool}`
            case nullType:
                return `<null>`
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
thumbscript4.asyncChunk = 500_000
// thumbscript4.asyncChunk = 1_000_000_000

thumbscript4.run = function(world, opts) {
    opts = opts || {}
    if (world.global.stopped) {
        return
    }

    // for async
    for (let w = world; w != null; w = w.dynParent) {
        if (w.stopped) {
            return
        }
    }
    
    // can replace the dynParent check above?
    if (world.asyncTop.stopped) {
        return
    }

    // if (thumbscript4.async) {
    if (opts.async) {
        setTimeout(function () {
            thumbscript4.runAsync(world)
        }, 0)
        return
    }

    // var oldPreventRender = preventRender
    // preventRender = true
    while (true) {
        var newWorld = thumbscript4.next(world)
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

thumbscript4.runAsync = function(world, opts) {
    if (world.global.stopped) {
        return
    }
    // for async
    for (let w = world; w != null; w = w.dynParent) {
        if (w.stopped) {
            return
        }
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
        globalVar.t99 = setTimeout(function() { thumbscript4.runAsync(world) }, 0)
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

// not faster
thumbscript4.recycledWorlds = []
thumbscript4.recycle = function (world) {
    return
    
    if (thumbscript4.recycledWorlds.length < 10000) {
        thumbscript4.recycledWorlds.push(world)
    }
}
thumbscript4.getRecycledWorld = function () {
    return {}
    
    var world = thumbscript4.recycledWorlds.pop() || {}
    return world
}

// not helpful ??
thumbscript4.recycledClosures = []
thumbscript4.recycleClosure = function (c) {
    return
    
    if (thumbscript4.recycledClosures.length < 10000) {
        thumbscript4.recycledClosures.push(c)
    }
}
thumbscript4.getRecycledClosure = function () {
    return {}
    var c = thumbscript4.recycledClosures.pop() || {}
    return c
}
thumbscript4.stopN = function (n, world) {
    n = n-0
    // alert(n)
    while (world && world.isParens) {
        alert("should not get here parens 1")
        world = world.parent
    }
    for (var i=0; i<n; i++) {
        if (!world) {
            break
        }
        // i originally had dynParent but it wasn't right
        // like when I wrapped if
        // TODO (onend) !! do I need this here?!
        thumbscript4.callOnEnds(world)
        var rWorld = world
        world = world.parent
        // log2(`+world went from ${rWorld.name} to ${world.name}`)
        while (world && world.isParens) {
            alert("should not get here parens 2")
            world = world.parent
        }
        thumbscript4.recycle(rWorld)
        // todo: see onend
    }
    if (!world) {
        return world
    }
    world.i = world.tokens.length
    return world
}

// thumbscript4.continueN = function (n, world) {
//     n = n-1
//     // n = n-0
//     // alert(n)
//     while (world && world.isParens) {
//         alert("should not get here parens 1")
//         world = world.parent
//     }
//     for (var i=0; i<n; i++) {
//         if (!world) {
//             break
//         }
//         // i originally had dynParent but it wasn't right
//         // like when I wrapped if
//         // if (world.onEnd) world.onEnd(world)
//         var rWorld = world
//         world = world.parent
//         log2(`+world went from ${rWorld.name} to ${world.name}`)
//         while (world && world.isParens) {
//             alert("should not get here parens 2")
//             world = world.parent
//         }
//         thumbscript4.recycle(rWorld)
//         // todo: see onend
//     }
//     if (!world) {
//         return world
//     }
//     world.i = world.tokens.length
//     return world
// }

thumbscript4.breakN = function (n, world) {
    n = n-0
    while (world && world.isParens) {
        alert("should not get here parens 3")
        world = world.parent
    }
    for (var i=0; i<n; i++) {
        if (!world) {
            break
        }
        // i originally had dynParent but it wasn't right
        // like when I wrapped if
        thumbscript4.callOnEnds(world)
        var rWorld = world
        world = world.parent
        // log2(`+world went from ${rWorld.name} to ${world.name}`)
        while (world && world.isParens) {
            alert("should not get here parens 4")
            world = world.parent
        }
        thumbscript4.recycle(rWorld)
        // todo: see onend
    }
    return world
}
function trace() {
    var err = new Error();
    return err.stack;
}

// built in funcs have to have func call last?
thumbscript4.builtIns = {
    rand: thumbscript4.genFunc1((a) => Math.floor(Math.random() * a)),
    say: thumbscript4.genFunc1NoReturn(a => {
        if (typeof log2 != "undefined") {
            log2(a)
            return
        }
        console.log(a)
    }),
    alert: thumbscript4.genFunc1NoReturn(a => { alert(a) }),
    cc: thumbscript4.genFunc2((a, b) => a + b),
    // nowmillis: thumbscript4.genFunc0(() => Date.now()),
    // nowmillis: thumbscript4.genFunc0(() => performance.now()),
    nowmillis: thumbscript4.genFunc0(() => Date.now()),
    now: thumbscript4.genFunc0(() => (Math.floor(Date.now()/1000))),
    lf: thumbscript4.genFunc0(() => "\n"),
    tab: thumbscript4.genFunc0(() => "\t"),
    cr: thumbscript4.genFunc0(() => "\r"),
    plus: thumbscript4.genFunc2((a, b) => a + b),
    // plus: function (world) {
    //     world.stack.push(world.stack.pop() + world.stack.pop())
    //     return world
    // },
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
    isnt: thumbscript4.genFunc2((a, b) => a != b),
    eq: thumbscript4.genFunc2((a, b) => a === b),
    ne: thumbscript4.genFunc2((a, b) => a !== b),
    contains: thumbscript4.genFunc2((a, b) => a && a?.indexOf(b) !== -1),
    chr: thumbscript4.genFunc1((a) => String.fromCharCode(a)),
    ord: thumbscript4.genFunc1((a) => a.charCodeAt(0)),
    // at: thumbscript4.genFunc2((a, b) => a[b]),
    at: thumbscript4.genFunc2((a, b) => {
        // try {
            var ret = a && a[b]
            // var ret = a[b]
        // } catch (e) {
        //     alert(a)
        //     return
        // }
        // js hack.
        if (typeof ret == "function") {
            var ts = ret.toString.bind(ret)
            ret = ret.bind(a)
            ret.toString = ts
        }
        return ret
    }),
    of: thumbscript4.genFunc2((b, a) => {
        var ret = a && a[b]
        if (typeof ret == "function") {
            var ts = ret.toString.bind(ret)
            ret = ret.bind(a)
            ret.toString = ts
        }
        return ret
    }),
    props: thumbscript4.genFunc1((a) => {
        var v = a[0]
        for (var i = 1; i < a.length; i++) { v = v[a[i]] }
        return v
    }),
    not: thumbscript4.genFunc1((a) => !!!a),
    "cond": thumbscript4.genFunc3((a, b, c) => (a ? b : c) ),
    length: thumbscript4.genFunc1((a) => a.length),
    len: thumbscript4.genFunc1((a) => a.length),
    push: thumbscript4.genFunc2NoReturn((a, b) => a.push(b)),
    blobfrombytes: thumbscript4.genFunc2((bytes, type) => new Blob([new Uint8Array(bytes)], { type: type })),
    blobfromstrings: thumbscript4.genFunc2((strings, type) => new Blob(strings, { type: type })),
    pushto: thumbscript4.genFunc2NoReturn((a, b) => b.push(a)),
    pop: thumbscript4.genFunc1((a) => a.pop()),
    unshift: thumbscript4.genFunc2NoReturn((a, b) => a.unshift(b)),
    unshiftto: thumbscript4.genFunc2NoReturn((a, b) => b.unshift(a)),
    shift: thumbscript4.genFunc1((a) => a.shift()),
    join: thumbscript4.genFunc2((a, b) => a.join(b)),
    slice: thumbscript4.genFunc3((a, b, c) => a.slice(b, c)),
    slicefrom: thumbscript4.genFunc2((a, b) => a.slice(b)),
    sliceto: thumbscript4.genFunc2((a, b) => a.slice(0, b)),
    split: thumbscript4.genFunc2((a, b) => {
        if (!a) {
            log2(trace())
        } else {
            return a.split(b)
        }
    }),
    upper: thumbscript4.genFunc1((a) => a.toUpperCase()),
    lower: thumbscript4.genFunc1((a) => a.toLowerCase()),
    trim: thumbscript4.genFunc1((a) => a.trim()),
    indexof: thumbscript4.genFunc2((a, b) => a.indexOf(b)),
    replace: thumbscript4.genFunc3((a, b, c) => a.replaceAll(b, c)),
    tonumber: thumbscript4.genFunc1((a) => a - 0),
    padstart: thumbscript4.genFunc3((s, len, c) => s.padStart(len, c)),
    padend: thumbscript4.genFunc3((s, len, c) => s.padEnd(len, c)),
    urlencode: thumbscript4.genFunc1((a) => {
        if (a === null) {
            return ""
        }
        return encodeURIComponent(a)
    }),
    tojson: thumbscript4.genFunc1((a) => JSON.stringify(a)),
    tojsonpretty: thumbscript4.genFunc1((a) => JSON.stringify(a, null, "    ")),
    formatjson: thumbscript4.genFunc1((a) => JSON.stringify(JSON.parse(a), null, "    ")),
    fromjson: thumbscript4.genFunc1((a) => JSON.parse(a)),
    haskey: thumbscript4.genFunc2((a, b) => Object.hasOwn(a, b)),
    newobj: thumbscript4.genFunc0(() => {
        return {}
    }),
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
    "new": function (world) {
        var theClass = world.stack.pop()
        var theArgs = world.stack.pop()
        var ret = new (Function.prototype.bind.apply(theClass, [null].concat(theArgs)))
        world.stack.push(ret)
        return world
    },
    jsapply: function(world) {
        var f = world.stack.pop()
        var args = world.stack.pop()
        return thumbscript4.builtIns.call_js_func_args(world, f, args)
    },
    call_js_skipstack: function(world, f) {
        // can't always do this because some (many) javascript functions have variable lengths
        // see call_js_func_args
        var args = []
        for (var i=0; i < f.length; i++) {
            args.unshift(world.stack.pop())
        }
        return thumbscript4.builtIns.call_js_func_args(world, f, args)
    },
    call_js_func_args: function(world, f, args) {
        // var ret = f.apply(null, args)
        var ret = f(...args)
        if (ret && ret?.constructor == Promise) {
            var returned = false
            ret.then(function (r) {
                if (!returned) {
                    try {
                        returned = true
                        thumbscript4.outstandingCallbacks--
                        world.stack.push(r)
                        world.stack.push(null)
                        // world.state.lastError = null
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
                    // world.state.lastError = err
                    thumbscript4.run(world)
                }
            })
            return null // this suspends the execution
        }
        world.stack.push(ret)
        return world
    },
    // jscall: function (world) {
    //     var args = world.stack.pop()
    //     var funcName = world.stack.pop()
    //     var ret = window[funcName](...args)
    //     world.stack.push(ret)
    //     return world
    // },
    // jscallcb: function (world) {
    //     var args = world.stack.pop()
    //     var funcName = world.stack.pop()
    //     args.push(function (err, ret) {
    //         thumbscript4.outstandingCallbacks--
    //         world.stack.push(ret)
    //         world.stack.push(err)
    //         thumbscript4.run(world)
    //     })
    //     window[funcName](...args)
    //     thumbscript4.outstandingCallbacks++
    //     return null // this suspends the execution
    // },
    // jscallpromise: function (world) {
    //     var args = world.stack.pop()
    //     var funcName = world.stack.pop()
    //     try {
    //         var p = window[funcName](...args)
    //     } catch (e) {
    //         alert(funcName)
    //         alert(args)
    //         alert(e)
    //     }
    //     var returned = false
    //     p.then(function (r) {
    //         if (!returned) {
    //             try {
    //                 returned = true
    //                 thumbscript4.outstandingCallbacks--
    //                 world.stack.push(r)
    //                 world.stack.push(null)
    //                 thumbscript4.run(world)
    //             } catch (e) {
    //                 alert(e)
    //             }
    //         }
    //     }).catch(function (err) {
    //         if (!returned) {
    //             returned = true
    //             thumbscript4.outstandingCallbacks--
    //             world.stack.push(null)
    //             world.stack.push(err)
    //             thumbscript4.run(world)
    //         }
    //     })
    //     return null // this suspends the execution
    // },
    dyn: function(world) {
        var a = world.stack.pop()
        // #closureshortcut
        // a = thumbscript4.closureify(a, world)
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
    get: function(world) {
        var a = world.stack.pop()
        var w = thumbscript4.getWorldForKey(world, a, false, false)
        world.stack.push(w.state[a])
        return world
    },
    set: function(world) {
        var a = world.stack.pop()
        var b = world.stack.pop()

        // foo.bar.baz: "yo!"
        // if (a && a.indexOf && a.indexOf(".") != -1) {
        //     var parts = a.split(".")
        //     var w = thumbscript4.getWorldForKey(world, parts[0], true, true)
        //     var v = w.state[parts[0]]
        //     for (var i = 1; i < parts.length; i++) {
        //         // kinda feels backwards
        //         var prop = parts[i]
        //         if (prop.startsWith("@")) {
        //             prop = prop.slice(1)
        //             let w = thumbscript4.getWorldForKey(world, prop, false, false)
        //             prop = w.state[prop]
        //         }
        //         if (i < parts.length - 1) {
        //             v = v[prop]
        //         } else {
        //             v[prop] = b
        //         }
        //     }
        //     return world
        // }
        var w = thumbscript4.getWorldForKey(world, a, false, true, false)
        w.state[a] = b
        // #closureshortcut
        // w.state[a] = thumbscript4.closureify(b, world)
        return world
    },
    setlocal: function(world) {
        var a = world.stack.pop()
        var b = world.stack.pop()
        var w = thumbscript4.getWorldForKey(world, a, false, true, true)
        w.state[a] = b
        // #closureshortcut
        // w.state[a] = thumbscript4.closureify(b, world)
        return world
    },
    setb: function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        var w = thumbscript4.getWorldForKey(world, a, false, true, false)
        w.state[a] = b
        // #closureshortcut
        // w.state[a] = thumbscript4.closureify(b, world)
        return world
    },
    setblocal: function(world) {
        var b = world.stack.pop()
        var a = world.stack.pop()
        var w = thumbscript4.getWorldForKey(world, a, false, true, true)
        w.state[a] = b
        // #closureshortcut
        // w.state[a] = thumbscript4.closureify(b, world)
        return world
    },
    setplus1: function(world) {
        var a = world.stack.pop()
        var w = thumbscript4.getWorldForKey(world, a, false, true)
        w.state[a] += 1
        return world
    },
    setprop: function(world) {
        var v = world.stack.pop()
        var k = world.stack.pop()
        var o = world.stack.pop()
        o[k] = v
        return world
    },
    setprop2: function(world) {
        var k = world.stack.pop()
        var o = world.stack.pop()
        var v = world.stack.pop()
        o[k] = v
        return world
    },
    setpropKOV: function(world) {
        var k = world.stack.pop()
        var o = world.stack.pop()
        var v = world.stack.pop()
        o[k] = v
        return world
    },
    setpropVKO: function(world) {
        var v = world.stack.pop()
        var k = world.stack.pop()
        var o = world.stack.pop()
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
    runid: function(world) {
        world.stack.push(world.runId)
        return world
    },
    nameworld: function(world) {
        var a = world.stack.pop()
        world.name = a
        return world
    },
    jseval: function(world) {
        var code = world.stack.pop()
        world.stack.push(globalVar.eval(code))
        return world
    },
    jsdrop: function(world) {
        world.stack.pop()
        return world
    },
    jsloopn: function(world) {
        // for some reason this doesn't work unless you preventRender
        // see preventRender assignment
        var f = world.stack.pop()
        var n = world.stack.pop()
        
        
        var fWorld
        var fTokens
        if (f.th_type == curlyType) {
            alert("oops curly -1")
            // #closureshortcut
            // may remove this attempted optimization
            fWorld = world
            fTokens = f.valueArr
        } else if (f.th_type == closureType) {
            fWorld = f.world
            fTokens = f.tokens
        }
        
        var loopWorld = {
            parent: fWorld,
            state: {},
            stack: world.stack,
            tokens: fTokens,
            i: 0,
            dynParent: null,
            runId: ++thumbscript4.runId,
            indent: world.indent + 1,
            // cachedLookupWorld: {},
            global: fWorld.global,
            asyncTop: world.asyncTop,
            onEnds: [],
            waitingWorlds: [],
        }
        for (var i=0; i<n; i++) {
            var pWorld = loopWorld
            pWorld.stack.push(i)
            while (true) {
                var pWorld = thumbscript4.next(pWorld)
                if (!pWorld) {
                    break
                }
            }
            loopWorld.i = 0
        }
        return world
    },
    thisworld: function (world) {
        world.stack.push(world)
        return world
    },
    pause: function (world) {
        world.asyncTop.paused = world
        return null
    },
    resume: function (world) {
        let theTop = world.asyncTop.asyncParent.asyncTop;
        while (true) {
            if (theTop && theTop.paused) {
                break
            }
            if (theTop == theTop.asyncParent) {
                return null
            }
            theTop = theTop.asyncParent.asyncTop
        }
        var toResume = theTop.paused
        theTop.paused = null
        return toResume
        // ---
        var toResume = world.asyncTop.asyncParent.asyncTop.paused
        if (toResume) {
            world.asyncTop.asyncParent.asyncTop.paused = null
            return toResume
        }
        return null
    },
    pausex: function (world) {
        return null
    },
    resumex: function (world) {
        var a = world.stack.pop()
        thumbscript4.run(a)
    },
    wait: function (world) {
        var asyncWorld = world.stack.pop()
        // alert(asyncWorld.i + " " + asyncWorld.tokens.length)
        
        if (!asyncWorld.foofoo) {
            log2("what??! " + asyncWorld.foofoo)
            for (let key in asyncWorld) {
                log2("key: " + key)
            }
        }
        if (asyncWorld.done) {
            for (let item of asyncWorld.stack) {
                world.stack.push(item)
            }
            return world
        }

        asyncWorld.onEnds.push(function () {
            for (let item of asyncWorld.stack) {
                world.stack.push(item)
            }
            thumbscript4.run(world)
        })
        return null
    },
    cancel: function (world) {
        // TODO, (elsewhere) when we check for stopped we should check asyncTop in addition to global?
        var asyncWorld = world.stack.pop()
        if (!asyncWorld.stopped) {
            asyncWorld.stopped = true
            // if we don't call now we'd have to wait for next callback
            thumbscript4.callOnEnds(asyncWorld)
        }
        return world
    },
    go: function (world) {
        var f = world.stack.pop()
        // see call_skipstack
        var fWorld
        var fTokens
        if (f.th_type == curlyType) {
            alert("oops curly 0")
            // #closureshortcut
            // may remove this attempted optimization
            fWorld = world
            fTokens = f.valueArr
        } else if (f.th_type == closureType) {
            fWorld = f.world
            fTokens = f.tokens
        }
        var asyncWorld = {
            parent: fWorld,
            state: {},
            // stack: [], // brand new stack
            stack: [...world.stack], // copied stack
            tokens: fTokens,
            i: 0,
            dynParent: null, // so it stops
            asyncParent: world,
            runId: ++thumbscript4.runId,
            indent: world.indent + 1,
            // cachedLookupWorld: {},
            global: world.global,
            done: false,
            onEnds: [],
            waitingWorlds: [],
            foofoo: "banana",
        }
        // spawning a new async world (aka goroutine), we set itself to the asyncTop.
        // any new worlds genersted have this as its top, except new async worlds have their own.
        asyncWorld.asyncTop = asyncWorld

        if (f.dynamic) {
            asyncWorld.parent = world
            // asyncWorld.cachedLookupWorld = {}
        }
        
        // this can break if you are running asynchronously
        // instead you can have your own event loop?
        setTimeout(function () {
            thumbscript4.run(asyncWorld)
        }, 1)
        world.stack.push(asyncWorld)
        // returning the original world
        return world
    },
    storefunc: function(world) {
        var a = world.stack.pop()
        if (!world.storedFuncsStack) {
            world.storedFuncsStack = []
        }
        world.storedFuncsStack.push(a)
        return world
    },
    callstored: function(world) {
        var f = world.storedFuncsStack.pop()
        return thumbscript4.builtIns.callany_skipstack(world, f)
    },
    callany_skipstack: function(world, f, t) {
        if (!f) {
            world.stack.push(f)
            return world
        }
        if (t && t.preventCall) {
            world.stack.push(f)
            return world
        }
        switch (f.th_type) {
            case closureType:
                return thumbscript4.builtIns.call_skipstack(world, f)
            case builtInType:
                return f.valueFunc(world, f)
            default:
                if (typeof f === "function") {
                    // for calling js, used
                    // newWorld = thumbscript4.builtIns.call_js_skipstack(world, f)
                    thumbscript4.builtIns.call_js_skipstack(world, f)
                } else {
                    world.stack.push(f)
                }
                return world
        }
        // if (f.th_type === closureType) {
        //     return thumbscript4.builtIns.call_skipstack(world, f)
        // } else if (f.th_type === builtInType) {
        //     return f.valueFunc(world, f)
        // } else if (typeof f === "function") {
        //     return thumbscript4.builtIns.call_js_skipstack(world, f)
        // }
        return world
    },
    // do (alias)
    call: function(world) {
        var f = world.stack.pop()
        return thumbscript4.builtIns.callany_skipstack(world, f)
    },
    call_skipstack: function(world, f) {
        var oldWorld = world

        // used fo have f.callWorld hack here
        // world = thumbscript4.getRecycledWorld()
        // world.parent = f.world
        // world.state = {}
        // world.stack = oldWorld.stack
        // world.tokens = f.tokens
        // world.i = 0
        // world.dynParent = oldWorld
        // world.runId = thumbscript4.runId
        // world.indent = oldWorld.indent + 1
        // // world.cachedLookupWorld = {}
        // world.global = f.world.global
        // world.asyncTop: f.world.asyncTop,
        //
        // world.log = null
        // world.name = null
        // world.repeatCount = 0
        
        
        // if (f.local && f.world == world) { // not exactly the meaning of local, not handling dynamic yet
        // if (!f.local) { // not exactly the meaning of local, not handling dynamic yet
        //     log2("yay hack")
        //     log2(f.world == world)
        //     log2(f.world.name)
        //     log2(f)
        //     if (!world.tokenStack && !world.iStack) {
        //         world.tokenStack = []
        //         world.iStack = []
        //     }
        //     world.tokenStack.push(world.tokens)
        //     world.iStack.push(world.i)
        //     world.tokens = f.tokens
        //     world.i = 0
        //     return world
        // }
        var fWorld
        var fTokens
        if (f.th_type == curlyType) {
            alert("oops curly 1")
            // #closureshortcut
            // may remove this attempted optimization
            fWorld = oldWorld
            fTokens = f.valueArr
        } else if (f.th_type == closureType) {
            fWorld = f.world
            fTokens = f.tokens
        }
        world = {
            parent: fWorld,
            state: {},
            stack: oldWorld.stack,
            tokens: fTokens,
            i: 0,
            dynParent: oldWorld,
            runId: ++thumbscript4.runId,
            indent: oldWorld.indent + 1,
            // cachedLookupWorld: {},
            global: oldWorld.global,
            asyncTop: oldWorld.asyncTop,
            onEnds: [],
            waitingWorlds: [],
        }

        if (f.dynamic) {
            world.parent = oldWorld
            // world.cachedLookupWorld = {}
        }
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
            var rWorld = world
            world = world.dynParent
            thumbscript4.recycle(rWorld)
        }
    },
    "break": function(world) {
        return thumbscript4.breakN(1, world)
    },
    "breakp": function(world) {
        return thumbscript4.breakN(2, world)
    },
    "breakn": function(world) {
        var n = world.stack.pop()
        return thumbscript4.breakN(n+1, world)
    },
    "goto": function(world) {
        var loc = world.stack.pop()
        var w = world
        // log2("+ called goto " + loc)
        while (!w.tokens.anchors || !w.tokens.anchors.hasOwnProperty(loc)) {
            // log2("+ in " + w.name + "; searching above")
            w = w.parent
        }
        w.i = w.tokens.anchors[loc]
        return w
    },
    "stop": function(world) {
        // same as return, but I like better
        return thumbscript4.stopN(0, world)
    },
    "stopp": function(world) {
        return thumbscript4.stopN(1, world)
    },
    "stopn": function(world) {
        var n = world.stack.pop()
        return thumbscript4.stopN(n, world)
    },
    // "return": function(world) {
    //     return thumbscript4.continueN(1, world)
    // },
    // "returnp": function(world) {
    //     return thumbscript4.continueN(2, world)
    // },
    // "continue": function(world) {
    //     // same as return, but I like better
    //     return thumbscript4.continueN(1, world)
    // },
    // "continuep": function(world) {
    //     return thumbscript4.continueN(2, world)
    // },
    // "continuen": function(world) {
    //     var n = world.stack.pop()
    //     return thumbscript4.continueN(n, world)
    // },
    "exit": function(world) {
        log2("exiting!!!")
        // world.global.stopped = true
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
            thumbscript4.callOnEnds(world)
            var rWorld = world
            world = world.parent
            thumbscript4.recycle(rWorld)
        }
        return world
    },
    guardlt: function(world) {
        // test this again
        var b = world.stack.pop()
        var a = world.stack.pop()
        if (!(a<b)) {
            thumbscript4.callOnEnds(world)
            var rWorld = world
            world = world.parent
            thumbscript4.recycle(rWorld)
        }
        return world
    },
    // "break": function(world) {
    //     for (var i=0; i<2; i++) {
    //         thumbscript4.recycle(world)
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
    //         thumbscript4.recycle(world)
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
        if (world.repeatCount === 2_000_000_000) {
            world = null
            alert("runaway loop")
            return world
        }
        world.i = -1 // because same world and will increment
        return world
    },
    jumpelse: function (world) {
        var loc = world.stack.pop()
        var what = world.stack.pop()
        if (!what) {
            var w = world
            while (!w.tokens.anchors || !w.tokens.anchors.hasOwnProperty(loc)) {
                w = w.parent
            }
            w.i = w.tokens.anchors[loc]
            return w
            // world.stack.push(b)
            // return thumbscript4.builtIns["goto"](world)
        }
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
            world = thumbscript4.builtIns.callany_skipstack(world, block)
        } else {
            // there are more places to recycle, this is just an easy one
            // thumbscript4.recycleClosure(block)
        }
        return world
    },
    // ifnot
    "?!": function(world, token) {
        var block = world.stack.pop()
        var cond = world.stack.pop()
        if (!cond) {
            if (token.endOfIfChainI != -1) {
                world.i = token.endOfIfChainI
            }
            world = thumbscript4.builtIns.callany_skipstack(world, block)
        } else {
            // there are more places to recycle, this is just an easy one
            // thumbscript4.recycleClosure(block)
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
            world = thumbscript4.builtIns.callany_skipstack(world, block)
        }
        return world
    },
    // elseifnot
    "??!": function(world, token) {
        var block = world.stack.pop()
        var cond = world.stack.pop()
        if (!cond) {
            if (token.endOfIfChainI != -1) {
                world.i = token.endOfIfChainI
            }
            world = thumbscript4.builtIns.callany_skipstack(world, block)
        }
        return world
    },
    // else
    "?;": function(world, token) {
        var block = world.stack.pop()
        world = thumbscript4.builtIns.callany_skipstack(world, block)
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
    usdateutc: (world) => {
        var unixTime = world.stack.pop()
        let date = new Date(unixTime * 1000)
        const year = date.getUTCFullYear()
        const month = ("0" + (date.getUTCMonth() + 1)).slice(-2)
        const day = ("0" + date.getUTCDate()).slice(-2)
        const hours = ("0" + date.getUTCHours()).slice(-2)
        const minutes = ("0" + date.getUTCMinutes()).slice(-2)
        const seconds = ("0" + date.getUTCSeconds()).slice(-2)
        const formattedTime = month + '/' + day + '/' + year + ' ' + hours + ':' + minutes + ':' + seconds
        world.stack.push(formattedTime)
        return world
    },
    sqldateutc: (world) => {
        var unixTime = world.stack.pop()
        // write js code that takes a unix timestamp
        // and generates a date string in this format:
        // 2006-01-02 15:04:05
        // the timezone will be utc

        let date = new Date(unixTime * 1000)
        const year = date.getUTCFullYear()
        const month = ("0" + (date.getUTCMonth() + 1)).slice(-2)
        const day = ("0" + date.getUTCDate()).slice(-2)
        const hours = ("0" + date.getUTCHours()).slice(-2)
        const minutes = ("0" + date.getUTCMinutes()).slice(-2)
        const seconds = ("0" + date.getUTCSeconds()).slice(-2)
        const formattedTime = year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds
        world.stack.push(formattedTime)
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
             world.stack.push(text)
             world.stack.push(err)
             thumbscript4.run(world)
        })
        thumbscript4.outstandingCallbacks++
        return null // lol
    },
    assertempty: function(world) {
        return world
        var message = world.stack.pop()
        if (world.stack.length) {
            alert("stack not empty: " + message)
            log2("-stack is not empty")
            log2(world.stack)
            return null
        }
        return world
    }
}
thumbscript4.builtIns["if"] = thumbscript4.builtIns["?"]
thumbscript4.builtIns["ifnot"] = thumbscript4.builtIns["?!"]
thumbscript4.builtIns["elseif"] = thumbscript4.builtIns["??"]
thumbscript4.builtIns["elseifnot"] = thumbscript4.builtIns["??!"]
thumbscript4.builtIns["else"] = thumbscript4.builtIns["?;"]

// do is an alias for call
thumbscript4.builtIns["do"] = thumbscript4.builtIns["call"]


thumbscript4.builtIns.localDateFormat = thumbscript4.genFunc1((unixTimestamp) => {
    // return 2001
    let date = new Date(unixTimestamp * 1000)
    const year = date.getFullYear()
    const month = ("0" + (date.getMonth() + 1)).slice(-2)
    const day = ("0" + date.getDate()).slice(-2)
    const hours = ("0" + date.getHours()).slice(-2)
    const minutes = ("0" + date.getMinutes()).slice(-2)
    const seconds = ("0" + date.getSeconds()).slice(-2)
    const formattedTime = month + '/' + day + '/' + year + ' ' + hours + ':' + minutes + ':' + seconds
    return formattedTime
})



thumbscript4.getWorldForKey = function(world, key, errOnNotFound, forSetting, local) {
    // the cachedLookupWorld seems noticeably faster when running jsloopn
    // 19ms vs 38ms on a loopn with somevar+= for 100k loops

    if (local && forSetting) {
        // this may be what's missing in ijs
        if (!world.cachedLookupWorld) {
            world.cachedLookupWorld = {}
        }
        world.cachedLookupWorld[key] = world
        return world
    }
    if (!world.cachedLookupWorld) {
        world.cachedLookupWorld = {}
    } else if (world.cachedLookupWorld[key]) {
        return world.cachedLookupWorld[key]
    }
    for (var w = world; w != null; w = w.parent) {
        // perf doesn't seem to matter here
        if (Object.hasOwn(w.state, key)) {
        // if (key in w.state) {
            world.cachedLookupWorld[key] = w
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

thumbscript4.callOnEnds = function (world) {
    world.done = true
    if (world.onEnds) {
        for (let onEnd of world.onEnds) {
            onEnd(world)
        }
    }
    if (world.waitingWorlds) {
        for (let w of world.waitingWorlds) {
            thumbscript4.run(w)
        }
    }
}

// #closureshortcut
thumbscript4.closureify = function (a, world) {
    if (a && a.th_type == curlyType) {
        a = {
            th_type: closureType,
            tokens: a.valueArr,
            world: world,
        }
    }
    return a
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
            // if (world.tokenStack && world.tokenStack.length) {
            //    log2("pop stacky2")
            //    log2(world.state.i + "/" + world.state.n)
            //    world.tokens = world.tokenStack.pop()
            //    world.i = world.iStack.pop()
            //    return world
            // }
            thumbscript4.callOnEnds(world)
            if (world.dynParent) {
                var rWorld = world
                world = world.dynParent
                thumbscript4.recycle(rWorld)
                // the stacks should point to same thing
                return world
            }
            return false
        }
        var token = world.tokens[world.i]
        // logging token to debug
        // log2("+" + (token.valueString || token.name || token.valueNumber + "" || "???").replaceAll("\n", "-")?.substr(0, 50))
        // log2("\t".repeat(world.indent) + "// token: " + thumbscript4.displayToken(token)) // lime marker
        // log2("\t".repeat(world.indent) + "// stack length: " + world.stack.length)

        // that's actually barely slower.
        // newWorld = typeMap[token.th_type](world, token)
        // break

        var newWorld = world
        if (!token) {
            log2("+no token")
            log2(world.i)
            log2(world.tokens)
        }
        switch (token.th_type) {
            case stringType:
                world.stack.push(token.valueString)
                break outer
            case numberType:
                world.stack.push(token.valueNumber)
                break outer
            case boolType:
                world.stack.push(token.valueBool)
                break outer
            case nullType:
                world.stack.push(null)
                break outer
            case squareType:
                newWorld = {
                    parent: world,
                    state: {},
                    stack: [],
                    tokens: token.valueArr,
                    i: 0,
                    dynParent: world,
                    indent: world.indent + 1,
                    runId: ++thumbscript4.runId,
                    // cachedLookupWorld: {},
                    global: world.global,
                    asyncTop: world.asyncTop,
                    onEnds: [function(world) {
                        if (Object.keys(world.state).length) {
                            world.dynParent.stack.push(world.state)
                        } else {
                            world.dynParent.stack.push(world.stack)
                        }
                    }],
                    waitingWorlds: [],
                }
                break outer
            case curlyType:
                // #closureshortcut
                // world.stack.push(token); break outer

                var closure = {
                    th_type: closureType,
                    tokens: token.valueArr,
                    world: world,
                }
                // var closure = thumbscript4.getRecycledClosure()
                // closure.th_type = closureType
                // closure.tokens = token.valueArr,
                // closure.world = world

                closure.toJSON = function() {
                    return {
                        tokens: closure.tokens,
                        th_type: closure.th_type,
                        dynamic: closure.dynamic,
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
                // TODO: this is no longer called
                // it's desugared away
                // we can remove this

                // newWorld = {
                //     parent: world,
                //     state: {},
                //     stack: [],
                //     tokens: token.valueArr,
                //     i: 0,
                //     dynParent: world,
                //     onEnd: function(world) {
                //         for (var i=0; i<world.stack.length; i++) {
                //             world.dynParent.stack.push(world.stack[i])
                //         }
                //     },
                //     indent: world.indent + 1,
                //     runId: ++thumbscript4.runId,
                //     cachedLookupWorld: {},
                //     global: world.global,
                //     asyncTop: world.asyncTop,
                // }
                // break outer

                // this
                newWorld = {
                    parent: world,
                    state: world.state,
                    stack: world.stack,
                    tokens: token.valueArr,
                    i: 0,
                    dynParent: world,
                    indent: world.indent + 1,
                    runId: ++thumbscript4.runId,
                    // cachedLookupWorld: {},
                    global: world.global,
                    asyncTop: world.asyncTop,
                    isParens: true,
                    onEnds: [],
                    waitingWorlds: [],
                }
                break outer
            case builtInType:
                // you could call this, but we don't need to check all the cases
                // thumbscript4.builtins.callany_skipstack(world, token, token) // the token is the "function" in this case
                
                if (!token.preventCall) {
                    // log2("// yay calling builtin: " + token.name)
                    newWorld = token.valueFunc(world, token)
                } else {
                    // world.stack.push(token.nonPreventCallVersion || token)
                    world.stack.push(token)
                    // world.stack.push({
                    //     th_type: closureType,
                    //     tokens: [token.nonPreventCallVersion],
                    //     world: world,
                    // })
                }
                break outer
            case varType:
                // see also set and at
                var x
                // if (token.valueString.indexOf(".") != -1) {
                //     // see also the "set" builtin
                //     var parts = token.valueString.split(".")
                //     var w = thumbscript4.getWorldForKey(world, parts[0], true, false)
                //     var x = w.state[parts[0]]
                //     for (var i = 1; i < parts.length; i++) {
                //         // kinda feels backwards
                //         var prop = parts[i]
                //         if (prop.startsWith("@")) {
                //             prop = prop.slice(1)
                //             let w2 = thumbscript4.getWorldForKey(world, prop, false, false)
                //             prop = w2.state[prop]
                //         }
                //         if (x) {
                //             var v = x[prop]
                //             if (typeof v == "function") {
                //                 var ts = v.toString.bind(v)
                //                 v = v.bind(x)
                //                 v.toString = ts
                //             }
                //             x = v
                //         }
                //     }
                // } else {
                    var w = thumbscript4.getWorldForKey(world, token.valueString, true, false)
                    x = w.state[token.valueString]
                // }

                newWorld = thumbscript4.builtIns.callany_skipstack(world, x, token)
                // saddlebrown #color
                // if (x && x.th_type === closureType && !token.preventCall) {
                //     // log2("yay calling closure: " + JSON.stringify(x.tokens))
                //     newWorld = thumbscript4.builtIns.call_skipstack(world, x)
                // } else {
                //     if (typeof x === "function" && !token.preventCall) {
                //         // for calling js, used
                //         newWorld = thumbscript4.builtIns.call_js_skipstack(world, x)
                //     } else {
                //         world.stack.push(x)
                //     }
                // }
                // end #color

                break outer
            case incrType:
                var w = thumbscript4.getWorldForKey(world, token.valueString, true, true, false)
                w.state[token.valueString]++
                break outer
            case noOpType:
                break outer
            case anchorType:
                world.name = token.valueString
                break outer
            case interpolateType:
                var r = token.valueString
                var r = r.replace(/\$\[([^\]]+)\]/g, function(x, code) {
                    // hacky
                    return thumbscript4.evalQuick(code, world)
                })
                var r = r.replace(/\$[\w]+/g, function(x) {
                    x = x.slice(1)
                    // var w = thumbscript4.getWorldForKey(world, x, true, false)
                    // return w.state[x]
                    return thumbscript4.evalQuick(x, world)
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
// thumbscript4.stdlib = function x() { /*
thumbscript4.stdlib = String.raw`
    // for use in interpolation
    bob: "200lol"
    it: { :a ~a }
    swap:  { :b :a ~b ~a }
    drop: { :droppy }
    dup: { :a ~a ~a }
    // todo: look at what's slow with not inlining (object creation? and fix)
    // that said jsloopn is fastest
    loopn: {
        :block :n 0 :i
        {
            i •lt n not ~stop ?
            // i •lt n not ? ~stop
            i block
            i++
            repeat
        } call
    }
    loopn2: {
        :block :n 0 :i
        {
            i •lt (n •minus 1) guard
            i block
            i •plus 2 :i
            repeat
        } call
    }
    foreach: {
        :block :list
        list typename "object" is {
            list :obj
            obj keys :theKeys
            theKeys length :theMax
            theMax {
                theKeys swap at :key
                obj key at :value
                key ~value block
            } loopn
            stopp
        } ?
        list length :theMax
        theMax {
            :i
            i list •at i block
        } loopn
    }
    each: {
        :block :list
        list typename "object" is {
            list :obj
            obj keys :theKeys
            theKeys length :theMax
            theMax {
                theKeys swap at :key
                obj key at :value
                ~value block
            } loopn
            stopp
        } ?
        list length :theMax
        theMax {
            :i
            list •at i block
        } loopn
    }
    eachn: {
        :block :skip :list
        i: 0
        loop. {
            loopn. skip {
                -plus i -of list
            }
            block
            i = i -plus skip
            if. i -gte -length list {
                breakp
            }
        }
    }
    guard: { not { 2 stopn } ? } dyn
    loopmax: {
        :theMax :block 0 :i
        {
            i theMax lt ~stop ?
            block
            i++
            repeat
        } call
    }
    sayn: { " " join say }
    take: {
        :n9 [] :a9
        n9 {
            a9 swap unshift
        } loopn
        a9
    }
    cases: {
        :c
        c length :m
        c 2 {
            "looping" say
            :v2 drop :v1 drop
            v1 { v2 3 stopn } ?
        } every
        c •at (m •minus 1) call
    }
    timeit: {
        :block :n
        // nowmillis :start
        start: nowmillis
        say. "start is $start"
        // n ~block loopn
        n ~block jsloopn
        // nowmillis :end
        end: nowmillis
        say. "end is $end"
        // end •minus start :total
        total: end •minus start
        "it took $total ms" say
    }
    and: {
        :b :a
        a :firstValue
        ~firstValue not { ~firstValue stopp } ?
        b
    }
    or: {
        :b :a
        a :firstValue
        ~firstValue { ~firstValue stopp } ?
        b
    }
    loop: {
       :block
       {
           block
           repeat
       } call
    }
    filter: {
        :func :list
        [] :ret
        list {
            :v
            v func {
                ret v push
            } ?
        } each
        ret
    }
    map: {
        :func :list
        [] :output
        list {
            output func push
        } each
        output
    }
    trimPrefix: {
        :prefix :str
        str 0 prefix len slice prefix is {
            prefix len undefined str slice
            stopp
        } ?

        // if. str 0 prefix len slice prefix is {
        //     prefix len undefined str slice
        //     stopp
        // }
        str
    }
    ifelse: {
        :theElse
        :theThen
        :toCheck
        toCheck ~theThen ~theElse cond call
    }
    jumpelse: {
        :loc
        :what
        what {
            loc goto
        } ?
    } dyn
    exec: { runshell drop trim }
    bashStrEscape: {
        "'"
        swap
        "'" "'\''" replace
        cc
        "'" cc
    }
    // only does simple types for now
    formencode: {
        r: []
        foreach. { :value :key
            r "$[urlencode. key]=$[urlencode. value]"
            push
        }
        r join("&")
    }
    every: {
        :fn :skip :list
        i: 0
        loop. {
            if. i gte(list len) {
                breakp
            }
            
            loopn. skip {
                :subi
                i .plus subi
                list[i .plus subi]
            }
            fn
            i = i plus(skip)
        }
    }
    looprange: {
        :fn :to :from
        if. from .lt to {
            n: to .minus from .plus 1
            loopn. n {
                :i
                from .plus i fn
            }
            stopp
        }
        n: from .minus to .plus 1
        loopn. n {
            :i
            to .minus i fn
        }
    }
    replacegroup: {
      :replacerMap :str
      chunks: [str]
      foreach. replacerMap { :toReplace :search
          newChunks: []
          every. chunks 2 {
              :nextPartialStr :nextI
              :partialStr :i
              subChunks: partialStr split(search)
              loopn. subChunks len {
                  :sI
                  subChunks at(sI) newChunks push
                  if. sI .ne (subChunks len .minus 1) {
                      newChunks toReplace push
                  }
              }
              if. i lt(chunks len .minus 1) {
                  newChunks nextPartialStr push
              }
          }
          chunks = newChunks
      }
      chunks join("")
    }

    // replacegroup. "a story about a dog" [
    //     a: "A"
    //     s: "S"
    // ]
    // say
    httpreq: {
        :config
        config @method at :method
        headers: []
        config.headers not {
            config.headers: []
        } ?
        config @headers at {
            :v :k
            "-H " "$k: $v" bashStrEscape .cc
            headers swap push
        } foreach
        headersStr: headers " " join
        dataStr: ""
        say. "the body is " .cc config.body
        data: config @body at
        say. "the data is " .cc data
        if. data {
            dataStr: " -d " data bashStrEscape .cc
        }
        extraFlags: ""
        if. config.extraFlags {
            extraFlags: config.extraFlags
        }
        urlStr: config @url at bashStrEscape
        «
            curl $[extraFlags] -s -X $method $headersStr $dataStr $urlStr
        »
        config.debug { trim say "" } ~exec ifelse
    }
    parsecsv: {
        theKeys: []
        theRows: []
        trim
        split(lf)
        foreach. {
            :line :i
            line split(",")

            if. i .is 0 {
                > theKeys
                stopp
            }

            r: newobj
            foreach. {
                :field :i
                k: theKeys[i]
                r[theKeys[i]] = trim. field
            }
            theRows r push
        }
        theRows
    }
    parsetableoutput: {
        :dbOutput
        lines: split. trim(dbOutput) lf
        // add extra space
        headerLine: lines[0] .cc " x" // extra col to close out the previous one
        contentIndexes: []
        theKeys: []
        rows: []
        state: "in_space"
        loopn. headerLine len { :i
            theChr: headerLine[i]
            if. state .is "in_space" {
                if. trim(theChr) .is "" { }
                else. {
                    state = "in_word"
                    contentIndexes .push i

                    if. contentIndexes len .gt 1 {
                        a: contentIndexes[contentIndexes len .minus 2]
                        b: contentIndexes[contentIndexes len .minus 1]
                        headerLine slice(a b) trim theKeys swap push
                    }
                }
            }
            elseif. state .is "in_word" {
                if. theChr trim "" is {
                    state = "in_space"
                }
            }
        }
        looprange. 1 lines len minus(1) { :i
            line: lines[i] trim
            row: newobj
            looprange. 1 contentIndexes len minus(1) { :j
                a: contentIndexes[j .minus 1]
                b: contentIndexes[j]
                row[theKeys[j .minus 1]] = line slice(a b) trim
            }
            rows row push
        }
        rows
    }
    makesemaphore_old: { :count
        [count: count max: count]
    }
    acquire_old: { :s
        if. s.count -eq 0 {
            s.pausedWorld = thisworld
            pausex
        }
        s.count = s.count -minus 1
    }
    waitsemafore_old: { :s
        loopn. s.max { drop
           acquire. s
        }
    }
    release_old: { :s
        s.count = s.count -plus 1
        if. s.count -eq 1 {
            if. s.pausedWorld {
                pw: s.pausedWorld
                s.pausedWorld = ""
                resumex. pw
            }
        }
    }
    makesemaphore: { :count
        [count: count max: count]
    }
    acquire: { :s
        if. s.count -eq 0 {
            pause
        }
        s.count = s.count -minus 1
    }
    waitsemafore: { :s
        loopn. s.max { drop
           acquire. s
        }
    }
    release: { :s
        s.count = s.count -plus 1
        if. s.count -eq 1 {
            resume
        }
    }
    wait2: { :w
        if. w.done {
            each. w.stack {}
            stopp
        }
        w.waitingWorlds -push thisworld
        pause
    }
    waitfirst: { :futures
        anyFinished: false
        futures each. { :f
            drop. go. {
                #thegoroutine
                wait. f
                if. anyFinished ~stop
                anyFinished = true
                futures each. { :f2
                    if. f2 -eq f ~stop
                    cancel. f2
                }
                resume
            }
        }
        pause
    }
    waitall: { :futures
        doneCount: 0
        futures each. { :f
            drop. go. {
                wait. f
                doneCount = doneCount -plus 1
                if. doneCount -eq -len futures {
                    resume
                }
            }
        }
        log2("pausing for wait all")
        pause
    }
`
// */}.toString().split("\n").slice(1, -1).join("\n") + "\n"
thumbscript4.stdlib2 = function x() { /*
*/}.toString().split("\n").slice(1, -1).join("\n") + "\n"

// See other spot where we do this
// total hacky tradeoff because of a bug with Bun
if (globalVar.Bun) {
    thumbscript4.stdlib = unescapeUnicodeChars(thumbscript4.stdlib)
}

// use of this is a total hack
// we call this for bun because it wrongly escapes things, like "•»🧑🏻‍❤️‍🧑🏼" passed to String.raw will give back the escaped version, not the actual raw string
// it will break it if ths source code actually has \u stuff in it
function unescapeUnicodeChars(inputString) {
    return inputString.replace(/\\u(?:\{([0-9A-Fa-f]+)\}|([\dA-Fa-f]{4}))/g, (_, hex1, hex2) => {
        // Decide if the match was in \u{...} format (hex1) or \uXXXX format (hex2)
        const hex = hex1 || hex2;
        // Convert hex to code point value before creating the character
        const codePoint = parseInt(hex, 16);
        // Return the actual character corresponding to the Unicode code point
        return String.fromCodePoint(codePoint);
    });
}

// func main() {
// 	fmt.Printf("%q","•»🧑🏻‍❤️‍🧑🏼")
// }
// "•»🧑🏻\u200d❤️\u200d🧑🏼"

// alter this to handle the \u{} flow too
// for example \u{1f9d1}\u{1f3fb}\u200D\u2764\uFE0F\u200D\u{1f9d1}\u{1f3fc}
// 
// To modify the given code snippet to handle Unicode escape sequences in the format `\u{...}`, in addition to the already handled `\uXXXX`, we need to update the regular expression (regex) to match both formats and slightly adjust the logic for converting the hexadecimal values to characters. We can accomplish this by using a compatible regex pattern that captures both `\uXXXX` and `\u{...}` formats and by adjusting the parsing conditionally based on the detected format.
// Here's how you could alter the given code snippet to handle both scenarios:
// ```javascript
// if (globalVar.Bun) {
//     thumbscript4.stdlib = thumbscript4.stdlib.replace(/\\u(?:\{([0-9A-Fa-f]+)\}|([\dA-Fa-f]{4}))/g, (_, hex1, hex2) => {
//         // Decide if the match was in \u{...} format (hex1) or \uXXXX format (hex2)
//         const hex = hex1 || hex2;
//         // Convert hex to code point value before creating the character
//         const codePoint = parseInt(hex, 16);
//         // Return the actual character corresponding to the Unicode code point
//         return String.fromCodePoint(codePoint);
//     });
// }
// ```
// covert the replace part to an isolated function
// 
// To convert the replace functionality within the `if` block to an isolated function, you can define a function that accepts the string to be transformed (`inputString`) as an argument. This function can then be called with `thumbscript4.stdlib` as its argument, or any other string you wish to process in the same manner. Here's how you can do it:
// ```javascript
// function replaceUnicodeChars(inputString) {
//     return inputString.replace(/\\u(?:\{([0-9A-Fa-f]+)\}|([\dA-Fa-f]{4}))/g, (_, hex1, hex2) => {
//         // Decide if the match was in \u{...} format (hex1) or \uXXXX format (hex2)
//         const hex = hex1 || hex2;
//         // Convert hex to code point value before creating the character
//         const codePoint = parseInt(hex, 16);
//         // Return the actual character corresponding to the Unicode code point
//         return String.fromCodePoint(codePoint);
//     });
// }
// // Usage
// if (globalVar.Bun) {
//     thumbscript4.stdlib = replaceUnicodeChars(thumbscript4.stdlib);
// }
// ```
// This approach encapsulates the replace functionality into a reusable function, `replaceUnicodeChars`, which can be easily tested and maintained separately from the rest of your code.
// 
// explain the difference between javascript strings and utf-8 strings
// 
// The distinction between JavaScript strings and UTF-8 strings primarily lies in how they are encoded and represented internally, along with their use in programming contexts. Here's a breakdown of the differences:
// ### JavaScript Strings
// 1. **Encoding**: JavaScript strings are encoded as UTF-16, which means each code unit is 16 bits (2 bytes). This encoding allows JavaScript to represent a wide range of characters from various languages, as well as symbols, emojis, and other special characters. Most common characters are represented by a single 16-bit unit, while some characters (especially those outside the Basic Multilingual Plane) are represented using a pair of 16-bit units known as "surrogates."
// 2. **Internals**: In JavaScript, a string is a sequence of 16-bit code units, not bytes. When you work with strings in JavaScript (e.g., creating strings, manipulating them with various string methods), you are working at an abstraction level where you don't have to worry about the specific bytes that make up the characters.
// 3. **Usage**: JavaScript strings are used for text manipulation and storage within JavaScript programs. They can be used for creating dynamic HTML content, handling form inputs, processing text, and more.
// ### UTF-8 Strings
// 1. **Encoding**: UTF-8 is a variable-width character encoding that uses one to four 8-bit bytes to encode all possible Unicode characters. UTF-8 is designed to be backward compatible with ASCII, meaning the first 128 characters of Unicode, which correspond to ASCII, are encoded in UTF-8 using a single byte that matches the ASCII representation.
// 2. **Internals**: UTF-8 Strings directly deal with bytes rather than code units. When dealing with UTF-8, understanding the byte representation of characters is more crucial, especially in environments like filesystems or network protocols, where data is transmitted or stored as bytes.
// 3. **Usage**: UTF-8 strings are often used in file storage, web pages, and data transmission over the Internet, where efficient and compact representation of a wide range of characters from different languages is needed. UTF-8 has become the dominant encoding for the web due to its efficiency and compatibility with ASCII.
// ### Key Differences
// - **Encoding and Internals**: JavaScript strings use UTF-16 encoding and deal with 16-bit code units, while UTF-8 strings use a variable-width encoding scheme and deal with bytes.
// - **Use Context**: JavaScript strings are primarily used within the context of JavaScript programming, whereas UTF-8 strings are used for storing and transferring text data across different systems and networks.
// - **Compatibility**: UTF-8 is widely used in file encoding, web content, and protocols due to its efficiency and ASCII compatibility, but JavaScript handles text as UTF-16 to support a wide range of characters directly in the language.
// Understanding these differences can help developers choose the right encoding scheme and work effectively with text data in various programming and data
// 
// Explanation:
// - The updated regex `\\u(?:\{([0-9A-Fa-f]+)\}|([\dA-Fa-f]{4}))` makes use of a non-capturing group `(?: ... )` with two alternatives: `\{([0-9A-Fa-f]+)\}` for matching `\u{...}` style sequences where `...` can be one or more hexadecimal digits, and `([\dA-Fa-f]{4})` for matching `\uXXXX` style sequences where `XXXX` is exactly four hexadecimal digits. outside the Basic Multilingual Plane (BMP) via surrogate pairs.
// - **UTF-8 Strings:** UTF-8 is a variable-width character encoding used for electronic communication. It encodes each Unicode character as a sequence of one to four bytes, focusing on minimizing the byte size for characters that are common in the ASCII standard. UTF-8 is backward compatible with ASCII but can represent any Unicode character, making it a widely adopted encoding standard, especially on the web.
// ### Key Differences
// 1. **Encoding Efficiency:**
//    - JavaScript strings, being UTF-16 encoded, typically use 2 bytes for characters within the BMP and 4 bytes for characters outside the BMP (via surrogate pairs).
//    - UTF-8 strings vary in size, using 1 byte for ASCII characters and up to 4 bytes for characters outside the Basic Latin Unicode block, optimizing for ASCII text.
// 2. **Compatibility:**
//    - JavaScript strings' UTF-16 encoding makes them straightforward for representing a wide range of Unicode characters directly in string literals and handling text in programming constructs.
//    - UTF-8 is the dominant encoding for web content and files, ensuring compatibility across different systems and platforms, particularly important for the internet and file storage.
// 3. **Usage Context:**
//    - JavaScript strings are primarily used within the JavaScript programming language, making them ideal for web scripts, server-side Node.js code, and applications developed within the JavaScript ecosystem.
//    - UTF-8 strings are used in a broader context, including HTML files, JSON data, and system file encoding, making them essential for data interchange and web communications.
// ### Conclusion
// The distinction between JavaScript strings and UTF-8 strings is mainly around their encoding (UTF-16 for JavaScript strings and UTF-8 for UTF-8 strings) and their usage context (programming within JavaScript vs. broader data representation and communication). Understanding these differences is crucial when dealing with internationalization, storage, and transmission of text data across different platforms and technologies.
// - By using capturing groups for the hexadecimal digits inside both alternatives (`([0-9A-Fa-f]+)` for the first and `([\dA-Fa-f]{4})` for the second), the `replace` function's callback gets `hex1` for matches of the first kind and `hex2` for matches of the second kind, with the non-matched kind being `undefined`.
// - The code then unifies the handling by defining `const hex = hex1 || hex2`, which selects the non-`undefined` value.
// - Finally, it uses `parseInt(hex, 16)` to parse the hexadecimal string to an integer and `String.fromCodePoint(codePoint)` to convert the Unicode code point value to a string. Notably, `String.fromCharCode()` is replaced with `String.fromCodePoint()` as the former can't handle all possible values in the `\u{...}` notation, such as emoji or supplementary characters which are outside the Basic Multilingual Plane (BMP).


// alert(j(thumbscript4.stdlib))

// knownFuncs is deprecated
thumbscript4.knownFuncs = {}
thumbscript4.stdlib.split("\n").forEach(function (line) {
    var m = line.match(/^    (\w+): /)
    if (m) {
        thumbscript4.knownFuncs[m[1]] = true
    }
    delete thumbscript4.knownFuncs["swap"]
    delete thumbscript4.knownFuncs["drop"]
    delete thumbscript4.knownFuncs["dup"]
})


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


// log2(thumbscript4.tokenize(`person $friend1 at $name: "Peter2"`))
// log2(thumbscript4.tokenize(`foo: [bar:1]`))
// log2(thumbscript4.tokenize(`t $fillstyle:: $red `))
// log2(thumbscript4.tokenize(`t $fillstyle:: •upper $red `))
// log2(thumbscript4.tokenize(`t $fillstyle:: $red upper`))
// log2(thumbscript4.tokenize(`$red upper ::t $fillstyle`))
// log2(thumbscript4.tokenize(`t (10 1 plus):: "was here"`))
// log2(thumbscript4.tokenize(`If x y
// hi say
// `))
// log2(thumbscript4.tokenize(`say. hi`, true))
// log2(thumbscript4.tokenize(`If 1 1 is {
//     Alert "it's 1"
// }`, true))

// log2(thumbscript4.tokenize(`
// name: 1 1 plus
// `, true))

// log2(thumbscript4.tokenize(`
//     c: [
//         name: 1 1 plus
//     ] addProp
//
//
// `, true))

// log2(thumbscript4.tokenize(`
// yo.man: 10
// 10 :yo.man
// person: [friend1: [name: @pete] friend2: [name: @tom]]
// person: [
//     [score: 10]
// ]
// person.friend1.name: "Peterio"
// alert. str.length
// alert. trim. " yo "
// x plus(2)

// cases [
// ]

// bob/2: yo
// walrus

// {
// } call
// " " "every day is a new day" split :mylist
// "every day is a new day" " " split :mylist
// yo: say 3 4 5
// "hi"
// say. 1 2


// 10 {
//     :i
//     say "+yay $i"
//     if i 5 is {
//         say "tried to break"
//         breakp
//     }
// } loopn










// nowmillis :foo

// list at(i plus. 1)
// 1 (i plus. 1)

// a: [b: 1 2 plus]
// [person 0 @score] props say
// a: [b: 1]
// a: [b: 1 2 plus c: 40 3 minus]

// "hell(oyo" split("l")

// 1 2 plus :myvar
// myvar: 1 2 plus
// myvar: plus. 1 2

// {
//     if. i gt(100_000) {
//         breakp
//     }
//     count: count plus. i
//     i: i plus. 1
//     repeat
// } call
// foo["bar"]: 30




// 1 count+=
// 1 count plus :count

// foo[1 plus. 2]: "three"
// a •plus foo["bar"]
// 20 :[foo "bar"]
// 20 :foo["bar"]
// foo("a")("b")(plus. 1 2)
// foo("a")("b")("c")

// foo["bar"]["baz"][1 1 plus]
// foo[9](100 200)[16](32).ferries
// foo[9].ferries(toodles and loodles)
// foo

// foo("baz").bar

// foo.bar(20)

// foo
// .bar(30)

// foo.bar

// .biz(30)

// 7 plus(1)
// foo(30)(40)
// foo(100)[9]
// foo["bar" cc. "yo"]
// foo["bar" cc. "yo"]
// "baz" "bar" foo at at
// [foo "bar"]
// 
// "baz" "bar" 


false && thumbscript4.tokenize(`
// foo
// // .bar(biz)[20]
// .bar(biz)
// .(20 @plus 3)


// foo.bar.baz: 10

// foo.bar baz:: 20

// if. 10 lt(100) {
//     0
// }
// if. lt(10 100) {
//     say. "yay lt"
// }
// a: 100
// a say

// foo.bar: 10
// foo.(bar): 10
// yo.stuff: 3
// a::

// =>1
// 100 :a
// 100 :foo.bar
// 100 :(foo.bar)
// 100 :(("foo" get).(1 1 plus))

// 1<=
// a: 100
// a = 100
// foo.bar: 100
// foo.bar.baz: 100

// <=
// (a): 100
// (foo.bar): 100
// (foo.bar.baz): 100
// ("foo" get).(1 1 plus): 100


// a.(b) = 20

// 100 :a
// foo.(bar) : 100

// foo.bar


// a =
// 100 => foo.bar


// myobj.("my" "prop" cc): "updated5"
// b: "a"

// 12 :a 13 :b

// a: 20 b: 30

// a[b] = 3

// 27 [var] = 20

// o = [:]
// •not y.a

// myobj.count: myobj.count 1 plus
// myobj.count: myobj.count 1 plus
// myobj.count < 1 2 plus
// x = 1
// x: 1
// 1 x plus :x

// 1 IS 3

// a.b c.d
// a[b](2 3)

// x: 3 2 plus
// a[x.y]
// 1 Plus 2
// 1 PLUS a.b
// 1 PLUS upper("name")

// foo.me = 1 PLUS 2
// foo.me: biz.baz bar: 1
// foo: 3 bar: 1

// 20 :a.b
// 20 > a.b 30 > c.d

// a[b]: 10 1 plus c[d]: 20
// a[b] = 10 1 plus
// c[d] = 20
// 10 1 plus :b 30 1 plus :c
// a.b = 1
// c = 3(2) 

// say. 200 b: 10
// say. 200
// a.b: 10
// a[b]: 10
// [a] = 20
// a: 1
// a = 1
// a.b = 1
// a.b: 1
// a: 1
// a[b]: 10

// 20 :b
// 30 :b.a
// 30 :b[a]

// a.(foo) = 3

// name: str
//     this just can't have "stuff in it
// 
// Loopn 3 {{}}
// a b
// Loopn 3 {
//     // :i
//     // "why hello " i cc say
//     "yo"
// }
// a: [name: "Drew"]
// chunks: [1]

// a = 1
// person = [
    // [theLast] = "LeSueur"
// ]
// [var]: 201
// "(2) it took \$[end •minus start] ms"
// a["colors"].blue = "ok"
// 1 •minus foo

// 1 PLUS a[foo].bar(baz)

// [foo].(bar)


// i9 < i9 plus(2)

// r1: newobj
// Loopn 3 {
//     :i1
//     say. "i1 is $i1"
//     r1[i1] = 10
// }
    // :i1
    // r1[i1] = 10
    
// r1: []
// "foozy" :i1
// a = 3
// a = 3
// i1: "foozy"
// r1[i1] = 10

// foo: raw «ok dokay»

// d.ExistingDeviceId = 1
// d.BAR = 1
// d["BAR"] = 1

// foo.Bar = 1
// foo.BAR = 1
// foo
// .bar
// yo

// yo foo. bar [
//     bizzy
// ] bazzy

// a .b c
// 1.2
// 1 .plus a.b(c d)

// foo.bar 


// a .math.plus b
// . 10
// elif. x y
// a : 3
// a: 3

// hi. {}; foo. bar
// if. 1 {
// 
// }
// else. {
// 
// }


// if. 1 {
// 
// }; elseif. 0 {
// }; else. {
// 
// }

// 1.2
// "foobar" --slice 1 -4
// nowmillis :start

// if. yo { // hi
// }
// and -thing 3 // ok
// foo bar.baz
`, true) // _aquamarine

function promiseCheck(name) {
    return new Promise(function (res, rej) {
        setTimeout(function () {
            if (name == "Drew") {
                rej("rejected")
            } else {
                res("hello " + name)
            }
        }, 10)
    })
}
globalVar.promiseCheck = promiseCheck

globalVar.xyzzy = 123

globalVar.gulp = {
    yo: function () {
        alert("yo")
    },
    yo2: function () {
        alert("yo2")
    },
    yo3: null,
    yo4: {}
}
// `; var code2 = `
// `; var code2 = `
// `; var code2 = `
// `; var code2 = `
// `; var code2 = `


// var county = 0
// var start = Date.now()
// for (var i=0; i<100_000; i++) {
//     county += i
// }
// log2("js: it took " + (Date.now(i) - start))
// log2("js county: " + county)

// idea fresh syntax of only =
// a = 10
// foo.bar.baz = 30
// a =
// foo.(bar).baz = 100
// :(foo.bar.baz)

// `, window); false && thumbscript4.eval(` // _lime
false && thumbscript4.eval(` // _lime

x: 3



// ifso. x .is 3
//     say. "yay it's 3"
// endif.


if. 1 {

}; else. {

}

// trim. 3;




a: 900
say. "hello $a"

#main

a: 101
say. "a is $a"
say. raw «a is $a»
say. indented «
    Hello
    this is an indented string
    ok? $a
»
say. «
    Hello
    this is an indented string
    ok? $a
»
say. rawindented «
    Hello
    this is an indented string
    ok? $a
»
say. "done"


// r1: []
// "foozy" :i1
// i1: "foozy"
// r1[i1] = 10


`, globalVar); false && thumbscript4.eval(` // lime marker

every. [100 200 300 400 500] 2 {
    :v2 :i2 :v1 :i1
    "every a: $i1: $v1" say
    "every b: $i2: $v2" say
}


i9: 0
loopn. 10 {
    if. i9 gte(8) {
        breakp
    }
    // i9 = i9 plus(2)
    say. "i9 is $i9"
    i9 = i9 plus(2)
}




loopn. 3 {
   say. "hi " swap cc
   // stop
   break
   say. "bye " swap cc
}

// say. "yo"
// If 1 {
//     say. "ok"
// }
// a: 1 PLUS 2

say. "here?"
a: [name: "yo"]
20 > a["bar"]
21 :a["baz" "biz" cc]
22 > a["boz" "biz" cc]

a["colors"] = [red: "yea"]

color: "green"
a["colors"]["red"] = "ok"
a["colors"].blue = "ok"
a["colors"][color] = "ok"
say. a


a: [name: "Drew"]
say. a


chunks: [1]
say. chunks

// say. "+++++++"


loopn. 3 {
    :i
    "why hello " i cc say
}

// Loopn 3 {
//     :i45
//     "why hello " i45 cc say
// }

// Loop 3 {
//    :i
//    500 sleepms
//    i "The value is " swap cc say
// }

say. "hello world!"

1 .is 1
" what was that" cc say

// say. "+hello world!"
say. "===="
// say. "+++"
makeIncr: {
    x: 0
    // { x++ x }
    // {
    //     x: x 1 plus
    //     x
    // }
    // {
    //     x = x 1 plus
    //     x
    // }
    {
        1 x plus > x
        x
    }
}

// say. makeIncr



"here's the incremented numbers" say

incr = makeIncr
incr say
incr say
incr say
"those were the incremented numbers" say

funcs: []
// Loopn 3 {
//     :i
//     "why hello " i cc say
//     {
//         "afterward " i cc say
//     } funcs swap push
// }

// Loopn 3 {
//     :i45
//     "why hello " i45 cc say
//     {
//         "afterward " i45 cc say
//     } funcs swap push
// }

// i44 = 0
// Call {
//     #outer42
//     If i44 3 gte { stopp }
//     say. "yay $i44"
//     {
//         #inner43
//         "afterward raw " i44 cc say
//     } funcs swap push
//     i44++
//     repeat
// }


// i = 0
// Call {
//     #outer42
//     If i 3 gte { stopp }
//     say. "yay $i"
//     {
//         #inner43
//         "afterward raw " i cc say
//     } funcs swap push
//     // i++
//     i = 1 i plus
//     repeat
// }
// funcs[0]()
// funcs[1]()
// funcs[2]()

each. funcs {
    call
}


// makeIncr: {
//     x: 0
//     // { x++ x }
//     {
//         x < x 1 plus
//         x
//     }
// }

if. false {
    say. "check 1" }
elseif. true {
    say. "check 2" }
elseif. {
    say. "check 3"
}

// If false {
//     say. "check 1"
// * Elseif true
//     say. "check 2"
// * Else
//     say. "check 3"
// }

x = 1
if. x is(0) {
    "it's 0" say
}
"not 0 let's keep going" say
elseif. x 1 is {
    "it's 1" say
}
"hmm we got here" say
else. {
    "it's neither" say
}



// empty object bs empty array
say. [
    [:] []
]


var = "b"
[var] = 201
"the value is $b" say

theLast = "last"
person = [
    name: [
        first: "Drew"
        [theLast]: "LeSueur"
    ]
]


// person["name"]["last"] = "bob"
person say

a = 100
say. "the a is $a"
person = [ name: "Drew" ]
say. person
person.name = "hiya"
say. person
theVar = "name"
person.(theVar) = "ok2"
say. person
person[theVar] = "ok3"
say. person
"ok4" > person["name"]
say. person
person["name"] < "ok5"
say. person
person = [name = "Bob"]
say. person

200 > a
"a is $a" say



theInner: {
    #inner
    {
        #inner2
        say. "before inner"
        say. "after inner"
    } call
    say. "sub here"
}

theOuter: {
    #outerFunc
    say. "Before"
    theInner
    say. "After"
}
theOuter

say. "done"

numbers: [10 20 30]

map. numbers {
    :n 1 n plus
}
say



// map. numbers {
//     1 plus
// }
// say
// "what??" say
// exit

person = [
    name: "drew" age: 39
    sports: [
        volleyball: [level: 8]
        basketball: [level: 1]
    ]
    sports.basketball.level: 3
]

a: 30 b: 40
say. "$a and $b"

a: 31
person.name = "Bob"
say. "$a and $b"

say. person

// exit
100 :a
say. a

a: 101
say. a


"what's the length here" say
"1234" length say
"1234" length() say


["yo" :myprop] :myobj
say. myobj.myprop

"updated" :(myobj.myprop)
say. myobj.myprop

"updated2" :(myobj.("my" "prop" cc))
say. myobj.myprop

{ myobj } :getObj

// "updated3" :((getObj).("my" "prop" cc))
// say. myobj.myprop

"updated3.5" > (getObj).("my" "prop" cc)
say. myobj.myprop
"updated3.6" > (getObj)["my" "prop" cc]
say. myobj.myprop
"updated3.7" > getObj["my" "prop" cc]
say. myobj.myprop

myobj.myprop: "updated4"
say. myobj.myprop

myobj.("my" "prop" cc): "updated5"
say. myobj.myprop

myobj["my" "prop" cc]: "updated5.5"
say. myobj.myprop

myobj.myprop: "updated6"
say. myobj.myprop
myobj.myprop = "updated6.5"
say. myobj.myprop
myobj.myprop < "updated6.6"
say. myobj.myprop


a: 102
say. a

12 :a 13 :b
say. "$a and $b"

`, globalVar);  // _lime

thumbscript4.exampleCode = function () { // _maroon
/*
0 :count
"count is $count" say
nowmillis :start
"start is $start" say
numbers: [1 2]
each. numbers {
    "number is " swap cc say
}
 exit

a: 101
say. "🫐🫐🫐🫐🫐🫐🫐🫐🫐"
say. "hello"

// commenty gray marker
"(2) it took $[a] ms" say
say. "another"

// stop


yo: [
    stuff: "this is the stuff"
]
say. yo


yo.stuff: 3000
say. yo.stuff
// exit

foo: {
   :a
   100 a plus
}

// say. 30 foo
// say. foo(30)
// say. foo. 30

// if. 10 lt(100) {
//     0
// }

// if. 10 100 lt {
if. lt(10 100) {
    say. "yay lt"
}

// ltt: {
//     lt
// }
// lt(10 100) say

3 loopn. {
    {
        0 :count
        0 :i
        nowmillis :start
        {
            if. i gt(100_000) {
            // if. i 100_000 gt {
                stopp
            }
            
            // if. i gt(100_000) ~stop
            
            // i 100_000 gt {
            //     stopp
            // } ?
            // count: count plus. i
            i count+=
            
            // i: i plus. 1
            i++
            
            // "testing how slow" drop
            // "testing how slow" drop
            // "testing how slow" drop
            // "testing how slow" drop
            // "testing how slow" drop
            // "testing how slow" drop
            // "testing how slow" drop
            // "testing how slow" drop
            
            
            // "testing how slow" jsdrop
            // "testing how slow" jsdrop
            // "testing how slow" jsdrop
            // "testing how slow" jsdrop
            // "testing how slow" jsdrop
            // "testing how slow" jsdrop
            // "testing how slow" jsdrop
            // "testing how slow" jsdrop
            
            // "testing how slow"
            // "testing how slow"
            // "testing how slow"
            // "testing how slow"
            
            // "testing how slow" ~drop
            // "testing how slow" ~drop
            // "testing how slow" ~drop
            // "testing how slow" ~drop
            // "testing how slow" ~drop
            // "testing how slow" ~drop
            // "testing how slow" ~drop
            // "testing how slow" ~drop

            // count 1 plus :count
            // i 1 plus :i

            repeat
        } call
        nowmillis :end
        end •minus start :total
        "end: $end; start: $start" say
        "(manual) it took $total ms // maroon marker" say
        "+count is $count" say
    } call
    say. "-------"
    say. ""
}

goto. @countPart

3 loopn. {
    say. "hiyaya"
    say. "yo"
}

exit

loopn. 3 {
    a: 1
    if. a is(1) {
        say. "yay 1 // teal marker"
    }
}

#yo

foo: newobj
// foo["bar"]: 30
say. foo



null
urlencode
tojson
say

// point 1

// alert plus. 3 4
// alert 3 •plus 4
a: [b: 1 2 plus c: 40 3 minus]
say. a tojson


person: [
    [score: 10]
]
person tojson say
assertempty. "a check" // olive marker


// [person 0 @score] props say
person 0 at say
// person.0.score say

list: ["drew" "cristi"]
list at(0 plus. 1) say


window @xyzzy at "xyzzy is " swap cc say

if. 1 1 is {
    say. "it's 1"
}

if. 1 1 is {
    say. "it's 1"
}

// window.gulp {

10 {
    :i
    i say
    if. i 5 is { stopp }
} loopn
#done

say. "done"

loopn. 10 {
    :i
    say. "yay $i"
    if. i 5 is {
        say. "tried to break"
        stopp
    }
}



{
    say. "what"
} call


a: 20
say. "hello $a"
say. "hello $[a 1 plus]"

assertempty. "first assert" // olive marker

say. "hello"
"hello" say
// loopn 10 {
//     say
// }
if. 1 1 is {
    say. "it's 1"
}
// window.gulp {

10 {
    :i
    say. "yay $i"
    // i 5 is {
    //     stopp
    // } ?
    if. i 5 is {
        say. "tried to break"
        stopp
    }
} loopn

loopn. 10 {
    :i
    say. "yay $i"
    // yo
    if. i 5 is {
        say. "tried to break"
        stopp
    }
}

// point 2

assertempty("prewow") // olive marker
#a
foreach. globalVar {
    #b
    :v :k
    if. ~v.toString {
        #c
        if. typename(~v) is("function") not {
            #d
            say. "$k: is not a function!"
            "endy" goto
            // 3 stopn 
        }
        say. "$k: $[typename. ~v]"
        source: v.toString
        if. source contains("native code") {
            say. v.length
            say. ""
            say. k
            say. source
        }
    }
}
#endy
assertempty("assert after wow") // olive marker



say. plus. 1 2
abc: plus. 100 1
say. "abc is $abc"

"abcdefg" slice(0 3) "sliced: " swap cc say

say. cc. "sliced: " "abcdefg" slice(0 3)

x: 3
if. x is(3) {
    say. "wow x is 3"
}


str: "some random string"
// alert. str.length
// alert. [0 5] str.slice
// ["2020-01-02"] ~Date new say
["2020-01-02"] ~Date new say
"Drew" promiseCheck :v
say. lastError
say. v

person: [friend1: [name: @pete] friend2: [name: @tom]]
person.friend1.name: "Peterio"
key: @friend2
person[key].name: "Tomio"
person say

"Repeter" :person.friend1.name
key: @friend2
"Retom" :person[key].name
person say


// x plus(2)
// "why hello" slice(0 3) say


// if. x @lt 20


// point 3


funcs: [
    sayHi: {
        say. "Hi!"
    }
]

funcs.sayHi



// a: 1 1 plus
// "a is $a" say
// b: [ name: 1 1 plus ]
// "b is " say
// b say



addProp: {
    dup
    // this syntax broken
    (10 1 plus):: "was here"

    // alternatively
    // :obj
    // obj $someProp:: "was here"
    // obj

    // one day?
    // obj.someProp: "was here"
}

{
    c: [
        name: 1 1 plus
    ] addProp
    "c is " say
    c say
} call

// assertempty

say. "yo world"


x: 1
x 20 lt @end1 jumpelse
"WOW" say
#end1






if. x 10 is {
    say. "x is 10"
}
elseif. x 20 is {
    say. "x is 20"
}
else. {
    say. "x is something else"
}




// ifelse. {
//
// }
//
// cases. [
//
// ]
// x






// If 1 1 is {
//     "it's 1" alert
// }


@hi say
person: [friend1: [name: @pete] friend2: [name: @tom]]
person say



person.friend1.name: "Peterio"
person say

p: [name: "drew"]
p say

// point 4


assertempty. "a checky1" // olive marker


@yo say

v: 1 2 plus
"v is @v" say
3 4 plus say



// . is no op!
// if first on new line
// if (x is 3)
// if
// if x is 1 {
// }
//
// loopn 3 {
//
// }



assertempty. "a checky2" // olive marker



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





[100 200 300 400] {
    :v :i
    "$i: $v" say
} foreach
"" say
[100 :a 200 :b 300 :c 400 :d] {
    :v :k
    "$k: $v" say
}  foreach


"yo" say
// 0 :i
// {
//     // { breakp } i 100 gt if
//     ~breakp i 100 gt if
//     i++
//     "number is $i" say
// } loop


// { say } :saything
// ~saything 20 loopn
// "all done" say

// 200 alert

10 {
  say
} loopn

{ -1 } { 0 } and :a
"value of a is $a" say

{ 0 } { 100 } or :b
"value of b is $b" say

// person: [a: 1 friend: [b: 1]]

assertempty. "a check -1" // olive marker
foo: [bar: [baz: 3]]
foo say

[foo @bar @baz] props say

// assertempty. "a check0" // olive marker
10 :[foo "bar" "baz"]


[foo @bar @baz] props say

[foo "bar" "baz"]: 30
[foo @bar @baz] props say

foo @bar at @bat at say

assertempty. "a check0.1" // olive marker


// person say

// "woa" : [person "a" "friend" "c"]

"Drew" :name
"the name is $name" say
•say "the name is $name"

#countPart
say. "we're in the countpart"
say. lf


do. {
    0 :count
    nowmillis :start
    100_000 {
        count+=
    } jsloopn
    nowmillis :end
    end •minus start :total
    "jsloopn: it took $total ms // pink marker" say
    "count is $count" say
}

say. 

    {
        0 :count
        nowmillis :start
        100_000 {
            count+=
        } jsloopn
        nowmillis :end
        end •minus start :total
        "jsloopn again: it took $total ms // pink marker" say
        "count is $count" say
    } call

{
    0 :count
    // { count plus :count } 5000000 timeit
    // { count plus :count } 100 timeit
    // { count+= } 100 timeit
    // { count+= } 100000 timeit

    // with jsloopn 18 ms
    // with loopn inline sub 60ms
    // { count+= } 100000 timeit

    // 100000 { count plus :count } timeit
    100_000 { count+= } timeit
    "ok cool yea count is $count" say


    // 70 :count2
    // { count2+= } 100 timeit
    //
    // ["count2 is" count2] sayn
    // h say
} call
say. "-------"
say. ""
assertempty. "a check0.25" // olive marker

say. "what about here2?"


// commenty gray marker
// {
//     0 :count
//     start: nowmillis
//     100_000 { count+= } timeit
//     "count is $count oh boy" say
//     end: nowmillis
//     say. "(2) it took $[end •minus start} ms"
// } call
// say. "-------"
// say. ""


say. "what about here?"

// commenty gray marker
// 3 loopn. {
//     {
//         0 :count
//         0 :i
//         nowmillis :start
//         {
//             i 100_000 guardlt
//             // i 100_000 lt guardb
//             // if. i •gt 100_000 {
//             //     breakp
//             // }
// 
//             i count+=
//             // count: count plus. i
//             // count+=. i
// 
//             // i: i plus. 1
//             // i 1 plus :i
//             i++
//             repeat
//         } call
//         nowmillis :end
//         end •minus start :total
//         "end: $end; start: $start" say
//         "(repeat guardlt) it took $total ms // blue marker" say
//         "+count is $count" say
//     } call
//     say. "-------"
//     say. ""
// }


say. "how we get here?"

3 loopn. {
    {
        0 :count
        0 :i
        nowmillis :start
        100_000 jsloopn. {
            count+=
        }
        nowmillis :end
        end •minus start :total
        "endy2: $end; start: $start" say
        "it took $total ms // pink marker" say
        "count is $count" say
    } call
    say. "-------"
    say. ""
}



assertempty. "a check0.5" // olive marker

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



assertempty. "a check1" // olive marker

"that was cool" say

"----" say

5 {
    :x
    "+value is $x" say
    ("checking 0" say x •is 0) { "zero" say } ?
    ("checking 1" say x •is 1) { "one" say } ??
    ("checking 2" say x •is 2) { "two" say } ??
    ("checking 3" say x •is 3) { "three" say } ??
    ("running else" say) { "other" say } ?;
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
        result n times > result
        n 1 minus > n
        repeat
    } call
    result
} :factorial

"///////" say
"10 factorial is: " 10 factorial cc say

// 1 1 plus 3 4 plus times

// "what is your name?" prompt :name

"Hello " name cc say


20 :n
n 1 plus
say


// exit washerefeb1 (a)


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
} loopn


window @xyzzy at "xyzzy is " swap cc say

100 :count
count say
count: 100
count say

//
person: [
    [score: 10]
]
person say
assertempty. "a check" // olive marker


[person 0 @score] props say

500 :[person 0 @score]
[person 0 @score] props say

[person 0 @score]: 600
[person 0 @score] props say
"🍅" say
"🍅" encodeURIComponent say

// 1 2 3 •5 4 6
// foo •(bar baz) biz
// another •"here" two foe


// what (5 •6 4) foobar
// dump
// exit

7 •plus (1 •times 2) say




// ["drew" :name] :person
// "Drew2" [person "name"] setc
// "Drew2" : [person "name"]
//
// "Drew" : name
// •name : "Drew"


[@hi @my •@is @name @drew] sayn
[@hi @my •"is" @name @drew] sayn

10 {
    "hello! " swap cc say
} loopn

every. [100 200 300 400 500] 2 {
    :v2 :i2 :v1 :i1
    "every: $i1: $v1" say
    "every: $i2: $v2" say
}

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

assertempty // olive marker

"every day is a new day" " " split :mylist

every. mylist 2 {
    4 take say
} 


[] :mylist
// •loopn •20 { mylist swap push }
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
        { abstractbreak nameworld 3 stopn } dyn :break
        "what is gong on?" say

        // 1 stopn
        stop

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
//


{ #incrfunc :name
    "the value is " name get cc say
    name get 1 plus name set
} dyn :incr1
{
    #testwrapper
    99 :foo
    @foo incr1
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
    i •is 6 { stopp } ?
    "ok number is " i cc say
} 10 loopn

{
    0 :i {
        i •lt 4 guard
        @looping say
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


@Drew :name
name say
[999 2 3 4] :mylist

"the first item is " mylist 0 at cc say
[@blue :eyes @brown :hair] :info

info say

info @eyes at say

info @hair at say

info @ha @ir cc at say

@ha @ir cc :key
info key at
say

[
    @Drew :name
    38 :age
    [
        @programming @volleybal @family
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
"The selected b is " [person @work @secondary @b] props cc say


"how on earth??? 🌍" say
2011 [person @work @secondary @b] setc
"The selected b is " [person @work @secondary @b] props cc say
"The selected b is " [person @work x 1 match @main @secondary cond @b] props cc say

"hello world" :message

"The message is " message cc say



"The list has " mylist length cc " elements" cc say
«The list has » mylist length cc « elements» cc say


@hi :name2
name2 say



@Why @hello cc name cc
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

{ @! cc } :exclaim


{say} :sayo
@foobar sayo

@hi exclaim
@bye exclaim
cc say

{ cc } :b
@foo @bow b say


{
    @hello say
    @goodbye say
    return
    @goodday say
    @sir say
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
        stopp
    } { 300 } cond call

    500
} :something2
something2
say




// this tests the desugaring
bug: {•plus 1}
fix: {•times 100}
foo: [bar: 30]

•say foo

foo2: •fix •bug 3
•say foo2

7 bug fix :foo2
•say foo2
•say foo



200 :a
50 :b
{ 900 :a  "b is " b cc say } :somefunc
202 :a
"the value of a is " a cc say
somefunc
"the value of a is " a cc say


*/
}
var code = thumbscript4.exampleCode.toString().split("\n").slice(2, -2).join("\n")



// alert(greet("drew"))



// come back to this
// var world = thumbscript4.eval(thumbscript4.stdlib, {})
// thumbscript4.defaultState = world.state
// log2(world.state.a)


 // mid 70 ms for the onenperf check
// thumbscript4.eval(code, {})
thumbscript4.eval(code, globalVar, [], {async: true}) // red marker
// window makes my test a bit slower (in 80s) interesting
// actuallt down to sub 60 ms now. with inlining
// was mis 60s before.
// showLog()


// setTimeout(function() {
//     showLog()
// }, 1001)

thumbscript4.makeJsFunc = function (f) {
    var lines = f.toString().split("\n").slice(1, -1)
    var code = lines.join("\n")
    return function (...args) {
        var stack = []
        for (let arg of args) {
            stack.push(arg)
        }
        var world = thumbscript4.eval(code, globalVar, stack, {
            async: false
        })
        // alert(JSON.stringify(world.stack))
        return world.stack.pop()
    }
}


thumbscript4.makeJsFuncString = function (code, state) {
    return function (...args) {
        var stack = []
        for (let arg of args) {
            stack.push(arg)
        }
        var world = thumbscript4.eval(code, state || globalVar, stack, {
            async: false
        })
        // log2("state is: ")
        // log2(world.state)
        // alert(JSON.stringify(world.stack))
        return world.stack.pop()
    }
}

// template tag business
globalVar.ths = function (strings, ...values) {
    // Start with the raw string part
    var rawStrings = strings.raw
    
    if (globalVar.Bun) {
        // bun broken here
        // console.log(String.raw`•»`)
        
        // Bun Output:
        // \u2022\u00BB

        // Node.js output
        // •»

        // this fix will break if someone actually wanted the escaped unicode
        // hopefully Bun fixes their bug
        // https://github.com/oven-sh/bun/issues/9891
        rawStrings = rawStrings.map(str => {
            return unescapeUnicodeChars(str)
        })
    }
    let result = rawStrings[0];
    // Loop over the values (the interpolated expressions)
    for (let i = 0; i < values.length; i++) {
        // Add the current value and the next raw string part
        result += values[i] + rawStrings[i + 1];
    }
    var f = thumbscript4.makeJsFuncString(result)
    return f;
}
var greet = thumbscript4.makeJsFunc(() => { /*
    :a
    "Hello " a cc
*/ })
/*




*/
if (typeof global != "undefined") {
    global.thumbscript4 = thumbscript4
}
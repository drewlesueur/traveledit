var thumbscript4 = {}


// because of terms, you can get rid of storefunc and callstored
// func(a b): { } syntax

// a: 10 1 plus b: 30
// a = 10
// foo.bar < 300
// 10 1 plus :b 30 1 plus :c


// allow foo["bar"]: 20
// get rid of foo $bar:: 20
// get rid of [foo $bar]: 20
// allow ewual sign as alternate to :
// a = b means a: b
// auto parens around a.b[c PLUS d] or foo(biz)


// idea for perf. after desugaring, you can remove the parens

if (typeof log2 == "undefined"){
    log2 = function (x) {
        console.log(x)
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

// thumbscript2 parser was cool with optional significant indenting
thumbscript4.tokenize = function(code, debug) {
    var leftAssignSugar = true // count: count 1 plus
    var funcFirstWithDotSugar = true // say. "hello world" or .say "hi"
    var funcFirstWithUpper = true // Say "hello world" or .say "hi"
    var allUpperSugar = true // 1 PLUS 2
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
            if ("([{".indexOf(token) == -1 && token.charAt(0) != "$") {
                token = "$" + token
            }
            quoteNext = false
        }
        // if (!token) {
        //     log2(tokens)
        //     return
        // }
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
                // addToken2("$" + token.slice(0, -2))
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
        //     addToken2("$" + token.slice(0, -1))
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
            if (token.charAt(0) == "$") {
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
            // } else if (".".indexOf(chr) != -1 && ")]}".indexOf(code.charAt(i-1)) != -1) {
            } else if (".".indexOf(chr) != -1) {
                
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
                    
                    addToken("<-")
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
                    addToken("->1")
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
            } else if (" \n\t".indexOf(chr) != -1) {
                
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
                if (leftAssignSugar && addClosingParensOnNewLine && "\n".indexOf(chr) != -1) {
                    // TODO: I check for close too much
                    // also should not check leftAssignSugar just addClosingParensOnNewLine
                    for (let i = 0; i < addClosingParensOnNewLine; i++) {
                        addToken(")") // addedClosingParen pink marker
                    }
                    addClosingParensOnNewLine = 0
                }
                if (leftAssignSugar && "\n".indexOf(chr) != -1) {
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
            } else if ("•@".indexOf(chr) != -1) {
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
            } else if (".".indexOf(chr) != -1 && "\n ".indexOf(nextChar) == -1) {
                
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
                    //     Say "hi" b: 10
                    // This is not
                    //     Say "hi" a.b: 10
                    
                    let t = tokens.pop() // will be a "("
                    
                    if (addClosingParensOnNewLine) {
                        for (let i = 0; i < addClosingParensOnNewLine; i++) {
                            addToken(")") // addedClosingParen pink marker
                        }
                        addClosingParensOnNewLine = 0
                    }
                    tokens.push(t) // funkiness

                    addToken("$" + currentToken)
                    addToken(")") // 🥑 green marker
                    addToken("1<-")
                    freshLine = true // darkorange marker
                    // if (leftAssignSugar && tokens[tokens.length - 2]?.onFreshLine) {
                    if (leftAssignSugar) {
                        addToken("(") // addLeftParen
                        addClosingParensOnNewLine++
                    }
                }
                currentToken = ""
                state = "out"
            } else if (" \n\t".indexOf(chr) != -1) {
                let addedToken = currentToken
                addToken(currentToken)
                currentToken = ""
                state = "out"
                addToken(")") // 🥑 green marker
                    
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
                } else if (funcFirstSugar && addClosingParensOnNewLine && "\n".indexOf(chr) != -1) {
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

                    addToken(tokenName)
                    addToken("<>")
                    addToken("(")
                    addClosingParensOnNewLine++
                } else if (allUpperSugar && " \n".indexOf(chr) != -1 && (addedToken.toUpperCase() == addedToken && addedToken.toLowerCase() != addedToken)) { // red marker
                    let tokenName
                    tokenName = addedToken.toLowerCase()
                    tokens.pop() // 🥑 green marker
                    tokens.pop()
                    tokens.pop() // 🥑 green marker
                    addToken("•")
                    addToken(tokenName)
                } else if (funcFirstWithUpper && " \n".indexOf(chr) != -1 && (addedToken[0].toUpperCase() == addedToken[0] && addedToken[0].toLowerCase() != addedToken[0])) { // red marker
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
                } else if (funcFirstWithDotSugar && addClosingParensOnNewLine && "\n".indexOf(chr) != -1) {
                    for (let i = 0; i < addClosingParensOnNewLine; i++) {
                        addToken(")") // addedClosingParen pink marker
                    }
                    addClosingParensOnNewLine = 0
                }

                if (leftAssignSugar && addClosingParensOnNewLine && "\n".indexOf(chr) != -1) {
                    for (let i = 0; i < addClosingParensOnNewLine; i++) {
                        addToken(")") // addedClosingParen pink marker
                    }
                    addClosingParensOnNewLine = 0
                }
                if (leftAssignSugar && "\n".indexOf(chr) != -1) {
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
                var prevToken = tokens.pop()
                if (prevToken?.th_type == varType && prevToken.valueString == "raw") {
                    addToken("$" + currentToken)
                } else {
                    if (prevToken) {
                        tokens.push(prevToken)
                    }
                    if (currentToken.indexOf("$") != -1) {
                        tokens.push({th_type: interpolateType, valueString: currentToken})
                    } else {
                        addToken("$" + currentToken)
                    }
                }
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
                    var prevToken = tokens.pop()
                    if (prevToken.th_type == varType && prevToken.valueString == "raw") {
                        addToken("$" + currentToken)
                    } else {
                        tokens.push(prevToken)
                        if (currentToken.indexOf("$") != -1) {
                            tokens.push({th_type: interpolateType, valueString: currentToken})
                        } else {
                            addToken("$" + currentToken)
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
            if ("•@".indexOf(chr) != -1) {
                currentToken += chr
            } else {
                i--
                addToken(currentToken)
                currentToken = ""
                state = "out"
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
    // return // REMOVE THIS! maroon marker
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
thumbscript4.desugar = function(tokens, debug) {
    tokens = thumbscript4.desugarAtSign(tokens)
    // if (debug) {
    //     log2("+desugared (before parens)")
    //     log2(tokens)
    // }
    
    // Do it after first desugarAtSign asomwe can check the at sign
    tokens = thumbscript4.desugarArrows(tokens) // white marker
    if (debug) {
        log2("+desugared (arrows)")
        log2(tokens)
    }
    
    
    tokens = thumbscript4.desugarAtSign(tokens)
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
    while (i < tokens.length) {
        var token = tokens[i]
        if (token.th_type == builtInType) {
            if (token.name == "?" || token.name == "if") {
                // hmm if I used a linked list for tokens,
                // then it moght be easier to point to thr end node, instead of end index
                // that might make inlining easier.
                token.endOfIfChainI = -1
                currentIfs = []
                currentIfs.push(token)
            } else if (token.name == "??" || token.name == "elseif") {
                token.endOfIfChainI = -1
                for (var j=0; j < currentIfs.length; j++) {
                    currentIfs[j].endOfIfChainI = i
                }
                currentIfs.push(token)
            } else if (token.name == "?;" || token.name == "else") {
                for (var j=0; j < currentIfs.length; j++) {
                    currentIfs[j].endOfIfChainI = i
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
                case "->1":
                    // 100 -> a
                    // 100 a set
                    // newTokens.push(dotToken)
                    // newTokens.push(setToken)
                    // break
                    var tokenForSet = setlocalToken
                    if (token.valueString == ">") {
                        tokenForSet = setToken
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
                                ts.push(tokenForSet)
                            } else if (path.valueArr.length > 1 && path.valueArr[path.valueArr.length - 1].name == "at") {
                                path.valueArr.pop()
                                // path.valueArr[path.valueArr.length - 1].th_type = stringType
                                ts.push({th_type: builtInType, valueFunc: thumbscript4.builtIns.setpropKOV, name: "setpropKOV"})
                            } else {
                                if (path.valueArr && path.valueArr[0]) {
                                    path.valueArr[0].th_type = stringType
                                    ts.push(tokenForSet)
                                }
                            }
                        }
                    }
                    newTokens.push(dotTokenForRightAssign)
                    // end #color

                    break
                case "<":
                case "=":
                case "<-":
                    var tokenForSet = setbToken
                    if (token.valueString == "<-") {
                        tokenForSet = setblocalToken
                    }

                    // same as 1<- for now
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
                case "1<-":
                    // a 1<- 100
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
thumbscript4.desugarAtSign = function(tokens) {
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
            while (j < token.valueString.length && "•@".indexOf(token.valueString.charAt(j)) != -1) {
                j++
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

thumbscript4.evalQuick = function(code, oldWorld, state) {
    var tokens
    if (!oldWorld) {
        code = thumbscript4.stdlib + "\n" + code // red marker
    }
    tokens = thumbscript4.tokenize(code)
    world = {
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
        asyncGlobal: oldWorld?.asyncGlobal,
    }
    if (!world.global) {
        world.global = world
    }
    if (!world.asyncGlobal) {
        world.asyncGlobal = world
    }
    while (true) {
        newWorld = thumbscript4.next(world)
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

PretendArray = function () {
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
    clearTimeout(window.t99)
    // I tried to pass in the state of the stdlib
    // wasn't working, so just doing this hacky string concat.
    // would be nice to grab the state of the stdlib
    // problem might be some function scope?
    // look later
    // TODO: uncomment the stdlib addition!!!!
    code = thumbscript4.stdlib + "\n" + code // red marker

    var tokens = thumbscript4.tokenize(code)
    // log2(tokens)
    // return
    world = {
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
    }
    world.global = world
    world.asyncGlobal = world

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
        newWorld = thumbscript4.next(world)
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
        window.t99 = setTimeout(function() { thumbscript4.runAsync(world) }, 0)
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
        // if (world.onEnd) world.onEnd(world)
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
        if (world.onEnd) world.onEnd(world)
        var rWorld = world
        world = world.parent
        log2(`+world went from ${rWorld.name} to ${world.name}`)
        while (world && world.isParens) {
            alert("should not get here parens 4")
            world = world.parent
        }
        thumbscript4.recycle(rWorld)
        // todo: see onend
    }
    return world
}

// built in funcs have to have func call last?
thumbscript4.builtIns = {
    rand: thumbscript4.genFunc1((a) => Math.floor(Math.random() * a)),
    say: thumbscript4.genFunc1NoReturn(a => { log2(a) }),
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
    eq: thumbscript4.genFunc2((a, b) => a === b),
    ne: thumbscript4.genFunc2((a, b) => a !== b),
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
    props: thumbscript4.genFunc1((a) => {
        var v = a[0]
        for (var i = 1; i < a.length; i++) { v = v[a[i]] }
        return v
    }),
    not: thumbscript4.genFunc1((a) => !!!a),
    "cond": thumbscript4.genFunc3((a, b, c) => (a ? b : c) ),
    length: thumbscript4.genFunc1((a) => a.length),
    len: thumbscript4.genFunc1((a) => a.length),
    push: thumbscript4.genFunc2NoReturn((b, a) => a.push(b)),
    pop: thumbscript4.genFunc1((a) => a.pop()),
    unshift: thumbscript4.genFunc2NoReturn((b, a) => a.unshift(b)),
    shift: thumbscript4.genFunc1((a) => a.shift()),
    join: thumbscript4.genFunc2((a, b) => a.join(b)),
    slice: thumbscript4.genFunc3((a, b, c) => a.slice(b, c)),
    split: thumbscript4.genFunc2((a, b) => {
        return a.split(b)
    }),
    trim: thumbscript4.genFunc1((a) => a.trim()),
    indexof: thumbscript4.genFunc2((a, b) => a.indexOf(b)),
    contains: thumbscript4.genFunc2((a, b) => a && a?.indexOf(b) !== -1),
    replace: thumbscript4.genFunc3((a, b, c) => a.replaceAll(b, c)),
    tonumber: thumbscript4.genFunc1((a) => a - 0),
    urlencode: thumbscript4.genFunc1((a) => {
        if (a === null) {
            return ""
        }
        return encodeURIComponent(a)
    }),
    tojson: thumbscript4.genFunc1((a) => JSON.stringify(a)),
    tojsonpretty: thumbscript4.genFunc1((a) => JSON.stringify(a, null, "    ")),
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
                        world.state.lastError = null
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
                    world.state.lastError = err
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
        //         if (prop.startsWith("$")) {
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
            asyncGlobal: fWorld.asyncGlobal,
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
    wait: function (world) {
        var asyncWorld = world.stack.pop()
        // alert(asyncWorld.i + " " + asyncWorld.tokens.length)
        asyncWorld.onEnd = function () {
            for (let item of asyncWorld.stack) {
                world.stack.push(item)
            }
            thumbscript4.run(world)
        }
        return null
    },
    cancel: function (world) {
        var asyncWorld = world.stack.pop()
        if (!asyncWorld.stopped) {
            asyncWorld.stopped = true
            // if we don't call now we'd have to wait for next callback
            if (asyncWorld.onEnd) {
                asyncWorld.onEnd(asyncWorld)
            }
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
            dynParent: null,
            asyncParent: world,
            runId: ++thumbscript4.runId,
            indent: world.indent + 1,
            // cachedLookupWorld: {},
            global: fWorld.global,
            asyncGlobal: fWorld.asyncGlobal,
        }

        if (f.dynamic) {
            asyncWorld.parent = world
            // asyncWorld.cachedLookupWorld = {}
        }
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
                    newWorld = thumbscript4.builtIns.call_js_skipstack(world, f)
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
        // world.asyncGlobal: f.world.asyncGlobal,
        //
        // world.log = null
        // world.name = null
        // world.repeatCount = 0
        // world.onEnd = null
        
        
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
            global: fWorld.global,
            asyncGlobal: fWorld.asyncGlobal,
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
            if (world.onEnd) world.onEnd(world)
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
            if (world.onEnd) world.onEnd(world)
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
thumbscript4.builtIns["elseif"] = thumbscript4.builtIns["??"]
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
            if (world.onEnd) {
                world.onEnd(world)
            }
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
                    onEnd: function(world) {
                        if (Object.keys(world.state).length) {
                            world.dynParent.stack.push(world.state)
                        } else {
                            world.dynParent.stack.push(world.stack)
                        }
                    },
                    indent: world.indent + 1,
                    runId: ++thumbscript4.runId,
                    // cachedLookupWorld: {},
                    global: world.global,
                    asyncGlobal: world.asyncGlobal,
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
                // this is no longer called
                // it's desugared away

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
                //     asyncGlobal: world.asyncGlobal,
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
                    asyncGlobal: world.asyncGlobal,
                    isParens: true,
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
                //         if (prop.startsWith("$")) {
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
                window.xyzzy++
                break outer
            case anchorType:
                world.name = token.valueString
                break outer
            case interpolateType:
                var r = token.valueString
                var r = r.replace(/\$\{([^}]+)\}/g, function(x, code) {
                    // hacky
                    return thumbscript4.evalQuick(code, world)
                })
                var r = r.replace(/\$[\w]+/g, function(x) {
                    x = x.slice(1)
                    var w = thumbscript4.getWorldForKey(world, x, true, false)
                    return w.state[x]
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
thumbscript4.stdlib = function x() { /*
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
    guard: •dyn { not { 2 stopn } ? }
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
            :i
            a9 unshift
        } loopn
        a9
    }
    cases: {
        :c
        c length :m
        2 c {
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
                v ret push
            } ?
        } each
        ret
    }
    map: {
        :func :list
        [] :output
        list {
            func output push
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
            "${urlencode. key}=${urlencode. value}"
            r push
        }
        r join("&")
    }
    every: {
        :fn :list :skip
        i: 0
        loop. {
            if. i gte(list len) {
                breakp
            }
            
            // Loopn skip { :subi
            //     i PLUS (skip MINUS subi MINUS 1)
            //     list[i PLUS subi]
            // }
            // Looprange skip MINUS 1 0 {
            //    :subi
            //    i PLUS
            // }
            Loopn skip {
                :subi
                i PLUS subi
                list[i PLUS subi]
            }
            fn
            i = i plus(skip)
        }
    }
    looprange: {
        :fn :to :from
        
        If to LT from {
            n: to MINUS from PLUS 1
            Loopn n {
                :i
                from PLUS i fn
            }
            stopp
        }
        
        n: from MINUS to PLUS 1
        Loopn n {
            :i
            to MINUS i fn
        }
        
    }
    replacegroup: {
      :replacerMap :str
      chunks: [str]
      foreach. replacerMap { :toReplace :search
          newChunks: []
          every. 2 chunks {
              :nextPartialStr :nextI
              :partialStr :i
              subChunks: partialStr split(search)
              loopn. subChunks len {
                  :sI
                  subChunks at(sI) newChunks push
                  if. sI NE (subChunks len MINUS 1) {
                      toReplace newChunks push
                  }
              }
              if. i lt(chunks len MINUS 1) {
                  nextPartialStr push. newChunks
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
        config $method at :method
        headers: []
        config.headers not {
            config.headers: []
        } ?
        config $headers at {
            :v :k
            "-H " "$k: $v" bashStrEscape cc
            headers push
        } foreach
        headersStr: headers " " join
        dataStr: ""
        data: config $body at
        data {
            dataStr: " -d " data bashStrEscape cc
        } ?
        extraFlags: ""
        if. config.extraFlags {
            extraFlags: config.extraFlags
        }
        urlStr: config $url at bashStrEscape
        «
            curl ${extraFlags} -s -X $method $headersStr $dataStr $urlStr
        »
        config.debug { trim say "" } ~exec ifelse
    }
*/}.toString().split("\n").slice(1, -1).join("\n") + "\n"
thumbscript4.stdlib2 = function x() { /*
*/}.toString().split("\n").slice(1, -1).join("\n") + "\n"


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
// log2(thumbscript4.tokenize(`Say hi`, true))
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
// person: [friend1: [name: $pete] friend2: [name: $tom]]
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
// [person 0 $score] props say
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


thumbscript4.tokenize(`
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

// ->1
// 100 :a
// 100 :foo.bar
// 100 :(foo.bar)
// 100 :(("foo" get).(1 1 plus))

// 1<-
// a: 100
// a = 100
// foo.bar: 100
// foo.bar.baz: 100

// <-
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

// Say 200 b: 10
// Say 200
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
// "(2) it took \${end •minus start} ms"
// a["colors"].blue = "ok"
// 1 •minus foo

// 1 PLUS a[foo].bar(baz)

// [foo].(bar)


// i9 < i9 plus(2)

`, true) // aquamarine marker

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
window.promiseCheck = promiseCheck

window.xyzzy = 123

window.gulp = {
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


var county = 0
var start = Date.now()
for (var i=0; i<100_000; i++) {
    county += i
}
log2("js: it took " + (Date.now(i) - start))
log2("js county: " + county)

// idea fresh syntax of only =
// a = 10
// foo.bar.baz = 30
// a =
// foo.(bar).baz = 100
// :(foo.bar.baz)

thumbscript4.eval(` // lime marker
#main

Every 2 [100 200 300 400 500] {
    :v2 :i2 :v1 :i1
    "every a: $i1: $v1" say
    "every b: $i2: $v2" say
}

exit

i9: 0
loopn. 10 {
    if. i9 gte(8) {
        breakp
    }
    // i9 = i9 plus(2)
    Say "i9 is $i9"
    i9 = i9 plus(2)
}




Loopn 3 {
   Say "hi " swap cc
   // stop
   break
   Say "bye " swap cc
}

// Say "yo"
// If 1 {
//     Say "ok"
// }
// a: 1 PLUS 2

Say "here?"
a: [name: "yo"]
20 > a["bar"]
21 :a["baz" "biz" cc]
22 > a["boz" "biz" cc]

a["colors"] = [red: "yea"]

color: "green"
a["colors"]["red"] = "ok"
a["colors"].blue = "ok"
a["colors"][color] = "ok"
Say a


a: [name: "Drew"]
Say a


chunks: [1]
Say chunks

// Say "+++++++"


Loopn 3 {
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

Say "hello world!"

1 IS 1
" what was that" cc say

// Say "+hello world!"
Say "===="
// Say "+++"
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

// Say makeIncr



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
//     } funcs push
// }

// Loopn 3 {
//     :i45
//     "why hello " i45 cc say
//     {
//         "afterward " i45 cc say
//     } funcs push
// }

// i44 = 0
// Call {
//     #outer42
//     If i44 3 gte { stopp }
//     Say "yay $i44"
//     {
//         #inner43
//         "afterward raw " i44 cc say
//     } funcs push
//     i44++
//     repeat
// }


// i = 0
// Call {
//     #outer42
//     If i 3 gte { stopp }
//     Say "yay $i"
//     {
//         #inner43
//         "afterward raw " i cc say
//     } funcs push
//     // i++
//     i = 1 i plus
//     repeat
// }
// funcs[0]()
// funcs[1]()
// funcs[2]()

Each funcs {
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

If false {
    Say "check 1" }
Elseif true {
    Say "check 2" }
Else {
    Say "check 3"
}

// If false {
//     Say "check 1"
// * Elseif true
//     Say "check 2"
// * Else
//     Say "check 3"
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

`, window); false && thumbscript4.eval(` // lime marker
`, window); false && thumbscript4.eval(` // lime marker


`, window)

thumbscript4.exampleCode = function () { // maroon marker
/*

Say "hello"

// commenty gray marker
"(2) it took ${a} ms"
Say "another"

// stop


yo: [
    stuff: "this is the stuff"
]
Say yo


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

goto. $countPart

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


// [person 0 $score] props say
person 0 at say
// person.$0.score say

list: ["drew" "cristi"]
list at(0 plus. 1) say


window $xyzzy at "xyzzy is " swap cc say

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
    // say. "yay $i"
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
say. "hello ${a 1 plus}"

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
foreach. window {
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
        say. "$k: ${typename. ~v}"
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

person: [friend1: [name: $pete] friend2: [name: $tom]]
person.friend1.name: "Peterio"
key: $friend2
person.$key.name: "Tomio"
person say

"Repeter" :person.friend1.name
key: $friend2
"Retom" :person.$key.name
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
x 20 lt $end1 jumpelse
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


$hi say
person: [friend1: [name: $pete] friend2: [name: $tom]]
person say



person.friend1.name: "Peterio"
person say

p: [name: "drew"]
p say

// point 4


assertempty. "a checky1" // olive marker


$yo say

v: 1 2 plus
"v is $v" say
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

[foo $bar $baz] props say

// assertempty. "a check0" // olive marker
10 :[foo "bar" "baz"]


[foo $bar $baz] props say

[foo "bar" "baz"]: 30
[foo $bar $baz] props say

foo $bar at $bat at say

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

Say "what about here2?"


// commenty gray marker
// {
//     0 :count
//     start: nowmillis
//     100_000 { count+= } timeit
//     "count is $count oh boy" say
//     end: nowmillis
//     say. "(2) it took ${end •minus start} ms"
// } call
// say. "-------"
// say. ""


Say "what about here?"

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


Say "how we get here?"

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
        result n times :result
        n 1 minus :n
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


window $xyzzy at "xyzzy is " swap cc say

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


[person 0 $score] props say

500 :[person 0 $score]
[person 0 $score] props say

[person 0 $score]: 600
[person 0 $score] props say
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


[$hi $my •$is $name $drew] sayn
[$hi $my •"is" $name $drew] sayn

10 {
    "hello! " swap cc say
} loopn

Every 2 [100 200 300 400 500] {
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

Every 2 mylist {
    4 take say
} 


[] :mylist
// •loopn •20 { mylist push drop }
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
    $foo incr1
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
        $looping say
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


$Drew :name
name say
[999 2 3 4] :mylist

"the first item is " mylist 0 at cc say
[$blue :eyes $brown :hair] :info

info say

info $eyes at say

info $hair at say

info $ha $ir cc at say

$ha $ir cc :key
info key at
say

[
    $Drew :name
    38 :age
    [
        $programming $volleybal $family
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
"The selected b is " [person $work $secondary $b] props cc say


"how on earth??? 🌍" say
2011 [person $work $secondary $b] setc
"The selected b is " [person $work $secondary $b] props cc say
"The selected b is " [person $work x 1 match $main $secondary cond $b] props cc say

"hello world" :message

"The message is " message cc say



"The list has " mylist length cc " elements" cc say
«The list has » mylist length cc « elements» cc say


$hi :name2
name2 say



$Why $hello cc name cc
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

{ $! cc } :exclaim


{say} :sayo
$foobar sayo

$hi exclaim
$bye exclaim
cc say

{ cc } :b
$foo $bow b say


{
    $hello say
    $goodbye say
    return
    $goodday say
    $sir say
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


thumbscript4.makeJsFunc = function (f) {
    var lines = f.toString().split("\n").slice(1, -1)
    var code = lines.join("\n")
    return function (...args) {
        var stack = []
        for (let arg of args) {
            stack.push(arg)
        }
        var world = thumbscript4.eval(code, window, stack, {
            async: false
        })
        // alert(JSON.stringify(world.stack))
        return world.stack.pop()
    }
}

var greet = thumbscript4.makeJsFunc(() => { /*
    :a
    "Hello " a cc
*/ })

// alert(greet("drew"))





// come back to this
// var world = thumbscript4.eval(thumbscript4.stdlib, {})
// thumbscript4.defaultState = world.state
// log2(world.state.a)


 // mid 70 ms for the onenperf check
// thumbscript4.eval(code, {})
thumbscript4.eval(code, window, [], {async: true}) // red marker
// window makes my test a bit slower (in 80s) interesting
// actuallt down to sub 60 ms now. with inlining
// was mis 60s before.
// showLog()


// setTimeout(function() {
//     showLog()
// }, 1001)

/*




*/

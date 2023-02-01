/*
examole

foo bar baz

foo (bar baz) biz

foo bar > baz
    biz bz
    buz bizz
        bozzy
        boo6
    bory
    
foo bar < baz
    biz
    buzzo
        bizoga bo
    
foo bar > baz
    biz bz
    buz bizz
        bozzy
        boo6
            bozzy7
    bory
foo (bar) $baz:$(biz biz):buz
foo (bar) $baz:$(biz (such thing) biz:$(other thing):yo (what thing)):buz



*/

var segmenter = new Intl.Segmenter('en', {granularity: "grapheme"})
function splitGraphemes(theLine) {
    // return theLine.split("")
    // return splitter.splitGraphemes(theLine)
    var a = []
    var segments = segmenter.segment(theLine)
    for (let {segment, index, isWordLike} of segments) {
      a.push(segment)
    }
    return a
    
    // This also works, strange to me this interface?
    // var si = segmenter.segment(theLine)[Symbol.iterator]()
    // return [...si].map(x => x.segment)
    // https://github.com/tc39/proposal-intl-segmenter
}

var thunbscript = {
}

// thumbscript.parseLine = function(line, parentLine, parentIndentLevel, world) {
//     loop letter by letter and make an array of tokens
//     
// }

thumbscript.eval = function(source, world) {
    var graphemes := splitGraphemes(source)
    var indent = 0
    var nodeStack = []
    var indentStack = []
    var state = "startLine"
    var nodes = []
    // var node = {tree: tree, children: null}
    var node = null
    var treeStack = [] // per line
    var tree = []
    var currIndent
    var word = ""
    for (var i=0; i < graphemes.length; i++) {
        var grapheme = graphemes[i]
        if (state == "startLine") {
            if (grapheme == " ") {
                currIndent += 1
            } else {
                if (currIndent > indent) {
                    indentStack.push(indent)
                    nodesStack.push(nodes)
                    indent = currIndent
                } else if (currIndent < indent) {
                    while (true) {
                        var indentedNodes = nodes
                        var indent = indentStack.pop()
                        nodes = nodeStack.pop()
                        nodes[nodes.length - 1].children = indentedNodes
                        word = ""
                        if (currIndent >= indent) {
                            break
                        }
                    }
                }
                state = "inWord"
                // with gotos it would be easier to not do the j-- ?
                j--
            }
        } else if (state == "inWord") {
            // every word automaticall gets wrapped
            // so you have to unwrap when you close.
            if (grapheme == "(") {
                if (word.length) {
                }
                treeStack.push(tree)
                tree = []
            } else {
            }
        }
    }
    
    // var lines = source.split("\n")
    // var theStack = []
    // var currState = {
    //     indentLevel: 0
    //     trees: []
    // }
    // for (var i=0; i < lines.length; i++) {
    //     var line = lines[i]
    //     var graphemes := splitGraphemes(line)
    //     // thumbscript.parseLine(line, parentLine, world)
    //     var treeStack = []
    //     var indentLevel = 0
    //     var tree = []
    //     var state = "startLine"
    //     var currWord = ""
    //     for (var j = 0; j < graphemes.length; j++) {
    //         if state == "start" {
    //             if (graphemes[i] == " ") {
    //                 indentLevel += 1
    //             } else {
    //                 if (indentLevel > currState.indentLevel) {
    //                     theStack.push(currState)
    //                     currState = {
    //                         indentLevel: indentLevel,
    //                         trees: []
    //                     }
    //                 } else if (indentLevel < currState.indentLevel) {
    //                     // how many do we pop?
    //                     while (true) {
    //                         var oldCurrState = currState
    //                         currState = theStack.pop()
    //                         // currState.trees[currState]
    //                         if (indentLevel >= currState.indentLevel) {
    //                             currState.indentLevel = indentLevel
    //                         }
    //                     }
    //                 }
    //                 state = "startWord"
    //                 
    //             }
    //         } else if (state == "startWord") {
    //             if 
    //         }
    //     }
    // }
}
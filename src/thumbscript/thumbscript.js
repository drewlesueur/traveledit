// lazy calls?
/*

a = or
   some call
   other call

a = or ; some call ; other call
if eq x 3
   do somethjng
else
  
greeted = greet name drew

ret = or x | something else
  do

b = fn
   greet @name


people:0:HEIGHT
people:currPerson:@height

@How


number = rand from 0 to 100

loop
    guess = ask Guess the number
    if $guess > $number
        say Too high, guess again
        break
    
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

var thumbscript = {
    state: {
        
    },
    keysByPrefix: {},
}

thumbscript.eval = function(str) {
    var evalWord = function(word) {
        if (!word) {
            return ""
        }
        
        if (word.charAt(0) == "@") {
            return word.slice(1)
        }
        
        if (word in thumbscript.state) {
            thumbscript.state[word]
        }
        
        // for (var i=0; i < words.length; i++) {
        //     var word = words[i]
        // }
    }
    var evalCall = function(words) {
        if (words.length == 0) {
            return ""
        }
        
        var f = evalWord(words[0])
        var oldValues = {}
        
        for (var i=1; i < words.length; i+=2) {
            var key = words[i]
            var value = words[i+1]
            oldValues[key] = thumbscript.
        }
        
    }
    var lines = str.split("\n")
    var calls = []
    for (var i=0; i < lines.length; i++) {
        var line = lines[i]
        if (line.trim().length == 0) {
            continue
        }
        var words = line.split(" ")
        calls.push(words)
        var nextLine = lines[i+1]
        var subLines = []
        var snaggedI = i
        var origI = i
        for (i+=1; i < lines.length; i++) {
            var nextLine = lines[i]
            // log2(`nextLine:${origI}: ${nextLine}`)
            if (nextLine.trim().length == 0) {
                if (nextLine.length > 4) {
                    subLines.push(nextLine.slice(4))
                } else {
                    subLines.push("")
                }
                subLines.push("")
                snaggedI = i
                continue
            }
            if (nextLine.charAt(0) == " ") {
                subLines.push(nextLine.slice(4))
                snaggedI = i
                continue
            }
            i = snaggedI
            break
        }
        words.push(subLines.join("\n"))
        evalCall(words)
    }
    return calls
}




var r = thumbscript.eval(`
hello world
how are you
    pretty good here
    yea pretty good
good and you
    great
        so great
        yea
        
`)

log2(r)
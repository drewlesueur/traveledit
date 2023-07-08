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




name Drew

people
    name Drew
    age 38
    
    nam
    




Greet
    input name d

name Drew



play:
    random 1 100 /n
    guessLoop:
    n
    prompt Guess the number
    if less
        print too low
        goto guessLoop
    else if more
        print too high
        goto guessLoop
    else
        print you win!

doGame:
play
prompt want to play again?
if yes, goto doGame

print All Done

findWordEntered newLine existingLine:
    length /newLineLength
    length
    if less
        return null
    
    0 /index
    newLineLength /maxLoop

    a:
        newLine.$index, existingLine.$index
        if notEqual
            break a
        incr index 1
        if greater than maxLoop
            break a
    goto a
    
    0 /fromRight
    b:
        newLine, length, minus 1, minus fromRight, charAt newLine
        existingLine, length, minus 1, minus fromRight, charAt existingLine
        if notEqual, break b
        incr fromRight 1
        if greaterThan maxLoop, break b
    goto b
        
        
        
        
        

// var max right loop
function findWordEntered(newLine, existingLine) {
    // find first char different from left
    if (newLine.length < existingLine.length) {
        return null
    }
    // Now we know the  new line is bigger
    var index = 0
    var maxLoop = newLine.length
    while (true) {
        var newChar = newLine[index]
        var existingChar = existingLine[index]
        if (newChar != existingChar) {
            break
        }
        index++
        if (index >= maxLoop) {
            break
        }
    }

    // find first char different from right
    var fromRight = 0
    while (true) {
        newLineIndex = newLine.length - 1 - fromRight
        existingLineIndex = existingLine.length - 1 - fromRight
        
        var newChar = newLine[newLineIndex]
        var existingChar = existingLine[existingLineIndex]
        if (newChar != existingChar) {
            break
        }
        fromRight++
        if (fromRight >= maxLoop) {
            break
        }
    }
    var endIndex = newLine.length - fromRight
    var word = newLine.slice(index, endIndex)
    // log(["added?", newLine.slice(index, endIndex), index, fromRight])
    if (!word) {
        return null
    }
    return {
        word: word,
        startIndex: index,
        endIndex: endIndex
    }
}



myList sort
    itemAt myList, itemAt myList
    less
    
    
if a == 1 || b == 2 {
    doSomething()
}



play

return
   
check:
    if equals a 1, goto d
    if equals b 2, goto d
    break check
    d:
    doSomething()
    
check:
    a
    if equals 1, doSomething()
    if equals 2, doSomething()

    
 // if expr (or (equals a 1) (equals b 2))
    


if (a == 1 || b == 2) && (c == 3) {
    doSomething()
}

if and
    eq c 30
    or
        eq a 1
        eq b 2
then
    
if and (eq c 30) (or (eq a 1) (eq b 2))



runShellCommand line:
    fx.fileMode, "shell", if equal
        return
    
    copyBuffer /oldCopyBuffer
    a:
        trim line
        if not startsWith "git", goto notGitP
        if not match /\s-p\b/, goto notGitP
        :
            indexOf " log "
            if not equals -1, goto notGitP
        :
            indexOf " show "
            if not equals -1, goto notGitP
            
        clear
        string run this in terminal (xterm button), not non-interactive shell
        string
        list /copyBuffer
        paste true
        
        fx.lines, length, minus 1, /fx.cursorLineIndex
        updateCursorXY
        ensureCursorInScreen
        oldCopyBuffer /copyBuffer
        break a
    
        notGitP:

runShellCommand line:
    fx.fileMode, "shell", if equal
        return
    
    copyBuffer /oldCopyBuffer
    a:
        trim line
        if not startsWith "git", goto notGitP
        if not match /\s-p\b/, goto notGitP
        :
            indexOf " log "
            if not equals -1, goto notGitP
        :
            indexOf " show "
            if not equals -1, goto notGitP
            
        clear
        string run this in terminal (xterm button), not non-interactive shell
        string
        list /copyBuffer
        paste true
        
        fx.lines, length, minus 1, /fx.cursorLineIndex
        updateCursorXY
        ensureCursorInScreen
        oldCopyBuffer /copyBuffer
        break a
    
        notGitP:
        

runShellCommand line:
    
function runShellCommand(line) {
    // outer loop to simulate goto
    if (fx.fileMode != "shell") {
        return
    }
    var oldCopyBuffer = copyBuffer
    for (var s=0; s<1; s++) {
        // ""supposebly" in non interactive mode this will get into some weird loop and use all the memory
        var trimmedLine = line.trim() 
        if (trimmedLine.startsWith("git") && trimmedLine.match(/\s-p\b/) && (trimmedLine.indexOf(" log ") == -1 && trimmedLine.indexOf(" show ") == -1)) {
            copyBuffer = ["run this in terminal (xterm button), not non-interactive shell", ""]
            paste(true)
            fx.cursorLineIndex = fx.lines.length - 1
            updateCursorXY()
            ensureCursorInScreen()
            copyBuffer = oldCopyBuffer
            break
        }
        if (line == "clear") {
            // clear everything but the last 2 lines
            // TODO: should we be using set lines here?
            fx.lines = fx.lines.slice(-4)
            if (fx.lines.length == 0) {
                fx.lines = [""]
            }
            fx.cursorLineIndex = 0
            fx.cursorColIndex = 0
            updateCursorXY()
            fx.offsetY = 0
            // render()
            // return
            line = "p"
        }

        if (line.startsWith("open ")) {
            var fileToLoad = line.split(" ")[1]
            copyBuffer = [""]
            paste(true)
            fx.cursorLineIndex += 1
            fx.cursorColIndex = 0
            ensureCursorInScreen()
            // TODO: get rid of rootLocation stuff. I am pretty sure it's not used at least on front end
            addFile(trimPrefix(fx.shellCWD, rootLocation) + "/" + fileToLoad)
            break
        }

        if (line == "p") {
            // TODO: should we be restoring the old copyBuffer here?
            copyBuffer = shellHelpers.concat([
                // Adding the cwd here because it's helpful
                fx.shellCWD
                    .split("/")
                    .reverse()
                    .join(" < ")
            ])
            paste(true)
            fx.cursorLineIndex = fx.lines.length - 2

            fx.cursorColIndex = 0
            updateCursorXY()
            ensureCursorInScreen()
            break
        }

        let myFx = fx
        // fetch(proxyPath + "/myshell?id="+fx.ID+"&cwd="+encodeURIComponent(fx.shellCWD)+"&cmd="+encodeURIComponent(line), {
        fetch(proxyPath + "/myshell?id="+fx.ID+"&cwd="+encodeURIComponent(fx.shellCWD), {
            cache: "no-cache",
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded"},
            body: "cmd="+encodeURIComponent(line)
        }).then(r => {
            if (r.headers.get("X-ID")) {
                myFx.ID = r.headers.get("X-ID") - 0
            }
            return r.text()
        }).then(r => {
            var oldFx = fx
            fx = myFx
            copyBuffer = r.split("\n")
            copyBuffer.unshift("") // leading newline
            // second to last item is cwd
            myFx.shellCWD = copyBuffer[copyBuffer.length - 2]
            // let's restyle the pwd after we grab it

            // TODO: maybe come up with something more elegant than this paste dance
            copyBuffer[copyBuffer.length - 2] = myFx.shellCWD
                .split("/")
                .reverse()
                .join(" < ")
            copyBuffer.push(line) // add the line so it's easy to run again.
            copyBuffer.push("")
            myFx.cursorColIndex = 0
            myFx.cursorLineIndex += copyBuffer.length
            myFx.cursorLineIndex = myFx.lines.length - 1
            selectMode = "line"
            paste(true)
            myFx.cursorLineIndex = myFx.lines.length - 1
            updateCursorXY()
            ensureCursorInScreen()
            copyBuffer = oldCopyBuffer
            fx = oldFx
        }).catch(e => {
            alert("There was an error running the command: " + e)
        })
    }
    copyBuffer = oldCopyBuffer
}

clear
recv $recvOptionsChannel
recv $recvOptionsChannel
recv $recvOptionsChannel
list /opts

sortBy description





























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
hello world :)
# comment here
how "are" we?
woa
and $ this thing here "yo"

exit

greet:
    say "yo"



if (is x 3) :










greet:


   

incr: set "x" (add x 1), put x, rerurn
makeIncr: set "x" 0, lex incr, return

function makeIncr() {
    var x = 0; return () => { return ++x }
}

lex: as "f"
    setp f "scope" callerScope
    f
end
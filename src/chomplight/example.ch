
hello world :)
# comment here
how "are" we?
woa
and $ this thing here "yo"

exit

greet:
    say "yo"



if (is x 3) :


if (x is 3):
    


set "foo" {
    
}






se


loop 100 { as "i"
    if (is i 50) {
        break 2
    }
    say ("i is " cc i)
}

loop 100: as "i"
    if (is i 50):
        goPastEnd 2
    say ("i is " cc i)


set "makeIncr" {
    set "x" 0
    lex {
        set "x" (add x 1)
        put x
    }
}

if x is 3 then
else
end

makeIncr:
    set "x" 0
    : set "x" (add x 1), put x


incr: set "x" (add x 1), put x, rerurn
makeIncr: set "x" 0, lex incr, return

function makeIncr() {
    var x = 0; return () => { return ++x }
}

lex: as "f"
    setp f "scope" callerScope
    f
end


// can take variable number of args
// a markr is put on stack before a function is called
def makeIncr { as x
    put {
        set x (add $x 1)
        put $x
    }
}

say Hello world

loop 100 { as i
    if (is $i 50) {
        break 2
    }
    say "i is $i"
}
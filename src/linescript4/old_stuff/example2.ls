#!/usr/bin/env -S go run ../linescript4.go ../stringmath.go 

#!/usr/local/bin/linescript4
# "yo man"
# say dupit toJson
# dupit
# say
# exit

# "yo man"
# say dupit toJson
# "----"
# dupit
# say
# exit

# say "hi"
# exit

def sum3 a b c
    a + b + c
end

sum3 7 3 5
say

local foo 3 + 4 * 5
say foo
exit


# [2 4 6] map: * 2 + 3; map: + 1
[2 4 6] map: "yo" | + len it; map: "number " ++ it

say
exit

23
.hi | (say dupit)
say
exit
# .yo upper it, say
# .yo

# 
# 
# "yo man"
# say dupit toJson
# dupit
# say
# exit

"yo man"
say dupit toJson
dupit
say
exit


.foo = {
    .fName .Drew
    .lName .LeSueur
}
say foo

def .updateFoo .f
    setProp f .fName "drew2"
end
updateFoo foo
say foo

def .updateFoo2 .f
    useVars f
    .lName = .les2
    .yo = .dude
end

updateFoo2 foo

say foo



exit


# say getType 7
# say getType 0.1
# 
# 7 - 0.1
# say getType it

def .test1 .value
    value
end
def .test2 .value
    value
    drop
end
# def .test1
#     
# end

let .loopCount 1000000
# let .loopCount 10
let .theStart now
let .val 0
let .i 0
loopCount loop .i
    test2 1
    test2 1
    test2 1
    test2 1
    test2 1
    i - test1 1
    # i - 1
    - 0.1
    # + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2
    + val
    as .val
end
let .theEnd now
say "+it took " (- theEnd theStart) " millis"
say "+loops: " loopCount
say "and val is " val

say "---"
exit

let .loopCount 1000000
# let .loopCount 10
let .theStart now
let .val 0
let .i 0
loopCount loop .i
    i - 1
    - 0.1
    # + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2, + 2, - 2
    + val
    as .val
end
let .theEnd now
say "+it took " (- theEnd theStart) " millis"
say "+loops: " loopCount
say "and val is " val

say "---"
exit




let :loopCount 1000000
# let :loopCount 1
let :theStart (now)
let :val 0.0
let :i 0
loop loopCount :i
    toFloat i, - 0.1, + val, as "val"
end
let :theEnd (now)
say "+it took " (- theEnd theStart) " millis"
say "+loops: " loopCount
say "and val is " val

say "---"
exit


eval %"
let :loopCount 1000000
# let :loopCount 1
let :theStart (now)
let :val 0.0
let :i 0
loop loopCount :i
    toFloat i, - 0.1, + val, as "val"
end
let :theEnd (now)
say "+it took " (- theEnd theStart) " millis"
say "+loops: " loopCount
say "and val is " val
"%


say "---"

let "loopCount" 1000000
# let "loopCount" 1
let "theStart" (now)
let "val" 0.0
let "i" 0
loop loopCount :i
    eval 'toFloat i, - 0.1, + val, as "val"
'
end
let "theEnd" (now)
say "+it took " (- theEnd theStart) " millis" (cc) (cc)
say "+loops: " loopCount (cc)
say "and val is " val (cc)


say "Wow"


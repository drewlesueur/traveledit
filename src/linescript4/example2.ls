#!/usr/local/bin/linescript4


# say getType 7
# say getType 0.1
# 
# 7 - 0.1
# say getType it

def .test1 .value
    value
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
    # i - test1 1
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


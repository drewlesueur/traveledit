#!/usr/bin/env -S go run linescript4.go funcs.go

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


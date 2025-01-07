#!/usr/bin/env -S go run linescript4.go funcs.go

let "loopCount" 100000

let "theStart" (now)
let "val" 0
let "i" 0
#here
get "val"
get "i"
% 30
+
as "val"
incr "i"
put "here", get "i", get "loopCount", <, goUpIf
let "theEnd" (now)
say "+it took " (- theEnd theStart) " millis" (cc) (cc)
say "and val is " val (cc)




let "theStart" (now)
let "val" 0
let "i" 0
#here
put val
% i 30
+
as "val"
incr "i"
# put "here" i loopCount, <, goUpIf
goUpIf "here" (< i loopCount)
let "theEnd" (now)
say "+it took " (- theEnd theStart) " millis" (cc) (cc)
say "and val is " val (cc)


exit








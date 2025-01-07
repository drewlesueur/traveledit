#!/usr/bin/env -S go run linescript4.go funcs.go

let "loopCount" 100000



let "theStart" (now)
let "val" 0
let "i" 0
#here
put val
% i 30
+
as "val"
incr "i"
goUpIf (< i loopCount) "here"
let "theEnd" (now)
say "+it took " (- theEnd theStart) " millis" (cc) (cc)
say "and val is " val (cc)


let "theStart" (now)
let "val" 0.0
let "i" 0
#here
let "val" (put 300.0, / 200.221)
put 101.0, / 43.218997, as "foo"
put 101.0, / 43.218997, as "foo"
put 101.0, / 43.218997, as "foo"
put 101.0, / 43.218997, as "foo"
incr "i"
goUpIf (< i loopCount) "here"
let "theEnd" (now)
say "+it took " (- theEnd theStart) " millis" (cc) (cc)
say "and val is " val (cc)
say "and foo is " foo (cc)


exit








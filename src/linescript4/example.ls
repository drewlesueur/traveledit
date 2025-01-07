#!/usr/bin/env -S go run linescript4.go funcs.go

# let "loopCount" 100000
let "loopCount" 100000

[1 2] say

{
"foo" "bar"
"biz" [9, {"dokay" "blur"} 7 ["ok"]]
}
say
+ 2 3
say

if true (not)
    say "block 1"
else if true (not)
    say "block 2"
else
    say "block 3"
end

let "foo" "This is foo"

def :greet [:name]
    let :myFoo "bar"
    let :foo "bar"
    say "hello " name (cc)
end

greet "Drew"
say myFoo
say foo

say "what?!"
# let "theStart" (now)
# let "val" 0.0
# let "i" 0
# #here
# put val
# % i 30
# +
# as "val"
# incr "i"
# goUpIf (< i loopCount) "here"
# let "theEnd" (now)
# say "+it took " (- theEnd theStart) " millis" (cc) (cc)
# say "and val is " val (cc)


let "theStart" (now)
let "val" 0.0
let "i" 0
#here
toFloat i, - 0.1, + val, as "val"
incr "i"
goUpIf (< i loopCount) "here"
# < i loopCount, goUpIf "here"
let "theEnd" (now)
say "+it took " (- theEnd theStart) " millis" (cc) (cc)
say "and val is " val (cc)


exit








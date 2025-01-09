#!/usr/bin/env -S go run linescript4.go funcs.go
#!/usr/bin/env -S bun linescript4.js

let :sayHiFunc func [:name]
    say "from function: hello " (cc name)
end

sayHiFunc "Drew"
# say sayHiFunc

def :map [:theList :f]
    let :ret (makeArray)
    each theList :i :v
        f v | if
            ret push v
        end
    end
    ret
end

let :mylist [1 2 3 4 5 6 7]
map mylist func [:v]
    v mod 2, is 0
end
say
exit




say "wow"

say %"
hi
"%

say "yo"

say newline




{"foo"  "bar" "biz": "baz"}

say




# def :doIt [:f]
#     say "doing"
#     say f
#     f "yay"
#     say "done"
# end
# 
# doIt func [:v]
#     say "here" (cc v)
# end

if true (not)
    say "block 1"
else if true (not)
    say "block 2"
else
    say "block 3"
end

if true (not)
    say "block 1"
else if true
    say "block 2"
else
    say "block 3"
end

if true
    say "block 1"
else if true
    say "block 2"
else
    say "block 3"
end

if true (not)
    say "block a"
else
    say "block b"
end

if true
    say "block a"
else
    say "block b"
end

if true (not)
    say "block A"
end

if true
    say "block A"
end


say "wow"

loop 2 :i
    say "i " (cc i)
    
    if true
        say "  true1"
    end
    if false
        say "+error"
    end
    if true
        say "  true2"
    end


    if true (not)
        say "  block 1"
    else if true (not)
        say "  block 2"
    else
        say "  block 3"
    end
    
    
    if true (not)
        say "  block 1"
    else if true
        say "  block 2"
    else
        say "  block 3"
    end
    
    if true
        say "  block 1"
    else if true
        say "  block 2"
    else
        say "  block 3"
    end
    
    if true (not)
        say "  block a"
    else
        say "  block b"
    end
    
    if true
        say "  block a"
    else
        say "  block b"
    end
    
    if true (not)
        say "  block A"
    end
    
    if true
        say "  block A"
    end
end

say "done loopie"

[:a :b :c]
each :i :w
    say w
    if false
        say w
    end
end
say "done"





"foo bar"
say {
    "foo" "Foo"
    "bar" "Bar"
}
say

say "hi"
"yo" say

[1 2] say



{
"foo" "bar"
"biz" [9, {"dokay" "blur"} 7 ["ok"]]
}
say
+ 2 3
say


let "foo" "This is foo"

def :greet [:name]
    let :myFoo "bar"
    let :foo "bar"
    say "hello " name (cc)
end

# map myList func 
# end

# inline comments
# break return
# function literals
# assignment in outer scope
# you can use state.mode when getting tokens


myVar





greet "Drew"
say myFoo
say foo

(greet "Drew")

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


let "loopCount" 1000000
let "theStart" (now)
let "val" 0.0
let "i" 0
#here
toFloat i, - 0.1, + val, as "val"
incr "i"
goUpIf (i < loopCount) "here"
# < i loopCount, goUpIf "here"
let "theEnd" (now)
say "+it took " (- theEnd theStart) " millis" (cc) (cc)
say "+loops: " loopCount (cc)
say "and val is " val (cc)

# +it took 398 millis
# +loops: 1000000
# and val is 499999400004.4008


let "loopCount" 1000000
let "theStart" (now)
let "val" 0.0
let "i" 0
loop loopCount :i
    toFloat i, - 0.1, + val, as "val"
end
let "theEnd" (now)
say "+it took " (- theEnd theStart) " millis" (cc) (cc)
say "+loops: " loopCount (cc)
say "and val is " val (cc)

exit


# convert this script (written in custom lang in stack-based style) to php
# loop loopCount :i
#     toFloat i, - 0.1, + val, as "val"
# end
#
# <?php
# for ($i = 0; $i < $loopCount; $i++) {
#     $val = (float)$i - 0.1 + $val;
# }
# ?>






#!/usr/bin/env -S go run linescript4.go funcs.go
#!/usr/bin/env -S bun linescript4.js

say ""

def pretendHeavy
    loop 100 i
        say "uy got in loop" i
    end
end

if false and (pretendHeavy)
    say "FAIL"
else
    say "yay else"
end



say ""

say "yo" "ho"

"ok" say "skipping ok"

say "----"

let items [10 20 30 40]
each items i v
    say "the item is" v
end

each [:aa :bb :cc] i v
    say "the item is" v
end

each items (sliceFrom 2) i v
    say "the item is" v
end

def greet name
    say "hi " name
end

loop 10 i
    say "looping and i is" i
end

loop 5 :i
    say "looping and i is" i
end

greet "Drew"

let greet2 func name
    say "hi2 " (cc name)
end
greet2 "Ted"

def :greet :name
    say "hi " (cc name)
end
greet "Drew"

let :greet2 func :name
    say "hi2 " (cc name)
end
greet2 "Ted"



let MyVar "some var here"
say "-->" (cc MyVar)

say "what1" # inline comment
say "what2"
say "here1"

goDown :spot1
say "here2"
say "here3"
#spot1
say "here4"

let :sayHiFunc func :name
    say "from function: hello " (cc name)
end

sayHiFunc "Drew"
# say sayHiFunc

def increr v
    local x v
    say "incrementer x is" x
    func
        let x (x + 1)
        x
    end
end

say "Incrementer test"
let :counter (increr 5000)
counter, say
counter, say
counter, say
counter, say
counter, say


let :name "Drew"
let :age 40

def :update
    let :name "Ted"
    local :age 50
    say "the name is " (cc name) (cc " and age is ") (cc age)
end
update
say "the name is " (cc name) (cc " and age is ") (cc age)

def :map :theList :f
    let :ret (makeArray)
    each theList :i :v
        f v | if
            ret push v
        end
    end
    ret
end

loop 100 :i
    say i
    if (i gte 10)
        goDown :endLoop
    end
end #endLoop

let :mylist [1 2 3 4 5 6 7]
map mylist func :v
    v mod 2, is 0
end
say
# exit




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

def :greet :name
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






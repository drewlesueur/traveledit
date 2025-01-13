#!/usr/bin/env -S go run linescript4.go funcs.go

say ""
def :plus1 :a
    a + 1
end
plus1 20
# debugVals
say
say "done"
exit

"apples" and "bananas" | say "should be bananas:" it
"" and "bananas" | say "should be empty:" it
"apples" or "bananas" | say "should be apples:" it
"" or "bananas" | say "should be bananas:" it

say "Hello"
let :name "Drew"
say "Hello" name
eval 'say "Hello2" name'

if true: say "true!"
say "done if"

# def :plus1 :a: a (+ 1) | * 21


exit

{
    "foo": "bar":::
    :biz :baz
} | say

loop 3 :i : say "it's" i
loop 3 :i: say "it's" i
loop 3 "i": say "it's" i
loop 3 i: say "it's" i
10 loop :i: say "ok" i
exit



exit
{}
[
1 2 3
# (func: + 290)
func: + 290
4
5
]

{
    "a" (func: 99)
    "b" func: 22
}
dup | at "a" | call | say "a result is" it
dup | at "b" | call | say "b result is" it

say "hello done"



  

let b func: 300
say (b)
say (b)
say (b)

let add290 [(func: + 290)]
add290 at 0
as "foo"
foo 20
say

# # say (b)

let :a {
    "foo": "bar" "biz": "baz"
     "foo2": "bar", "biz2": "baz"
     "other": (10 + 20)
}
say a

clear


loop 10 "i"
   say i
end

func a: a + 2
see
call it 30
say
# func: + 2
# as "plus2"
# say "plus2 is " plus2
# plus2 300
# say


# say 3 (plus2)


# def plus1 a: + 1 a
def plus1 a: a (+ 1) | * 21
plus1 20
say
say "done"


loop 10 i: say i
say "wow"

if true: say "true!"
say "done if"

each [99 100] i v: say v (+ 1)
say "done each"

def plus1 a: a (+ 1)
say plus1
# say 30 (plus1)

say "done def"



if true: say ok!
loop 10 i: say i

let a func a b c: 



"apples" and "bananas" | say "should be bananas:" it
"" and "bananas" | say "should be empty:" it
"apples" or "bananas" | say "should be apples:" it
"" or "bananas" | say "should be bananas:" it

say __vals # should be empty


# say "should be true:" it
# say "should be true:" it

def heavyTrue
    say "BANG!"
    return true
end
def heavyFalse
    say "BANG!"
    return false
end

say ""
say ""
say "1----and"
if false and (heavyFalse)
    say "FAIL 1"
    exit
else
    say "no bang 1"
end

say "2----and"
if false and (heavyTrue)
    say "FAIL 2"
    exit
else
    say "no bang 2"
end


say "3----and"
if true and (heavyFalse)
    say "FAIL 3"
    exit
else
    say "yes bang 3"
end

say "4----and"
if true and (heavyTrue)
    say "yes bang 4"
else
    say "FAIL 4"
    exit
end

say ""
say ""
say "1----or"
if false or (heavyFalse)
    say "FAIL 1"
    exit
else
    say "yes bang 1"
end

say "2----or"
if false or (heavyTrue)
    say "yes bang 2"
else
    say "FAIL 2"
    exit
end


say "3----or"
if true or (heavyFalse)
    say "no bang 3"
else
    say "FAIL 3"
    exit
end

say "4----or"
if true or (heavyTrue)
    say "no bang 4"
else
    say "FAIL 4"
    exit
end



say ""

say "yo" "ho"

"ok" say "skipping ok"

say "----"

let items [10 20 30 40]
each items i v
    say "the item is" v
end


each ["aa" "bb" "cc"] i v
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

loop 5 i
    say "looping and i is" i
end

greet "Drew"

let greet2 func name
    say "hi2 " (cc name)
end
greet2 "Ted"

def greet name
    say "hi " (cc name)
end
greet "Drew"

let greet2 func name
    say "hi2 " (cc name)
end
greet2 "Ted"



let MyVar "some var here"
say "-->" (cc MyVar)

say "what1" # inline comment
say "what2"
say "here1"

goDown "spot1"
say "here2"
say "here3"
#spot1
say "here4"

let sayHiFunc func name
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
let counter (increr 5000)
counter, say
counter, say
counter, say
counter, say
counter, say


let name "Drew"
let age 40

def update
    let name "Ted"
    local age 50
    say "the name is " (cc name) (cc " and age is ") (cc age)
end
update
say "the name is " (cc name) (cc " and age is ") (cc age)

def map theList f
    let ret (makeArray)
    each theList i v
        f v | if
            ret push v
        end
    end
    ret
end

loop 100 i
    say i
    if (i gte 10)
        goDown "endLoop"
    end
end #endLoop

let mylist [1 2 3 4 5 6 7]
map mylist func v
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




# def doIt [:f]
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

loop 2 i
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

["a" "b" "c"]
each it i w
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

def greet name
    let myFoo "bar"
    let foo "bar"
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
loop loopCount i
    toFloat i, - 0.1, + val, as "val"
end
let "theEnd" (now)
say "+it took " (- theEnd theStart) " millis" (cc) (cc)
say "+loops: " loopCount (cc)
say "and val is " val (cc)



# convert this script (written in custom lang in stack-based style) to php
# loop loopCount i
#     toFloat i, - 0.1, + val, as "val"
# end
#
# <?php
# for ($i = 0; $i < $loopCount; $i++) {
#     $val = (float)$i - 0.1 + $val;
# }
# ?>






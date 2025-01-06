#!/usr/bin/env go run linescript3.go funcs.go

#notfound


say "start lol"
setProp __STATE "foo" "this is bar"
getProp __STATE "foo", say

+ 1 100
say

getProp __STATE "__stateChangers", setProp "yo" %"
    say "Yo!"
"%
yo

# keep for reference but not needed
# getProp __STATE "__stateChangers", setProp "get" %"
#     getProp __STATE "s"
#         getProp "__vals"
#
#         getProp __STATE "s"
#             getProp __STATE "s"
#             getProp "__vals"
#             pop
#         getProp
#     push
# "%

getProp __STATE "__globals", setProp "as" %"
    setPropVKO __STATE
"%

getProp __STATE "__globals", setProp "get" %"
    getPropKO __STATE
"%


setProp __STATE "color" "blue"
say "ok got here"
get "color", say

# this works, and I keep it for reference, but harder to understand
# get "__stateChangers", setProp "getSubStateVals" %"
#     get "s"
#     getProp "__vals"
#
#     get "s"
#     getProp "s"
#     getProp "__vals"
#     push
# "%

get "__globals", setProp "getSubStateVals" %"
    get "s", getProp "__vals"
"%

# keeping for reference
# get "__stateChangers", setProp "dup" %"
#     get "s"
#     getProp "__vals"
#         get "s"
#         getProp "__vals"
#             get "s"
#                 getProp "__vals"
#                 length
#             - 1
#         at
#     push
# "%
# get "__stateChangers", setProp "dup" %"
#     # funny thing is this could use dup!
#     # get "s", getProp "__vals"
#     getSubStateVals
#     getSubStateVals
#     getSubStateVals
#     length
#     - 1
#     at
#     push
# "%

get "__globals", setProp "dup" %"
    as "__a"
    get "__a"
    get "__a"
    deleteProp __STATE "__a"
"%


put 999
dup
say
say

# keeping for reference but a simpler version exisits
# get "__stateChangers", setProp "as" %"
#     get "s"
#
#     # get "s", getProp "__vals"
#     getSubStateVals
#     pop
#
#     # get "s", getProp "__vals"
#     getSubStateVals
#     pop
#
#     setProp
# "%
put "yo this is a value of a variable"
as "hello"
get "hello", say

# get "__stateChangers", setProp "swap" %"
#     # get "s", getProp "__vals"
#     getSubStateVals
#     pop, as "tmp"
#
#     getSubStateVals
#     pop, as "tmp2"
#
#     getSubStateVals
#     get "tmp"
#     push
#
#     getSubStateVals
#     get "tmp2"
#     push
# "%

get "__globals", setProp "swap" %"
    as "__a"
    as "__b"
    get "__a"
    get "__b"
    deleteProp __STATE "__a"
    deleteProp __STATE "__b"
"%

get "__call_immediates", setProp "(" %"
    get "s", getProp "__funcTokenStack"
    get "s", getProp "__currFuncToken"
    push
    get "s", setProp "__currFuncToken" ""


    get "s", getProp "__funcTokenSpotStack"
    get "s", getProp "__funcTokenSpot"
    push
    get "s", setProp "__funcTokenSpot" -1
"%

get "__call_immediates", setProp ")" %"
    get "s", callFuncAccessible
    as "s"

    get "s"
    put "__currFuncToken"
        get "s", getProp "__funcTokenStack"
        pop
    setProp


    get "s"
    put "__funcTokenSpot"
        get "s", getProp "__funcTokenSpotStack"
        pop
    setProp
"%

# get "__call_immediates", setProp "(" %"
#     # might be more readable if we used "as" here?
#     put __STATE "s"
#     makeObject
#         dup
#             put "__fileName"
#             get "s", getProp "__fileName"
#         setProp
#
#         dup
#             put "__i"
#             get "s", getProp "__i"
#         setProp
#
#         dup
#             put "__code"
#             get "s", getProp "__code"
#         setProp
#
#         dup
#             put "__vals", makeArray
#         setProp
#         dup
#             put "__stateChangers"
#             get "s", getProp "__stateChangers"
#         setProp
#         dup
#             put "__globals"
#             get "s", getProp "__globals"
#         setProp
#
#         dup
#             put "__call_immediates"
#             get "s", getProp "__call_immediates"
#         setProp
#
#
#         dup
#             put "__currFuncToken" ""
#         setProp
#
#         dup
#             put "__funcTokenStack" makeArray
#         setProp
#
#         dup
#             put "__lexicalParent"
#             get "s"
#         setProp
#         # this last dup remove?
#         dup
#             put "__callingParent"
#             get "s"
#         setProp
#     setProp
# "%


# get "__call_immediates", setProp ")" %"
#     # call without setting __currFuncToken so it doesn't recurse
#     get "s", callFuncAccessible
#     as "s"
#
#     # debug
#     # get "s", getProp "__vals"
#     # pop
#     # say
#     # exit
#
#     get "s", getProp "__lexicalParent"
#     as "parentState"
#
#     get "parentState", getProp "__vals"
#     getSubStateVals
#     pushm
#
#
#     get "parentState"
#     put "__i"
#
#     get "s"
#     getProp "__i"
#     setProp
#
#     put __STATE "s"
#     get "parentState"
#     setProp
# "%



get "__globals", setProp "let" %"
    swap, as
"%


say "the globals"
get "__stateChangers", keys, say


put "bar" "foo", swap, cc, say

say (+ 10 200)
say (cc "hello " "world!")
say "what?"

# (get s") doesn't work cuz it's a  new scope
# need lexical lookup func

get "__stateChangers", setProp "goUp" %"
    # todo add caching

    getSubStateVals
    pop
    put "#", swap, cc
    as "toSearch"

    get "s"
    getProp "__code"
    put 0, get "s", getProp "__i", slice
    get "toSearch"
    lastIndexOf
    as "newI"

    get "s"
    put "__i"
    get "newI"
    setProp
"%
get "__stateChangers", setProp "goDown" %"
    # todo add caching

    getSubStateVals
    pop
    put "#", swap, cc
    as "toSearch"
    

    get "s", getProp "__code"
    get "s", getProp "__i"
    sliceFrom 
    get "toSearch"
    indexOf
    as "newI"

    get "s"
    put "__i"
    get "newI"
    setProp
"%

get "__stateChangers", setProp "stop" %"
    get "s"
        put "__i"

        get "s", getProp "__code", length
            get "s", getProp "__i"
        -

        get "s", getProp "__i"
        +

    setProp
"%

get "__stateChangers", setProp "stopIf" %"
    get "s"
        put "__i"

        get "s", getProp "__code", length
            get "s", getProp "__i"
        -

        getSubStateVals
        pop
        toInt
        *

        get "s", getProp "__i"
        +

    setProp
"%

get "__globals", setProp "testing1" %"
    say "here we test"
    stopIf true
    say "#red should not get here"
"%

testing1
say "Done testing1"

get "__stateChangers", setProp "goUpIf" %"
    getSubStateVals
    pop
    not
    stopIf

    # todo add caching
    getSubStateVals
    pop
    put "#", swap, cc
    as "toSearch"

    get "s"
    getProp "__code"
    put 0, get "s", getProp "__i", slice
    get "toSearch"
    lastIndexOf
    as "newI"

    get "s"
    put "__i"
    get "newI"
    setProp
"%

# TODO: need to grab both vars before you exit early
get "__stateChangers", setProp "goDownIf" %"
    getSubStateVals
    pop
    not
    stopIf
    
    # todo add caching
    getSubStateVals
    pop
    put "#", swap, cc
    as "toSearch"
    

    get "s", getProp "__code"
    get "s", getProp "__i"
    sliceFrom 
    get "toSearch"
    indexOf
    as "newI"

    get "s"
    put "__i"
    get "newI"
    setProp
"%



get "__globals", setProp "sayP" %"
    swap, cc, say
"%

put "(blue)"
sayP "the color is "
as "(green)" "theColor"
get "theColor", sayP "the var color: "
# exit


say "test parens"
let "name" "Drew"
getProp __STATE (cc "na" "me")
say
say "done parens"

makeArray
dup, push 0
dup, push 100
dup, push 200
dup, push 300
splice 2 1 null
say


get "__call_immediates", setProp "$it" %"
    say "calling it"

    say "ok0"
    getProp (get "s") "__funcTokenSpot"
    as "spot"

    getSubStateVals, splice (get "spot") 1 null
    at 0
    as "item"


    getSubStateVals
    push (get "item")
"%

put "okie dokey"
cc "val: " it
say


get "__globals", setProp "incr" %"
    as "__key"

    get "__key"
    get
    + 1

    get "__key"
    as
"%

put 101, as "theCount"
say "count:"
get "theCount", say
# get "theCount", sayP "The count is "
# exit

incr "theCount"
incr "theCount"
incr "theCount"
incr "theCount"
say "count:"
get "theCount", say


get "__globals", setProp "__getVar" %"
    get
"%

let "name" "Drew L."
put name
say
put name
say

say name
say "<--"


# let "a" "300"
# say (cc "a is: " it)



let "i" 0
#yoink
incr "i"
say "hmm....." i (cc)
goUpIf "yoink" (< i 10)


let "j" 100
# goDown "rock"
goDownIf "rock" (== j 101)
say "-should not het here!"
#rock


get "__globals", setProp "loop" %"
    
    as "code"
    as "varName"
    as "count"
    #start
    
    
"%


let "theStart" (now)
let "val" 0
# loop 10000 "i" %"
loop 100000 "i" %"
    get "val"
    get "i"
    % 30
    +
    as "val"
"%
let "theEnd" (now)
say "+it took " (- theEnd theStart) " millis" (cc) (cc)
say "and val is " val (cc)





let "theStart" (now)
let "val" 0
# loop 10000 "i" %"
loop 100000 "i" %"
    put val
    % i 30
    +
    as "val"
"%
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
# goUpIf "here" (< i 10000)
put "here", < i 100000, goUpIf
let "theEnd" (now)
say "+it took " (- theEnd theStart) " millis" (cc) (cc)
say "and val is " val (cc)

exit


setProp __STATE "__callFunc" %"

"%


say "end lol"






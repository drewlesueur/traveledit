#!/usr/bin/env go run linescript3.go

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

get "__globals", setProp "sayP" %"
    swap, cc, say
"%

put "(blue)"
sayP "the color is "
as "(green)" "theColor"
get "theColor", sayP "the var color: "
# exit

get "__globals", setProp "let" %"
    swap, as
"%

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
say name


# let "a" "300"
# say (cc "a is: " it)


exit


#yoink
say "hmm....."
goUp "yoink"
exit

        # "__fileName": fileName,
        # "__i": 0,
        # "__code": code,
        # "__vals": &[]any{},
        # "__stateChangers": map[string]any{},
        # "__call_immediates": map[string]any{},
        # "__currFuncToken": "",
    # "(": func(state map[string]any) map[string]any {
    #     // stateCreation
    #     newState := map[string]any{
    #         "__files": state["__files"],
    #         "__fileIndex": state["__fileIndex"],
    #         "__valStack": state["__valStack"],
    #         "__endStack": &[]any{},
    #         "__vars": map[string]any{},
    #         "__args": &[]any{},
    #         "__i": state["__i"],
    #         "__currFuncToken": "",
    #         "__mode": "normal",
    #         "__lexicalParent": state,
    #         "__callingParent": state,
    #     }
    #     return newState
    # },
    # ")": func(state map[string]any) map[string]any {
    #     state = callFunc(state)
    #     parentState := state["__lexicalParent"].(map[string]any)
    #     if parentState["__currFuncToken"].(string) == "" {
    #         for _, val := range *(state["__valStack"].(*[]any)) {
    #             push(parentState["__valStack"], val)
    #         }
    #     } else {
    #         for _, val := range *(state["__valStack"].(*[]any)) {
    #             push(parentState["__args"], val)
    #         }
    #     }
    #     parentState["__i"] = state["__i"]
    #     return parentState
    # },





# get foo
# say

# getProp __STATE "__stateChangers", setProp "__getVar" %"
#     getProp __STATE "s"
#     getProp __STATE "varName"
#     has
#
#
# "%

yo

# getProp __STATE "__stateChangers", setProp "__evalToken" %"
#
# "%

setProp __STATE "__callFunc" %"

"%



# getProp __STATE "__stateChangers"
# setProp "let" "
#     put __STATE
#     getProp __STATE "__vals"
#     pop
#
#     setProp __STATE "v"
#     getProp __STATE "s"
#     setProp ""
# "

# setProp __STATE "let" "
#     getProp __STATE
#     setProp __STATE
# "




# put __STATE "get2", here, setProp
# pop __vals

# put __STATE "goto", here, setProp
# __code
#
#
# put __STATE "endFunc", here, setProp
# goto "#doneEndFunc"
# say "this should end the func"
#doneEndFunc

say "end lol"




# put __STATE "let"
#
# put __STATE "sayHi"
# here
# setProp
# say "saying hi!"
# end
#
# say "-->"
#
# # getProp __STATE "sayHi"
# # say sayHi
#
# say "hello world"



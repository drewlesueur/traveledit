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

getProp __STATE "__stateChangers", setProp "get" %"
    getProp __STATE "s"
        getProp "__vals"

        getProp __STATE "s"
            getProp __STATE "s"
            getProp "__vals"
            pop
        getProp
    push
"%

get "__stateChangers", setProp "getSubStateVals" %"
    get "s"
    getProp "__vals"

    get "s"
    getProp "s"
    getProp "__vals"
    push
"%

# get "__globals", setProp "getSubStateVals" %"
#     get "s", getProp "__vals"
# "%

get "__globals", setProp "testGlobal" %"
    say "ok!"
"%
testGlobal



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
get "__stateChangers", setProp "dup" %"
    # funny thing is this could use dup!
    # get "s", getProp "__vals"
    getSubStateVals
    getSubStateVals
    getSubStateVals
    length
    - 1
    at
    push
"%


put 999
dup
say
say

get "__stateChangers", setProp "as" %"
    get "s"

    # get "s", getProp "__vals"
    getSubStateVals
    pop

    # get "s", getProp "__vals"
    getSubStateVals
    pop

    setProp
"%
put "yo!!"
as "hello"
get "hello", say

get "__stateChangers", setProp "swap" %"
    # get "s", getProp "__vals"
    getSubStateVals
    pop, as "tmp"

    getSubStateVals
    pop, as "tmp2"

    getSubStateVals
    get "tmp"
    push

    getSubStateVals
    get "tmp2"
    push
"%


get "__call_immediates", setProp "(" %"
    # might be more readable if we used "as" here?
    put __STATE "s"
    makeObject
        dup
            put "__fileName"
            get "s", getProp "__fileName"
        setProp

        dup
            put "__i"
            get "s", getProp "__i"
        setProp

        dup
            put "__code"
            get "s", getProp "__code"
        setProp

        dup
            put "__vals", makeArray
        setProp
        dup
            put "__stateChangers"
            get "s", getProp "__stateChangers"
        setProp

        dup
            put "__call_immediates"
            get "s", getProp "__call_immediates"
        setProp

        dup
            put "__argCount" 0
        setProp

        dup
            put "__currFuncToken" ""
        setProp

        dup
            put "__lexicalParent"
            get "s"
        setProp
        dup
            put "__callingParent"
            get "s"
        setProp
    setProp
"%


get "__call_immediates", setProp ")" %"
    # call without setting __currFuncToken so it doesn't recurse
    get "s", callFuncAccessible
    as "s"
    
    # debug
    # get "s", getProp "__vals"
    # pop
    # say
    # exit
    
    get "s", getProp "__lexicalParent"
    as "parentState"

    get "parentState", getProp "__vals"
    get "s", getProp "__vals"
    # getSubStateVals
    pushm


    get "parentState"
    put "__i"

    get "s"
    getProp "__i"
    setProp

    put __STATE "s"
    get "parentState"
    setProp
"%

get "__stateChangers", setProp "goUp" %"
    lastIndexOf (getProp (get "s") "__code" (get "s", getProp "__vals", pop))
"%


say "the globals"
get "__stateChangers", keys, say


put "bar" "foo", swap, cc, say

say (+ 10 200)
exit
# 
say (cc "hello " "world!")
say "what?"
exit

        # "__fileName": fileName,
        # "__i": 0,
        # "__code": code,
        # "__vals": &[]any{},
        # "__stateChangers": map[string]any{},
        # "__call_immediates": map[string]any{},
        # "__argCount": 0,
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



#!/usr/bin/env go run linescript3.go

#notfound


say "start lol"
setProp __STATE "foo" "this is bar"
getProp __STATE "foo", say

+ 1 100
say

getProp __STATE "__globals", setProp "yo" %"
    say "Yo!"
"%
yo

getProp __STATE "__globals", setProp "get" %"
    getProp __STATE "s"
        getProp "__vals"

        getProp __STATE "s"
            getProp __STATE "s"
            getProp "__vals"
            pop
        getProp
    push
"%

get "__globals", setProp "dup" %"
    # funny thing is this could use dup!
    get "s"
    getProp "__vals"

        get "s"
        getProp "__vals"
            get "s"
                getProp "__vals"
                length
            - 1
        at
    push
"%

put 999
dup
say
say

get "__globals", setProp "as" %"
    put  __STATE

    get "s", getProp  "__vals"
    pop


    get "s", getProp  "__vals"
    pop

    setProp
"%

get "__globals", setProp "swap" %"
    get "s", getProp  "__vals"
    pop, as "tmp"

    get "s", getProp  "__vals"
    pop, as "tmp2"

    get "s", getProp "__vals"
    get "tmp2"
    push

    get "s", getProp "__vals"
    get "tmp1"
    push
"%

get "__globals", setProp "goUp" %"

"%


get "__call_immediates", setProp "(" %"
    # might be more readable if we used "as" here?
    put __STATE
    put "s"
    makeObject
        dup
            put "__fileName"
            get "s", getProp "__fileName"
        setProp

        dup
            put "__i" 0
        setProp

        dup
            put "__code"
            get "s", getProp "__code"
        setProp

        dup
            put "__vals", makeArray
        setProp
        dup
            put "__globals"
            get "s", getProp "__globals"
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
    // because potentially no newline, so we force call it
    get "s", callFunc
    get "s", getProp "__lexicalParent"
    as "parentState"

    get "parentState", getProp "__vals"
    get "s", getProp "__vals"

    put __STATE "s"
    get "parentState"
    setProp
"%

        # "__fileName": fileName,
        # "__i": 0,
        # "__code": code,
        # "__vals": &[]any{},
        # "__globals": map[string]any{},
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



get "foo", say

exit


# get foo
# say

# getProp __STATE "__globals", setProp "__getVar" %"
#     getProp __STATE "s"
#     getProp __STATE "varName"
#     has
#
#
# "%

yo

# getProp __STATE "__globals", setProp "__evalToken" %"
#
# "%

setProp __STATE "__callFunc" %"

"%



# getProp __STATE "__globals"
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



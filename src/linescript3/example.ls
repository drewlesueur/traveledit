#!/usr/bin/env go run linescript3.go

#notfound


say "start lol"
setProp __STATE "foo" "this is bar"
getProp __STATE "foo", say

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



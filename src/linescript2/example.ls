#!/usr/bin/env go run linescript2.go

say "start lol"


# put __STATE "get2", here, setProp
# pop __vals

put __STATE "goto", here, setProp
__code


put __STATE "endFunc", here, setProp
goto "#doneEndFunc"
say "this should end the func"
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



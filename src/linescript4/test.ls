#!/usr/bin/env linescript4

let foo bar
say foo

def DoSomething name
    say "what do you want me do do? " name
end

DoSomething Drew


let bizzy null
say bizzy



# "abcdefghijklmnopqestuvwxyz"
# split ""
# each :letter
#     if letter (is "a")
#         say "cool an A"
#     else if letter (is "b")
#         say "cool a B"
#     else
#     end #endif
# end #endeach

# "abcdefghijklmnopqestuvwxyz"
# split ""
# each :letter
#     if letter (is "a")
#         say "cool an A"
#     else if letter (is "b")
#         say "cool a B"
#     else
#         say "cool other"
#     end #endif
# end #endeach



# let :letter "b"
# if letter (is "a")
#     say "cool an A"
# else if letter (is "b")
#     say "cool a B"
# else
#     say "cool other"
# end #endif
# exit

# "abcdefghijklmnopqestuvwxyz"
# split ""
# each :letter
#     if letter (is "a")
#         say "cool an A"
#     else if letter (is "b")
#         say "cool a B"
#     else
#         say "cool other"
#     end #endif
# end #endeach
# 
# say "done"
# exit


# "abc"
# split ""
# each :letter
#     if letter (is "a")
#         say "cool an A"
#     else if letter (is "b")
#         say "cool a B"
#     else
#         say "cool other"
#     end #endif
#     say "loopend"
# end #endeach
# 
# say "done"
# exit





# 3 loop :i
#     if letter (is "a")
#         say "#yellow cool an A"
#     else if letter (is "b")
#         say "#red cool a B"
#     else
#         say "#skyblue cool other"
#     end
# end





# "abcdefghijklmnopqestuvwxyz"
# split ""
# each :letter
#     say "letter is" letter
#     if letter (is "a")
#         say "#yellow cool an A"
#     else if letter (is "b")
#         say "#red cool a B"
#     else
#         say "#skyblue cool other"
#     end
# end

say "wow"

exit




"yo" startsWith "y", not
say

"yo" startsWith "y" 
say

string: foo bar 
toJson
say


let :names ("bob bill doug tom" split " ")
say names (map: upper, cc "!" (cc "?"))
names map: upper, cc "!"
say
exit


names map
   upper
   cc "!"
end
say
say

names map: upper, cc "!"
say
say
names (map: upper)
say
say
say
# names (map: upper, cc "!")
# say
# say
# say
exit

say names
names each :name
    say "hello" name
end
debugVals
names each :i :name
    say i "hello" name
end
names each
    say "hello" it
end
exit

let :myLog []
say myLog
exit

def :log :v
    myLog push v
end

def log v
    myLog push v
end

each (smrhng) i v

end

log "yo"
expect ["yo"]
debugVals

eaxh





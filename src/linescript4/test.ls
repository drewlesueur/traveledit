#!/usr/bin/env linescript4

string: foo bar 
toJson
say

let :names ("bob bill doug tom" split " ")
say names (map: upper, cc "!")
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





#!/usr/bin/env go run linescript.go
say "hello world"

execBashCombined %"
    date
"%
say

def "greet" "name"
    cc "Hello " name
    say
end

say "going to greet"
greet "Drew"
# loop "x" 1 100
# 
# end

# each list "key" "val"
# 
# end

if (is 1 2)
    say "1 is 2"
end

if (is 1 2)
    say "1 is 2"
else
    say "1 is not 2"
end

if (is 1 2)
    say "1 is 2"
else if (is 1 1)
    say "1 is 1"
end

if (is 1 2)
    say "1 is 2"
else if (is 1 3)
    say "1 is 3"
else if (is 1 4)
    say "1 is 4"
end

if (is 1 2)
    say "1 is 2"
else if (is 1 3)
    say "1 is 3"
else if (is 1 4)
    say "1 is 4"
else
    say "1 is not any"
end


let "list" [1 2 3]
say list

[2 4 6]
say

# say (cc "hia " "pal")

(let "x" "wowza!"
say x
put x)

# cc " is cool"
# say
say (cc " is cool")
            
# def "incrr"
#     let "x" 0
#     def "incr"
#         let "x" ()
#     end
#     return incr
# end

say "ok cool"

# say greet



let "foo" 100
say foo

# sleepMs 100



# label "thing"
# 
# 
# goto "thing"


# how is everyone
# 
# ok (yo man)
# 
# smthng"
# yo "wrld" yo"smthng
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

greet "Drew"


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
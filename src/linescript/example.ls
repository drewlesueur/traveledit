#!/usr/bin/env go run linescript.go
say "hello world"

execBashCombined %"
    date
"%
say

def "greet" "name"
    say "in greet!"
    say name
end

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
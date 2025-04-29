#!/usr/bin/env -S go run linescript4.go stringmath.go 

say .yo ++ .man

.name = .Drew
.info = {.age 40}


# say %% Hello my name is $name
# say %% Hello my name is <name> and I am <info at .age>
say %% Hello my name is (name) and I am (info at .age) 
# say %% Hello my name is [name] and I am [info at .age]
# say %% Hello my name is {name} and I am {info at .age}
# say %% Hello my name is %name% and I am %info at .age%


say verycool"yo man"verycool


# say istring: Hello $name

# let s __state
# go :s
#     sleepMs 1000
#     say "cool!"
#     resume s
# end
# as :w
# 
# say "whatup"
# 
# pause
# 
# say "wow!"






# go
#     sleepMs 1000
#     say "cool!"
# end
# as :w
# 
# say "whatup"
# 
# wait w

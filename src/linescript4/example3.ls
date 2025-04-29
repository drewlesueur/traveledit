#!/usr/bin/env -S go run linescript4.go stringmath.go 

string
    foobar
    yo
end upper
say

.name = .Drew
.info = {.age 40}

say %%
    what gives with this, %name
    thing?
    (%loopRange 10 20 .i
        %% Ok wow %i
        newline
    end)
    Pretty cool
end
say %%
    what gives with this, %name
    thing? (%
    loopRange 10 20 .i
        %% Ok wow %i
        newline
    end
    )Pretty cool
end

say .yo ++ .man



say %% Hello my name is (% name) and I am (% info at .age, (- 1)) years old (as of last year)
say %% Hello my name is %name and I am (% info at .age, (- 1)) years old (as of last year)


# say %% Hello my name is $name
# say %% Hello my name is <name> and I am <info at .age>
# say %% Hello my name is (name) and I am (info at .age, (- 1)) years old (lp)as of last year(rp)
# say %% Hello my name is (name) and I am (info at .age, (- 1)) years old ("(as of last year)")
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

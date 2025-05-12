#!/usr/bin/env -S go run linescript4.go stringmath.go 


# def .add1 .val

def .process .line
    upper line
    cc "!"
end

[wow. this. is. cool. i. think. apples. are. cool.]
each .line
    say line
    say process line
end

local .foo .bar

foo. = {name. drew.}

say %% hello (%foo at name.) yo (%foo at name.)

[wow. this. is. cool. i. think. apples. are. cool.]
sort
say
exit





execBashStdout %%
    # bash script to loop 10 times print the date and a message each time, then end
    COUNT=10
    for i in $(seq 1 "$COUNT"); do
      echo "$i: $(date)"
      sleep 1
    done
    echo "All $COUNT iterations completed."
end
drop go
    execBashStdout %%
        # bash script to loop 10 times print the date and a message each time, then end
        COUNT=10
        for i in $(seq 1 "$COUNT"); do
          echo "async: $i: $(date)"
          sleep 1
        done
        echo "All $COUNT iterations completed."
    end
    say
end
say

exit

["mountain", "tree", cloud]
as [.M .T .C]
say M T C

exit

{
    .tree .arbol
    .sun .sol
    .leaf .oja
    .star .estrella
} each .k .v
    say %% %k is %v
end






[100 20 500 30 900]
filter
    > 100
end
say
exit

"./go.sum" readFileByLine .i .line
    say i " => " line
end


[.one .two .three .four]
each .i .v
    say i v
end

[.one .two .three .four]
map .v
    v ++ "."
end
say


[.one .two .three .four]
each
    say it
end
exit


[.one .two .three .four]
each .v
    say v
end


[.one .two .three .four]
each .i .v
    say %% (%i) => %v
end
.name = "Drew"
say %% The name is %name



[.yo .a .test .here]
each .k .v
    say k v
    say %% what 
end


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

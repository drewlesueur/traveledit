#!/usr/bin/env linescript4


[
    "./example2.ls"
    "node example.js"
    "bun example.js"
    "php example.php"
    # "python3 example.py"
]
each :i :v
    say v
    # execBash "/usr/bin/time -l " (cc v)
    execBashCombined "/usr/bin/time -l " (cc v)
    say
end



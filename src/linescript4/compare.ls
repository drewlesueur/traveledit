#!/usr/bin/env linescript4


[
    "./example2.ls"
    # "node example.js"
    "node linescript4.js example2.ls"
    # "bun example.js"
    "bun linescript4.js example2.ls"
    # "php example.php"
    # "python3 example.py"
]
each :i :v
    say v
    # execBashCombined "/usr/bin/time -l " (cc v)
    execBashCombined "/usr/bin/time -v " (cc v)
    say
end



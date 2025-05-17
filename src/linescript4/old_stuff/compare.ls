#!/usr/bin/env linescript4


[
    "./example2.ls"
    "node example.js"
    "bun example.js"
    "perl example.pl"
    "python3 example.py"
    # "node linescript4.js example2.ls"
    # "bun linescript4.js example2.ls"
    # "php example.php"
]
each :i :v
    say "#cyan================" v
    # execBashCombined "/usr/bin/time -l " (cc v)
    # execBashCombined "/usr/bin/time -v " (cc v)
    execBashCombined v
    say
end



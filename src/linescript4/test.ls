# test.ls - Linescript4 tests

def .assertEq .label .actual .expected
    if eq actual expected
        say "PASS" label
    else
        say "FAIL" label "expected" expected "got" actual
    end
end

# Arithmetic
assertEq .addition (+ 2 3) 5
assertEq .multiplication (* 4 5) 20

# Variables
let .x 10
assertEq .variable x 10

# Conditionals
if eq x 10
    let .cond "ok"
else
    let .cond "bad"
end
assertEq .if cond "ok"

# Arrays
let .arr [1 2 3]
push arr 4
assertEq .arrayPush (length arr) 4
pop arr
assertEq .arrayPop (length arr) 3
assertEq .arrayIndex (at arr 2) 2

# Objects
let .obj {"foo" 1}
setProp obj "bar" 2
assertEq .objectGet (getProp obj "bar") 2

# Loop sum with each
let .sum 0
arr each .i .v
    + v sum as .sum
end
assertEq .loopEach sum 6

# Function definition and call
def .addTwo .a .b
    + a b
end
assertEq .function (addTwo 3 4) 7

# Map
[1 2 3] map .v
    * v 2
end as .double
assertEq .mapTest (at double 3) 6

# Filter
[1 2 3 4] filter .v
    gt v 2
end as .filtered
assertEq .filterTest (length filtered) 2

# Sort
[3 1 2] sort as .sorted
assertEq .sortTest (at sorted 1) 1

say "DONE"

package main

import (
    "fmt"
)
func main() {
    a := []int{0, 1, 2, 3, 4, 5}
    fmt.Println("cap of a is", cap(a))
    b := a[0:4]
    fmt.Println(b)
    
    c := append(b, 200, 300)
    fmt.Println("after append")
    fmt.Println("a", a)
    fmt.Println("b", b)
    fmt.Println("c", c)
    
    
    b = append(b, -100)
    fmt.Println("after append2")
    fmt.Println("a", a)
    fmt.Println("b", b)
    fmt.Println("c", c)
    
    
    a = append(a, 500)
    a[0] = -1
    fmt.Println("after append3")
    fmt.Println("a", a)
    fmt.Println("b", b)
    fmt.Println("c", c)
}

hello world :)
# comment here
how "are" we?
woa
and $ this thing here "yo"

exit

greet:
    say "yo"



if (is x 3) :


if (x is 3):



set "foo" {

}






se


loop 100 { as "i"
    if (is i 50) {
        break 2
    }
    say ("i is " cc i)
}

loop 100: as "i"
    if (is i 50):
        goPastEnd 2
    say ("i is " cc i)


set "makeIncr" {
    set "x" 0
    lex {
        set "x" (add x 1)
        put x
    }
}

if x is 3 then
else
end

makeIncr:
    set "x" 0
    : set "x" (add x 1), put x


incr: set "x" (add x 1), put x, rerurn
makeIncr: set "x" 0, lex incr, return

function makeIncr() {
    var x = 0; return () => { return ++x }
}

lex: as "f"
    setp f "scope" callerScope
    f
end


// can take variable number of args
// a marker is put on stack before a function is called
def makeIncr { as x
    put {
        set x (add $x 1)
        put $x
    }
}

say Hello world

loop 100 { as i
    if (is $i 50) {
        break 2
    }
    say "i is $i"
}

makeIncr:
    as x
    set state {
        set x $x
    }
    put [makeIncr_Incr $state]
    return
makeIncr_Incr:
    as state
    setp [$state x] (plus 1 ($state at x))

makeIncr_Incr:
    as state
    $state at x
    plus 1
    as [$state x]

makeIncr_Incr:
    dup
    at x
    plus 1
    setOVK x
    return

set incr (makeIcr 100)
say (incr)
say (incr)

greet: as name
    is $name Drew
    ifso its_drew not_drew
its_drew:
    say "Hello Drew, access granted"
    goto done_drew_check
not_drew:
    say "Hello $name, access denied"
done_drew_check:



loop: as n fn
set i 0
loopStart:
$fn
set i (plus 1 $i)
gte $i $n
elsego loopEnd
goto loopStart
loopEnd:
return

loop: as n fn
    set i 0
loopStart:
    $fn $i
    elsego loopEnd
    set i (plus 1 $i)
    gte $i $n
    elsego loopEnd
    goto loopStart
loopEnd:
return

calling a func auto puts the first param as the next location


loop 3 sayPlus1
goto endSayPlus1
sayPlus1: as i
    say "$i plus 1 is $(plus 1 $i)"
    return true
endSayPlus1:

upperFirst:
    dup
    at 0, upper
    sliceFrom 1
    cc
    return

greet:
    upperFirst
    "Hello"
    swap
    cc
    say


example recursive function javascript

function factorial(n) {
    if (n === 0) {
        return 1;
    }
    return n * factorial(n - 1);
}

factorial: as n
    is $n 0
    elsego not0
    1
    return
not0:
    factorial (minus $n 1)
    times n
return


the :: goes to the correspondig done

if (is x 3) yay nay
yay::

done_yay:
nay::
done_nay:


concurrency

set endpoints [/blue /green /red /orange]
processEndpoints
say

processEndpoints:: as peRet endpoints
    set values
    set gotCount 0
    forEach endpoints each_endpoint
    each_endpoint:: as i e
        httpGet "https://example.com$(e)" [onGot $i $e]
    ::each_endpoint
    onGot:: as i e response
        set [$values i] ($response at body)
        is gotCount (len endpoints)
        elsego done_onGot
        returnTo peRet values
    ::onGot
    void
::processEndpoints


processEndpointsConcurrent:: as peRet endpoints
    set values
    set gotCount 0
    forEach endpoints each_endpoint
    each_endpoint:: as i e
        httpGet "https://example.com$(e)" [onGot $i $e]
    ::each_endpoint
    onGot:: as i e response
        set [$values i] ($response at body)
        is gotCount (len endpoints)
        elsego done_onGot
        returnTo peRet values
    ::onGot
    void
::processEndpointsConcurrent


sleepSync:: as swRet seconds
    sleep $seconds [$swRet]
    void
::sleepSync

go:: as fn cb
    setTimeout 0 $fn [whenDone $cb]
    whenDone:: as cb
       $cb
    ::whenDone
::go

forEachConcurrent:: as items concurrency fn
    set pendingRequests 0
    set i 0
    start:
    go $fn [itsDone $i]
    goto start
::forEachConcurrent
itsDone::

::itsDone


start:
    set info []
    set colors [red blue green yellow gold]
    limitedForEach 3 colors [eachColor $info] [doneColors $info]
eachColor: as info i color cb
    say "sleeping $i $color"
    sleep 2 [eachColorSleep $info $i $color $cb]
eachColorSleep: as info i color cb
    set [info $i] "the color is $color"
    $cb $info
doneColors: as info
    say "yay done colors $info"


limitedForEach: as concurrency items fn allDone
    set s [set processing 0, set processsed 0]
    loop $concurrency [limProcessOne $items $fn $allDone $s]
limProcessOne: as items fn allDone s i
    incr [$s processing] 1
    $fn $i ($items at $i) [doneProcessOne $items $allDone $s $i]
doneProcessOne: as items allDone s i
    incr [$s processsed] 1
    say "yay done with $i"
    is ($s, at processed) (len $items)
    ifso $allDone [notDone $items $fn $allDone $s]
notDone:
    lt ($s at processing) (len $items)
    ifso [limProcessOne $items $fn $allDone $s] ""



start:
    sleep 1 [afterSleep]
afterSleep:
    sleep 2 [afterSleep2]
afterSleep2:
    say "done sleeping"
    
if []



limitedForEach: as concurrency items fn allDone
    s: [processing: 0, processed: 0]
    loop $concurrency [limProcessOne $items $fn $allDone $s]
limProcessOne: as items fn allDone s i
    incr $s:processing 1
    $fn $i $items:$i [doneProcessOne $items $allDone $s $i]
doneProcessOne: as items allDone s i
    incr $s:processed 1
    say "yay done with $i"
    is $s:processed (len $items)
    ifso $allDone [notDone $items $fn $allDone $s]
notDone:
    lt $s:processing (len $items)
    ifso [limProcessOne $items $fn $allDone $s] ""


$s at 3


function limitedForEach(concurrency, items, cb, allDone) {
    
}

( $s at processing)

finish this

```javascript
function limitedForEach(concurrency, items, cb, allDone) {
    let index = 0;
    let active = 0;

    function next() {
        if (index === items.length && active === 0) {
            return allDone();
        }

        while (active < concurrency && index < items.length) {
            active++;
            cb(items[index], () => {
                active--;
                next();
            });
            index++;
        }
    }

    next();
}


limitedForEach: concurrency items fn allDone
    s: [processing: 0, processed: 0]
    loop $concurrency [limProcessOne $items $fn $allDone $s]
limProcessOne: items fn allDone s i
    incr $s:processing 1
    $fn $i $items:$i [doneProcessOne $items $allDone $s $i]
doneProcessOne: items allDone s i
    incr $s:processed 1
    say "yay done with $i"
    is $s:processed (len $items)
    ifso $allDone [notDone $items $fn $allDone $s]
notDone:
    lt $s:processing (len $items)
    ifso [limProcessOne $items $fn $allDone $s] ""



limited_for_each: concurrency items fn allDone
    s = [processing: 0, processed: 0]
    loop $concurrency [.limProcessOne $items $fn $allDone $s]
limProcessOne: items fn allDone s i
    $s:processing += 1
    $fn $i $items.$i [.doneProcessOne $items $allDone $s $i]
doneProcessOne: items allDone s i
    incr $s.processed 1
    say "yay done with $i"
    if ($s.processed is (len $items))
        $allDone
        [.notDone $items $fn $allDone $s]
notDone:
    if ($s.processing lt (len $items) [
        .limProcessOne $items $fn $allDone $s
    ] ""




2 otions

allow:
    $my_list push 300
but then require:
    call $cb $value
vs

require:
    push $my_list 300
but allow:
    $cb $value
hmm

($s at bar)

newline means call function
sugar for assignment

easy to implement
easy to learn (simple rules)
but easy to write and read (flow)
----
also idea of being a state machine evebt loop


"word = " is a token itself
    val = 37

first one on line is a function
    say hello
    push $mylist 20
    gt $x 20

the second one on line could aslo be the
func as long as first one is a variable
    "hello" say
    $mylist push 20
    $x gt 20
    
But if you need to dynamically call a
function use "call"
    call $cb

because of that if the first one is a string
and not meant to be a function call
use quotes
    "hello" say

call, goto, callSameScope
caller scope

$x.$y+1 = 

greet: name
    $name at 0
    upper
    $name sliceFrom 1
    cc

greet: name
    ($name startsWith "Drew") #isDrew #notDrew
isDrew:
    say Hello $name
notDrew:
    ($name is "Sam I Am") @isSam @notSam
isSam:
    say Hi Sam
notSam:
    say Not Sam


cb on anything?!


make a fizbuzz program in javascript

for (let i = 1; i <= 100; i++) {
  if (i % 3 === 0 && i % 5 === 0) {
    console.log("FizzBuzz");
  } else if (i % 3 === 0) {
    console.log("Fizz");
  } else if (i % 5 === 0) {
    console.log("Buzz");
  } else {
    console.log(i);
  }
}

loopRange 1 100

now in Go

for i := 1; i <= 100; i++ {
    if i%3 == 0 && i%5 == 0 {
        fmt.Println("FizzBuzz")
    } else if i%3 == 0 {
        fmt.Println("Fizz")
    } else if i%5 == 0 {
        fmt.Println("Buzz")
    } else {
        fmt.Println(i)
    }
}








loop: times fn
    call $fn
    times = $times - 1

true: a b
    goto $a
false: a b
    goto $b

start:
new_chomp:
    machine = {
        files: []
        code_index: 0
        file_index: 0
        stack: []
        call_stack: []
        currentToken
    }
    $machine
chomp_add_file: c full_path code
    $c.files push [
        full_path: $full_path
        code: $code
    ]
chomp_run: c cb
    token = get_next_token $c




start:
new_chomp:
    machine = {
        files: []
        code_index: 0
        file_index: 0
        stack: []
        call_stack: []
        currentToken
    }
    $machine
chomp_add_file: c full_path code
    $c.files push [
        full_path: $full_path
        code: $code
    ]
chomp_run: c cb
    token = get_next_token $c
    

start:
new_chomp:
    machine = {
        files: []
        code_index: 0
        file_index: 0
        stack: []
        call_stack: []
        currentToken
    }
    $machine
chomp_add_file: c full_path code
    $c.files push [
        full_path: $full_path
        code: $code
    ]
chomp_run: c cb
    token = get_next_token $c



if 
else if
end

loop 30
end


limitedLoop: concurrency items cb
    




get_next_token: c
    file = $c.files at ($c.file_index)
    code = $file.code
    token = step_index c code
step_index: c code
    char = $code at ($c.code_index)
    $c.code_index += 1
    if ($char isany "(){}[]") [.goto is_brace] [.goto not_brace]
is_brace:
    return {
        token: $char
        type: symbol
    }
not_brace:
    $char isany [$newline ","]
    [.goto is_newline]
    [.goto not_newline]
is_newline:
    return {
        token: $newline
        type: newline
    }
not_newline:
    if ($char is ",")



each_index: c code i
    char = $code.$i
    if ($char isany "(){}[]") [is_symbol $c $char] [not_symbol $char]
is_symbol: c char
    token = {
        value: $char
        type: symbol
    }
not_symbol: c char
next:
peek_next_token: c




main:
    vals = []
    loop 10 [#loopie $vals] [#doneLoop $vals]
loopie: vals i
    $vals push $i
doneLoop: vals
    say "the values are $vals"

func main() {
    vals = []
    loop 10 {
        $vals push $i
    }
    say "the vals are $vals"
}


greet: name cb
    $name at 0
    name sliceFrom 1
    cc
    as titledName
    if ($titledName is "Drew") #isDrew #notDrew #doneCheck
isDrew:
    say "welcome Drew"
notDrew:
    
doneDrew:
    hi

    
yo:

function main() {
    doCount()
    print("All Done")
}

function limitedLoop(concurrency, times, fn) {
    sem = makeSem(5)
    loop 100 {
        acquire(sem)
        fn(i)
        release(sem)
    }
}

another draft*****
    limitedLoop: concurrency times fn cb
        var s $scope
        var $s.started 0
        var $s.finished 0
        loop $s.concurrency [#loopie $s] ""
    loopie: s i
        incr $s.started 1
        $s.fn $i [#doneLoopie $s $i]
    doneLoopie: s i cb
        incr $s.finished 1
        if (eq $s.finished $s.times) [$s.cb] [#notDoneLooping $s] ""
    notDoneLooping:
        if (lt $s.started $s.times) [#loopie $s] "" ""

early return

if (a or (b and c))

semIdea****
    makeSem: size
        {
            var max $size
            var used 0
            var waiters []
        }
    acquire: s cb
        if (eq $s.used $s.max) [#blocked $s $cb] [#notBlocked $s $cb]
    blocked: $s $cb
        push $s.waiters $cb
    notBlocked: $s $cb
        incr $s.used 1
    release: s
        if (len $s.waiters, gt 0) [#runOne $s] [#noNeed $s]
    runOne:
        var cb (pop $s.waiters)
        $cb
    noNeed:
        decr $s.waiters 1

semIdea2****
    makeSem: size
        {
            var max $size
            var used 0
            var waiters []
        }
    acquire: s cb
        if (eq $s.used $s.max)
            push $s.waiters $cb
        else
            incr $s.used 1
        end
    release: s
        if (len $s.cb, gt 0)
            $s.cb
        else
            decr $s.used 1
        end
semIdea2 (syntax change)****
    makeSem: size
        {
            max: size
            used: 0
            waiters: []
        }
    acquire: s cb
        if (eq s.used s.max)
            push s.waiters cb
        else
            incr s.used 1
        end
    release: s
        if (len s.cb, gt 0)
            s.cb
        else
            decr s.used 1
        end
semIdea3 (syntax change)****
    makeSem size
        {
            max: size
            used: 0
            waiters: []
        }
    acquire s cb
        if (eq s.used s.max)
            push s.waiters cb
        else
            incr s.used 1
        end
    release s
        if (len s.cb, gt 0)
            s.cb
        else
            decr s.used 1
        end
        
exampleWaterfall*****
    waterfallLoop: times fn cb
        var s {
            var started 0
            var finished 0
            var times $times
            var fn $fn
            var cb $cb
        }
        doOne $s
    doOne: s
        incr $s.started 1
        $s.fn [#doneOne $s]
    doneOne: s
        incr $s.finsihed 1
        if (eq $s.finsihed $s.times)
            $s.cb
        else if (lt $s.started $s.times)
            doOne $s
        end
exampleWaterfall alt syntax*****
    waterfallLoop: times fn cb
        s = {
            started: 0
            finished: 0
            times: times
            fn: fn
            cb: cb
        }
        doOne s
    doOne: s 
        incr s.started 1
        s.fn [#doneOne s]
    doneOne: s
        incr s.finsihed 1
        if (eq s.finsihed s.times)
            s.cb
        else if (lt s.started s.times)
            doOne s
        end
exampleAsyncLoop ****
    asyncLoop: times fn cb
        s = record
            finished: 0
            times: times
            fn: fn
            cb: cb
        end
        loop times "i"
            fn [#asyncCb s cb]
        end
    asyncCb: s i
        incr s.finished 1
        if eq s.finished s.times
            cb
        end
    done:
early draft****
    limitedForEach: concurrency items fn allDone
        s: [processing: 0, processed: 0]
        loop $concurrency [limProcessOne $items $fn $allDone $s]
    limProcessOne: items fn allDone s i
        incr $s:processing 1
        $fn $i $items:$i [doneProcessOne $items $allDone $s $i]
    doneProcessOne: items allDone s i
        incr $s:processed 1
        say "yay done with $i"
        is $s:processed (len $items)
        ifso $allDone [notDone $items $fn $allDone $s]
    notDone:
        lt $s:processing (len $items)
        ifso [limProcessOne $items $fn $allDone $s] ""





function doCount() {
    sem = makeSem(5)
    loop 100 {
        acquire(sem)
        print("hello $i")
        sleepMs(300)
        release(sem)
    }
}


main:

doCount: cb
    concurrency = 5
    maxLoop = 100
    finished = 0
    started = $concurrency
    loop $concurrency [#loopie $started $finished]
loopie: started finished i
    say "hello $i"
    sleepMs 300 [#doneSleep #finished]
doneSleep:
    setValue $finished $i
    if (eq $finished $)

    




main:
    doCount [#allDone]
allDone:
    print "All Done"

not done
    # doCount: cb
    #     sem = makeSem 5
    #     loopAsync 100 [#loopie $sem] [#doneLoop $cb]
    # loopie: sem i loopieCb
    #     acquire $sem [#acquired $sem $i $loopieCb]
    # acquired: sem i loopieCb
    #     say "hello $i"
    #     sleepMs 300 [#doneSleep $sem $loopieCb]
    # doneSleep: sem loopieCb
    #     relase $sem
    #     $loopieCb
    # doneLoop: cb
    #     $cb


main:
    doCount [#allDone]
allDone:
    print "All Done"

doCount: cb
    sem = makeSem 5
    loopAsync 100 [#loopie $sem] [#doneLoop $cb]
loopie: sem i loopieCb
    acquire $sem [#acquired $sem $i $loopieCb]
acquired: sem i loopieCb
    say "hello $i"
    sleepMs 300 [#doneSleep $sem $loopieCb]
doneSleep: sem loopieCb
    relase $sem
    $loopieCb
doneLoop: cb
    $cb
    


getValue

handlePollData: s req
    var name $req.name
    var valuesForName ($s.values.$name)
    if (len $valuesForName, gt 0)
        var v (pop $valuesForName)
        send $req $v
        return
    end
    var t setTimeout 10s [#pollTimeout $s $req]
    $s.waiters.$name | push $req
    $req | setProp timer $t
pollTimeout: s req
    $s.waiters | remove $req
    send $req "yo timeout!"
handleAddData: s req
    var name $req.name
    var value $req.value
    var waitersForName $s.waiters.$name
    if (len $waitersForName, gt 0)
        var waitingReq ($waitersForName | shift)
        $waitingReq | send $value
        $req.timeout | clearTimeout
        return
    end
    $s.values.$name | push $value

    
alernative

handlePollData: s req
    var name $req.name
    var valuesForName ($s.values.$name)
    if (len $valuesForName, is 0)
        var future go {
            sleepSeconds 10
        }
        $s.waiters.$name | push $future
        wait future
    end
    if (len $valuesForName, is 0)
        get $s.waiters, remove $req
        send $req "timeout"
    end
    var v (pop $valuesForName)
    send $req $v
    return
handleAddData: s req
    var name $req.name
    var value $req.value
    var waitersForName $s.waiters.$name
    if (len $waitersForName, gt 0)
        var future ($waitersForName | shift)
        cancel $future
    end
    $s.values.$name | push $value

    

handlePollData: s req
    var name $req.name
    var valuesForName ($s.values.$name)
    if (len $valuesForName, gt 0)
        var v (pop $valuesForName)
        send $req $v
        return
    end
    var t setTimeout 10s [pollTimeout $s $req]
    $s.waiters.$name | push $req
    $req | setProp timer $t
pollTimeout: s req
    $s.waiters | remove $req
    send $req "yo timeout!"
handleAddData: s req
    var name $req.name
    var value $req.value
    var waitersForName $s.waiters.$name
    if (len $waitersForName, gt 0)
        var waitingReq ($waitersForName | shift)
        $waitingReq | send $value
        $req.timeout | clearTimeout
        return
    end
    $s.values.$name | push $value


def makeEnsureAfter
    {
        isRunning false
        needsRun false
    }

global
and local
debating on dollar signs
(evalInCallerScope)



set curValue 100
set saveCurValue makeEnsureCovered rawSaveCurValue

def makeEnsureCovered fn
    let s {
        isRunning false
        needsRun false
        fn fn
    }
    [runEnsureCovered s]
def runEnsureCovered s
    if s.isRunning
        let s.needsRun true
        return
    end
    let s.isRunning true
    s.fn [runEnsureCovered_done s]
def runEnsureCovered_done s
    let s.isRunning false
    if s.needsRun
        let s.needsRun false
        runEnsureCovered s
    end


def rawSaveCurValue cb
    saveFile "myfile.txt" cb
def updateValue value
    let curValue (now)
    saveCurValue
def covered fn afterFn cb
    $fn [covered_doneFn afterFn cb]
def covered_doneFn afterFn cb
    

def makeEnsureCovered fn
    let s {
        isRunning false
        needsRun false
        fn fn
    }
    [ runEnsureCovered s ]
end
def runEnsureCovered s
    if s.isRunning
        let s.needsRun true
        return
    end
    let s.isRunning true
    s.fn [runEnsureCovered_done s ]
    s.fn [ runEnsureCovered_done s ]
end
def runEnsureCovered_done s
    let s.isRunning false
    if s.needsRun
        let s.needsRun false
        runEnsureCovered s
    end
end

a ""

if ( x | is 3 )
    say "hi"
end


if (x | is 3)

end

x + (3)


if (is(), and [has 3 x])
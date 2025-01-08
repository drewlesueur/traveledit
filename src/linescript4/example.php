<?php
$loopCount = 1000000;
$val = 0;
$startTime = microtime(true);
for ($i = 0; $i < $loopCount; $i++) {
    $val = (float)$i - 0.1 + (float)$val;
}
$endTime = microtime(true);
$executionTime = ($endTime - $startTime) * 1000;
echo "Execution time: " . $executionTime . " milliseconds\n";
echo "val is " . $val . "\n";


echo "---\n";

$code = '
$loopCount = 1000000;
$val = 0;
$startTime = microtime(true);
for ($i = 0; $i < $loopCount; $i++) {
    $val = (float)$i - 0.1 + (float)$val;
}
$endTime = microtime(true);
$executionTime = ($endTime - $startTime) * 1000;
echo "Execution time: " . $executionTime . " milliseconds\n";
echo "val is " . $val . "\n";
';

eval($code);

echo "---\n";

$loopCount = 1000000;
$val = 0;
$startTime = microtime(true);
for ($i = 0; $i < $loopCount; $i++) {
    eval('$val = (float)$i - 0.1 + (float)$val;');
}
$endTime = microtime(true);
$executionTime = ($endTime - $startTime) * 1000;
echo "Execution time: " . $executionTime . " milliseconds\n";
echo "val is " . $val . "\n";


echo "---\n";
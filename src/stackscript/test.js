#!/usr/bin/env node
const { performance } = require('perf_hooks');

console.log('yay');

const start = performance.now();

let b = 0;
for (let i = 1; i < 9_000_001; i++) {
  b = i - 1 - 0.1 + b
}

console.log('Last value:', b);

const end = performance.now();
const elapsedMs = end - start;

console.log(`Elapsed time: ${elapsedMs.toFixed(3)} ms`);

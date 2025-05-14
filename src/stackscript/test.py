import time

# start = time.perf_counter()
start_ns = time.perf_counter_ns()
b = 0
for i in range(9_000_000):
    b = i - 0.1 + b
print("Last value:", b)
# end = time.perf_counter()
end_ns = time.perf_counter_ns()

# elapsed_ms = (end - start) * 1_000
# print(f"Elapsed time: {elapsed_ms:.3f} ms")

elapsed_ms2 = (end_ns - start_ns) / 1_000_000
print(f"Elapsed time: {elapsed_ms2:.3f} ms")


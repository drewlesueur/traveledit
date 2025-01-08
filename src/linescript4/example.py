import time

loop_count = 1000000
val = 0
start_time = time.time()
for i in range(loop_count):
    val = i - 0.1 + val
end_time = time.time()
execution_time = (end_time - start_time) * 1000
print(f"Execution time: {execution_time} milliseconds")
print(f"Val is {val}")

print("---")

exec('''
loop_count = 1000000
val = 0.0
start_time = time.time()
for i in range(loop_count):
    val = i - 0.1 + val
end_time = time.time()
execution_time = (end_time - start_time) * 1000
print(f"Execution time: {execution_time} milliseconds")
print(f"Val is {val}")
''')

print("---")

loop_count = 1000000
val = 0
start_time = time.time()
for i in range(loop_count):
    exec('val = i - 0.1 + val')
end_time = time.time()
execution_time = (end_time - start_time) * 1000
print(f"Execution time: {execution_time} milliseconds")
print(f"Val is {val}")

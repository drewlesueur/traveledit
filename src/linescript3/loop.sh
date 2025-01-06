i=0
val=0
start=$(date +%s)  # Get the current time in milliseconds
while [ $i -lt 100000 ]; do
  val=$((val + (i % 30)))
  i=$((i + 1))
done
end=$(date +%s)    # Get the current time in milliseconds

# Calculate elapsed time in milliseconds
elapsed=$((end - start))
echo $elapsed



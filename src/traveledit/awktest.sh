#!/bin/bash


# commit 83526ad64cc00514b5fe5ce147d6c2635487f68f
# Author: Drew LeSueur <drewalex@gmail.com>
# Date:   Sun Oct 3 23:21:05 2021 -0700
# 
#     more work on calling it 'shell' instead of 'bash'

git log -1 | awk '
    NR == 2 { print  }
    { print NR }
    
'
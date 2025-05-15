#!/usr/local/bin/linescript4

say "hello"


  # "input": "tell me a 5-10 word story",
string
    curl "https://api.openai.com/v1/responses" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $CHATGPTKEY"  \
      -d '{
          "model": "gpt-4.1",
          "input": "tell me a 20 word story",
          "stream": true
      }'
end
execBashStdout
# say
each :v
    say v
done



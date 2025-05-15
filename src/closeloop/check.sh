
curl "https://api.openai.com/v1/responses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHATGPTKEY"  \
  -d '{
      "model": "gpt-4.1",
      "input": "In the heart of an ancient forest, there stood a towering oak tree known to the villagers as the Guardian. Every evening, as the sun dipped below the horizon, a soft golden glow would emanate from the tree’s bark, illuminating the surrounding woods. One evening, a curious young girl named Elara ventured close enough to touch the glowing tree. The moment her fingers brushed the bark, the forest fell silent, and a hidden door slowly creaked open at the tree’s base.\n\nInside, Elara found a spiral staircase that seemed to descend endlessly into the roots of the oak. Gathering her courage, she began the descent, every step echoing with a soft hum. At the bottom, she entered a cavern filled with shimmering lights, where tiny creatures with wings danced around a crystalline pool. They whispered ancient secrets and beckoned her to join their circle.\n\nElara felt a strange warmth spreading through her chest, as if the forest was sharing its oldest memories with her. Yet, she sensed there was more to discover beyond the glowing pool, a mystery waiting to be unveiled within the heart of the Guardian itself.\n\nWhat comes next?",
      "stream": true
  }'
  
  
  # come up with a story of a few paragrpahs, ar the end ask "What comes next?"
  # encode the story as a json string

  
curl "https://api.openai.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHATGPTKEY" \
  -d '{
    "model": "gpt-4.1",
    "messages": [
      {"role": "user", "content": "In the heart of an ancient forest, there stood a towering oak tree known to the villagers as the Guardian. Every evening, as the sun dipped below the horizon, a soft golden glow would emanate from the tree’s bark, illuminating the surrounding woods. One evening, a curious young girl named Elara ventured close enough to touch the glowing tree. The moment her fingers brushed the bark, the forest fell silent, and a hidden door slowly creaked open at the tree’s base.\n\nInside, Elara found a spiral staircase that seemed to descend endlessly into the roots of the oak. Gathering her courage, she began the descent, every step echoing with a soft hum. At the bottom, she entered a cavern filled with shimmering lights, where tiny creatures with wings danced around a crystalline pool. They whispered ancient secrets and beckoned her to join their circle.\n\nElara felt a strange warmth spreading through her chest, as if the forest was sharing its oldest memories with her. Yet, she sensed there was more to discover beyond the glowing pool, a mystery waiting to be unveiled within the heart of the Guardian itself.\n\nWhat comes next?"}
    ],
    "stream": true,
    "stream_options": {"include_usage": true}
  }'
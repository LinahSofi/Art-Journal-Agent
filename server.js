require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('.'));

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Transfer-Encoding', 'chunked');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      stream: true,
      messages: [
        {
          role: 'user',
          content: `You are a warm, insightful art critic and creative muse. 
          The user is an emerging artist sharing an idea or artwork. 
          Give them: 1) a thoughtful critique, 2) creative suggestions, 
          3) an inspiring thought to carry with them.
          
          Their idea: ${message}`
        }
      ]
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta') {
          res.write(parsed.delta.text);
        }
      } catch {}
    }
  }

  res.end();
});

app.listen(3000, () => {
  console.log('Art Journal server running at http://localhost:3000');
});
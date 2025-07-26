const fetch = require('node-fetch');

async function testFallback() {
  const response = await fetch('http://localhost:3000/api/analyze-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        { question: "What is AI?", answer: "Artificial Intelligence", id: 1 }
      ],
      columns: ["question", "answer", "id"],
      useFallback: true
    })
  });

  const result = await response.json();
  console.log('API Response:', JSON.stringify(result, null, 2));
}

testFallback().catch(console.error);

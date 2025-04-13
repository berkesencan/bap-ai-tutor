# Start the server
npm run dev

# Test the Gemini integration
curl -X POST http://localhost:3000/api/ai/chat -H 'Content-Type: application/json' -d '{"message": "Hello, can you help me with my studies?"}'

# FormUp

Forms, one question at a time — an AI form helper for neurodivergent adults.

## Stack
- Express.js server (`server.js`)
- Claude Sonnet API for form parsing and answer formatting
- Vanilla HTML/CSS/JS frontend
- Web Speech API for voice input

## Endpoints
- `POST /api/parse` — Extract questions from pasted form text
- `POST /api/format` — Clean up and format user answers

## Design Principles
- Shield the user from the form — never show the whole document
- One question at a time, plain language
- No explanations, no commentary — just question → answer → next
- Voice input everywhere text is accepted
- Dyslexia-friendly font toggle

## Running Locally
```
npm install
ANTHROPIC_API_KEY=sk-... npm start
```
Runs on port 3001 by default. Works in demo mode without an API key.

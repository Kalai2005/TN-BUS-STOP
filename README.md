# TN Smart Bus System

A centralized digital platform for public and private bus transportation in Tamil Nadu.

## Features

- Real-time bus search
- AI-powered travel advice
- Digital QR ticketing
- Admin inventory management
- User travel history

## Tech Stack

- React 19
- Tailwind CSS
- Motion
- Express
- SQLite
- ChatGPT / OpenAI

## Backend Setup

1. Install dependencies:
   - `npm install`
2. Configure optional environment values:
   - `OPENAI_API_KEY` (required for travel advice and chatbot responses)
   - `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`)
3. Run the app:
   - `npm run dev`

The backend now uses MongoDB for persistence and JWT for authentication.

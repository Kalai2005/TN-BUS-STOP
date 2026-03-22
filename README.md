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
+++++++++++++++++++++++++++++++++++++++++++++++++++++++- Firebase Firestore (backend persistence)
- Gemini AI

## Backend + Firebase Setup

1. Install dependencies:
   - `npm install`
2. Configure Firebase credentials using either option:
   - Option A: put service account JSON at project root as `Firebase credentials.json`
   - Option B: configure environment variables in `.env` (copy from `.env.example`):
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - Optional: set `FIREBASE_CREDENTIALS_PATH` to point to a custom JSON credentials file path
3. Configure optional environment values:
   - `GEMINI_API_KEY` (optional for travel advice endpoint)
4. Run the app:
   - `npm run dev`

When Firebase credentials are configured, backend APIs use Firestore for:
- Bus search data (`schedules`, `routes`, `buses` collections)
- Booking storage (`bookings` collection)

If Firebase credentials are missing, the backend automatically falls back to SQLite mode for local development.

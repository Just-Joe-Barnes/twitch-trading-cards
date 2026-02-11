# Twitch Trading Cards

This repository houses both the React front‑end and Node/Express back‑end for the Twitch Trading Cards project.

For in depth information on the trading and market system implementation, see **backend/README_trading_market.md**.

## Setup

1. Ensure [Node.js](https://nodejs.org/) (version 18 or later) is installed.
2. Install dependencies for each part of the project:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. Configure environment variables as described below.

## Environment Variables

### Backend (`backend/.env`)
Create a `.env` file inside the `backend` directory with values for the following variables:

```
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_SECRET=
TWITCH_REFRESH_TOKEN=
TWITCH_REDIRECT_URI=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
JWT_SECRET=
JWT_EXPIRES_IN=
PORT=5000
MONGO_URI=
CLIENT_URL=
FRONTEND_URL=
SUPER_ADMIN_USER_IDS=696e18dc3126f68a611387af
CHANNEL_POINTS_COST=5000
MODIFIER_CHANCE=0.05
RELAY_SECRET=
TIKTOK_COINS_PER_PACK=1000
YOUTUBE_SUPERCHAT_PACK_USD=5
YOUTUBE_RELAY_ENABLED=false
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
YOUTUBE_POLL_INTERVAL_MS=15000
YOUTUBE_LIVE_CHAT_ID=
YOUTUBE_EVENT_BASE_URL=
YOUTUBE_EVENT_ENDPOINT=/api/external/event
```

`YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET` fall back to the Google OAuth client values if left blank.

After configuring the backend environment, seed the default card modifiers:

```bash
node src/scripts/seedModifiers.js
```
This seeds the **Negative**, **Glitch**, and **Prismatic** modifiers. The Glitch modifier now uses
animated jittering text combined with a subtle static overlay.


### Frontend (`frontend/.env`)
The frontend uses a small `.env` file:

```
PORT=3000
REACT_APP_API_BASE_URL=
REACT_APP_CHANNEL_POINTS_COST=5000
```

## Development Scripts

### Frontend
Run these commands from the `frontend` directory.

- `npm start` – start the React development server.
- `npm run build` – build the production bundle.
- `npm test` – execute frontend tests.

### Backend
Run these commands from the `backend` directory.

- `node server.js` – start the Express server (use `npx nodemon` for live reload during development).
- `npm test` – run backend tests (currently a placeholder script).

Refer to [`backend/README_trading_market.md`](backend/README_trading_market.md) for additional backend documentation.

## Card Grading

Any logged in user can initiate grading for a card from the `/grading` page. Once started, grading takes 24 hours to complete unless an admin overrides the timer. When finished, the card is slabbed with a random grade from 1–10 and displays a plastic "slab" overlay with the grade value.


# Otaku frontend

React (Vite) frontend for the Otaku manga platform — browsing, personalized
zones, a chapter reader with a live "translate as you read" overlay,
library/bookmarks, and 1:1/group chat. Built to run against the
**otaku-backend** API from the previous step.

## 1. Install dependencies

```bash
npm install
```

## 2. Point it at your backend

```bash
cp .env.example .env
```

By default `VITE_API_URL=http://localhost:5000/api`, matching the backend's
default port. Change it if your API runs elsewhere.

## 3. Run both projects

In one terminal:

```bash
cd otaku-backend
npm install
npm run dev        # http://localhost:5000
```

In another:

```bash
cd otaku-frontend
npm install
npm run dev         # http://localhost:5173
```

Open http://localhost:5173. Register an account, then visit **Zones** to
pick your personalization zones, or run `npm run seed` in the backend first
to have sample manga to browse immediately.

## Pages

| Route | What it does |
|---|---|
| `/` | Browse manga, search, filter by zone |
| `/zones` | Pick personalization zones, see zone-based recommendations |
| `/manga/:id` | Title detail + chapter list, bookmark to library |
| `/read/:id` | Chapter reader — toggle translation overlay + target language |
| `/login`, `/register` | Auth (stores the JWT in `localStorage`) |
| `/library` | Bookmarked/in-progress titles (requires login) |
| `/chat` | 1:1 and group conversations (requires login) |

## Notes

- Auth token is stored in `localStorage` under `otaku_token` and attached
  automatically by `src/api/client.js`.
- The reader calls `GET /api/chapters/:id/translate?page=&lang=` per page
  and positions each translated line over its source text region using the
  coordinates the backend returns.
- The chat page's "start a chat" field takes a raw user `_id` for now —
  the backend doesn't yet expose a user-search endpoint, so wire that up
  server-side if you want a friend-picker instead.
- Design: ink-on-paper palette with a single red accent, sharp-cornered
  "panels" instead of rounded cards, and `Anton`/`Inter` for
  display/body type — meant to read like a manga page rather than a
  generic SaaS dashboard.

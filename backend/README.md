# Otaku API — MongoDB backend

Express + Mongoose backend for **Otaku**, implementing the features from the
pitch deck: real-time translation-as-you-read, personalized zones,
recommendations, and built-in 1:1/group chat.

## 1. Install dependencies

```bash
npm install
```

## 2. Connect it to MongoDB

Copy the example env file and fill in your connection string:

```bash
cp .env.example .env
```

Then set `MONGO_URI` in `.env` to one of:

- **Local MongoDB**: `mongodb://127.0.0.1:27017/otaku`
- **MongoDB Atlas** (free tier works fine): create a cluster at
  https://www.mongodb.com/cloud/atlas, add a database user, allow your IP,
  and copy the connection string it gives you, e.g.
  `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/otaku?retryWrites=true&w=majority`

Also set `JWT_SECRET` to any long random string, and — when you're ready to
wire up real translation — `TRANSLATION_API_KEY`/`TRANSLATION_API_URL` for
whichever machine-translation provider you use (Google Cloud Translation,
DeepL, Azure Translator, etc. all work with the same fetch call in
`controllers/translationController.js`).

## 3. Run it

```bash
npm run dev      # with nodemon
# or
npm start
```

You should see:

```
MongoDB connected: <host>/otaku
Otaku API running on port 5000
```

Check `GET http://localhost:5000/api/health` → `{"status":"ok"}` to confirm
the API and the database are both up.

## 4. (Optional) Seed sample data

```bash
npm run seed
```

Adds a few zones plus one sample manga + chapter so you can immediately
exercise the endpoints below.

## API overview

| Feature (from the deck)         | Endpoint(s) |
|---|---|
| Auth / user profile             | `POST /api/users/register`, `POST /api/users/login`, `GET /api/users/me` |
| Personalized zoning             | `GET/POST /api/zones`, `PUT /api/users/me/zones` |
| Manga catalog + discovery       | `GET/POST /api/manga`, `GET /api/manga/:id`, `GET /api/zones/:id/recommendations` |
| Chapters                        | `POST /api/manga/:mangaId/chapters`, `GET /api/chapters/:id` |
| Translate-as-you-read           | `GET /api/chapters/:chapterId/translate?page=1&lang=en` |
| Glossary corrections            | `PUT /api/translations/:id/correct` |
| Library / progress / likes      | `PUT /api/progress`, `GET /api/progress/library` |
| 1:1 + group chat                | `POST/GET /api/chat/conversations`, `POST/GET /api/chat/conversations/:id/messages` |

All routes except registration, login, and read-only manga/zone browsing
require `Authorization: Bearer <token>` from the login/register response.

## Data model

- **User** — auth, preferred reading language, selected zones, library, friends
- **Zone** — genre/tag-based personalization buckets ("Shonen Action", "Isekai", ...)
- **Manga** — title metadata, genres/tags, zones, original language
- **Chapter** — pages, each with detected text regions for translation overlay
- **Translation** — cached MT output per page/region/target-language, with
  optional community glossary correction
- **ReadingProgress** — per-user, per-title progress/likes/bookmarks
- **Conversation** / **Message** — 1:1 and group chat, optionally tied to a
  title or zone

## Notes

- `helmet`, `cors`, and a rate limiter are enabled by default in `server.js`.
- Passwords are hashed with bcrypt before saving (`models/User.js`).
- Swap `translateText()` in `controllers/translationController.js` for
  whichever translation provider you settle on — everything downstream just
  expects a translated string back.

# Database (MongoDB)

Otaku uses MongoDB through Mongoose. Collections/schemas live in `backend/models/`:
`users`, `mangas`, `chapters` (pages + `textRegions`), `translations` (cache), `zones`,
`readingprogresses`, `conversations`, `messages`.

```bash
docker compose up -d          # from the project root -> mongodb://127.0.0.1:27017
cd backend && npm run seed    # 3 zones, 3 manga, 1 chapter (SVG pages, works offline)
```

Prefer Atlas? Put its `mongodb+srv://…` string in `backend/.env` as `MONGO_URI`.
`npm run seed` **wipes zones, manga and chapters** first — don't run it against real data.
The anime pages need no database: they come live from Jikan through `/api/anime`.

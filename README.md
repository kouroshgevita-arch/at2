# Client Tracker

Real, multi-user version of the client tracking tool — coach dashboard, client self-login, workout assignment, session logging, and progressive-overload suggestions, backed by a real Supabase database with row-level security.

## 1. Database setup (one-time)

In your Supabase project dashboard → SQL Editor:
1. Run `schema.sql` in full (if you haven't already)
2. Then run `schema-part-2.sql` in full

## 2. Local development (optional, to test before deploying)

```
npm install
cp .env.example .env
```
Edit `.env` and fill in your real `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the publishable key from Project Settings → API).

```
npm run dev
```

## 3. Deploy to Netlify

1. Push this project to a GitHub repo (or drag-and-drop the way you did with your other tool)
2. In Netlify: **New site from Git**, pick the repo
3. Build command: `npm run build` — Publish directory: `dist` (already set in `netlify.toml`)
4. **Important:** in Netlify → Site settings → Environment variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   Without these set in Netlify (not just locally), the deployed site won't connect to your database. This is the single most common thing to forget.
5. Deploy

## 4. Using it

**As the coach:** sign up, choosing "I'm the coach." You'll land on your roster — same as the prototype, but every client you add now lives in a real database only you can access.

**Getting a client onto their own login:** open their profile — if they haven't linked yet, you'll see a "Copy invite code" button. Send that code to your client. They go to the app, sign up choosing "I'm a client," and enter that code. Their new login is now permanently tied to the profile you already built for them — their history, assigned workouts, everything.

**In-person clients:** no login needed for them at all — keep logging their sessions yourself exactly like before.

## Known limitations (next round)

- Progress photos and payment tracking aren't wired into this version yet — the database tables exist (from `schema.sql`), but the interface for them isn't built. That's the natural next step.
- Email confirmation is on by default for new Supabase projects, which means a new signup won't be able to log in until they click a confirmation email. You can turn this off in Supabase → Authentication → Providers → Email if you'd rather skip that step during testing.

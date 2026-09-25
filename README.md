# Murmur — frontend

A real Vite + React project, seeded from the Claude-artifact version of
Murmur, with **auth now wired to Supabase** (step 1 of `MIGRATION.md`
from the backend package). Posts, follows, DMs and notifications still
run on local component state for now — see "What's real vs. mock" below.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase project's URL and anon key
(Project Settings → API in the Supabase dashboard):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Then run it:

```bash
npm run dev
```

Open the printed localhost URL. You should land on the sign-up screen;
creating an account there creates a real row in `auth.users` (and,
via the `handle_new_user` trigger in `schema.sql`, a matching row in
`public.profiles`).

## What's real vs. mock right now

| Area | Status |
|---|---|
| Sign up / log in / log out | **Real** — Supabase Auth |
| Posts, likes, reposts, bookmarks, polls | Mock — in-memory seed data, resets on refresh |
| Follows / blocks / mutes / lists | Mock — same as above |
| DMs / group chats / typing indicators | Mock — same as above |
| Notifications | Mock — same as above |

The hooks for all the mock areas (`usePosts`, `useSocial`, `useMessages`,
`useNotifications`) already exist in `src/hooks/` and are fully written
against the schema — they're just not wired into `App.jsx` yet. Follow
`MIGRATION.md` (copied into this folder) section by section, in order:
posts next, then social, then messages, then notifications. Each one is
independently testable once it's in.

## Project layout

```
src/
  App.jsx              — the whole app (ported from the Claude artifact)
  main.jsx             — Vite/React entry point
  lib/
    supabaseClient.js  — Supabase client, reads VITE_SUPABASE_* env vars
    api/               — thin wrappers over supabase-js calls (one file per domain)
  hooks/
    useAuth.js         — wired in
    usePosts.js        — ready, not yet wired in
    useSocial.js       — ready, not yet wired in
    useMessages.js     — ready, not yet wired in
    useNotifications.js — ready, not yet wired in
    profileCache.js    — maps your real Supabase UUID to the literal "you"
                          slug the UI already keys off of, so none of the
                          ~20 display components need to change
```

## Deploying

Once you're happy with it locally: `npm run build` produces a static
`dist/` folder — push this repo to GitHub and connect it to Vercel or
Netlify (build command `npm run build`, output directory `dist`), and
set the two `VITE_SUPABASE_*` env vars in that platform's project
settings the same way as `.env.local`.

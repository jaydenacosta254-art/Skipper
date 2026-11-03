# Nexus — Community Hub

A customizable full-stack starter for a gaming/community website. Built with React, Vite, Express, Socket.IO, and Supabase.

## Features included

- Responsive dark UI with animated hero section and page navigation
- Sign up / sign in with Supabase Auth
- Guest mode for trying the UI without configuring Supabase
- Community chat with Socket.IO (live while connected)
- Online presence list
- Create and join lobby-code rooms
- Host-controlled lobby start event
- Starter game catalog cards
- Admin dashboard shell with live server statistics
- Supabase profile schema with Row Level Security starter policies

## Requirements

- Node.js 18 or newer
- npm
- A Supabase project (needed for persistent accounts; guest mode works without it)

## Run locally

1. Download/clone this repository.
2. In the project folder, install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`.
4. Add your Supabase project URL and anon/public key to `.env`:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   PORT=3001
   CLIENT_ORIGIN=http://localhost:5173
   ```

   If Supabase is not configured, you can still use **Continue as guest**.

5. In Supabase, open **SQL Editor**, paste and run `supabase/schema.sql`.
6. Start the app:

   ```bash
   npm run dev
   ```

7. Open http://localhost:5173

## Supabase setup

- Create a project at https://supabase.com.
- Find the Project URL and anon/public key in Project Settings → API.
- Enable Email authentication under Authentication → Providers.
- Run `supabase/schema.sql`.
- Sign up through the site. If email confirmation is enabled, confirm your email.
- To make your account an admin, run this in Supabase SQL Editor, replacing the username:

  ```sql
  update public.profiles set role = 'admin' where username = 'YOUR_USERNAME';
  ```

The app reads the profile role to show the admin page. **This starter's admin page is display-only.** Before adding moderation, user management, or other privileged actions, enforce admin authorization on the server/database for every action. Never trust a client-side role check.

## Project structure

```text
nexus-hub/
├── server/
│   └── index.js          # Express API + Socket.IO events
├── src/
│   ├── App.jsx            # Main UI, auth, chat, lobbies, pages
│   ├── main.jsx           # React entry
│   ├── styles.css         # Theme and responsive styles
│   └── supabase.js        # Supabase client
├── supabase/
│   └── schema.sql         # Profiles table + RLS policies
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

## Deploying

### Frontend + server

This project uses WebSockets, so deploy the Node server on a host that supports persistent Node processes and WebSocket connections. A static-only host cannot run `server/index.js`.

- Set `CLIENT_ORIGIN` to your deployed frontend origin.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the frontend build environment.
- Set `PORT` if your host requires it.
- If frontend and backend are on different domains, set `VITE_SERVER_URL` to the backend origin in the frontend environment and configure CORS for the exact frontend origin.

### GitHub

1. Create a new empty GitHub repository.
2. Extract this project folder.
3. Do **not** commit `.env` or any private keys.
4. Commit `.env.example`, source files, and `README.md`.
5. Push the project to GitHub.

Example:

```bash
git init
git add .
git commit -m "Initial Nexus community hub"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

## Important limitations / next steps

This is a working starter foundation, not a production Discord replacement:
- Chat and lobby state currently live in server memory. Restarting the server clears them.
- Chat history is not persisted yet.
- Lobby membership is a starter implementation; add authenticated socket identity, reconnect handling, rate limits, and server-side validation before public launch.
- The sample game catalog is UI only; implement each actual game separately.
- Add moderation/reporting, message filtering, abuse prevention, logging, backups, and deployment secrets before opening it to the public.
- Use HTTPS in production and never put a Supabase service-role key in frontend code.

## Customize it

- Change colors and layout in `src/styles.css`.
- Edit page content and navigation in `src/App.jsx`.
- Add games in the `starterGames` array in `src/App.jsx`.
- Add server events and API routes in `server/index.js`.

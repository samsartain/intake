# intake.

**set. track. achieve.** — Honest calorie and macro tracking with photo recognition, weight tracking, workout logging, and auto-calculated TDEE.

Built with Next.js 15 (App Router), Supabase (auth + Postgres), Anthropic Claude API (vision), Tailwind CSS, and TypeScript.

---

## Setup checklist

You'll need accounts on:

- **Supabase** ([supabase.com](https://supabase.com))
- **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)) — for Google OAuth
- **Anthropic** ([console.anthropic.com](https://console.anthropic.com)) — for the API key
- **Vercel** ([vercel.com](https://vercel.com)) — for deployment
- **GitHub** ([github.com](https://github.com)) — for deploying via Vercel

---

## Step 1: Supabase project

1. Create a new Supabase project. Pick a region close to you (East US Ohio for Pittsburgh).
2. Wait for provisioning (~2 min).
3. Go to **SQL Editor**, paste the contents of `supabase/schema.sql`, click Run. You should see "Success. No rows returned."
4. Go to **Project Settings → API**. Copy:
   - **Project URL** → goes in `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → goes in `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 2: Google OAuth

1. In Google Cloud Console, create a project (or reuse one) named `intake-auth`.
2. Set up **OAuth consent screen** (External, fill in app name + email).
3. Go to **Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. **Authorized redirect URIs**: add
   ```
   https://YOUR-SUPABASE-PROJECT-ID.supabase.co/auth/v1/callback
   ```
   Replace `YOUR-SUPABASE-PROJECT-ID` with your project's subdomain.
6. Save the **Client ID** and **Client Secret**.
7. In Supabase dashboard → **Authentication → Providers → Google**, paste the Client ID and Client Secret, toggle on, save.

---

## Step 3: Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com).
2. Create an API key.
3. Add credits to your account (a few dollars covers extensive testing — each image analysis costs ~$0.003).
4. Copy the key.

---

## Step 4: Local development

```bash
# Install dependencies
npm install

# Copy env template
cp .env.example .env.local

# Edit .env.local — fill in:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# ANTHROPIC_API_KEY=...
# NEXT_PUBLIC_APP_URL=http://localhost:3000

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should be redirected to `/login`, sign in with Google, complete onboarding, and land on the dashboard.

---

## Step 5: Deploy to Vercel

1. Push this project to a new GitHub repo (private is fine).
2. In Vercel: **New Project → Import** your repo.
3. Vercel auto-detects Next.js. Before deploying, add environment variables (same ones as `.env.local`, but set `NEXT_PUBLIC_APP_URL` to your eventual Vercel URL, like `https://intake.vercel.app`).
4. Deploy.
5. **Important post-deploy step:** go back to Google Cloud Console → your OAuth client → add your Vercel URL to **Authorized JavaScript origins** (e.g. `https://intake.vercel.app`). Without this, sign-in will fail in production.
6. Also update Supabase **Authentication → URL Configuration → Site URL** and add the Vercel URL to **Redirect URLs**.

---

## Architecture

```
src/
├── app/
│   ├── api/analyze/route.ts      # Claude vision API (server-side, key never exposed)
│   ├── auth/callback/route.ts    # OAuth callback handler
│   ├── login/page.tsx            # Google sign-in page
│   ├── layout.tsx                # Root layout with fonts
│   ├── page.tsx                  # Main app (auth-gated)
│   └── globals.css               # Tailwind + animations
├── components/
│   └── IntakeApp.tsx             # Main app — all views in one client component
├── lib/
│   ├── storage.ts                # Supabase data layer (CRUD for food/weight/workouts/settings)
│   ├── supabase-browser.ts       # Client-side Supabase client
│   ├── supabase-server.ts        # Server-side Supabase client
│   └── utils.ts                  # BMR, TDEE, date helpers, constants
├── middleware.ts                 # Auth gate — redirects unauthenticated users to /login
supabase/
└── schema.sql                    # Database schema (run once in Supabase SQL editor)
```

### Auth flow

1. User hits any route → `middleware.ts` checks for session
2. No session → redirected to `/login`
3. User clicks "Continue with Google" → Supabase → Google OAuth → `/auth/callback`
4. Callback exchanges code for session, sets cookies, redirects to `/`
5. `/` server component fetches user, renders `<IntakeApp />` or redirects back to login

### Data flow

- All reads/writes go through `src/lib/storage.ts`
- Each function calls Supabase with the authenticated user
- Row Level Security in Postgres enforces: user can only see/edit their own data — even if a frontend bug tried to query someone else's, the database would refuse

### Vision API

- Photo selected → base64 → POSTed to `/api/analyze` with `type: 'food'` or `'workout'`
- API route validates auth, calls Anthropic with Claude Sonnet 4
- Anthropic API key lives only on the server (env var), never exposed to the browser

---

## What's working out of the box

- Google sign-in
- Multi-step animated onboarding (BMR, TDEE, calorie target, protein target auto-calculated)
- Daily food logging with photo recognition + manual entry
- Meal categories (breakfast, lunch, dinner, snack, pre-workout, post-workout)
- Daily weight logging
- Workout logging via Apple Watch / Health screenshot recognition
- 7-day and 30-day history views
- Auto-TDEE calculation after 14+ days of weight + intake data (MacroFactor-style)
- Adjustable goal modes (cut, recomp, lean bulk, bulk, maintain)
- Settings adjustments with live target recalculation
- Cross-device sync (same Google login = same data anywhere)
- Sign out

---

## Things to know / future work

**Workout calorie accuracy:** Apple Watch overestimates by 15-40% — the app flags this clearly in the UI. Workout calories are logged for compliance tracking, not as numbers to subtract from intake.

**Costs at scale:**
- Supabase free tier: ~50k MAU, 500MB DB. Plenty for personal/small-group use.
- Anthropic API: ~$0.003 per image. 10 meals/day for 30 days = ~$0.90/month.
- Vercel free tier: 100GB bandwidth, plenty for solo use.

**No password recovery flow yet** — Google sign-in only. If you want email/password later, Supabase supports it natively; just toggle on in Auth Providers.

**No data export** — would be a nice add. Easy to write: query all 4 tables, dump to CSV.

**Real-time sync** — Supabase supports it, not wired up. Currently each device polls fresh data on view change. Fine for one user, not ideal for shared accounts.

---

## Local commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Run production build locally
npm run lint     # ESLint
```

---

## License

Personal use. Do whatever you want with it.
# intake

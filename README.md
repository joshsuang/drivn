# Drivn — My Car Dashboard

A personal car management dashboard built with React, Vite, TypeScript, Tailwind CSS and Recharts. Data lives in Supabase (Postgres + Auth + Storage), with email/password login and cross-device sync over Supabase Realtime.

## Run it locally

```bash
npm install
cp .env.example .env   # then fill in your Supabase project values
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

### Environment

`.env` needs two values, both from **Supabase → Project Settings → API**:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

`.env*` files are gitignored — set these as host environment variables when you deploy. The anon key is public by design, but that only holds because every table enforces row level security; see below.

### Database

The schema lives in `supabase/migrations/`, not in the dashboard. Apply it with:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Or paste `supabase/migrations/0001_init.sql` into the Supabase SQL editor — it's idempotent and safe to re-run. It creates every table, its indexes, the row level security policies, and the private `media` storage bucket.

**RLS is load-bearing.** The anon key ships in the client bundle, so the `auth.uid() = user_id` policies are the only thing separating accounts. If you add a table, add its policies in the same migration, and verify isolation by signing in as a second account before trusting a change.

### Media

Photos, documents, the profile avatar and the vehicle photo live in the private `media` bucket, and the convention is strict: **the database stores paths, app state holds display-ready URLs.** `fetchCollections` signs every path it reads (in one batched request per table), so components only ever render a string. Any new upload should follow that pattern — see `src/lib/media.ts`.

Accounts that predate storage still hold base64 payloads in `file_data`, `url`, `image_url` or `avatar_url`. **Settings → Migrate media to storage** moves them across and clears the old columns. It's idempotent, so running it twice is harmless.

App icons are generated, not committed as opaque binaries:

```bash
npm run icons   # rewrites public/icon-*.png from scripts/generate-icons.mjs
```

### Offline

Writes go through one chokepoint (`mutate` in `src/context/DataContext.tsx`), which applies the change locally first, then either writes to Supabase or — if the connection is down, or the request never reaches the server — persists the batch to IndexedDB and replays it in order once the connection returns. Failures that the server actually rejected are surfaced as errors instead of being retried forever.

## What's in here

- **Overview** — vehicle card, quick stats, upcoming maintenance/insurance/tax, mileage and fuel efficiency charts, latest trip, recent timeline, recent mods.
- **Timeline** — full chronological history with type filters.
- **Maintenance** — upcoming service reminders, full history table, add/edit/delete.
- **Fuel & Costs** — fill-up history with auto-calculated totals and consumption, plus edit/delete. Editing a fill-up re-derives the consumption figure for the *next* entry too, since it's calculated from the mileage gap between them.
- **Statistics** — mileage, consumption, cost, and driving analytics with charts.
- **Modifications** — a visual mod collection with category filters, add/edit/delete.
- **Trips** — road trip cards with a stylized route map, add/edit/delete, detail view.
- **Documents** — insurance, registration, invoices, manuals with status badges, add/edit/delete and file upload.
- **Gallery** — photo grid with lightbox, uploads straight to storage.
- **Settings** — vehicle info, appearance, notification toggles, media migration, export/reset data.

On mobile, the sidebar becomes a bottom tab bar with a center "+" button that opens a quick-add sheet (Fuel, Maintenance, Trip, Modification, Expense, Photo), each deep-linking into the right page's add form.

## Notes

- Demo data (Ford Puma, Nand, Herentals/Antwerp/Durbuy locations) seeds into your account on first load. Edit `src/data/demoData.ts` to change it, or use **Settings → Reset data** to restore it after you've made changes.
- The vehicle photo and modification/photo images are placeholder stock photos from Unsplash — swap the URLs in `src/data/demoData.ts` for real photos whenever you like.
- Trip route maps are stylized SVG paths, not a real map — this was called out as an acceptable simplification in the brief.
- Routing uses `HashRouter` so the app works correctly once deployed as a static site (Vercel, GitHub Pages, etc.) without extra rewrite config.
- It installs as a PWA (`src/sw.ts` is a hand-written service worker so cached media keys on the object path rather than the rotating signed-URL token).
- Timeline entries carry `source_table`/`source_id`, so editing or deleting a fill-up, service, trip, mod, document or expense updates or removes its timeline entry rather than stranding it. Seeded demo entries are linked at seed time.
- Chart series are derived from local state (`src/lib/analytics.ts`), so an edit updates the charts immediately without refetching.
- The edit/delete actions and the offline queue share one code path: a change applied while offline is queued with an optimistic description, and that description is replayed over fetched state so unsynced work stays visible after a reload.

## Next step: deploying

Not deployed yet — say the word when you're ready and I'll set it up on Vercel (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables).

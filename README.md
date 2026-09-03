# Drivn — My Car Dashboard

A personal car management dashboard built with React, Vite, TypeScript, Tailwind CSS and Recharts. All data lives in `localStorage` — no backend required.

## Run it locally

```bash
cd Drivn
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## What's in here

- **Overview** — vehicle card, quick stats, upcoming maintenance/insurance/tax, mileage and fuel efficiency charts, latest trip, recent timeline, recent mods.
- **Timeline** — full chronological history with type filters.
- **Maintenance** — upcoming service reminders, full history table, add-service modal.
- **Fuel & Costs** — fill-up history with auto-calculated totals and consumption.
- **Statistics** — mileage, consumption, cost, and driving analytics with charts.
- **Modifications** — a visual mod collection with category filters and delete support.
- **Trips** — road trip cards with a stylized route map, add-trip modal, detail view.
- **Documents** — insurance, registration, invoices, manuals with status badges.
- **Gallery** — photo grid with lightbox.
- **Settings** — vehicle info, appearance, notification toggles, export/import/reset data.

On mobile, the sidebar becomes a bottom tab bar with a center "+" button that opens a quick-add sheet (Fuel, Maintenance, Trip, Modification, Expense, Photo), each deep-linking into the right page's add form.

## Notes

- Demo data (Ford Puma, Nand, Herentals/Antwerp/Durbuy locations) seeds on first load. Edit `src/data/demoData.ts` to change it, or use **Settings → Reset data** to restore it after you've made changes.
- The vehicle photo and modification/photo images are placeholder stock photos from Unsplash — swap the URLs in `src/data/demoData.ts` for real photos whenever you like.
- Trip route maps are stylized SVG paths, not a real map — this was called out as an acceptable simplification in the brief.
- Routing uses `HashRouter` so the app works correctly once deployed as a static site (Vercel, GitHub Pages, etc.) without extra rewrite config.

## Next step: deploying

Not deployed yet — say the word when you're ready and I'll set it up on Vercel (with Supabase if you want the data to move off localStorage into a real backend).

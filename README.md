# 7isab (حساب)

A personal monthly budget app for iPhone. Give every pound of your income a job (Rent, Bills, Food, Transport, Fun) and the app tells you how much is **safe to spend today**.

It's a Progressive Web App (PWA): it installs from Safari, works fully offline, and keeps all data on your phone. There are no accounts and no server.

---

## 1. Run it on your computer

You need **Node.js 20 or newer** (https://nodejs.org → "LTS" installer).

```bash
cd 7isab
npm install        # first time only
npm run dev        # open the URL it prints, e.g. http://localhost:5173
```

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the unit tests for the budget math (`src/lib`) |
| `npm run build` | Makes the production version in `dist/` |
| `npm run preview` | Serves `dist/` locally so you can test the offline/installable version |

> Tip: to try it on your phone while developing, run `npm run dev -- --host` and open the "Network" URL on your iPhone (same Wi‑Fi). Installing to the home screen needs HTTPS, so use a deploy (below) for that.

---

## 2. Put it online for free

Pick **one**.

### Option A: Netlify drag-and-drop (easiest, no Git needed)

1. Run `npm run build`. This creates a `dist` folder.
2. Go to https://app.netlify.com and sign up (free).
3. Open **Sites**, then find the box that says **"Drag and drop your site output folder here"**.
4. Drag the **`dist`** folder (not the whole project) into it.
5. After a few seconds you get a link like `https://random-name.netlify.app`. That's your app.
6. Optional: **Site configuration → Change site name** to get something like `https://my-7isab.netlify.app`.

To update later, run `npm run build` again and drag the new `dist` folder onto **Deploys** for your site.

### Option B: Vercel (auto-deploys from GitHub)

1. Create a free GitHub account and a new **private** repository. Upload this project to it with GitHub Desktop or `git push`. Don't upload `node_modules` or `dist`; `.gitignore` already excludes them.
2. Go to https://vercel.com, sign in **with GitHub**, then click **Add New… → Project**.
3. Pick your repository. Vercel detects **Vite** on its own (build command `npm run build`, output `dist`).
4. Click **Deploy**. You'll get a link like `https://7isab.vercel.app`.

Every later push to GitHub redeploys the app automatically.

> The app uses `#/` style URLs, so neither host needs any redirect configuration.

---

## 3. Install it on your iPhone

1. Open your app link in **Safari**. It must be Safari, not Chrome.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Open **7isab** from the home screen. It runs full-screen and works offline from then on.

Updates: when you deploy a new version, the app picks it up the next time you open it while online.

---

## 4. Back up and restore your data

Your data lives **only on your phone**, inside the app. iOS may delete a web app's data if you don't open it for several weeks, so **back up once a month**. The home screen reminds you when a backup is due.

**Back up:** ☰ (top-left) → **Settings** → **Export backup**. On iPhone the share sheet opens, so choose **Save to Files** and put it in iCloud Drive. On a computer the file downloads as `7isab-backup-YYYY-MM-DD.json`.

**Restore:** ☰ → **Settings** → **Import backup** → pick the `.json` file → confirm. This **replaces** everything currently in the app.

**Start over:** ☰ → **Settings** → **Reset all data**.

**Demo data:** in Settings, tap the small **"7isab v1.0"** label 5 times and a **Load demo data** button appears. It replaces your data with sample months so you can preview the design.

---

## How the money works

- **Budget period:** runs from your income day to the day before the next income day. If your income day is the 31st, short months use their last day.
- **Safe to spend today** = money left in *flexible* envelopes ÷ days left (today included), rounded down.
- **Fixed** envelopes (Rent, Bills) are paid once. Tap the envelope, then **Mark paid**.
- **Warnings** turn an envelope red when it is ≥ 90% used, over budget, or when spending is 15+ points ahead of the calendar (for example 70% spent when only 40% of the month has passed).
- If an expense would overdraw an envelope, the app offers to **move money** from another envelope first.
- **New month:** when a period ends, the app asks you to confirm your income and whether leftovers go to **Savings** or roll into next month's envelopes.
- Amounts are stored as whole piastres (integers), so there are no rounding errors.

## Project layout

```
src/
  lib/          pure budget logic + tests (money, periods, alerts, rollover, insights)
  db/           Dexie (IndexedDB) schema, live hooks, write actions, backup, demo data
  components/   NeuCard/NeuButton/ProgressBar/AlertBanner/Chip (ui.tsx), BottomSheet, Keypad, BottomNav, icons
  screens/      Onboarding, Home, AddExpense, EnvelopeDetail, History, Debts, Insights, Settings, EditPlan, NewPeriod
  styles/       tokens.css (design tokens), global.css, components.css
public/icons/   app icons (from 7isab-icons/)
```

Later (v2): push notifications, recurring expenses and a Capacitor wrapper for the App Store. All storage goes through `src/db`, so a Capacitor build can reuse the app as-is.

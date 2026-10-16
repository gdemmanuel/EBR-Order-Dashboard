# Empanadas by Rose – Order Dashboard

Order management for Empanadas by Rose. Live at **https://orders.empanadasbyrose.com**.

It has two parts:

- **Customer order page** (`/order`) – customers build an order (flavors, packages, party platters, salsas) and pick a pickup or delivery time. It can be embedded in the business website.
- **Admin dashboard** (`/`, login required) – orders and approvals, calendar, prep and inventory list, expenses, staff shifts, reports and AI insights, and store settings.

Built with React 18, TypeScript and Vite, using Firebase (Firestore and email/password auth). It's hosted on Vercel, which also runs the serverless functions in `api/`.

## Run it locally

You need Node.js (v20 or newer) and access to the Vercel project.

```bash
npm install
npm i -g vercel
vercel login
vercel link                 # pick the existing ebr-order-dashboard project
vercel env pull .env.local  # copies the project's environment variables
npm run dev                 # http://localhost:5173
```

> **Local dev uses the live database.** There's one Firebase project, so orders, settings and deletions you make on localhost change real data. Use clearly fake test orders and delete them afterwards.

`npm run dev` serves only the front end. AI insights and new-order emails come from the functions in `api/`, so use `vercel dev` instead if you need those locally.

If logging in fails locally with "requests from referer … are blocked", the Firebase API key's website restrictions are missing `http://localhost:5173/*`. Add it in Google Cloud console → APIs & Services → Credentials → Browser key. `https://ebr-order-app.firebaseapp.com/*` must also be listed, or password-reset links fail.

## Deploying

Vercel deploys `main` to production automatically. **Anything merged into `main` goes live.**

1. Work on a branch, e.g. `git switch -c fix/something`.
2. Push it and open a pull request into `main`.
3. Vercel comments on the pull request with a preview link. Test there; the preview also uses the live database.
4. Merge the pull request to deploy.
5. To roll back: Vercel → Deployments → pick the last good deployment → **Promote to Production**.

## Environment variables

These are kept in Vercel (Settings → Environment Variables). `vercel env pull` copies them locally. See [.env.example](.env.example) for the full list.

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_FIREBASE_*` (7) | Browser | Firebase project config. Not secret; access is enforced by Firestore rules. |
| `VITE_EMBED_ORIGIN` | Browser | The website allowed to embed `/order`. Falls back to `*` if unset. |
| `VITE_INTERNAL_API_SECRET` / `INTERNAL_API_SECRET` | Browser / `api/` | Shared secret on calls to `api/`; the two must match. |
| `ALLOWED_ORIGIN` | `api/` | Origin allowed to call the functions (defaults to `https://ebr-order-app.vercel.app`). |
| `GEMINI_API_KEY` | `api/gemini-proxy.js` | Google Gemini key for AI insights. |
| `RESEND_API_KEY`, `RESEND_FROM`, `OWNER_EMAIL` | `api/order-alert.js` | New-order email alerts. |

## Data and security

Firestore collections:

| Path | Contents | Who can read |
|---|---|---|
| `app_settings/general` | Only what `/order` needs: message of the day, flavors, pricing, scheduling | Anyone (public) |
| `app_settings/private` | Everything else: ingredients and price history, recipes, prep settings, inventory, employees, wages, expense categories, templates | Admins |
| `orders/{id}` | Orders. Customers can create a pending order; nothing else. | Admins |
| `expenses/{id}` | Expenses and labor shifts | Admins |

`services/dbService.ts` splits settings between the two docs on save. `PUBLIC_SETTINGS_KEYS` is the allowlist, so new settings are private by default.

The security rules are published by hand in the Firebase console (Firestore Database → Rules). [firestore.rules](firestore.rules) is the reference copy: fill in the admin user IDs from Authentication → Users, then publish. Update it whenever an admin login is added or removed.

## How costs are calculated

- **Ingredient prices** are kept with a dated price history. Logging an expense linked to an ingredient adds an entry. So does changing a price in Settings, dated the day you save.
- **Recipes** list ingredient amounts per 20 minis, or per container for salsas. A full size uses the full size filling multiplier (default 2×).
- **Discos** are counted once, from Prep settings: discos per mini (0.5 means one disco makes two minis) and per full size. They're priced at the latest price of the **Discos** ingredient, and salsas use none.
- **Order supply cost** uses the prices in effect on the order date. It's saved on the order when an admin saves, approves or completes it, and frozen once the order is completed, so later price or recipe changes don't rewrite past orders. Reports use the saved cost when it's there.
- **Prep list** uses the latest prices, for planning the next batch. Its cost box is off by default and never prints.
- **Party platters** are sized by the minis in the platter: 50 = 18", 25 = 12".

## Settings map

| Section | What's there |
|---|---|
| Store | Message of the day, hours, closed days, date overrides, status messages |
| Menu and pricing | Flavors (on menu, surcharges, minimums), packages and platters, salsas and extras |
| Kitchen and costs | Ingredients and price history, recipes with cost per mini, prep settings (discos, pack sizes, multiplier, production rates, wage), expense categories |
| Team | Staff, wages, production rates, active or inactive |
| Messages | Customer message templates, order status colors |

## Project layout

```
App.tsx                 Routing, auth, shared state and Firestore subscriptions
components/             Screens and modals (AdminDashboard, CustomerOrderPage, PrepListModal, SettingsModal, ...)
services/dbService.ts   Firestore reads and writes, including the public/private settings split
services/authService.ts Firebase auth
services/geminiService.ts AI insights (calls api/gemini-proxy)
utils/pricingUtils.ts   Order totals and dated supply cost
utils/orderUtils.ts     Package grouping, platter detection and sizes, CSV export
api/                    Vercel functions: Gemini proxy, order email alert
firestore.rules         Reference copy of the Firestore security rules
vercel.json             Rewrites and security headers (CSP, framing for /order)
```

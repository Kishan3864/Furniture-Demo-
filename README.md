# WoodBook — Furniture Workshop Management

*by Brighton Solution*

WoodBook manages a furniture workshop: orders with naap (measurements), karigars, stages, delivery, payments, stock, expenses and reports. It is an installable PWA, mobile-first, and also works on desktop.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Firebase Auth, Firestore and Storage · zod · sonner

---

## 1. Firebase setup (project `furniture-webs`)

1. **Authentication** → Sign-in method → enable **Email/Password**.
2. **Firestore Database** → Create database (production mode, region `asia-south1` recommended).
3. **Storage** → Get started.
4. **Project settings → General → Your apps → Add web app**, then copy the config values into `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=furniture-webs.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=furniture-webs
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=furniture-webs.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_APP_URL=https://your-domain.com   # used in WhatsApp status links
```

5. Deploy the security rules and indexes:

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes,storage
```

`storage.rules` looks up the user's role in Firestore (cross-service rules). The first time you deploy, the CLI asks you to grant Storage access to Firestore. Answer **Yes**.

## 2. Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start
```

## 3. First login and roles

- **The first account created** on the login page ("Owner account banayein") becomes the **Owner**. Create it right after you deploy.
- **Karigar login:** Owner → Karigar → open a karigar → *Login banayein* (email and password). Give those details to the karigar.
  - A karigar sees only the jobs assigned to them, can change the stage and upload progress photos.
  - A karigar never sees prices or payments. Firestore rules enforce this, because money data lives in the separate owner-only `finance` and `payments` collections.
- An account that signs up later without an invite sees "Account active nahi hai".

## 4. Demo data

- **From the app:** Settings → *Demo data daalein*.
- **From the CLI:** put `SEED_EMAIL` and `SEED_PASSWORD` (the owner login) in `.env.local`, then run:

```bash
npm run seed
```

## 5. Deploy (Firebase Hosting)

**Live:** https://furniture-webs.web.app

The app is a static export (`output: 'export'`) served by Firebase Hosting, so it runs on the free Spark plan.

```bash
npm run deploy        # build + deploy hosting
npm run deploy:all    # build + deploy auth providers, Firestore rules/indexes, hosting
```

**Dynamic routes:** each dynamic route (`/orders/[id]`, `/status/[token]` and the others) is exported once as a placeholder page `_`. The `rewrites` in `firebase.json` send every real id to that placeholder, and the page reads the id from the URL through `useRouteParam()`.

### Photos

- **Default (free plan):** photos are compressed in the browser and stored in the Firestore `images` collection.
- **Switching to Cloud Storage:** Storage on new projects needs the Blaze plan. Once Storage is enabled (Console → Storage → Get started), set `NEXT_PUBLIC_PHOTO_STORE=storage`, run `firebase deploy --only storage`, then `npm run deploy`. Photos already uploaded keep working.

## Modules

| Module | Route |
|---|---|
| Dashboard (today/week deliveries, overdue, in progress, ready, pending payments) | `/` |
| Orders (naap ft/inch, design photos, lakdi, price/advance/balance, stages, karigar) | `/orders` |
| Kaam kahan tak (board by stage / karigar) | `/board` |
| Delivery (countdown list + calendar) | `/delivery` |
| Grahak (customers, history, paid/due) | `/customers` |
| Payments (advance + instalments, dues, receipts) | `/payments` |
| Karigar (skills, active jobs, labour paid/due, login) | `/karigar` |
| Stock (in/out, material per order, low-stock) | `/stock` |
| Kharcha (expenses) | `/expenses` |
| Reports (monthly, CSV export) | `/reports` |
| Settings (profile, logo, GST, item/wood types, stages, trash, demo data) | `/settings` |
| Karigar app | `/jobs` |
| Public status page (WhatsApp share) | `/status/[token]` |
| Print bill / estimate / receipt (Print → Save as PDF) | `/print/bill/[id]`, `/print/receipt/[id]` |

## Data model (Firestore)

| Collection | Holds |
|---|---|
| `users/{uid}` | role (`owner` / `karigar`), karigarId, active |
| `meta/owner` | one-time owner bootstrap |
| `settings/workshop` | profile, item types, wood types, stages, categories |
| `counters/orders`, `counters/receipts` | auto numbers WB-0001 / RC-0001 |
| `customers` | customer records |
| `orders` | job data, no money (readable by assigned karigars) |
| `finance/{orderId}` | price, discount, paid, balance (owner only) |
| `payments`, `labour`, `stock`, `stockMoves`, `expenses` | owner only |
| `status/{token}` | public read-only mirror for the status page (prices only if enabled per order) |
| `images/{id}` | compressed photos when Firestore photo storage is used |

Records are soft deleted (`deleted: true`) and can be restored from Settings → Trash. Reads still work offline through Firestore's IndexedDB cache, and the service worker caches the app shell and photos.

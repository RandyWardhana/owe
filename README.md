<div align="center">

# owe

### settle up, skip the drama

**Scan a receipt, split it fairly, and settle up — right from your phone.**
`scan · split · settle`

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-087EA4?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-offline--first-5A0FC8?logo=pwa&logoColor=white)](#-offline-first--private)
[![License](https://img.shields.io/badge/License-MIT-9be52e)](./LICENSE)

</div>

---

**owe** is an offline-first PWA that takes the awkwardness out of splitting a bill. Snap a receipt and a cloud OCR reads the items, you tap who had what, and owe works out exactly who owes whom — then hands everyone a payment number to settle up. No account, no sign-up: the split-and-settle flow runs locally, and the only things that touch the network are reading a receipt, an optional encrypted backup of your own bills, and a link you choose to share.

## ✨ Highlights

- 📷 **Scan a receipt** — cloud OCR ([OCR.space](https://ocr.space/)) pulls out items, prices, tax and service when you're online; offline, the scan buttons let you know to reconnect or enter items by hand.
- ✋ **Assign by tapping** — mark who had each item, or split a shared dish evenly between a few people.
- 🧮 **Fair, itemised splits** — per-person totals with tax, service and discounts apportioned proportionally; expand any person to see exactly which items are theirs.
- 💸 **Settle up** — see who pays whom, with each person's bank / e-wallet number one tap to copy.
- ☁️ **Your bills, backed up** — saved splits sync to an anonymous, encrypted cloud row keyed to your device, so they survive a cleared cache — still no account.
- 🧾 **Proof of payment** — whoever owes can attach the transfer receipt; only the person who made the bill can mark the line settled.
- ✍️ **Claim your own plate** — items the maker could not attribute travel with the link, so whoever ordered one puts their own name on it.
- 🔗 **Share without an app** — lock a split in, then share a link; whoever opens it sees the totals, each person's items, and payment numbers right in their browser.
- 🌍 **Bilingual** — English and Indonesia.
- 🎨 **Make it yours** — light / dark theme, six accent colors, currency, rounding, and a motion toggle.
- 📲 **Installable** — add to your home screen and run it standalone; the split-and-settle flow works with no connection.

## 🧭 How it works

```text
Home ──▶ Scan ──▶ Review ──▶ People ──▶ Assign ──▶ Breakdown ──▶ Share
        (OCR)    (fix items)  (add)    (who had    (the split &
                                        what)        settle up)
```

1. **Scan** a receipt (needs a connection — OCR.space extracts items, quantities, prices, tax and service charges) or enter items by hand.
2. **Review** the parsed items and tweak anything the camera fumbled.
3. **People** — add everyone at the table, optionally with a bank account or e-wallet so they can be paid back.
4. **Assign** each item to the person (or people) who had it.
5. **Breakdown** shows each person's share — items plus their proportional cut of tax, service and discounts — and who needs to pay whom.
6. **Lock it in**, then **share** a link or copy a text summary so everyone can settle up. (Sharing is only available once a split is locked in, so anything you share is saved to your list.)

## 🔒 Offline-first & private

owe keeps as much as possible on your device, and what does leave is minimal or encrypted:

- The **split → assign → settle flow runs entirely offline.** Your splits, history and preferences live in `localStorage` — no account, no login.
- **Usage analytics, tied to your device.** Firebase Analytics (`lib/analytics.ts`) records which screens are opened, which buttons are tapped, and uncaught errors (as `exception` events — Crashlytics has no web SDK). Never bill contents: no items, amounts, payment details or links. Every event does carry a `device` label: the name you set under Settings → Sync (or "no name") and your **sync code**, so a report can be traced to a phone. Your sync code is the key to your backup, so whoever can see the analytics can open it. Google signals and ad personalisation are off, and development builds send nothing (`NEXT_PUBLIC_ANALYTICS_DEBUG=1` to test).
- **Reading a receipt** is the one step that needs a connection: the photo is sent to [OCR.space](https://ocr.space/) only to extract text. Offline, the scan buttons prompt you to reconnect or enter items by hand.
- **Backup is anonymous and end-to-end encrypted.** Your bill list is mirrored to Cloudflare D1 keyed by `sha256(deviceId)`, with the payload **AES-GCM encrypted** under a key derived from your device id (your sync code). The database stores only its hash, so it cannot read your history on its own; the code itself is sent with analytics events (see above). Next to it, the server keeps the list of *shared* bill ids that device holds, and each bill you shared records the same `sha256(deviceId)`, so a lost phone's shared bills can be found and handed back. If you type a name under Settings → Sync, that name is stored in the clear next to the backup so support can tell whose it is; it is optional and empty by default. Unshared bills, contacts and the rest stay unreadable.
- **Shared bills are encrypted in transit and at rest**, but not from us: the key is a constant this app ships, so that any link opens without a password. A short link stores the encrypted bill and hands out a random, unguessable id; a long link packs the bill into the URL itself. Treat a share link as the secret — anyone holding one can read the split.
- **Payment receipts** are readable by anyone holding that link, on purpose: settling up is a group conversation. Only the device that created the bill can confirm a payment or delete the bill.
- A service worker (Serwist) precaches the app so it loads instantly and the core flow works with no connection.

> The cloud is **optional** — without it, owe runs fully local (no backup, no receipts, and shares fall back to self-contained long links).

## 🛠️ Tech stack

| Area | Choice |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| State | [Zustand](https://github.com/pmndrs/zustand) (persisted to `localStorage`) |
| Receipt OCR | [OCR.space](https://ocr.space/) via a server route |
| Cloud (optional) | [Cloudflare D1 + R2](https://developers.cloudflare.com/d1/) behind the `owe-db` Worker in [`worker/`](./worker) — shared bills, encrypted backups, payment receipts |
| Crypto | Web Crypto `AES-GCM` (shared bills + per-device backup) |
| PWA / offline | [Serwist](https://serwist.pages.dev/) service worker |
| Styling | Hand-written CSS with design tokens + light/dark theming |
| Package manager | [pnpm](https://pnpm.io/) |

## 🚀 Getting started

**Prerequisites:** Node.js 18.18+ and [pnpm](https://pnpm.io/installation).

```bash
# install dependencies
pnpm install

# start the dev server
pnpm dev
```

Open [http://localhost:6769](http://localhost:6769).

### Environment

Everything works out of the box with sensible defaults — both of these are optional. Copy `.env.local.example` to `.env.local` to override:

- **`NEXT_PUBLIC_FIREBASE_*`** — Firebase web config for anonymous usage analytics (see `lib/analytics.ts`). Leave empty and analytics stays off.
- **`OCRSPACE_API_KEY`** — receipt scanning calls [OCR.space](https://ocr.space/ocrapi). The built-in `helloworld` demo key works but is rate-limited; set your own free key (25k/month) for reliability.
- **`NEXT_PUBLIC_OWE_CLOUD=1`** plus **`OWE_DB_URL` / `OWE_DB_SECRET`** — enable cloud backup, payment receipts and short share links. Without them, owe stays fully local. See [`worker/README.md`](./worker/README.md) for the one-time Cloudflare setup.
- **`ADMIN_PASSWORD`** (8+ characters) — enables `/admin`, a console for recovering a bill someone has lost. Off unless set.

> [!NOTE]
> The PWA service worker is **disabled in development** and only generated for production builds. If you ever run a production build locally and later see stale assets in dev, unregister the service worker (DevTools → Application → Storage → *Clear site data*) once.

### Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build (generates the service worker) |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Unit tests (compiles the pure `lib/` modules first) |

## 📁 Project structure

```text
app/
  layout.tsx        # root layout + PWA metadata
  page.tsx          # screen router (home → scan → … → breakdown)
  sw.ts             # Serwist service worker
  not-found.tsx     # 404 · error.tsx · global-error.tsx
  api/              # scan (OCR.space), bill, claim, proof, sync, admin
  s/                # shared-bill pages (+ link metadata)
  admin/            # bill-recovery console
  landing/          # marketing page
  styles/           # design tokens + per-screen CSS
components/
  Sheet.tsx         # draggable bottom-sheet primitive
  Settings.tsx      # theme / language / money settings
  scan · review · people · assign · breakdown · shared   # the flow
  ui/               # ClickSpark, AnimatedMoney, CopyButton, …
lib/
  store.ts          # Zustand store (persisted)
  historyMerge.ts   # folding two devices' bill lists together
  ocr.ts            # receipt parsing
  calc.ts           # split math
  breakdown.ts      # per-person settlement
  currency.ts       # currencies + formatting
  payments.ts       # payment-method catalogue
  share.ts          # encode/decode/encrypt shared splits
  shareId.ts        # the random id a share link points at
  shareMeta.ts      # share-link Open Graph metadata
  oweDb.ts          # server-side client for the owe-db Worker
  bills.ts          # shared-bill storage + paid sync
  proofs.ts         # payment receipts
  billOwner.ts      # per-bill owner tokens
  device.ts         # anonymous per-device id
  userBills.ts      # encrypted history backup
  adminAuth.ts      # password gate for /admin
  i18n/             # en + id dictionaries
  hooks/            # composable hooks
worker/             # owe-db — Cloudflare Worker over D1 + R2
```

## ⚙️ Settings

Everything is tweakable from the in-app settings sheet:

- **Theme** — light or dark (native form controls follow the theme via `color-scheme`).
- **Accent** — six accent colors that recolor the whole UI.
- **Animations** — a single toggle that respects `prefers-reduced-motion`.
- **Language** — English or Indonesia.
- **Currency** — IDR (default), every other ASEAN currency (MYR, SGD, THB, PHP, VND, BND, KHR, LAK, MMK), plus USD, JPY and TWD.
- **Rounding** — exact, whole, or round up to the nearest 5.

## 💳 Currencies & payment methods

**Currencies:** IDR · MYR · SGD · THB · PHP · VND · BND · KHR · LAK · MMK · USD · JPY · TWD

**Payment methods:** Bank transfer · GoPay · OVO · DANA · ShopeePay · LinkAja · PayPal · Other

## 📲 Install as an app

owe is a full PWA. In a supporting browser, use **Add to Home Screen** (mobile) or the install icon in the address bar (desktop) to run it standalone and offline.

## 📄 License

[MIT](./LICENSE) © 2026 Randy Wardhana

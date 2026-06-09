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
- ☁️ **Your bills, backed up** — saved splits sync to an anonymous, end-to-end-encrypted cloud row keyed to your device, so they survive a cleared cache — still no account.
- 🔗 **Share without an app** — lock a split in, then share a link; whoever opens it sees the totals, each person's items, and payment numbers right in their browser.
- 🌍 **Bilingual** — English and Bahasa Indonesia.
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
- **Reading a receipt** is the one step that needs a connection: the photo is sent to [OCR.space](https://ocr.space/) only to extract text. Offline, the scan buttons prompt you to reconnect or enter items by hand.
- **Backup is anonymous and encrypted.** Your bill list is mirrored to Supabase keyed by `sha256(deviceId)`, with the payload **AES-GCM encrypted** using a key derived from a device id that never leaves the browser — so rows are opaque and only your device can read them.
- **Shared bills are encrypted too.** A short link stores the encrypted bill in Supabase; a long link packs it into the URL itself. Either way the recipient only sees the bill in the link they were given.
- A service worker (Serwist) precaches the app so it loads instantly and the core flow works with no connection.

> Supabase is **optional** — without it, owe runs fully local (no cloud backup, and shares fall back to self-contained long links).

## 🛠️ Tech stack

| Area | Choice |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| State | [Zustand](https://github.com/pmndrs/zustand) (persisted to `localStorage`) |
| Receipt OCR | [OCR.space](https://ocr.space/) via a server route |
| Cloud (optional) | [Supabase](https://supabase.com/) — encrypted bill backup + shared bills |
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

Open [http://localhost:3000](http://localhost:3000).

### Environment

Everything works out of the box with sensible defaults — both of these are optional. Copy `.env.local.example` to `.env.local` to override:

- **`OCRSPACE_API_KEY`** — receipt scanning calls [OCR.space](https://ocr.space/ocrapi). The built-in `helloworld` demo key works but is rate-limited; set your own free key (25k/month) for reliability.
- **`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`** — enable cloud backup and short share links. Without them, owe stays fully local. When set, run [`supabase/schema.sql`](./supabase/schema.sql) once in the Supabase SQL editor to create the tables.

> [!NOTE]
> The PWA service worker is **disabled in development** and only generated for production builds. If you ever run a production build locally and later see stale assets in dev, unregister the service worker (DevTools → Application → Storage → *Clear site data*) once.

### Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build (generates the service worker) |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |

## 📁 Project structure

```text
app/
  layout.tsx        # root layout + PWA metadata
  page.tsx          # screen router (home → scan → … → breakdown)
  sw.ts             # Serwist service worker
  api/scan/         # server route → OCR.space
  s/                # shared-bill pages (+ link metadata)
  styles/           # design tokens + per-screen CSS
components/
  Sheet.tsx         # draggable bottom-sheet primitive
  Settings.tsx      # theme / language / money settings
  scan · review · people · assign · breakdown · shared   # the flow
  ui/               # ClickSpark, AnimatedMoney, CopyButton, …
lib/
  store.ts          # Zustand store (persisted)
  ocr.ts            # receipt parsing
  calc.ts           # split math
  breakdown.ts      # per-person settlement
  currency.ts       # currencies + formatting
  payments.ts       # payment-method catalogue
  share.ts          # encode/decode/encrypt shared splits
  shareMeta.ts      # share-link Open Graph metadata
  supabase.ts       # lazy Supabase client (optional)
  bills.ts          # shared-bill storage + paid sync
  device.ts         # anonymous per-device id
  userBills.ts      # encrypted history backup
  i18n/             # en + id dictionaries
  hooks/            # composable hooks
```

## ⚙️ Settings

Everything is tweakable from the in-app settings sheet:

- **Theme** — light or dark (native form controls follow the theme via `color-scheme`).
- **Accent** — six accent colors that recolor the whole UI.
- **Animations** — a single toggle that respects `prefers-reduced-motion`.
- **Language** — English or Bahasa Indonesia.
- **Currency** — IDR (default), MYR, JPY, USD, SGD.
- **Rounding** — exact, whole, or round up to the nearest 5.

## 💳 Currencies & payment methods

**Currencies:** IDR · MYR · JPY · USD · SGD

**Payment methods:** Bank transfer · GoPay · OVO · DANA · ShopeePay · LinkAja · PayPal · Other

## 📲 Install as an app

owe is a full PWA. In a supporting browser, use **Add to Home Screen** (mobile) or the install icon in the address bar (desktop) to run it standalone and offline.

## 📄 License

[MIT](./LICENSE) © 2026 Randy Wardhana

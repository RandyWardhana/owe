# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (`packageManager: pnpm@10.25.0`). `pnpm` may not be on `PATH` in a bare shell — `npm run <script>` works for everything below.

```bash
pnpm dev                # Next dev server on :6769 (service worker disabled)
pnpm build              # production build; generates public/sw.js via Serwist
pnpm lint               # eslint (next/core-web-vitals)
pnpm typecheck          # tsc --noEmit
pnpm test               # pretest compiles lib/ → .test-build, then node --test test/*.test.mjs
node --test test/claims.test.mjs   # one file (run `node scripts/build-test.mjs` first)
```

`scripts/build-test.mjs` compiles only the hand-listed `ENTRIES` set of `lib/` modules into
`.test-build/` and rewrites emitted relative imports to carry `.js`. **Testing a new lib module
means adding it to that list** — the tests import from `.test-build/`, not from `lib/`. It
compiles with `--lib es2022,dom` because `share.ts` speaks WebCrypto and CompressionStream.

### Worker (`worker/`) — separate package, own install

```bash
cd worker
npx wrangler dev --local                       # local D1 + R2 on :8787
OWE_DB_URL=http://127.0.0.1:8787 OWE_DB_SECRET=local-test-secret npm test
npx wrangler deploy
npm run schema:remote                          # apply schema.sql to production D1
```

`worker/test/guard.mjs` refuses to run the suites against anything but localhost — they write
real D1 rows and upload real R2 objects. Override only with `OWE_ALLOW_REMOTE_TESTS=1`.

## Architecture

Offline-first PWA for splitting a restaurant bill. Next 15 App Router + React 19 + Zustand,
deployed on Vercel. No accounts anywhere — identity is device-local tokens, not logins.

### Screen flow is state, not routing

There is essentially one route. `app/page.tsx` renders `components/App.tsx`, which picks a
screen from `store.view` (`home → scan → review → people → assign → breakdown`). Navigation is
`store.go` / `back` / `editStep` pushing onto `store.stack`; the browser URL never changes.
`/s` and `/s/[id]` also render `App` — `useSharedBill` detects the share URL and swaps in
`SharedView` instead of the wizard, or `SharedMissing` when the link resolved to nothing.
`/landing` and `/admin` are the only real separate pages.

From 1080px wide, `App` lays the same screens out as a desktop workspace (`app/styles/desk.css`):
`components/desk/Sidebar` on the left, the current screen in `.ws-main`, and
`components/desk/LiveReceipt` on the right, which prints the draft through `lib/receipt.ts`.
Below that width the sidebar and receipt are hidden and the phone layout is unchanged, so a
screen must keep working inside `.ws-main` at both sizes. `SharedView` renders its own receipt
column, since only it knows who has paid.

Dead ends share `components/StatusScreen.tsx` and its `ReceiptArt` illustrations:
`app/not-found.tsx` (404), `app/error.tsx` (a throw below the root layout) and `SharedMissing`,
one message and picture per `BillMissing` reason from `loadBill`. `app/global-error.tsx` is the exception —
it replaces the whole document, so it has no fonts, no `globals.css` and no store, and is
deliberately inline-styled English with no dependency on anything that might be what broke.

### Two storage tiers

1. **localStorage, always** — the Zustand store persists under key `owe.v1` (`partialize` in
   `lib/store.ts` decides what). Separate keys hold the address book (`owe.contacts.v1`),
   per-bill owner tokens (`owe.owner.v1`), device id (`owe.device`), and per-share paid/proof
   mirrors (`owe.shared.<id>`, `owe.proofs.<id>`).
2. **Cloudflare D1 + R2, optional** — gated by `NEXT_PUBLIC_OWE_CLOUD=1`. Every cloud call goes
   browser → own `/api/*` route → `lib/oweDb.ts` → the `owe-db` Worker. The browser never holds
   `OWE_DB_SECRET`, and D1 bindings only work from Cloudflare compute, which is why the Worker
   exists at all. Without the env vars, every cloud helper no-ops and shares fall back to
   self-contained long links.

### The trust model (read before touching anything share-related)

- **The share id is the credential.** `/api/bill` takes no auth and the payload is encrypted
  with a constant this app ships, so whoever holds an id can read the split and everyone's
  payment details. Ids are therefore 12 random base58 characters (~70 bits, short enough to
  share in a chat), minted once per bill in `lib/shareId.ts`
  and frozen on `Draft.shareId`. `legacyShareId` is the old 32-bit content hash, kept **only**
  to read rows written before this changed — never mint with it. Two bills hashing alike used
  to overwrite each other, and a content hash is guessable by anyone who knows the numbers.
- **The sync code is a credential too, and analytics carries it.** It decrypts the device's
  backup, which holds every owner token. By the owner's choice, `track()` in
  `lib/analytics.ts` adds `device: "<sync name or 'no name'> - <sync code>"` to every event, so
  Firebase Analytics access is backup access. Don't copy that label anywhere else.
- **Owner token** (`lib/billOwner.ts`): sharing a bill mints a random per-bill token kept in
  localStorage; only `sha256(token)` reaches the server as `owner_hash`. Only the holder may
  change `paid` or delete the bill. Claimed once, on the write that creates the row, and never
  re-claimable. Bills predating the column have `owner_hash IS NULL` and stay open — that is what
  keeps old links working. Losing the device loses ownership; `/admin` → "Give to someone" puts
  the bill into a sync code with a fresh owner token and points `owner_hash` at it
  (`/admin/owner` on the Worker).
- **Claims** (`/claim`, `worker/src/index.ts`) are deliberately *not* owner-gated: the people who
  ordered a loose item say so from the link, and they are not the creating device. One person per
  request, not a whole set, so two phones claiming the same plate cannot clobber each other.
- **Proofs** are uploadable and viewable by anyone holding the link; deletion is open until the
  line is marked paid, owner-only after.
- **Admin** (`lib/adminAuth.ts`) is a single `ADMIN_PASSWORD`, not a user login. The cookie is an
  HMAC over an expiry signed with that password, so there is no session store and rotating the
  password invalidates every session.

### Invariants that will bite

- **`SharePayload` single-character keys are the wire format** (`entities/share.ts`). They are
  JSON → deflate → AES-GCM → base64url'd into share URLs. Renaming one breaks every link already
  sent. Map to/from the readable `SharedBill` at the `toWire`/`fromWire` boundary in
  `lib/share.ts` and keep app code on the readable shape. New fields must be optional — readers
  handle links made before the field existed.
- **The share encryption key is a hardcoded constant** (`KEY_PHRASE`, duplicated in
  `lib/share.ts` and `lib/adminDb.ts`). It obscures the payload in a URL; it is not end-to-end
  secrecy. Device history backups (`lib/userBills.ts`) are different — keyed off the device id,
  which the server only sees as a hash, so the server genuinely cannot read those.
- **`computeSplit` apportions tax/service/discount over `itemsSubtotal`, not `assignedSubtotal`**
  (`lib/calc.ts`). Unclaimed items carry their own fees until someone takes them; dividing by the
  assigned subtotal double-charges when a claim lands. `test/claims.test.mjs` pins this.
- **`POST /bill` merges via `COALESCE`** — a `paid`-only write keeps `data`, a `data`-only write
  keeps who has settled. Never go back to sending whole rows.
- **Deletes need tombstones.** `store.tombstones` and the `tombstones` field in the sync payload
  exist because otherwise the next sync resurrects a deleted bill. The merge itself is pure and
  lives in `lib/historyMerge.ts` — last-write-wins on `updatedAt` (falling back to `createdAt`),
  then filtered by tombstone timestamp, then capped at `HISTORY_LIMIT`. It is the one piece of
  the store that can lose a bill, which is why it is out of the store and under test.
- **`step` is normalised to `"breakdown"` on the way out** (`forSync` in `lib/userBills.ts`) —
  `syncSaved` mirrors the live draft into history on every keystroke, so an in-progress `step`
  would otherwise make a finished split render as a draft on the other device.
- **One poller per screen, and none while hidden.** `lib/poll.ts` (`pollWhileVisible`) is the
  only timer the settle screens use; a bill row carries `paid` and `claims` together, so one
  request answers both. Adding a second timer puts back the ~3 requests/5s-forever this
  replaced.
- **Cloud helpers distinguish "no" from "could not ask".** `fetchProofs` returns `null` when
  offline or the server errored, `[]` when there genuinely are none; `savePaid` reports whether
  the server took the write. Collapsing those back into a falsy value reintroduces fixed bugs
  (a proof vanishing on refresh, a tick that moves then springs back).

### Styling and i18n

Hand-written CSS, no framework. Icons are a local set in `components/icons.tsx` — 24x24,
`stroke="currentColor"`, `strokeWidth={2}`, round caps, via a shared `Svg` wrapper. There is no
icon package (no Phosphor, no Lucide); add new glyphs to that file in the same geometry rather
than pulling in a dependency, and never use an emoji as UI — emoji are drawn by the platform, so
they ignore the theme and accent.

Colour tokens must clear 4.5:1 against every surface they land on. `--ink-3` (muted text,
placeholders) and `--pos` (success) are both set at the edge of that, so changing either means
re-checking it in both themes. `app/globals.css` imports `app/styles/*.css` in order; design
tokens (colors, radii, shadows, the 8-colour person palette `--p1`…`--p8`) live in `tokens.css`
with a `[data-theme="dark"]` block. Theme, accent and motion are applied pre-paint by an inline
script in `app/layout.tsx` that reads `owe.v1` from localStorage — that is why `<html>` carries
`suppressHydrationWarning`.

Strings go through `useT()` (`lib/i18n/`), dot-path keys into `en.ts` / `id.ts`, with `en` as
fallback for missing keys. Both dictionaries need the key. `global-error.tsx` is the one screen
that cannot use `useT` — see above.

### Environment

All optional; the app degrades to fully local without them.

| Var | Side | Effect |
| --- | --- | --- |
| `NEXT_PUBLIC_OWE_CLOUD=1` | client | tells the UI sharing + backup exist |
| `OWE_DB_URL` / `OWE_DB_SECRET` | server | the Worker and the secret it checks |
| `OCRSPACE_API_KEY` | server | receipt scanning (defaults to the rate-limited `helloworld` key) |
| `ADMIN_PASSWORD` | server | enables `/admin`; must be 8+ chars |
| `NEXT_PUBLIC_SITE_URL` | build | `metadataBase`; falls back to Vercel-provided URLs |

## Code design

Follow these in every change, so the codebase reads as one system rather than a pile of
generated files.

### Where things go

- `entities/`: every `type` and `interface`, and nothing else. Domain types by area
  (`bill.ts`, `share.ts`, `payment.ts`, `proof.ts`, `sync.ts`, `admin.ts`, …); component props
  and view-local types in `entities/props/<feature>.ts`, one file per `components/` folder.
  Never declare a type inside `lib/`, `components/` or `app/`, and never between functions.
- `lib/`: logic, no types. `lib/hooks/`: React hooks. Runtime constants shared by server and
  client code live in their own module (e.g. `lib/adminConstants.ts`), never in `entities/`.
- `components/<feature>/`: UI. `app/`: routes and API handlers, kept thin.
- Import entities with `import type`. Inside `lib/` use relative paths (`../entities/bill`);
  the test build compiles `lib/` without the `@/` alias. Elsewhere use `@/entities/...`.

### Inside a file

Order: imports, then constants, then helpers, then the main export (the component, the route
handler, or the module's public functions). One component per file unless a sub-component is
private to its parent.

### Names

- Say what the value is: `bill`, `person`, `draft`, `entry`, `account`, `file`, `row`. No
  single letters or abbreviations for domain values (`b`, `p`, `d`, `it`, `x`, `pi`).
- Accepted idioms: `(s) => s.theme` store selectors, `e` for events, `(a, b)` in sort
  comparators, `i`/`j` numeric indexes, `const t = useT()`.
- Exported type names carry their feature (`AdminTab`, `ReceiptSlip`, `SettleUpProps`), so a
  name means one thing across the repo.

### The wire format is not a naming problem

`SharePayload`'s one-letter keys (`t`, `pp`, `py`, …) are persisted in every share link and
every stored bill; renaming them breaks both. Read and write bills through `lib/share.ts`
(`toWire` / `fromWire`) and work with the readable `SharedBill` everywhere else, the admin
included.

### Comments

Write a comment only when the code cannot explain itself: a security or ownership rule, a
persisted format, a workaround with a non-obvious reason. Never narrate what the next line
does, and never write history ("it used to…", "the old version…"); that belongs in the commit
message.

### Other

- Path alias is `@/*` → repo root.
- `worker/` is excluded from the root `tsconfig.json` and has its own.

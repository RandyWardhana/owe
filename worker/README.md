# owe-db

Cloudflare Worker over a D1 database and an R2 bucket. It holds shared bills (so
`/s/owe-…` links resolve), per-device history backups, and the payment receipts
people attach when they settle up. Bill and backup rows are opaque ciphertext —
the app encrypts before sending — and the Worker is reached only by owe's server
routes, never the browser.

D1 bindings only work from Cloudflare compute, which is why this Worker exists:
owe itself runs on Vercel and cannot bind D1 directly.

## One-time setup

Same Cloudflare account as boothique's share Worker — no new signup.

```sh
cd worker
npx wrangler login

# 1. create the database, then paste the printed id into wrangler.toml
npx wrangler d1 create owe

# 2. create the tables (add --local to seed a dev copy instead)
npx wrangler d1 execute owe --remote --file=./schema.sql

# 3. set the shared secret the Worker checks on every request
#    use the same value for OWE_DB_SECRET in the app's env
npx wrangler secret put OWE_API_SECRET

# 4. ship it
npx wrangler deploy
```

An existing database needs each new file in `migrations/` run once, before deploying the Worker
that uses it:

```sh
npx wrangler d1 execute owe --remote --file=./migrations/0003_backup_bill_ids.sql
npx wrangler d1 execute owe --remote --file=./migrations/0004_bill_sync_key.sql
npx wrangler d1 execute owe --remote --file=./migrations/0005_backup_name.sql
```

Then set `OWE_DB_URL`, `OWE_DB_SECRET` and `NEXT_PUBLIC_OWE_CLOUD=1` in the
app's environment (locally in `.env.local`, and in the Vercel project settings).

## Endpoints

All require `x-owe-secret`; anything else gets a 401. Writes that change who has
paid, or that remove something, additionally require `x-owe-owner` — the raw
token whose sha256 is stored as the bill's `owner_hash`.

| Method | Path                    | Body / query                              | Returns                    |
| ------ | ----------------------- | ----------------------------------------- | -------------------------- |
| GET    | `/bill?id=…`            | —                                         | `{ data, paid, claims }`   |
| POST   | `/bill`                 | `{ id, data?, paid?, owner_hash? }`       | `{ ok }`                   |
| DELETE | `/bill?id=…`            | owner                                     | `{ ok, proofs }`           |
| POST   | `/claim`                | `{ id, item, person, on }`                | `{ ok, claims }`           |
| GET    | `/sync?key=…`           | —                                         | `{ data }`                 |
| POST   | `/sync`                 | `{ key, data }`                           | `{ ok }`                   |
| GET    | `/proofs?id=…`          | —                                         | `{ proofs[] }`             |
| GET    | `/proof?id=…&i=…`       | —                                         | the image                  |
| POST   | `/proof?id=…&i=…&name=…`| raw body, `content-type` set              | `{ ok }`                   |
| DELETE | `/proof?id=…&i=…`       | owner once the line is paid               | `{ ok }`                   |
| GET    | `/admin/bills`          | —                                         | `{ bills[] }`              |
| GET    | `/admin/backups`        | —                                         | `{ backups[] }`            |
| GET    | `/admin/backup?key=…`   | —                                         | `{ backup }`               |
| GET    | `/admin/bill?id=…`      | —                                         | `{ bill, proofs[] }`       |
| GET    | `/admin/objects?prefix=…`| —                                        | `{ objects[] }` with bill  |
| GET    | `/admin/object?key=…`   | —                                         | the file                   |
| POST   | `/admin/owner?id=…`     | `{ owner_hash, sync_key? }`               | `{ ok, changed }`          |
| POST   | `/admin/backup-bills?key=…` | `{ bills[] }`                         | `{ ok, changed }`          |
| DELETE | `/admin/bill?id=…`      | —                                         | `{ ok, proofs, files }`    |
| DELETE | `/admin/backup?key=…`   | —                                         | `{ ok, changed }`          |
| DELETE | `/admin/object?key=…`   | —                                         | `{ ok }`                   |

`POST /bill` merges rather than replaces: sending only `paid` keeps `data`, and
sending only `data` keeps whoever has already settled.

`POST /claim` is deliberately not owner-gated — the people who ordered a loose
item say so from the shared link, and they are not the device that made the
bill. It takes one person at a time so two phones claiming the same plate cannot
overwrite each other.

## Tests

They write real rows and upload real objects, so `test/guard.mjs` refuses to run
them anywhere but localhost.

```sh
npx wrangler dev --local                                    # another terminal
OWE_DB_URL=http://127.0.0.1:8787 OWE_DB_SECRET=local-test-secret npm test
```

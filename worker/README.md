# owe-db

Cloudflare Worker over a D1 database. It holds what Supabase used to: shared
bills (so `/s/owe-…` links resolve) and per-device history backups. Rows are
opaque ciphertext — the app encrypts before sending — and the Worker is reached
only by owe's server routes, never the browser.

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

Then set `OWE_DB_URL`, `OWE_DB_SECRET` and `NEXT_PUBLIC_OWE_CLOUD=1` in the
app's environment (locally in `.env.local`, and in the Vercel project settings).

## Endpoints

All require `x-owe-secret`; anything else gets a 401.

| Method | Path             | Body / query          | Returns                  |
| ------ | ---------------- | --------------------- | ------------------------ |
| GET    | `/bill?id=…`     | —                     | `{ data, paid }`         |
| POST   | `/bill`          | `{ id, data?, paid? }`| `{ ok }`                 |
| GET    | `/sync?key=…`    | —                     | `{ data }`               |
| POST   | `/sync`          | `{ key, data }`       | `{ ok }`                 |

`POST /bill` merges rather than replaces: sending only `paid` keeps `data`, and
sending only `data` keeps whoever has already settled.

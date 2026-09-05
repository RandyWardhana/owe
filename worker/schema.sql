-- owe — D1 schema. Mirrors the Supabase tables it replaces.
--
--   bills      — shared bills, keyed by their deterministic id, so short links
--                (/s/owe-…) resolve. `data` is the AES-GCM encrypted bill.
--   user_bills — per-device history backup, keyed by sha256(deviceId).
--
-- No auth here either: rows are opaque ciphertext and the key is the secret.
-- SQLite has no jsonb/timestamptz, so `paid` is a JSON array as TEXT and
-- `updated_at` an ISO-8601 string. Re-runnable.

CREATE TABLE IF NOT EXISTS bills (
  id         TEXT PRIMARY KEY,
  data       TEXT,
  paid       TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_bills (
  key        TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

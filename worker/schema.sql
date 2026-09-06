-- owe — D1 schema. Mirrors the Supabase tables it replaces.
--
--   bills      — shared bills, keyed by their deterministic id, so short links
--                (/s/owe-…) resolve. `data` is the AES-GCM encrypted bill.
--   user_bills — per-device history backup, keyed by sha256(deviceId).
--
-- No auth here either: rows are opaque ciphertext and the key is the secret.
-- SQLite has no jsonb/timestamptz, so `paid` is a JSON array as TEXT,
-- `claims` a JSON object as TEXT, and `updated_at` an ISO-8601 string.
-- Re-runnable.

CREATE TABLE IF NOT EXISTS bills (
  id         TEXT PRIMARY KEY,
  data       TEXT,
  paid       TEXT NOT NULL DEFAULT '[]',
  claims     TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  owner_hash TEXT
);

CREATE TABLE IF NOT EXISTS user_bills (
  key        TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Payment proof, one per person per bill and replaceable. `r2_key` points into
-- the owe-proofs bucket; the row is the index, the object is the image.
CREATE TABLE IF NOT EXISTS proofs (
  bill_id      TEXT    NOT NULL,
  person_index INTEGER NOT NULL,
  r2_key       TEXT    NOT NULL,
  content_type TEXT    NOT NULL,
  size         INTEGER NOT NULL,
  uploaded_at  TEXT    NOT NULL,
  PRIMARY KEY (bill_id, person_index)
);

CREATE INDEX IF NOT EXISTS proofs_bill ON proofs (bill_id);

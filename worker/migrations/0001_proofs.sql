-- Payment proof + bill ownership.
--
-- owner_hash: sha256 of a token the CREATING device keeps. Only that device can
-- change `paid`. Claimed on first write and never re-claimable, so a share link
-- cannot take a bill over. Bills created before this column stay open, which is
-- what keeps old links working.
ALTER TABLE bills ADD COLUMN owner_hash TEXT;

-- One proof per person per bill, replaceable: re-uploading corrects a mistake
-- rather than piling up. `r2_key` points into the owe-proofs bucket.
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

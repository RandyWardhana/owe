-- The sync code hash (user_bills.key) of the device that owns each bill, so
-- /admin can group bills by phone straight from the bills table. Written only
-- by the owner: on the share that creates the row, on later owner writes, and
-- on a sync that proves ownership with the bill's owner token.
ALTER TABLE bills ADD COLUMN sync_key TEXT;
CREATE INDEX IF NOT EXISTS bills_sync_key ON bills (sync_key);

-- The name a user typed under Settings -> Sync, so /admin can say whose phone
-- a backup is. Optional and stored in the clear: the backup itself stays
-- encrypted with the sync code.
ALTER TABLE user_bills ADD COLUMN name TEXT;

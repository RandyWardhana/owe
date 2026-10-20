-- Which shared bills each device backup holds, as a JSON array of bill ids.
-- The backup itself stays encrypted with the sync code; this index only links
-- a device to bills the server can already read, so /admin can group them.
ALTER TABLE user_bills ADD COLUMN bill_ids TEXT NOT NULL DEFAULT '[]';

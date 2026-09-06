-- Items the bill maker left unassigned can be claimed by whoever actually
-- ordered them, from the shared link. A JSON object of itemId -> personIndex,
-- alongside `paid` rather than in its own table: it is small, always read with
-- the bill, and never queried on its own.
ALTER TABLE bills ADD COLUMN claims TEXT NOT NULL DEFAULT '{}';

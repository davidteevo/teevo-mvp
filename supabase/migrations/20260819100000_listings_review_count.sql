-- Track how many times a listing has been sent back to the seller for changes.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

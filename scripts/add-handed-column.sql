-- Add handed (left/right) to listings for golf clubs
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS handed text CHECK (handed IN ('left', 'right'));

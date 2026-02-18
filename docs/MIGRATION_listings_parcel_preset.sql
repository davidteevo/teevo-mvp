-- Run in Supabase SQL Editor to add parcel preset to listings.
-- Used for Shippo label creation (accurate dimensions for DPD). Values: GOLF_DRIVER, IRON_SET, PUTTER, SMALL_ITEM.

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS parcel_preset TEXT;

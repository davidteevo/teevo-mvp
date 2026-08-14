-- Global buying & payments kill switch. Fail-closed: default OFF.
-- Run in Supabase SQL Editor (staging first, then production).
-- ON CONFLICT DO NOTHING so a later manual override is not overwritten.

INSERT INTO public.platform_settings (key, value)
VALUES ('buying_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

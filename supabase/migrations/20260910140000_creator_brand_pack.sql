-- Creator Brand Pack destination (external Drive / future asset host).

INSERT INTO public.platform_settings (key, value)
VALUES
  ('creator_brand_pack_enabled', 'true'),
  (
    'creator_brand_pack_url',
    'https://drive.google.com/drive/folders/1Z08g03AmCv24bVuvzojjDiIeyEC-buZy?usp=sharing'
  )
ON CONFLICT (key) DO NOTHING;

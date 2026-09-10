-- Primary Creator Programme objective (drives onboarding email messaging).

INSERT INTO public.platform_settings (key, value)
VALUES ('creator_primary_objective', 'listings')
ON CONFLICT (key) DO NOTHING;

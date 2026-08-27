-- Creator Hub: mission content + motivational monthly target (not a cash bonus).

INSERT INTO public.platform_settings (key, value)
VALUES
  ('creator_mission_title', 'Bring more clubs onto Teevo'),
  (
    'creator_mission_body',
    'We''re building the marketplace. More great listings = more reasons for golfers to come back.'
  ),
  ('creator_mission_cta_label', 'Find a seller'),
  ('creator_mission_cta_url', ''),
  (
    'creator_mission_reward_callout',
    'First approved listing from each new referral = {listing}'
  ),
  ('creator_monthly_referral_target', '10')
ON CONFLICT (key) DO NOTHING;

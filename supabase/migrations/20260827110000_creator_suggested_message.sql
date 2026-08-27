-- Creator Hub: Admin-configurable suggested share message.

INSERT INTO public.platform_settings (key, value)
VALUES
  (
    'creator_suggested_message',
    'Got golf clubs gathering dust?

Sell them on Teevo — the marketplace built for golf gear.'
  )
ON CONFLICT (key) DO NOTHING;

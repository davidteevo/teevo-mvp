-- Teevo in-app notifications (Action Centre) + transaction timestamps.
-- Run in Supabase SQL Editor. Safe to re-run.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS delivery_issue_reported_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS delivery_issue_resolved_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS label_created_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS fulfilment_status_changed_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tracking_status TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tracking_updated_at TIMESTAMPTZ;

UPDATE public.transactions
SET fulfilment_status_changed_at = COALESCE(updated_at, created_at)
WHERE fulfilment_status_changed_at IS NULL;

UPDATE public.transactions
SET label_created_at = COALESCE(updated_at, created_at)
WHERE label_created_at IS NULL
  AND (fulfilment_status = 'LABEL_CREATED' OR order_state = 'label_created');

UPDATE public.transactions
SET delivered_at = COALESCE(updated_at, created_at)
WHERE delivered_at IS NULL
  AND (fulfilment_status = 'DELIVERED' OR order_state = 'delivered');

UPDATE public.transactions
SET buyer_confirmed_at = completed_at
WHERE buyer_confirmed_at IS NULL
  AND completed_at IS NOT NULL
  AND status = 'complete';

CREATE OR REPLACE FUNCTION public.touch_fulfilment_status_changed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.fulfilment_status IS NOT NULL THEN
      NEW.fulfilment_status_changed_at := COALESCE(NEW.fulfilment_status_changed_at, NOW());
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.fulfilment_status IS DISTINCT FROM OLD.fulfilment_status THEN
    NEW.fulfilment_status_changed_at := NOW();
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_fulfilment_status_changed ON public.transactions;
CREATE TRIGGER trg_fulfilment_status_changed
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_fulfilment_status_changed_at();

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'transaction',
  entity_id TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  requires_action BOOLEAN NOT NULL DEFAULT FALSE,
  action_completed_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_action
  ON public.notifications (user_id)
  WHERE requires_action = TRUE AND action_completed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_open_action_unique
  ON public.notifications (user_id, type, entity_id)
  WHERE requires_action = TRUE AND action_completed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_info_unique
  ON public.notifications (user_id, type, entity_id)
  WHERE requires_action = FALSE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  n integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE user_id = auth.uid()
    AND id = ANY(p_ids)
    AND read_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  n integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE user_id = auth.uid()
    AND read_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$fn$;

REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

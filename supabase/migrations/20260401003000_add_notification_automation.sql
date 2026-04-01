CREATE OR REPLACE FUNCTION public.should_deliver_in_app_notification(
  p_user_id uuid,
  p_category text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefs public.user_notification_preferences%ROWTYPE;
BEGIN
  SELECT *
  INTO prefs
  FROM public.user_notification_preferences
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  CASE p_category
    WHEN 'support' THEN RETURN prefs.in_app_support_updates;
    WHEN 'billing' THEN RETURN prefs.in_app_billing_updates;
    WHEN 'product' THEN RETURN prefs.in_app_product_updates;
    ELSE RETURN true;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_in_app_notification(
  p_user_id uuid,
  p_title text,
  p_body text DEFAULT NULL,
  p_type text DEFAULT 'system',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_category text DEFAULT 'product'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  IF NOT public.should_deliver_in_app_notification(p_user_id, p_category) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, metadata)
  VALUES (p_user_id, p_title, p_body, p_type, p_metadata)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_support_ticket_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_by uuid;
  v_subject text;
BEGIN
  IF NEW.is_internal THEN
    RETURN NEW;
  END IF;

  SELECT created_by, subject
  INTO v_created_by, v_subject
  FROM public.support_tickets
  WHERE id = NEW.ticket_id;

  IF v_created_by IS NULL OR v_created_by = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  PERFORM public.create_in_app_notification(
    v_created_by,
    'New support reply',
    format('There is a new reply on your ticket "%s".', v_subject),
    'system',
    jsonb_build_object(
      'ticket_id', NEW.ticket_id,
      'message_id', NEW.id,
      'notification_category', 'support'
    ),
    'support'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_ticket_messages_notify_owner
ON public.support_ticket_messages;

CREATE TRIGGER support_ticket_messages_notify_owner
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_support_ticket_reply();

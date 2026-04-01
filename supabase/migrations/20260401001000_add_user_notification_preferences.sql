DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_notification_preferences'
      AND c.relkind = 'r'
  ) THEN
    CREATE TABLE public.user_notification_preferences (
      user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
      email_support_updates boolean NOT NULL DEFAULT true,
      email_billing_updates boolean NOT NULL DEFAULT true,
      email_product_updates boolean NOT NULL DEFAULT false,
      in_app_support_updates boolean NOT NULL DEFAULT true,
      in_app_billing_updates boolean NOT NULL DEFAULT true,
      in_app_product_updates boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TRIGGER user_notification_preferences_set_updated_at
      BEFORE UPDATE ON public.user_notification_preferences
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

    CREATE POLICY notification_preferences_select_own
      ON public.user_notification_preferences
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY notification_preferences_insert_own
      ON public.user_notification_preferences
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY notification_preferences_update_own
      ON public.user_notification_preferences
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY notification_preferences_admin_all
      ON public.user_notification_preferences
      FOR ALL
      USING (public.current_user_has_role('admin'))
      WITH CHECK (public.current_user_has_role('admin'));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.user_notification_preferences TO authenticated;

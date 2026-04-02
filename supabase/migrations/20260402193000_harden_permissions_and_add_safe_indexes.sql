DO $$
DECLARE
  rec record;
  v_index_name text;
  v_columns_sql text;
BEGIN
  FOR rec IN
    WITH fk AS (
      SELECT conrelid, conname, conkey
      FROM pg_constraint
      WHERE contype = 'f'
        AND connamespace = 'public'::regnamespace
    ),
    idx AS (
      SELECT indrelid, indkey::int2[] AS indkey
      FROM pg_index
      WHERE indisvalid
        AND indisready
    )
    SELECT
      fk.conrelid::regclass AS table_name,
      fk.conname,
      array_agg(att.attname ORDER BY ord.n) AS column_names
    FROM fk
    JOIN LATERAL unnest(fk.conkey) WITH ORDINALITY ord(attnum, n) ON TRUE
    JOIN pg_attribute att
      ON att.attrelid = fk.conrelid
     AND att.attnum = ord.attnum
    WHERE NOT EXISTS (
      SELECT 1
      FROM idx
      WHERE idx.indrelid = fk.conrelid
        AND idx.indkey[1:cardinality(fk.conkey)] = fk.conkey
    )
    GROUP BY fk.conrelid, fk.conname
  LOOP
    SELECT string_agg(format('%I', column_name), ', ')
    INTO v_columns_sql
    FROM unnest(rec.column_names) AS column_name;

    v_index_name := format(
      'idx_%s_%s_fk_%s',
      replace(split_part(rec.table_name::text, '.', 2), '"', ''),
      array_to_string(rec.column_names, '_'),
      substr(md5(rec.conname), 1, 6)
    );

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %s (%s)',
      v_index_name,
      rec.table_name,
      v_columns_sql
    );
  END LOOP;
END
$$;

ALTER VIEW public.v_active_marketplace_businesses SET (security_invoker = true);

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;

GRANT SELECT ON public.badges TO anon;
GRANT SELECT ON public.billing_products TO anon;
GRANT SELECT ON public.business_categories TO anon;
GRANT SELECT ON public.businesses TO anon;
GRANT SELECT ON public.offers TO anon;
GRANT SELECT ON public.subscription_plans TO anon;

REVOKE ALL PRIVILEGES ON public.v_active_marketplace_businesses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_active_marketplace_businesses TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT EXECUTE ON FUNCTION public.current_user_has_role(public.user_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_staff_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_support_ticket(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ensure_profile_for_role(public.user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_business_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_subscription_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_tx_credit_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_end_user_membership_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_offers(uuid, text, text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rewards_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_member(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_transaction(uuid, text, numeric, public.identification_method, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_membership_card(uuid) TO authenticated;

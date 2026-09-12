-- =========================================================
-- TLB Enterprise — Profile approval / UPDATE hardening
--
-- Live inspection (project mothgrmclaowhsiemiuj):
--   * authenticated (and even anon, via default grants) can UPDATE
--     every profiles column, including approval_status and account_type.
--   * "own profile update" lets a customer write those columns; only
--     prevent_self_approval currently stops approval_status, and it
--     does not lock account_type.
--   * "admin update all profiles" lets an admin JWT UPDATE any column
--     on any profile from the browser client.
--   * prevent_self_approval allows has_role(..., 'admin') and would
--     REJECT service_role (auth.uid() is null), so supabaseAdmin
--     approval updates would fail until the trigger is adjusted.
--
-- Does not touch warehouse, orders, or quotes.
-- =========================================================

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (
  full_name,
  phone,
  institution_name,
  institution_type
) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "own profile insert" ON public.profiles;
DROP POLICY IF EXISTS "admin update all profiles" ON public.profiles;

-- Contact-field updates only. Privileged columns have no authenticated UPDATE grant.
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Defense in depth: even if a grant/policy is restored, JWT callers cannot
-- change approval_status, account_type, or id. service_role (supabaseAdmin)
-- is allowed so privileged createServerFn mutations can succeed.
CREATE OR REPLACE FUNCTION public.prevent_self_approval() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    RAISE EXCEPTION 'approval_status can only be changed by an admin';
  END IF;

  IF NEW.account_type IS DISTINCT FROM OLD.account_type THEN
    RAISE EXCEPTION 'account_type cannot be changed';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profile id cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;

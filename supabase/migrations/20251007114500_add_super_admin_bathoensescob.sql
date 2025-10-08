-- Assign super_admin role to a specific email, with idempotent behavior
-- Also add helper functions to verify existence and role assignment by email

DO $$
DECLARE
  target_email TEXT := 'bathoensescob@gmail.com';
  target_user_id UUID;
BEGIN
  -- Lookup user id from auth
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found in auth.users. No role assigned.', target_email;
  ELSE
    -- Grant super_admin role if not already assigned (idempotent)
    INSERT INTO public.user_roles (user_id, role, assigned_at, assigned_by)
    SELECT target_user_id::text, 'super_admin', now()::text, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id::text = target_user_id::text AND role::text = 'super_admin'
    );

    RAISE NOTICE 'Ensured super_admin role for user % (id=%).', target_email, target_user_id;
  END IF;
END $$;

-- Helper: check if a user exists by email
CREATE OR REPLACE FUNCTION public.user_exists_by_email(_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = _email LIMIT 1;
  RETURN uid IS NOT NULL;
END;
$$;

-- Helper: check if a user has a role by email (robust to enum/text)
CREATE OR REPLACE FUNCTION public.has_role_by_email(_email TEXT, _role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = _email LIMIT 1;
  IF uid IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id::text = uid::text AND role::text = _role::text
  );
END;
$$;
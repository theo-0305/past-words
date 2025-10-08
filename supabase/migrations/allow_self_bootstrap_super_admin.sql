-- Allow one-time self-bootstrap for super_admin under RLS
-- This policy permits an authenticated user to insert a super_admin role for themselves
-- ONLY if no super_admin currently exists in user_roles. This enables initial bootstrap
-- while preserving strong RLS afterwards.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Self-bootstrap super_admin when none exists' 
      AND tablename = 'user_roles'
  ) THEN
    CREATE POLICY "Self-bootstrap super_admin when none exists"
    ON public.user_roles
    FOR INSERT
    WITH CHECK (
      auth.uid() = user_id
      AND role = 'super_admin'::public.app_role
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.role = 'super_admin'
      )
    );
  END IF;
END $$;
-- Migration to allow self-bootstrap of super_admin role
-- This policy allows a user to assign themselves as super_admin when no super_admin exists

-- First, let's check if there are any existing super_admins
DO $$ 
DECLARE
  super_admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO super_admin_count 
  FROM public.user_roles 
  WHERE role = 'super_admin';

  -- Only create the policy if no super_admin exists
  IF super_admin_count = 0 THEN
    -- Create policy that allows users to insert super_admin role for themselves
    -- only when no super_admin exists in the system
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

    RAISE NOTICE 'Self-bootstrap policy created successfully';
  ELSE
    RAISE NOTICE 'Super admin already exists, skipping policy creation';
  END IF;
END $$;

-- Grant necessary permissions
GRANT INSERT ON public.user_roles TO authenticated;

-- Add comment for documentation
COMMENT ON POLICY "Self-bootstrap super_admin when none exists" ON public.user_roles 
IS 'Allows authenticated users to assign themselves as super_admin when no super_admin exists in the system';
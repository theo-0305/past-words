-- RPC: Log admin actions with SECURITY DEFINER, enforcing admin check
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action TEXT,
  _target_type TEXT,
  _target_id UUID,
  _details JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure only admins can log actions
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), _action, _target_type, _target_id, COALESCE(_details, '{}'::jsonb));
END;
$$;

-- Allow authenticated callers to execute (function enforces admin check)
GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- Refresh PostgREST schema
NOTIFY pgrst, 'reload schema';
-- Fix profiles RLS policy casting based on actual column type
BEGIN;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_data_type text;
  v_insert_condition text;
  v_update_condition text;
BEGIN
  SELECT data_type INTO v_data_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles' AND column_name='id';

  IF v_data_type IS NULL THEN
    RAISE EXCEPTION 'profiles.id column not found';
  END IF;

  IF v_data_type = 'uuid' THEN
    v_insert_condition := '(auth.uid() = id)';
    v_update_condition := '(auth.uid() = id)';
  ELSIF v_data_type IN ('text', 'character varying') THEN
    v_insert_condition := '(auth.uid()::text = id)';
    v_update_condition := '(auth.uid()::text = id)';
  ELSE
    -- Fallback: cast the column to uuid in the expression
    v_insert_condition := '(auth.uid() = id::uuid)';
    v_update_condition := '(auth.uid() = id::uuid)';
  END IF;

  -- Ensure public read policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Public read profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true)';
  END IF;

  -- Drop conflicting policies if present
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can insert their own profile'
  ) THEN
    EXECUTE 'DROP POLICY "Users can insert their own profile" ON public.profiles';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update their own profile'
  ) THEN
    EXECUTE 'DROP POLICY "Users can update their own profile" ON public.profiles';
  END IF;

  -- Create policies using the computed conditions
  EXECUTE 'CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ' || v_insert_condition;
  EXECUTE 'CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ' || v_update_condition;
END $$;

-- Reload PostgREST schema cache so the new policy is active immediately
NOTIFY pgrst, '
-- Restore INSERT RLS policy for profiles so users can upsert their own record
BEGIN;

-- Ensure RLS is enabled (safe idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Retain or add public read policy (used by embeds)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Public read profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true)';
  END IF;
END $$;

-- Allow authenticated users to insert their own profile (id must equal auth.uid())
DO $$ BEGIN
  -- Drop legacy/conflicting policy with the same name to avoid duplicates
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can insert their own profile'
  ) THEN
    EXECUTE 'DROP POLICY "Users can insert their own profile" ON public.profiles';
  END IF;

  -- Create the INSERT policy if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can insert their own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = id::text)';
  END IF;
END $$;

-- Also ensure users can update their own profile (in case it was dropped)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update their own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id::text)';
  END IF;
END $$;

-- Reload PostgREST schema cache so the new policy is active immediately
NOTIFY pgrst, 'reload schema';

COMMIT;
-- Ensure public SELECT access to languages via RLS
DO $$ BEGIN
  -- Enable RLS on languages
  EXECUTE 'ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY';

  -- Drop existing public read policy if present to avoid duplicates
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'languages' 
      AND policyname = 'Languages are viewable by everyone'
  ) THEN
    EXECUTE 'DROP POLICY "Languages are viewable by everyone" ON public.languages';
  END IF;

  -- Create public read policy
  EXECUTE 'CREATE POLICY "Languages are viewable by everyone" ON public.languages FOR SELECT USING (true)';
END $$;

-- Optionally grant privileges (not required when RLS is enabled, but harmless)
DO $$ BEGIN
  BEGIN
    EXECUTE 'GRANT SELECT ON TABLE public.languages TO anon';
  EXCEPTION WHEN undefined_object THEN
    -- Role anon may not exist in non-Hosted environments; ignore
    NULL;
  END;
  BEGIN
    EXECUTE 'GRANT SELECT ON TABLE public.languages TO authenticated';
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
END $$;
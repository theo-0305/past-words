-- Allow public SELECT on community_content when is_public = true

-- Ensure RLS is enabled
ALTER TABLE public.community_content ENABLE ROW LEVEL SECURITY;

-- Drop any restrictive view-only policy if present to avoid duplicates
DROP POLICY IF EXISTS "Public content is viewable by everyone" ON public.community_content;

-- Create public read policy gated by is_public
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'community_content' 
      AND policyname = 'Community content is viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Community content is viewable by everyone" ON public.community_content FOR SELECT USING (is_public = true OR user_id::text = auth.uid()::text)';
  END IF;
END $$;

-- Optional grants (harmless under RLS; useful for local
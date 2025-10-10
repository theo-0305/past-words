-- Refresh schema cache for PostgREST to recognize foreign key relationships
-- This migration ensures that the foreign key constraints are properly cached

-- First, ensure all foreign key constraints exist with correct names
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_user_id_fkey;
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_language_id_fkey;
ALTER TABLE public.community_content DROP CONSTRAINT IF EXISTS community_content_user_id_fkey;
ALTER TABLE public.community_content DROP CONSTRAINT IF EXISTS community_content_language_id_fkey;

-- Recreate foreign key constraints with exact names PostgREST expects
ALTER TABLE public.words
  ADD CONSTRAINT words_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.words
  ADD CONSTRAINT words_language_id_fkey
  FOREIGN KEY (language_id) REFERENCES public.languages (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.community_content
  ADD CONSTRAINT community_content_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.community_content
  ADD CONSTRAINT community_content_language_id_fkey
  FOREIGN KEY (language_id) REFERENCES public.languages (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- Force PostgREST schema cache refresh by updating a comment
COMMENT ON TABLE public.words IS 'Words table with foreign key relationships - updated for schema cache refresh';
COMMENT ON TABLE public.profiles IS 'User profiles table - updated for schema cache refresh';
COMMENT ON TABLE public.community_content IS 'Community content table with foreign key relationships - updated for schema cache refresh';
COMMENT ON TABLE public.languages IS 'Languages table - updated for schema cache refresh';

-- Verify constraints exist
DO $$
BEGIN
  -- Check if words_user_id_fkey exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'words_user_id_fkey'
  ) THEN
    RAISE EXCEPTION 'Foreign key constraint words_user_id_fkey was not created properly';
  END IF;
  
  -- Check if community_content_user_id_fkey exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'community_content_user_id_fkey'
  ) THEN
    RAISE EXCEPTION 'Foreign key constraint community_content_user_id_fkey was not created properly';
  END IF;
  
  RAISE NOTICE 'All foreign key constraints verified successfully';
END $$;
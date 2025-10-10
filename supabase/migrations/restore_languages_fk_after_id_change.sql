-- Restore foreign key constraints to languages after id column modifications
-- Ensures PostgREST schema cache can discover relationships for embedding

-- Align column types to UUID (safe if already UUID)
ALTER TABLE public.community_content
  ALTER COLUMN language_id TYPE UUID USING language_id::uuid;
ALTER TABLE public.words
  ALTER COLUMN language_id TYPE UUID USING language_id::uuid;

-- Drop existing constraints if they exist (to avoid stale references)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_content_language_id_fkey'
  ) THEN
    ALTER TABLE public.community_content
    DROP CONSTRAINT community_content_language_id_fkey;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'words_language_id_fkey'
  ) THEN
    ALTER TABLE public.words
    DROP CONSTRAINT words_language_id_fkey;
  END IF;
END $$;

-- Recreate constraints pointing to current languages(id)
ALTER TABLE public.community_content
  ADD CONSTRAINT community_content_language_id_fkey
  FOREIGN KEY (language_id) REFERENCES public.languages(id) ON DELETE SET NULL;

ALTER TABLE public.words
  ADD CONSTRAINT words_language_id_fkey
  FOREIGN KEY (language_id) REFERENCES public.languages(id) ON DELETE SET NULL;
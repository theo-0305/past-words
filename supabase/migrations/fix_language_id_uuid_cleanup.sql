-- Clean invalid language_id values and restore UUID/FK relationships
-- This prevents 22P02 errors when casting and re-enables PostgREST embeds

BEGIN;

-- 1) Sanitize invalid language_id values in community_content and words
--    - Convert empty strings and non-UUIDs to NULL
UPDATE public.community_content
SET language_id = NULL
WHERE language_id IS NOT NULL
  AND (
    language_id = ''
    OR NOT (language_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  );

UPDATE public.words
SET language_id = NULL
WHERE language_id IS NOT NULL
  AND (
    language_id = ''
    OR NOT (language_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  );

-- 2) Convert language_id columns to UUID safely
ALTER TABLE public.community_content
  ALTER COLUMN language_id TYPE UUID USING language_id::uuid;

ALTER TABLE public.words
  ALTER COLUMN language_id TYPE UUID USING language_id::uuid;

-- 3) Drop stale constraints if present
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_content_language_id_fkey') THEN
    ALTER TABLE public.community_content DROP CONSTRAINT community_content_language_id_fkey;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'words_language_id_fkey') THEN
    ALTER TABLE public.words DROP CONSTRAINT words_language_id_fkey;
  END IF;
END $$;

-- 4) Recreate
-- Fix FK relationships and RLS for PostgREST embeds on community_content and words
-- Ensures UUID types, cleans invalid values, recreates FKs with exact names, adds indexes, and enables public read policies

BEGIN;

-- 1) Sanitize invalid UUIDs (empty strings or non-UUIDs) to NULL for user_id and language_id
UPDATE public.community_content
SET user_id = NULL
WHERE user_id IS NOT NULL AND (
  NULLIF(user_id::text, '') IS NULL OR
  NOT (user_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);

UPDATE public.words
SET user_id = NULL
WHERE user_id IS NOT NULL AND (
  NULLIF(user_id::text, '') IS NULL OR
  NOT (user_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);

UPDATE public.community_content
SET language_id = NULL
WHERE language_id IS NOT NULL AND (
  NULLIF(language_id::text, '') IS NULL OR
  NOT (language_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);

UPDATE public.words
SET language_id = NULL
WHERE language_id IS NOT NULL AND (
  NULLIF(language_id::text, '') IS NULL OR
  NOT (language_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);

-- 2) Ensure column types are UUID where needed (idempotent)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'community_content'
      AND column_name = 'user_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.community_content
      ALTER COLUMN user_id TYPE uuid USING NULLIF(user_id::text, '')::uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'words'
      AND column_name = 'user_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.words
      ALTER COLUMN user_id TYPE uuid USING NULLIF(user_id::text, '')::uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'community_content'
      AND column_name = 'language_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.community_content
      ALTER COLUMN language_id TYPE uuid USING NULLIF(language_id::text, '')::uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'words'
      AND column_name = 'language_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.words
      ALTER COLUMN language_id TYPE uuid USING NULLIF(language_id::text, '')::uuid;
  END IF;
END $$;

-- 3) Null out orphan references (that don’t have matching rows in profiles/languages)
UPDATE public.community_content c
SET user_id = NULL
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = c.user_id);

UPDATE public.words w
SET user_id = NULL
WHERE w.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = w.user_id);

UPDATE public.community_content c
SET language_id = NULL
WHERE c.language_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.languages l WHERE l.id = c.language_id);

UPDATE public.words w
SET language_id = NULL
WHERE w.language_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.languages l WHERE l.id = w.language_id);

-- 4) Drop and recreate the foreign keys with the exact expected names
ALTER TABLE public.community_content DROP CONSTRAINT IF EXISTS community_content_user_id_fkey;
ALTER TABLE public.community_content DROP CONSTRAINT IF EXISTS community_content_language_id_fkey;
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_user_id_fkey;
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_language_id_fkey;

ALTER TABLE public.community_content
  ADD CONSTRAINT community_content_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.community_content
  ADD CONSTRAINT community_content_language_id_fkey
  FOREIGN KEY (language_id) REFERENCES public.languages (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.words
  ADD CONSTRAINT words_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.words
  ADD CONSTRAINT words_language_id_fkey
  FOREIGN KEY (language_id) REFERENCES public.languages (id)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- 5) Helpful indexes on FK columns
CREATE INDEX IF NOT EXISTS idx_community_content_user_id ON public.community_content(user_id);
CREATE INDEX IF NOT EXISTS idx_community_content_language_id ON public.community_content(language_id);
CREATE INDEX IF NOT EXISTS idx_words_user_id ON public.words(user_id);
CREATE INDEX IF NOT EXISTS idx_words_language_id ON public.words(language_id);

-- 6) Ensure public read RLS policies for languages and profiles (idempotent)
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read languages" ON public.languages;
CREATE POLICY "Public read languages" ON public.languages FOR SELECT USING (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

COMMIT;

-- Verification (optional to run manually):
-- SELECT conname, conrelid::regclass AS table, confrelid::regclass AS referenced
-- FROM pg_constraint
-- WHERE conname IN (
--   'community_content_user_id_fkey',
--   'community_content_language_id_fkey',
--   'words_user_id_fkey',
--   'words_language_id_fkey'
-- );
-- 
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name IN ('words','community_content')
--
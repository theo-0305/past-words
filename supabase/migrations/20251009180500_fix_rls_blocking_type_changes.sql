-- Corrected migration: handle RLS policy dependencies before altering column types
-- Drops policies that reference user_id/language_id, cleans data, alters to UUID, restores FKs, and recreates read policies

BEGIN;

-- A) Drop policies on community_content and words that reference user_id or language_id
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT polname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_content'
      AND (
        qual ILIKE '%user_id%' OR qual ILIKE '%language_id%'
        OR "with check" ILIKE '%user_id%' OR "with check" ILIKE '%language_id%'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.community_content', r.polname);
  END LOOP;

  FOR r IN (
    SELECT polname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'words'
      AND (
        qual ILIKE '%user_id%' OR qual ILIKE '%language_id%'
        OR "with check" ILIKE '%user_id%' OR "with check" ILIKE '%language_id%'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.words', r.polname);
  END LOOP;
END $$;

-- B) Sanitize invalid UUIDs to NULL
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

-- C) Convert column types to UUID safely (idempotent guards)
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

-- D) Null orphan references (no matching rows in profiles/languages)
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

-- E) Recreate foreign keys with exact expected names
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

-- F) Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_community_content_user_id ON public.community_content(user_id);
CREATE INDEX IF NOT EXISTS idx_community_content_language_id ON public.community_content(language_id);
CREATE INDEX IF NOT EXISTS idx_words_user_id ON public.words(user_id);
CREATE INDEX IF NOT EXISTS idx_words_language_id ON public.words(language_id);

-- G) Recreate safe read RLS policies
ALTER TABLE public.community_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Community content is viewable by everyone" ON public.community_content;
CREATE POLICY "Community content is viewable by everyone"
ON public.community_content FOR SELECT
USING (is_public = true OR user_id = auth.uid());

ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Words are viewable by everyone" ON public.words;
CREATE POLICY "Words are viewable by everyone"
ON public.words FOR SELECT
USING (is_public = true OR user_id = auth.uid());

-- Ensure languages and profiles have public read policies
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read languages" ON public.languages;
CREATE POLICY "Public read languages" ON public.languages FOR SELECT USING (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

-- H) Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification (optional)
-- SELECT conname, conrelid::regclass AS table_name, confrelid::regclass AS referenced
-- FROM pg_constraint
-- WHERE conname IN (
--   'community_content_user_id_fkey',
--   'community_content_language_id_fkey',
--   'words_user_id_fkey',
--   'words_language_id_fkey'
-- );
--
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name IN ('community_content','words')
--   AND column_name IN ('user_id','language_id');
--
-- SELECT polname, schemaname, tablename, cmd, qual, "with check"
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN ('community_content
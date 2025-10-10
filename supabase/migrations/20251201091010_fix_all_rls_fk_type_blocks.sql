-- Fix RLS policy blocks, sanitize/convert types, rebuild FKs, and restore policies for embeds
BEGIN;

-- A) Drop ALL existing RLS policies on community_content and words (SELECT/INSERT/UPDATE/DELETE)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_content'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.community_content', r.policyname);
  END LOOP;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'words'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.words', r.policyname);
  END LOOP;
END $$;

-- B) Temporarily relax NOT NULL for sanitization and type conversion (idempotent guards)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_content' AND column_name='user_id' AND is_nullable='NO'
  ) THEN
    ALTER TABLE public.community_content ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='words' AND column_name='user_id' AND is_nullable='NO'
  ) THEN
    ALTER TABLE public.words ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- C) Sanitize invalid UUID-like values to NULL before type conversion
-- community_content.user_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_content' AND column_name='user_id' AND data_type <> 'uuid'
  ) THEN
    UPDATE public.community_content
    SET user_id = NULL
    WHERE user_id = ''
      OR (user_id IS NOT NULL AND NOT (user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'));
  END IF;
END $$;

-- words.user_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='words' AND column_name='user_id' AND data_type <> 'uuid'
  ) THEN
    UPDATE public.words
    SET user_id = NULL
    WHERE user_id = ''
      OR (user_id IS NOT NULL AND NOT (user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'));
  END IF;
END $$;

-- community_content.language_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_content' AND column_name='language_id' AND data_type <> 'uuid'
  ) THEN
    UPDATE public.community_content
    SET language_id = NULL
    WHERE language_id = ''
      OR (language_id IS NOT NULL AND NOT (language_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'));
  END IF;
END $$;

-- words.language_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='words' AND column_name='language_id' AND data_type <> 'uuid'
  ) THEN
    UPDATE public.words
    SET language_id = NULL
    WHERE language_id = ''
      OR (language_id IS NOT NULL AND NOT (language_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'));
  END IF;
END $$;

-- D) Perform type conversions to UUID only when needed
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_content' AND column_name='user_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.community_content
      ALTER COLUMN user_id TYPE uuid USING NULLIF(user_id::text, '')::uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='words' AND column_name='user_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.words
      ALTER COLUMN user_id TYPE uuid USING NULLIF(user_id::text, '')::uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_content' AND column_name='language_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.community_content
      ALTER COLUMN language_id TYPE uuid USING NULLIF(language_id::text, '')::uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='words' AND column_name='language_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.words
      ALTER COLUMN language_id TYPE uuid USING NULLIF(language_id::text, '')::uuid;
  END IF;
END $$;

-- E) Null orphan references (no matching rows in referenced tables)
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

-- F) Drop and recreate FK constraints with exact names PostgREST uses for embeds
ALTER TABLE public.community_content DROP CONSTRAINT IF EXISTS community_content_user_id_fkey;
ALTER TABLE public.community_content DROP CONSTRAINT IF EXISTS community_content_language_id_fkey;
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_user_id_fkey;
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_language_id_fkey;
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_category_id_fkey;

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

-- Optional FK for categories if present
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='words' AND column_name='category_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='id'
  ) THEN
    ALTER TABLE public.words
      ADD CONSTRAINT words_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- G) Helpful indexes on FK columns
CREATE INDEX IF NOT EXISTS idx_community_content_user_id ON public.community_content(user_id);
CREATE INDEX IF NOT EXISTS idx_community_content_language_id ON public.community_content(language_id);
CREATE INDEX IF NOT EXISTS idx_words_user_id ON public.words(user_id);
CREATE INDEX IF NOT EXISTS idx_words_language_id ON public.words(language_id);
CREATE INDEX IF NOT EXISTS idx_words_category_id ON public.words(category_id);

-- H) Restore comprehensive RLS policies (no IF NOT EXISTS; safe idempotency via drop loops above)
ALTER TABLE public.community_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- community_content policies
CREATE POLICY "Community content is viewable by everyone"
  ON public.community_content FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own community content"
  ON public.community_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own community content"
  ON public.community_content FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own community content"
  ON public.community_content FOR DELETE
  USING (auth.uid() = user_id);

-- words policies
CREATE POLICY "Users can view their own words"
  ON public.words FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public words are viewable by everyone"
  ON public.words FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create their own words"
  ON public.words FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own words"
  ON public.words FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own words"
  ON public.words FOR DELETE
  USING (auth.uid() = user_id);

-- public read for embed sources
DROP POLICY IF EXISTS "Public read languages" ON public.languages;
CREATE POLICY "Public read languages" ON public.languages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

DO $$ BEGIN
  -- ensure categories public read for words embed
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='Categories are viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true)';
  END IF;
END $$;

-- I) Reload PostgREST schema cache to reflect changes immediately
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification (optional: run manually after migration)
/*
-- Check constraints exist and reference expected tables
SELECT conname, conrelid::regclass AS table_name, confrelid::regclass AS referenced
FROM pg_constraint
WHERE conname IN (
  'community_content_user_id_fkey',
  'community_content_language_id_fkey',
  'words_user_id_fkey',
  'words_language_id_fkey',
  'words_category_id_fkey'
);

-- Check column types
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('community_content','words')
  AND column_name IN ('user_id','language_id','category_id');

-- Inspect policies
SELECT policyname, schemaname, tablename, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename IN ('community_content','words','languages','profiles','categories');
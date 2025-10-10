-- Fix FK relationships and RLS for PostgREST embeds used in Community
-- Ensures the exact FK constraint names expected by client queries

BEGIN;

-- 1) Sanitize invalid UUID values before type conversions (idempotent)
-- words.language_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='words' AND column_name='language_id' AND data_type <> 'uuid'
  ) THEN
    UPDATE public.words
    SET language_id = NULL
    WHERE language_id = ''
      OR (language_id IS NOT NULL AND NOT (language_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'));

    ALTER TABLE public.words
    ALTER COLUMN language_id TYPE uuid
    USING NULLIF(NULLIF(language_id, ''), NULL)::uuid;
  END IF;
END $$;

-- community_content.language_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_content' AND column_name='language_id' AND data_type <> 'uuid'
  ) THEN
    UPDATE public.community_content
    SET language_id = NULL
    WHERE language_id = ''
      OR (language_id IS NOT NULL AND NOT (language_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'));

    ALTER TABLE public.community_content
    ALTER COLUMN language_id TYPE uuid
    USING NULLIF(NULLIF(language_id, ''), NULL)::uuid;
  END IF;
END $$;

-- words.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='words' AND column_name='user_id' AND data_type <> 'uuid'
  ) THEN
    UPDATE public.words
    SET user_id = NULL
    WHERE user_id = ''
      OR (user_id IS NOT NULL AND NOT (user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'));

    ALTER TABLE public.words
    ALTER COLUMN user_id TYPE uuid
    USING NULLIF(NULLIF(user_id, ''), NULL)::uuid;
  END IF;
END $$;

-- community_content.user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_content' AND column_name='user_id' AND data_type <> 'uuid'
  ) THEN
    UPDATE public.community_content
    SET user_id = NULL
    WHERE user_id = ''
      OR (user_id IS NOT NULL AND NOT (user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'));

    ALTER TABLE public.community_content
    ALTER COLUMN user_id TYPE uuid
    USING NULLIF(NULLIF(user_id, ''), NULL)::uuid;
  END IF;
END $$;

-- 2) Drop stale constraints (if any) and recreate with the exact names the client expects
-- words_language_id_fkey
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_language_id_fkey;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='words' AND column_name='language_id' AND data_type='uuid'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='languages' AND column_name='id' AND data_type='uuid'
  ) THEN
    ALTER TABLE public.words
    ADD CONSTRAINT words_language_id_fkey
    FOREIGN KEY (language_id) REFERENCES public.languages(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- community_content_language_id_fkey
ALTER TABLE public.community_content DROP CONSTRAINT IF EXISTS community_content_language_id_fkey;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_content' AND column_name='language_id' AND data_type='uuid'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='languages' AND column_name='id' AND data_type='uuid'
  ) THEN
    ALTER TABLE public.community_content
    ADD CONSTRAINT community_content_language_id_fkey
    FOREIGN KEY (language_id) REFERENCES public.languages(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- words_user_id_fkey
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_user_id_fkey;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='words' AND column_name='user_id' AND data_type='uuid'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='id' AND data_type='uuid'
  ) THEN
    ALTER TABLE public.words
    ADD CONSTRAINT words_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- community_content_user_id_fkey
ALTER TABLE public.community_content DROP CONSTRAINT IF EXISTS community_content_user_id_fkey;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='community_content' AND column_name='user_id' AND data_type='uuid'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='id' AND data_type='uuid'
  ) THEN
    ALTER TABLE public.community_content
    ADD CONSTRAINT community_content_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Optional: words_category_id_fkey (used by Community embed)
ALTER TABLE public.words DROP CONSTRAINT IF EXISTS words_category_id_fkey;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='words' AND column_name='category_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='id'
  ) THEN
    BEGIN
      ALTER TABLE public.words
      ADD CONSTRAINT words_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id)
      ON UPDATE CASCADE ON DELETE SET NULL;
    EXCEPTION WHEN others THEN
      -- Skip if types are incompatible; user can fix separately
      NULL;
    END;
  END IF;
END $$;

-- 3) Helpful indexes for FK columns (idempotent)
CREATE INDEX IF NOT EXISTS idx_words_language_id ON public.words(language_id);
CREATE INDEX IF NOT EXISTS idx_words_user_id ON public.words(user_id);
CREATE INDEX IF NOT EXISTS idx_words_category_id ON public.words(category_id);
CREATE INDEX IF NOT EXISTS idx_community_content_language_id ON public.community_content(language_id);
CREATE INDEX IF NOT EXISTS idx_community_content_user_id ON public.community_content(user_id);

-- 4) RLS: ensure public read for languages and profiles so embeds can resolve
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='languages') THEN
    ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='languages' AND policyname='Public can read languages'
    ) THEN
      CREATE POLICY "Public can read languages"
      ON public.languages FOR SELECT USING (true);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='profiles') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Public can read profiles'
    ) THEN
      CREATE POLICY "Public can read profiles"
      ON public.profiles FOR SELECT USING (true);
    END IF;
  END IF;
END $$;

COMMIT;
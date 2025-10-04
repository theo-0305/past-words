-- Add missing foreign keys for profiles and languages, and allow public view of public words
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_content_user_id_fkey'
  ) THEN
    ALTER TABLE public.community_content
    ADD CONSTRAINT community_content_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'words_user_id_fkey'
  ) THEN
    ALTER TABLE public.words
    ADD CONSTRAINT words_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_content_language_id_fkey'
  ) THEN
    ALTER TABLE public.community_content
    ADD CONSTRAINT community_content_language_id_fkey
    FOREIGN KEY (language_id) REFERENCES public.languages(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'words_language_id_fkey'
  ) THEN
    ALTER TABLE public.words
    ADD CONSTRAINT words_language_id_fkey
    FOREIGN KEY (language_id) REFERENCES public.languages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure any existing content has a matching profile to satisfy the FK
INSERT INTO public.profiles (id, display_name)
SELECT DISTINCT cc.user_id, NULL
FROM public.community_content cc
WHERE cc.user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cc.user_id);

INSERT INTO public.profiles (id, display_name)
SELECT DISTINCT w.user_id, NULL
FROM public.words w
WHERE w.user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = w.user_id);

-- Allow public viewing of words when is_public = true
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public words are viewable by everyone' AND tablename = 'words'
  ) THEN
    CREATE POLICY "Public words are viewable by everyone"
    ON public.words
    FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);
  END IF;
END $$;
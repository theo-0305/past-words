-- Ensure community_content.user_id -> profiles.id foreign key exists for PostgREST embeds
BEGIN;

-- 0) Ensure referenced column has a unique or primary key constraint (required for FK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'profiles'
      AND c.contype IN ('u','p') -- unique or primary key
      AND EXISTS (
        SELECT 1
        FROM unnest(c.conkey) AS cols
        JOIN pg_attribute a ON a.attnum = cols AND a.attrelid = t.oid
        WHERE a.attname = 'id'
      )
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_key UNIQUE (id);
  END IF;
END $$;

-- 1) Sanitize orphan references so the FK can be created safely
UPDATE public.community_content c
SET user_id = NULL
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = c.user_id
  );

-- 2) Drop any existing constraint with canonical name (idempotent)
ALTER TABLE public.community_content
  DROP CONSTRAINT IF EXISTS community_content_user_id_fkey;

-- 3) Create the FK with the canonical name PostgREST expects
ALTER TABLE public.community_content
  ADD CONSTRAINT community_content_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles (id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- 4) Helpful index on FK column
CREATE INDEX IF NOT EXISTS idx_community_content_user_id
ON public.community_content(user_id);

-- 5) Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
-- Restore foreign key constraint for endangered_languages.language_id -> languages.id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'endangered_languages_language_id_fkey'
  ) THEN
    ALTER TABLE public.endangered_languages
    DROP CONSTRAINT endangered_languages_language_id_fkey;
  END IF;
END $$;

ALTER TABLE public.endangered_languages
ADD CONSTRAINT endangered_languages_language_id_fkey
FOREIGN KEY (language_id)
REFERENCES public.languages(id)
ON DELETE CASCADE;
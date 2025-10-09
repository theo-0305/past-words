-- Fix foreign key relationship and backfill languages table
-- Restores referential integrity between endangered_languages and languages

-- 1) Drop existing FK if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'endangered_languages_language_id_fkey' 
      AND conrelid = 'public.endangered_languages'::regclass
  ) THEN
    ALTER TABLE public.endangered_languages
      DROP CONSTRAINT endangered_languages_language_id_fkey;
  END IF;
END $$;

-- 2) Backfill languages to match existing endangered_languages.language_id
-- Uses iso_639_3 to derive names; ensures parent IDs exist
INSERT INTO public.languages (id, name, code)
SELECT el.language_id,
       CASE el.iso_639_3
         WHEN 'kcy' THEN 'Korandje'
         WHEN 'tia' THEN 'Tidikelt'
         WHEN 'bga' THEN 'Tchumbuli'
         WHEN 'tyu' THEN 'Kua'
         WHEN 'nmn' THEN 'Taa'
         WHEN 'yey' THEN 'Yeyi'
         WHEN 'shg' THEN 'Xaise (Shua)'
         WHEN 'aku' THEN 'Akum'
         ELSE COALESCE(el.iso_639_3, 'Unknown Language')
       END AS name,
       el.iso_639_3 AS code
FROM public.endangered_languages el
LEFT JOIN public.languages l ON l.id = el.language_id
WHERE l.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3) Recreate FK with explicit name and ON DELETE CASCADE
ALTER TABLE public.endangered_languages
  ADD CONSTRAINT endangered_languages_language_id_fkey
  FOREIGN KEY (language_id)
  REFERENCES public.languages(id)
  ON DELETE CASCADE
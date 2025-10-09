-- Backfill languages table using existing endangered_languages entries
-- Ensures languages has rows with IDs matching endangered_languages.language_id

DO $$ BEGIN
  INSERT INTO public.languages (id, name, code)
  SELECT el.language_id,
         CASE el.iso_639_3
           WHEN 'kcy' THEN 'Korandje'
           WHEN 'tia' THEN 'Tidikelt'
           WHEN 'bga' THEN 'Tchumbuli'
           WHEN 'tyu' THEN 'Kua'
           WHEN 'nmn' THEN 'Taa'
           WHEN 'yey' THEN 'Yeyi'
           WHEN 'shg' THEN 'Xaise'
           WHEN 'aku' THEN 'Akum'
           ELSE COALESCE(el.iso_639_3, 'Unknown')
         END AS name,
         el.iso_639_3 AS code
  FROM public.endangered_languages el
  LEFT JOIN public.languages l ON l.id = el.language_id
  WHERE l.id IS NULL
  ON CONFLICT (id) DO NOTHING;
END $$;
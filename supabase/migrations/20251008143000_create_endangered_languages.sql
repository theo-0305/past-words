-- Create table for endangered language metadata and seed initial African entries
-- Safe to run multiple times due to IF NOT EXISTS guards and ON CONFLICT clauses

-- Create endangerment status enum if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'endangerment_status'
  ) THEN
    CREATE TYPE public.endangerment_status AS ENUM (
      'vulnerable',
      'definitely_endangered',
      'severely_endangered',
      'critically_endangered',
      'extinct'
    );
  END IF;
END $$;

-- Create endangered_languages table
CREATE TABLE IF NOT EXISTS public.endangered_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id UUID NOT NULL UNIQUE REFERENCES public.languages(id) ON DELETE CASCADE,
  iso_639_3 TEXT,
  family TEXT,
  region TEXT,
  countries TEXT[] DEFAULT ARRAY[]::TEXT[],
  status public.endangerment_status NOT NULL,
  speakers_estimate INTEGER,
  description TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.endangered_languages ENABLE ROW LEVEL SECURITY;

-- Public read policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Endangered languages are viewable by everyone' AND tablename = 'endangered_languages'
  ) THEN
    CREATE POLICY "Endangered languages are viewable by everyone"
    ON public.endangered_languages
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Admin manage policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage endangered languages' AND tablename = 'endangered_languages'
  ) THEN
    CREATE POLICY "Admins can manage endangered languages"
    ON public.endangered_languages
    FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.update_endangered_languages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_endangered_languages_updated_at ON public.endangered_languages;
CREATE TRIGGER update_endangered_languages_updated_at
BEFORE UPDATE ON public.endangered_languages
FOR EACH ROW
EXECUTE FUNCTION public.update_endangered_languages_updated_at();

-- Ensure base languages exist (codes and names)
INSERT INTO public.languages (name, code) VALUES
  ('Korandje', 'kcy'),
  ('Tidikelt', 'tia'),
  ('Tchumbuli', 'bga'),
  ('Kua', 'tyu'),
  ('Taa', 'nmn'),
  ('Yeyi', 'yey'),
  ('Xaise (Shua)', 'shg'),
  ('Akum', 'aku')
ON CONFLICT (code) DO NOTHING;

-- Seed endangered metadata for 8 African languages
INSERT INTO public.endangered_languages (
  language_id, iso_639_3, family, region, countries, status, speakers_estimate, description, sources, featured
) VALUES
  ((SELECT id FROM public.languages WHERE code = 'kcy'), 'kcy', NULL, 'Tabelbala (southwest Algeria)', ARRAY['Algeria'], 'severely_endangered', NULL,
   'Korandje is reported as severely endangered in Algeria.',
   '[{"label":"Wikipedia: Endangered languages in Africa","url":"https://en.wikipedia.org/wiki/List_of_endangered_languages_in_Africa"}]'::jsonb, true),

  ((SELECT id FROM public.languages WHERE code = 'tia'), 'tia', NULL, 'Tidikelt region (Algeria)', ARRAY['Algeria'], 'critically_endangered', NULL,
   'Tidikelt (Tamazight/Tuareg variety) listed as critically endangered.',
   '[{"label":"Wikipedia: Endangered languages in Africa","url":"https://en.wikipedia.org/wiki/List_of_endangered_languages_in_Africa"}]'::jsonb, false),

  ((SELECT id FROM public.languages WHERE code = 'bga'), 'bga', NULL, 'Benin', ARRAY['Benin'], 'critically_endangered', NULL,
   'Tchumbuli in Benin is critically endangered.',
   '[{"label":"Wikipedia: Endangered languages in Africa","url":"https://en.wikipedia.org/wiki/List_of_endangered_languages_in_Africa"}]'::jsonb, false),

  ((SELECT id FROM public.languages WHERE code = 'tyu'), 'tyu', NULL, 'Botswana', ARRAY['Botswana'], 'definitely_endangered', NULL,
   'Kua (a Kalahari Khoe language) is definitely endangered.',
   '[{"label":"Wikipedia: Endangered languages in Africa","url":"https://en.wikipedia.org/wiki/List_of_endangered_languages_in_Africa"}]'::jsonb, false),

  ((SELECT id FROM public.languages WHERE code = 'nmn'), 'nmn', NULL, 'Botswana & Namibia', ARRAY['Botswana','Namibia'], 'definitely_endangered', NULL,
   'Taa (ǃXóõ) is noted as definitely endangered.',
   '[{"label":"Wikipedia: Endangered languages in Africa","url":"https://en.wikipedia.org/wiki/List_of_endangered_languages_in_Africa"}]'::jsonb, true),

  ((SELECT id FROM public.languages WHERE code = 'yey'), 'yey', NULL, 'Botswana & Namibia', ARRAY['Botswana','Namibia'], 'definitely_endangered', NULL,
   'Yeyi (Yei) is reported as definitely endangered.',
   '[{"label":"Wikipedia: Endangered languages in Africa","url":"https://en.wikipedia.org/wiki/List_of_endangered_languages_in_Africa"}]'::jsonb, false),

  ((SELECT id FROM public.languages WHERE code = 'shg'), 'shg', NULL, 'Botswana', ARRAY['Botswana'], 'critically_endangered', NULL,
   'Xaise (often grouped with Shua) is critically endangered.',
   '[{"label":"Wikipedia: Endangered languages in Africa","url":"https://en.wikipedia.org/wiki/List_of_endangered_languages_in_Africa"}]'::jsonb, false),

  ((SELECT id FROM public.languages WHERE code = 'aku'), 'aku', NULL, 'Cameroon & Nigeria', ARRAY['Cameroon','Nigeria'], 'critically_endangered', NULL,
   'Akum is critically endangered in Cameroon/Nigeria.',
   '[{"label":"Wikipedia: Endangered languages in Africa","url":"https://en.wikipedia.org/wiki/List_of_endangered_languages_in_Africa"}]'::jsonb, false)
ON CONFLICT (language_id) DO NOTHING;
-- Create table for endangered language metadata
-- Safe to run multiple times due to IF NOT EXISTS guards

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
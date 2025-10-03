-- Create languages table
CREATE TABLE public.languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create content type enum
CREATE TYPE public.content_type AS ENUM ('audio', 'word', 'picture', 'cultural_norm', 'video', 'article');

-- Create community_content table
CREATE TABLE public.community_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  language_id UUID REFERENCES public.languages(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add language and is_public to words table
ALTER TABLE public.words 
ADD COLUMN language_id UUID REFERENCES public.languages(id) ON DELETE SET NULL,
ADD COLUMN is_public BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for languages (public read)
CREATE POLICY "Languages are viewable by everyone"
ON public.languages FOR SELECT
USING (true);

-- RLS Policies for community_content
CREATE POLICY "Public content is viewable by everyone"
ON public.community_content FOR SELECT
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own content"
ON public.community_content FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content"
ON public.community_content FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content"
ON public.community_content FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_community_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for community_content updated_at
CREATE TRIGGER update_community_content_updated_at
BEFORE UPDATE ON public.community_content
FOR EACH ROW
EXECUTE FUNCTION public.update_community_content_updated_at();

-- Insert some common languages
INSERT INTO public.languages (name, code) VALUES
  ('English', 'en'),
  ('Spanish', 'es'),
  ('French', 'fr'),
  ('German', 'de'),
  ('Mandarin Chinese', 'zh'),
  ('Arabic', 'ar'),
  ('Hindi', 'hi'),
  ('Portuguese', 'pt'),
  ('Swahili', 'sw'),
  ('Japanese', 'ja')
ON CONFLICT (code) DO NOTHING;
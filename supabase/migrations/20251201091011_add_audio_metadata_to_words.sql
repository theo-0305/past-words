-- Add audio recording metadata columns to words table
ALTER TABLE public.words 
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_duration INTEGER,
ADD COLUMN IF NOT EXISTS audio_recorded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_recorded BOOLEAN DEFAULT FALSE;

-- Create indexes for audio-related queries
CREATE INDEX IF NOT EXISTS idx_words_audio_recorded ON public.words(is_recorded);
CREATE INDEX IF NOT EXISTS idx_words_audio_url ON public.words(audio_url);

-- Add comment documentation for new columns
COMMENT ON COLUMN public.words.audio_url IS 'URL to the audio file in Supabase Storage';
COMMENT ON COLUMN public.words.audio_duration IS 'Duration of the audio recording in milliseconds';
COMMENT ON COLUMN public.words.audio_recorded_at IS 'Timestamp when the audio was recorded';
COMMENT ON COLUMN public.words.is_recorded IS 'Flag indicating if audio was recorded vs uploaded';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
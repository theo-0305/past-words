-- Create Supabase storage bucket for audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('audio', 'audio', true, 2097152, ARRAY['audio/webm', 'audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/ogg'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio files
-- Public read access for audio files
CREATE POLICY "Public access for audio files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'audio');

-- Users can upload their own audio (organized in user folders)
CREATE POLICY "Users can upload their own audio" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'audio' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own audio files
CREATE POLICY "Users can update their own audio" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'audio' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own audio files
CREATE POLICY "Users can delete their own audio" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'audio' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
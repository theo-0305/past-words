-- Create storage bucket for community content
INSERT INTO storage.buckets (id, name, public) 
VALUES ('community-content', 'community-content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for community content
CREATE POLICY "Anyone can view public content"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-content');

CREATE POLICY "Authenticated users can upload content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-content' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'community-content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
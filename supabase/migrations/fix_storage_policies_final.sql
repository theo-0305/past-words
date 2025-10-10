-- Fix Storage Bucket RLS Policies for community-content
-- Enforce user-folder validation to prevent unauthorized inserts/updates/deletes

BEGIN;

-- Ensure bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-content', 'community-content', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing/legacy policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view public content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload content" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own content" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own content" ON storage.objects;
DROP POLICY IF EXISTS "Public can view community content" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;

-- Public SELECT for files in community-content bucket
CREATE POLICY "Public can view community content"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-content');

-- INSERT only when first folder segment equals auth.uid()
-- Valid upload path must be: community-content/{user_id}/filename
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-content'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- UPDATE only allowed when first folder segment equals auth.uid()
CREATE POLICY "Users can update their own content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'community-content'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE only allowed when first folder segment equals auth.uid()
CREATE POLICY "Users can delete their own content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-content'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

COMMIT;
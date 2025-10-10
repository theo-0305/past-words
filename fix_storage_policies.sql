-- Fix Storage Bucket RLS Policies for community-content
-- This script addresses the StorageApiError by ensuring consistent user-based access control

-- Drop ALL existing storage policies for the objects table to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view public content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload content" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own content" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own content" ON storage.objects;
DROP POLICY IF EXISTS "Public can view community content" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;

-- Create new storage policies with consistent user-based access control

-- Allow public viewing of content in the community-content bucket
CREATE POLICY "Public can view community content"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-content');

-- Allow authenticated users to upload content to their own folder
-- Files should be uploaded to: community-content/{user_id}/filename
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-content' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own content
CREATE POLICY "Users can update their own content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'community-content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own content
CREATE POLICY "Users can delete their own content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
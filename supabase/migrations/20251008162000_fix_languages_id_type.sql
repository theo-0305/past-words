-- Fix languages table ID type from TEXT to UUID
-- This migration converts the id column from TEXT to UUID type

-- First, we need to handle existing data
-- Create a temporary column to store the UUID values
ALTER TABLE public.languages 
ADD COLUMN new_id UUID DEFAULT gen_random_uuid();

-- Copy existing IDs to new column (for records that have valid UUIDs)
UPDATE public.languages 
SET new_id = id::UUID 
WHERE id IS NOT NULL AND id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Drop existing primary key constraint
ALTER TABLE public.languages DROP CONSTRAINT languages_pkey;

-- Drop the old id column
ALTER TABLE public.languages DROP COLUMN id;

-- Rename new_id to id
ALTER TABLE public.languages RENAME COLUMN new_id TO id;

-- Set id as primary key
ALTER TABLE public.languages ADD PRIMARY KEY (id);

-- Update the default to use gen_random_uuid()
ALTER TABLE public.languages 
ALTER COLUMN id SET DEFAULT gen_random_uuid();
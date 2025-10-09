-- Fix null IDs in languages table before adding constraints
-- This migration assigns UUIDs to existing records with null IDs

-- Update any existing records with null IDs
UPDATE public.languages 
SET id = gen_random_uuid() 
WHERE id IS NULL;

-- Now ensure all records have IDs and add constraints
ALTER TABLE public.languages 
ALTER COLUMN id SET NOT NULL,
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Add primary key constraint
ALTER TABLE public.languages ADD PRIMARY KEY (id);

-- Add unique constraints
ALTER TABLE public.languages 
ADD CONSTRAINT languages_name_key UNIQUE (name),
ADD CONSTRAINT languages_code_key UNIQUE (code);
-- Fix languages table primary key and constraints
-- This migration ensures the languages table has proper primary key and unique constraints

-- First, let's check if we need to add the primary key constraint
DO $$ 
BEGIN
  -- Check if primary key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'languages_pkey' AND conrelid = 'public.languages'::regclass
  ) THEN
    -- Add primary key constraint if it doesn't exist
    EXECUTE 'ALTER TABLE public.languages ADD PRIMARY KEY (id)';
  END IF;
END $$;

-- Ensure the id column has default UUID generation
ALTER TABLE public.languages 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure unique constraints on name and code
DO $$ 
BEGIN
  -- Add unique constraint on name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'languages_name_key' AND conrelid = 'public.languages'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.languages ADD CONSTRAINT languages_name_key UNIQUE (name)';
  END IF;

  -- Add unique constraint on code if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'languages_code_key' AND conrelid = 'public.languages'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.languages ADD CONSTRAINT languages_code_key UNIQUE (code)';
  END IF;
END $$;
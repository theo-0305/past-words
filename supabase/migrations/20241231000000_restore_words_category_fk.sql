-- Restore foreign key constraint between words and categories tables
-- This ensures PostgREST can discover the relationship for embedding

-- Drop existing constraint if it exists (to avoid conflicts)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'words_category_id_fkey'
  ) THEN
    ALTER TABLE public.words
    DROP CONSTRAINT words_category_id_fkey;
  END IF;
END $$;

-- Recreate the foreign key constraint with explicit name
ALTER TABLE public.words
ADD CONSTRAINT words_category_id_fkey
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- Ensure the constraint is properly indexed for performance
CREATE INDEX IF NOT EXISTS idx_words_category_id ON public.words(category_id);
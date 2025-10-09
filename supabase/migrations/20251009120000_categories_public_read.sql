-- Allow public SELECT on categories to support embedded joins from words for anonymous users

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Drop restrictive policy if present
DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;

-- Create public read policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'categories' 
      AND policyname = 'Categories are viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true)';
  END IF;
END $$;

-- Optional grants
GRANT SELECT ON TABLE public.categories TO anon;
GRANT SELECT ON TABLE public.categories TO authenticated;
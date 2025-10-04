-- Update profiles table RLS policy to allow public viewing
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Allow everyone to view profiles (display names are not sensitive)
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);
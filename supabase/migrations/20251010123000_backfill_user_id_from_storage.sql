-- Backfill community_content.user_id from storage URLs and ensure profiles exist
BEGIN;

-- 1) Derive user_id from content_url or thumbnail_url when they point to storage buckets
--    and include the user UUID as the first path segment.
--    Examples: 
--    - https://.../object/public/community-content/<user_uuid>/<timestamp>.ext
--    - https://.../object/public/audio/<user_uuid>/<timestamp>.ext
WITH extracted AS (
  SELECT
    c.id,
    COALESCE(
      substring(c.content_url from '.*/community-content/([0-9a-f\-]{36})/.*'),
      substring(c.thumbnail_url from '.*/community-content/([0-9a-f\-]{36})/.*'),
      substring(c.content_url from '.*/audio/([0-9a-f\-]{36})/.*'),
      substring(c.thumbnail_url from '.*/audio/([0-9a-f\-]{36})/.*')
    ) AS uid_text
  FROM public.community_content c
  WHERE c.user_id IS NULL
    AND (
      c.content_url LIKE '%/community-content/%' OR
      c.thumbnail_url LIKE '%/community-content/%' OR
      c.content_url LIKE '%/audio/%' OR
      c.thumbnail_url LIKE '%/audio/%'
    )
)
UPDATE public.community_content c
SET user_id = extracted.uid_text::uuid
FROM extracted
WHERE c.id = extracted.id
  AND extracted.uid_text IS NOT NULL
  AND extracted.uid_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

-- 2) Ensure a profile exists for any user_id referenced by content or words
INSERT INTO public.profiles (id, display_name)
SELECT DISTINCT c.user_id, NULL
FROM public.community_content c
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = c.user_id);

INSERT INTO public.profiles (id, display_name)
SELECT DISTINCT w.user_id, NULL
FROM public.words w
WHERE w.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = w.user_id);

-- 3) Reload PostgREST schema cache so changes are immediately visible
NOTIFY pgrst, 'reload schema';

COMMIT;
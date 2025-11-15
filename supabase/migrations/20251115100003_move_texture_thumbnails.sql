-- Move texture thumbnails from 'thumbnails' bucket to 'texture-thumbnails' bucket
-- This copies the files to the new bucket without deleting from old, to avoid ruining old thumbnails

CREATE EXTENSION IF NOT EXISTS http;

DO $$
DECLARE
  file_record record;
  file_content bytea;
  supabase_url text := 'https://your-project.supabase.co'; -- Replace with your actual Supabase project URL
BEGIN
  -- Loop over files in 'thumbnails' bucket
  FOR file_record IN SELECT name FROM storage.objects WHERE bucket_id = 'thumbnails'
  LOOP
    -- Get the content using http.get
    SELECT content INTO file_content FROM http.get(supabase_url || '/storage/v1/object/public/thumbnails/' || file_record.name);

    -- Upload to new bucket
    PERFORM storage.upload('texture-thumbnails', file_record.name, file_content);
  END LOOP;
END $$;
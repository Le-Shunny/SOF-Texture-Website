-- Add RLS policies for thumbnail buckets
-- Note: This migration may require running with service role permissions.
-- If it fails with permission error, set policies manually in Supabase Dashboard > Storage.

-- Enable RLS on storage.objects if not already (should be enabled by default)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policies for texture-thumbnails bucket
DROP POLICY IF EXISTS "texture-thumbnails_select" ON storage.objects;
CREATE POLICY "texture-thumbnails_select" ON storage.objects
FOR SELECT USING (bucket_id = 'texture-thumbnails');

DROP POLICY IF EXISTS "texture-thumbnails_insert" ON storage.objects;
CREATE POLICY "texture-thumbnails_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'texture-thumbnails' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "texture-thumbnails_update" ON storage.objects;
CREATE POLICY "texture-thumbnails_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'texture-thumbnails' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "texture-thumbnails_delete" ON storage.objects;
CREATE POLICY "texture-thumbnails_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'texture-thumbnails' AND auth.role() = 'authenticated');

-- Policies for pack-thumbnails bucket
DROP POLICY IF EXISTS "pack-thumbnails_select" ON storage.objects;
CREATE POLICY "pack-thumbnails_select" ON storage.objects
FOR SELECT USING (bucket_id = 'pack-thumbnails');

DROP POLICY IF EXISTS "pack-thumbnails_insert" ON storage.objects;
CREATE POLICY "pack-thumbnails_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'pack-thumbnails' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pack-thumbnails_update" ON storage.objects;
CREATE POLICY "pack-thumbnails_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'pack-thumbnails' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pack-thumbnails_delete" ON storage.objects;
CREATE POLICY "pack-thumbnails_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'pack-thumbnails' AND auth.role() = 'authenticated');

-- Policies for textures bucket (if not already exist)
DROP POLICY IF EXISTS "textures_select" ON storage.objects;
CREATE POLICY "textures_select" ON storage.objects
FOR SELECT USING (bucket_id = 'textures');

DROP POLICY IF EXISTS "textures_insert" ON storage.objects;
CREATE POLICY "textures_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'textures' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "textures_update" ON storage.objects;
CREATE POLICY "textures_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'textures' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "textures_delete" ON storage.objects;
CREATE POLICY "textures_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'textures' AND auth.role() = 'authenticated');
-- Create separate buckets for texture and pack thumbnails
-- Note: After running this migration, set RLS policies in Supabase Dashboard > Storage for the new buckets:
-- - Allow SELECT for all users (public access)
-- - Allow INSERT, UPDATE, DELETE for authenticated users

-- Create texture-thumbnails bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('texture-thumbnails', 'texture-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Create pack-thumbnails bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('pack-thumbnails', 'pack-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure textures bucket exists (if not already)
INSERT INTO storage.buckets (id, name, public)
VALUES ('textures', 'textures', true)
ON CONFLICT (id) DO NOTHING;
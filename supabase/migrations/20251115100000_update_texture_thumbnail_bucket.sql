-- Update texture thumbnail bucket from 'thumbnails' to 'texture-thumbnails'
-- This migration updates the cleanup functions to handle both old and new bucket URLs

-- Update the delete function for texture deletion
CREATE OR REPLACE FUNCTION delete_texture_files_on_texture_delete()
RETURNS TRIGGER AS $$
DECLARE
  texture_path text;
  thumbnail_path text;
  updated_thumbnail_url text;
BEGIN
  -- Handle texture file deletion
  IF OLD.texture_url IS NOT NULL THEN
    texture_path := substring(OLD.texture_url from '/storage/v1/object/public/textures/(.+)$');
    IF texture_path IS NOT NULL THEN
      -- Attempt to delete the texture file (this might fail if the file doesn't exist)
      PERFORM storage.delete('textures', ARRAY[texture_path]);
    END IF;
  END IF;

  -- Handle thumbnail file deletion
  IF OLD.thumbnail_url IS NOT NULL THEN
    -- Normalize the URL to use the new bucket name for extraction
    updated_thumbnail_url := replace(OLD.thumbnail_url, '/thumbnails/', '/texture-thumbnails/');
    thumbnail_path := substring(updated_thumbnail_url from '/storage/v1/object/public/texture-thumbnails/(.+)$');
    IF thumbnail_path IS NOT NULL THEN
      -- Attempt to delete the thumbnail file (this might fail if the file doesn't exist)
      PERFORM storage.delete('texture-thumbnails', ARRAY[thumbnail_path]);
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the delete function for rejected textures
CREATE OR REPLACE FUNCTION delete_texture_files_on_reject()
RETURNS TRIGGER AS $$
DECLARE
  texture_path text;
  thumbnail_path text;
  updated_thumbnail_url text;
BEGIN
  -- Only proceed if the texture is being rejected (status changed to 'rejected')
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    -- Handle texture file deletion
    IF OLD.texture_url IS NOT NULL THEN
      texture_path := substring(OLD.texture_url from '/storage/v1/object/public/textures/(.+)$');
      IF texture_path IS NOT NULL THEN
        -- Attempt to delete the texture file (this might fail if the file doesn't exist)
        PERFORM storage.delete('textures', ARRAY[texture_path]);
      END IF;
    END IF;

    -- Handle thumbnail file deletion
    IF OLD.thumbnail_url IS NOT NULL THEN
      -- Normalize the URL to use the new bucket name for extraction
      updated_thumbnail_url := replace(OLD.thumbnail_url, '/thumbnails/', '/texture-thumbnails/');
      thumbnail_path := substring(updated_thumbnail_url from '/storage/v1/object/public/texture-thumbnails/(.+)$');
      IF thumbnail_path IS NOT NULL THEN
        -- Attempt to delete the thumbnail file (this might fail if the file doesn't exist)
        PERFORM storage.delete('texture-thumbnails', ARRAY[thumbnail_path]);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to document the updated functions
COMMENT ON FUNCTION delete_texture_files_on_texture_delete() IS 'Deletes texture and thumbnail files when a texture record is deleted, handling both old and new thumbnail bucket URLs';
COMMENT ON FUNCTION delete_texture_files_on_reject() IS 'Deletes texture and thumbnail files when a texture is rejected, handling both old and new thumbnail bucket URLs';
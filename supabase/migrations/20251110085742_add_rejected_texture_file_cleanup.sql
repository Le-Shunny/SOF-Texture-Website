-- Migration to add automatic file deletion when textures are rejected
-- This serves as a backup mechanism to ensure files are cleaned up

-- Create a function to delete storage files when a texture is rejected
CREATE OR REPLACE FUNCTION delete_texture_files_on_reject()
RETURNS TRIGGER AS $$
DECLARE
  texture_path text;
  thumbnail_path text;
BEGIN
  -- Only proceed if the texture status changed to 'rejected'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'rejected' THEN
    -- Extract file paths from URLs
    IF OLD.texture_url IS NOT NULL THEN
      texture_path := substring(OLD.texture_url from '/storage/v1/object/public/textures/(.+)$');
      IF texture_path IS NOT NULL THEN
        -- Attempt to delete the texture file (this might fail if the file doesn't exist)
        PERFORM storage.delete('textures', ARRAY[texture_path]);
      END IF;
    END IF;

    IF OLD.thumbnail_url IS NOT NULL THEN
      thumbnail_path := substring(OLD.thumbnail_url from '/storage/v1/object/public/thumbnails/(.+)$');
      IF thumbnail_path IS NOT NULL THEN
        -- Attempt to delete the thumbnail file (this might fail if the file doesn't exist)
        PERFORM storage.delete('thumbnails', ARRAY[thumbnail_path]);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically delete files when texture status changes to rejected
DROP TRIGGER IF EXISTS auto_delete_files_on_reject ON textures;
CREATE TRIGGER auto_delete_files_on_reject
  AFTER UPDATE ON textures
  FOR EACH ROW EXECUTE FUNCTION delete_texture_files_on_reject();

-- Add comments to document the trigger
COMMENT ON FUNCTION delete_texture_files_on_reject() IS
  'Automatically deletes associated storage files when a texture status is changed to rejected. This serves as a backup mechanism to ensure file cleanup.';

COMMENT ON TRIGGER auto_delete_files_on_reject ON textures IS
  'Trigger that automatically deletes texture and thumbnail files from storage when a texture status is updated to rejected.';
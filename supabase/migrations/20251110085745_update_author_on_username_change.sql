-- Create a function to update author when username changes
CREATE OR REPLACE FUNCTION update_texture_author_on_username_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all textures where user_id matches the updated profile
  UPDATE textures
  SET author = NEW.username
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on profiles table
CREATE TRIGGER trigger_update_texture_author
  AFTER UPDATE OF username ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_texture_author_on_username_change();
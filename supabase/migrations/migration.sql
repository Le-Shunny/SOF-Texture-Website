/*
  # Texture Sharing Platform Schema

  ## Overview
  Complete database schema for a community texture sharing platform with user accounts, 
  texture uploads, comments, voting, and admin moderation system.

  ## New Tables

  ### 1. `profiles`
  Extends auth.users with additional profile information
  - `id` (uuid, references auth.users) - Primary key
  - `username` (text, unique) - Display name for the user
  - `rank` (text) - User rank: 'admin', 'trusted', 'regular'
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### 2. `textures`
  Stores all texture uploads and metadata
  - `id` (uuid) - Primary key
  - `user_id` (uuid, references profiles) - Uploader
  - `title` (text) - Texture title
  - `description` (text) - Texture description
  - `author` (text) - Author name (from profile)
  - `texture_url` (text) - Supabase storage URL for texture file
  - `thumbnail_url` (text) - Supabase storage URL for thumbnail
  - `status` (text) - Approval status: 'pending', 'approved', 'rejected'
  - `upvotes` (integer) - Number of upvotes
  - `downvotes` (integer) - Number of downvotes
  - `created_at` (timestamptz) - Upload timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. `texture_votes`
  Stores user votes on textures
  - `id` (uuid) - Primary key
  - `texture_id` (uuid, references textures) - Voted texture
  - `user_id` (uuid, references profiles) - Voter
  - `vote_type` (text) - 'upvote' or 'downvote'
  - `created_at` (timestamptz) - Vote timestamp

  ### 4. `texture_comments`
  Stores comments on textures
  - `id` (uuid) - Primary key
  - `texture_id` (uuid, references textures) - Commented texture
  - `user_id` (uuid, references profiles) - Commenter
  - `content` (text) - Comment text
  - `created_at` (timestamptz) - Comment timestamp
  - `updated_at` (timestamptz) - Last edit timestamp

  ### 5. `reports`
  Stores user reports about textures
  - `id` (uuid) - Primary key
  - `texture_id` (uuid, references textures) - Reported texture
  - `reporter_id` (uuid, references profiles) - Reporter
  - `category` (text) - Report category
  - `reason` (text) - Report reason
  - `created_at` (timestamptz) - Report timestamp

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies ensure users can only access their own data or public data
  - Admins have full access
  - Authentication required for mutations

  ## Indexes
  - Primary keys on all tables
  - Foreign key indexes
  - Status and timestamp indexes for performance
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  rank text NOT NULL DEFAULT 'regular' CHECK (rank IN ('admin', 'trusted', 'regular')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create textures table
CREATE TABLE textures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  author text NOT NULL,
  texture_url text NOT NULL,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create texture_votes table
CREATE TABLE texture_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texture_id uuid NOT NULL REFERENCES textures(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(texture_id, user_id)
);

-- Create texture_comments table
CREATE TABLE texture_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texture_id uuid NOT NULL REFERENCES textures(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reports table
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texture_id uuid NOT NULL REFERENCES textures(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('inappropriate_content', 'theft', 'other')),
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE textures ENABLE ROW LEVEL SECURITY;
ALTER TABLE texture_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE texture_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Textures policies
CREATE POLICY "Textures are viewable by everyone" ON textures
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert textures" ON textures
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update their own textures" ON textures
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own textures" ON textures
  FOR DELETE USING (auth.uid() = user_id);

-- Texture votes policies
CREATE POLICY "Texture votes are viewable by everyone" ON texture_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert votes" ON texture_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON texture_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON texture_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Texture comments policies
CREATE POLICY "Texture comments are viewable by everyone" ON texture_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" ON texture_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON texture_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON texture_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Reports policies
CREATE POLICY "Reports are viewable by admins" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert reports" ON reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- Create indexes
CREATE INDEX idx_textures_user_id ON textures(user_id);
CREATE INDEX idx_textures_status ON textures(status);
CREATE INDEX idx_textures_created_at ON textures(created_at DESC);
CREATE INDEX idx_texture_votes_texture_id ON texture_votes(texture_id);
CREATE INDEX idx_texture_votes_user_id ON texture_votes(user_id);
CREATE INDEX idx_texture_comments_texture_id ON texture_comments(texture_id);
CREATE INDEX idx_texture_comments_user_id ON texture_comments(user_id);
CREATE INDEX idx_texture_comments_created_at ON texture_comments(created_at DESC);
CREATE INDEX idx_reports_texture_id ON reports(texture_id);
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Create functions for vote counting
CREATE OR REPLACE FUNCTION update_texture_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'upvote' THEN
      UPDATE textures SET upvotes = upvotes + 1 WHERE id = NEW.texture_id;
    ELSE
      UPDATE textures SET downvotes = downvotes + 1 WHERE id = NEW.texture_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'upvote' AND NEW.vote_type = 'downvote' THEN
      UPDATE textures SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.texture_id;
    ELSIF OLD.vote_type = 'downvote' AND NEW.vote_type = 'upvote' THEN
      UPDATE textures SET downvotes = downvotes - 1, upvotes = upvotes + 1 WHERE id = NEW.texture_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE textures SET upvotes = upvotes - 1 WHERE id = OLD.texture_id;
    ELSE
      UPDATE textures SET downvotes = downvotes - 1 WHERE id = OLD.texture_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for vote counting
CREATE TRIGGER trigger_update_texture_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON texture_votes
  FOR EACH ROW EXECUTE FUNCTION update_texture_vote_counts();

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_textures_updated_at BEFORE UPDATE ON textures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_texture_comments_updated_at BEFORE UPDATE ON texture_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pack_comments_updated_at BEFORE UPDATE ON pack_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration to add automatic file deletion when textures are deleted
-- This serves as a backup mechanism to ensure files are cleaned up

-- Create a function to delete storage files when a texture is deleted
CREATE OR REPLACE FUNCTION delete_texture_files_on_texture_delete()
RETURNS TRIGGER AS $$
DECLARE
  texture_path text;
  thumbnail_path text;
BEGIN
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

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on textures table
CREATE TRIGGER trigger_delete_texture_files_on_delete
  AFTER DELETE ON textures
  FOR EACH ROW EXECUTE FUNCTION delete_texture_files_on_texture_delete();

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
$$ LANGUAGE plpgsql;

-- Create trigger on textures table
CREATE TRIGGER trigger_delete_texture_files_on_reject
  AFTER UPDATE ON textures
  FOR EACH ROW EXECUTE FUNCTION delete_texture_files_on_reject();

/*
  # Reports Table Migration

  ## Overview
  Creates the reports table for users to report inappropriate textures.
  Admins can review and manage these reports through the admin panel.

  ## New Table

  ### `reports`
  Stores user reports about textures
  - `id` (uuid) - Primary key
  - `texture_id` (uuid) - References textures being reported
  - `reporter_id` (uuid, nullable) - References profiles, null if reporter account deleted
  - `category` (text) - Report category: 'inappropriate_content', 'theft', 'other'
  - `reason` (text) - Detailed explanation of the report
  - `created_at` (timestamptz) - Report submission timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - RLS enabled
  - Only admins can view reports
  - Authenticated users can create reports
*/

-- The reports table is already created in the main schema, but let's ensure it has the correct structure
-- Add updated_at column if it doesn't exist
ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger for updated_at on reports
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add status column to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed'));

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Update comment to reflect status field
COMMENT ON COLUMN reports.status IS 'Report status: pending (awaiting review) or dismissed (no action needed)';

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

-- Update rank from 'certified_maker' to 'trusted' in profiles table
-- and update the check constraint accordingly

-- First, update existing data
UPDATE profiles SET rank = 'trusted' WHERE rank = 'certified_maker';

-- Drop the old check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_rank_check;

-- Add the new check constraint
ALTER TABLE profiles ADD CONSTRAINT profiles_rank_check CHECK (rank IN ('admin', 'trusted', 'regular'));

-- Add download_count column to textures table
ALTER TABLE textures ADD COLUMN download_count integer DEFAULT 0;

-- Create packs table
CREATE TABLE IF NOT EXISTS packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  author text NOT NULL,
  thumbnail_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pack_textures table for many-to-many relation
CREATE TABLE IF NOT EXISTS pack_textures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  texture_id uuid NOT NULL REFERENCES textures(id) ON DELETE CASCADE,
  UNIQUE(pack_id, texture_id)
);

-- Enable RLS on packs and pack_textures
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_textures ENABLE ROW LEVEL SECURITY;

-- Packs policies
CREATE POLICY "Packs are viewable by everyone" ON packs
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert packs" ON packs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update their own packs" ON packs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own packs" ON packs
  FOR DELETE USING (auth.uid() = user_id);

-- Pack textures policies
CREATE POLICY "Pack textures are viewable by everyone" ON pack_textures
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert pack textures" ON pack_textures
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update their own pack textures" ON pack_textures
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM packs
      WHERE packs.id = pack_textures.pack_id
      AND packs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own pack textures" ON pack_textures
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM packs
      WHERE packs.id = pack_textures.pack_id
      AND packs.user_id = auth.uid()
    )
  );

-- Create indexes for packs
CREATE INDEX idx_packs_user_id ON packs(user_id);
CREATE INDEX idx_packs_status ON packs(status);
CREATE INDEX idx_packs_created_at ON packs(created_at DESC);
CREATE INDEX idx_pack_textures_pack_id ON pack_textures(pack_id);
CREATE INDEX idx_pack_textures_texture_id ON pack_textures(texture_id);

-- Create pack_votes table
CREATE TABLE IF NOT EXISTS pack_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(pack_id, user_id)
);

-- Enable RLS on pack_votes
ALTER TABLE pack_votes ENABLE ROW LEVEL SECURITY;

-- Pack votes policies
CREATE POLICY "Pack votes are viewable by everyone" ON pack_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert votes" ON pack_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON pack_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON pack_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Create function for pack vote counting
CREATE OR REPLACE FUNCTION update_pack_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'upvote' THEN
      UPDATE packs SET upvotes = upvotes + 1 WHERE id = NEW.pack_id;
    ELSE
      UPDATE packs SET downvotes = downvotes + 1 WHERE id = NEW.pack_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'upvote' AND NEW.vote_type = 'downvote' THEN
      UPDATE packs SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.pack_id;
    ELSIF OLD.vote_type = 'downvote' AND NEW.vote_type = 'upvote' THEN
      UPDATE packs SET downvotes = downvotes - 1, upvotes = upvotes + 1 WHERE id = NEW.pack_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE packs SET upvotes = upvotes - 1 WHERE id = OLD.pack_id;
    ELSE
      UPDATE packs SET downvotes = downvotes - 1 WHERE id = OLD.pack_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for pack vote counting
CREATE TRIGGER trigger_update_pack_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON pack_votes
  FOR EACH ROW EXECUTE FUNCTION update_pack_vote_counts();

-- Add texture_ids column to packs table
ALTER TABLE packs ADD COLUMN IF NOT EXISTS texture_ids uuid[] DEFAULT '{}';

-- Populate texture_ids from pack_textures for existing packs
UPDATE packs
SET texture_ids = (
  SELECT array_agg(texture_id ORDER BY texture_id)
  FROM pack_textures
  WHERE pack_textures.pack_id = packs.id
)
WHERE EXISTS (
  SELECT 1 FROM pack_textures WHERE pack_textures.pack_id = packs.id
);

-- Drop pack_textures table and its policies
DROP TABLE IF EXISTS pack_textures CASCADE;

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

  -- Handle thumbnail file deletion (support both old and new bucket)
  IF OLD.thumbnail_url IS NOT NULL THEN
    -- Try new bucket first
    thumbnail_path := substring(OLD.thumbnail_url from '/storage/v1/object/public/texture-thumbnails/(.+)$');
    IF thumbnail_path IS NOT NULL THEN
      PERFORM storage.delete('texture-thumbnails', ARRAY[thumbnail_path]);
    ELSE
      -- Try old bucket
      thumbnail_path := substring(OLD.thumbnail_url from '/storage/v1/object/public/thumbnails/(.+)$');
      IF thumbnail_path IS NOT NULL THEN
        PERFORM storage.delete('thumbnails', ARRAY[thumbnail_path]);
      END IF;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Update the reject function for texture rejection
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
      -- Try new bucket first
      thumbnail_path := substring(OLD.thumbnail_url from '/storage/v1/object/public/texture-thumbnails/(.+)$');
      IF thumbnail_path IS NOT NULL THEN
        PERFORM storage.delete('texture-thumbnails', ARRAY[thumbnail_path]);
      ELSE
        -- Try old bucket
        thumbnail_path := substring(OLD.thumbnail_url from '/storage/v1/object/public/thumbnails/(.+)$');
        IF thumbnail_path IS NOT NULL THEN
          PERFORM storage.delete('thumbnails', ARRAY[thumbnail_path]);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Create pack_reports table for users to report inappropriate packs.
-- Similar to reports table but for packs.

CREATE TABLE IF NOT EXISTS pack_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('inappropriate_content', 'theft', 'other')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for pack_comments
CREATE INDEX IF NOT EXISTS idx_pack_comments_pack_id ON pack_comments(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_comments_user_id ON pack_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_pack_comments_created_at ON pack_comments(created_at DESC);

-- Create indexes for pack_reports
CREATE INDEX IF NOT EXISTS idx_pack_reports_pack_id ON pack_reports(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_reports_reporter_id ON pack_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_pack_reports_created_at ON pack_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pack_reports_status ON pack_reports(status);

-- Enable RLS on pack_reports
ALTER TABLE pack_reports ENABLE ROW LEVEL SECURITY;

-- Pack reports policies
CREATE POLICY "Pack reports are viewable by admins" ON pack_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert pack reports" ON pack_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- Add trigger to update pack vote counts
CREATE OR REPLACE FUNCTION update_pack_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'upvote' THEN
      UPDATE packs SET upvotes = upvotes + 1 WHERE id = NEW.pack_id;
    ELSE
      UPDATE packs SET downvotes = downvotes + 1 WHERE id = NEW.pack_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'upvote' AND NEW.vote_type = 'downvote' THEN
      UPDATE packs SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.pack_id;
    ELSIF OLD.vote_type = 'downvote' AND NEW.vote_type = 'upvote' THEN
      UPDATE packs SET downvotes = downvotes - 1, upvotes = upvotes + 1 WHERE id = NEW.pack_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE packs SET upvotes = upvotes - 1 WHERE id = OLD.pack_id;
    ELSE
      UPDATE packs SET downvotes = downvotes - 1 WHERE id = OLD.pack_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid duplicate error
DROP TRIGGER IF EXISTS trigger_update_pack_vote_counts ON pack_votes;

-- Create trigger for pack vote counting
CREATE TRIGGER trigger_update_pack_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON pack_votes
  FOR EACH ROW EXECUTE FUNCTION update_pack_vote_counts();

-- Add RLS policies for pack_votes table
-- Enable RLS if not already enabled
ALTER TABLE pack_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Pack votes are viewable by everyone" ON pack_votes;
DROP POLICY IF EXISTS "Authenticated users can insert votes" ON pack_votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON pack_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON pack_votes;

-- Create policies
CREATE POLICY "Pack votes are viewable by everyone"
  ON pack_votes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert votes"
  ON pack_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON pack_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON pack_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
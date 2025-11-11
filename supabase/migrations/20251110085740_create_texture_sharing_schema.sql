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
  - `rank` (text) - User rank: 'admin', 'certified_maker', 'regular'
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### 2. `textures`
  Stores all texture uploads and metadata
  - `id` (uuid) - Primary key
  - `user_id` (uuid, nullable) - References profiles, null for guest uploads
  - `title` (text) - Texture name/title
  - `description` (text) - Detailed description
  - `author` (text) - Author name (username or custom for guests)
  - `aircraft` (text) - Which aircraft the texture is for
  - `category` (text) - Texture category
  - `texture_type` (text) - Type of texture
  - `texture_url` (text) - Storage path for main texture file
  - `thumbnail_url` (text) - Storage path for thumbnail
  - `status` (text) - 'pending', 'approved', 'rejected'
  - `upvotes` (integer) - Total upvotes count
  - `downvotes` (integer) - Total downvotes count
  - `created_at` (timestamptz) - Upload timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. `comments`
  User comments on textures
  - `id` (uuid) - Primary key
  - `texture_id` (uuid) - References textures
  - `user_id` (uuid, nullable) - References profiles
  - `author_name` (text) - Display name for comment author
  - `content` (text) - Comment text
  - `created_at` (timestamptz) - Comment timestamp
  - `updated_at` (timestamptz) - Last edit timestamp

  ### 4. `votes`
  Track individual user votes on textures
  - `id` (uuid) - Primary key
  - `texture_id` (uuid) - References textures
  - `user_id` (uuid) - References profiles
  - `vote_type` (text) - 'upvote' or 'downvote'
  - `created_at` (timestamptz) - Vote timestamp
  - Unique constraint on (texture_id, user_id)

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with appropriate policies:

  #### profiles table
  - Users can view all profiles
  - Users can update only their own profile
  - Admins can update any profile (for rank assignment)

  #### textures table
  - Everyone can view approved textures
  - Authenticated users can view their own pending textures
  - Admins can view all textures
  - Authenticated users can insert textures
  - Texture owners and admins can update textures
  - Admins can delete textures

  #### comments table
  - Everyone can view comments on approved textures
  - Authenticated users can create comments
  - Comment authors can update their own comments
  - Comment authors and admins can delete comments

  #### votes table
  - Users can view all votes
  - Authenticated users can insert their own votes
  - Users can update/delete only their own votes

  ## Important Notes
  - Guest uploads (user_id is null) automatically set status to 'pending'
  - Certified makers and admins have auto-approved textures via application logic
  - Vote counts are denormalized in textures table for performance
  - All timestamps use timestamptz for proper timezone handling
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  rank text NOT NULL DEFAULT 'regular' CHECK (rank IN ('admin', 'certified_maker', 'regular')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create textures table
CREATE TABLE IF NOT EXISTS textures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  author text NOT NULL,
  aircraft text NOT NULL,
  category text NOT NULL,
  texture_type text NOT NULL,
  texture_url text NOT NULL,
  thumbnail_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  upvotes integer DEFAULT 0,
  downvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texture_id uuid NOT NULL REFERENCES textures(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texture_id uuid NOT NULL REFERENCES textures(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(texture_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_textures_status ON textures(status);
CREATE INDEX IF NOT EXISTS idx_textures_user_id ON textures(user_id);
CREATE INDEX IF NOT EXISTS idx_textures_created_at ON textures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_texture_id ON comments(texture_id);
CREATE INDEX IF NOT EXISTS idx_votes_texture_id ON votes(texture_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE textures ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Textures policies
CREATE POLICY "Anyone can view approved textures"
  ON textures FOR SELECT
  TO authenticated, anon
  USING (status = 'approved');

CREATE POLICY "Users can view own pending textures"
  ON textures FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all textures"
  ON textures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert textures"
  ON textures FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Guests can insert textures"
  ON textures FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Texture owners can update own textures"
  ON textures FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any texture"
  ON textures FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

CREATE POLICY "Admins can delete textures"
  ON textures FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

-- Comments policies
CREATE POLICY "Anyone can view comments on approved textures"
  ON comments FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM textures
      WHERE textures.id = comments.texture_id
      AND textures.status = 'approved'
    )
  );

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Comment authors can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Comment authors can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment"
  ON comments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

-- Votes policies
CREATE POLICY "Anyone can view votes"
  ON votes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert votes"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, rank)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'regular'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update vote counts
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update vote counts
DROP TRIGGER IF EXISTS vote_count_trigger ON votes;
CREATE TRIGGER vote_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_texture_vote_counts();

-- Insert placeholder accounts (admin, certified maker, regular member)
-- Note: These will be linked to actual auth.users when they register
-- The admin will need to manually assign ranks after registration
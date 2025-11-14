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

-- Create pack_comments table
CREATE TABLE IF NOT EXISTS pack_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pack_votes table
CREATE TABLE IF NOT EXISTS pack_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  UNIQUE(pack_id, user_id)
);

-- Enable RLS
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_textures ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_votes ENABLE ROW LEVEL SECURITY;

-- Policies for packs
CREATE POLICY "Public packs are viewable by everyone" ON packs FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can insert their own packs" ON packs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own packs" ON packs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own packs" ON packs FOR DELETE USING (auth.uid() = user_id);

-- Policies for pack_textures
CREATE POLICY "Pack textures are viewable by everyone" ON pack_textures FOR SELECT USING (true);
CREATE POLICY "Users can insert textures to their own packs" ON pack_textures FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM packs WHERE id = pack_id AND user_id = auth.uid()));
CREATE POLICY "Users can update textures in their own packs" ON pack_textures FOR UPDATE USING (EXISTS (SELECT 1 FROM packs WHERE id = pack_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete textures from their own packs" ON pack_textures FOR DELETE USING (EXISTS (SELECT 1 FROM packs WHERE id = pack_id AND user_id = auth.uid()));

-- Policies for pack_comments
CREATE POLICY "Pack comments are viewable by everyone" ON pack_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON pack_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON pack_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON pack_comments FOR DELETE USING (auth.uid() = user_id);

-- Policies for pack_votes
CREATE POLICY "Pack votes are viewable by everyone" ON pack_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert votes" ON pack_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own votes" ON pack_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own votes" ON pack_votes FOR DELETE USING (auth.uid() = user_id);
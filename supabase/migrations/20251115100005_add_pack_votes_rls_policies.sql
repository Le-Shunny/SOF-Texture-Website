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
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON pack_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
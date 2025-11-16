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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update pack vote counts
DROP TRIGGER IF EXISTS pack_vote_count_trigger ON pack_votes;
CREATE TRIGGER pack_vote_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON pack_votes
  FOR EACH ROW EXECUTE FUNCTION update_pack_vote_counts();
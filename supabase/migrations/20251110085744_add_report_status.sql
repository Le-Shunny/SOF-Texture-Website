-- Add status column to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed'));

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Update comment to reflect status field
COMMENT ON COLUMN reports.status IS 'Report status: pending (awaiting review) or dismissed (no action needed)';

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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pack_reports_pack_id ON pack_reports(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_reports_reporter_id ON pack_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_pack_reports_created_at ON pack_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pack_reports_status ON pack_reports(status);

-- Enable Row Level Security
ALTER TABLE pack_reports ENABLE ROW LEVEL SECURITY;

-- Admins can view all pack reports
CREATE POLICY "Admins can view all pack reports"
  ON pack_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

-- Users can view their own pack reports
CREATE POLICY "Users can view their own pack reports"
  ON pack_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Authenticated users can create pack reports
CREATE POLICY "Authenticated users can create pack reports"
  ON pack_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Admins can update pack reports (to change status)
CREATE POLICY "Admins can update pack reports"
  ON pack_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

-- Admins can delete pack reports
CREATE POLICY "Admins can delete pack reports"
  ON pack_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

-- Add comments to document the table
COMMENT ON TABLE pack_reports IS 'Stores user reports about packs for admin review and moderation';
COMMENT ON COLUMN pack_reports.pack_id IS 'References packs being reported';
COMMENT ON COLUMN pack_reports.reporter_id IS 'References profiles, null if reporter account deleted';
COMMENT ON COLUMN pack_reports.category IS 'Type of report: inappropriate_content, theft, or other';
COMMENT ON COLUMN pack_reports.reason IS 'Detailed explanation of the report';
COMMENT ON COLUMN pack_reports.status IS 'Report status: pending (awaiting review) or dismissed (no action needed)';

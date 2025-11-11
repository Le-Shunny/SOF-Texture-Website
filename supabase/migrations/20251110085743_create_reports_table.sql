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

  ### Row Level Security (RLS)
  - Admins can view all reports
  - Users can view their own reports
  - Authenticated users can create reports
  - Only admins can update/delete reports
*/

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texture_id uuid NOT NULL REFERENCES textures(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('inappropriate_content', 'theft', 'other')),
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reports_texture_id ON reports(texture_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Reports policies

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Admins can update reports (to change status)
CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
  ON reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rank = 'admin'
    )
  );

-- Add comments to document the table
COMMENT ON TABLE reports IS 'Stores user reports about textures for admin review and moderation';
COMMENT ON COLUMN reports.category IS 'Type of report: inappropriate_content, theft, or other';

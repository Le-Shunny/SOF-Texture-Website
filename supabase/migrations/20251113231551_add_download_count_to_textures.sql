-- Add download_count column to textures table
ALTER TABLE textures ADD COLUMN download_count integer DEFAULT 0;
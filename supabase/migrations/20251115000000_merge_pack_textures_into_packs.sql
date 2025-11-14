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

-- Update RLS policies for packs to allow texture_ids access
-- The existing policies should work, but we can add a policy for texture_ids if needed
-- Since texture_ids is part of packs, existing policies cover it

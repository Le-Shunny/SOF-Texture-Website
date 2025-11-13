-- Update rank from 'certified_maker' to 'trusted' in profiles table
-- and update the check constraint accordingly

-- First, update existing data
UPDATE profiles SET rank = 'trusted' WHERE rank = 'certified_maker';

-- Drop the old check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_rank_check;

-- Add the new check constraint
ALTER TABLE profiles ADD CONSTRAINT profiles_rank_check CHECK (rank IN ('admin', 'trusted', 'regular'));
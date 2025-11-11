import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRank = 'admin' | 'certified_maker' | 'regular';

export interface Profile {
  id: string;
  username: string;
  rank: UserRank;
  created_at: string;
  updated_at: string;
}

export interface Texture {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  author: string;
  aircraft: string;
  category: string;
  texture_type: string;
  texture_url: string;
  thumbnail_url: string;
  status: 'pending' | 'approved' | 'rejected';
  upvotes: number;
  downvotes: number;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  texture_id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  texture_id: string;
  user_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
}

export interface Report {
  id: string;
  texture_id: string;
  reporter_id: string | null;
  category: 'inappropriate_content' | 'theft' | 'other';
  reason: string;
  status: 'pending' | 'dismissed';
  created_at: string;
  updated_at: string;
}

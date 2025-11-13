import { useState, useEffect } from 'react';
import { supabase, Texture } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

interface ProfileViewProps {
  username: string;
  onNavigate: (page: string) => void;
  onViewTexture: (texture: Texture) => void;
}

export default function ProfileView({ username, onNavigate, onViewTexture }: ProfileViewProps) {
  const { profile } = useAuth();
  const [textures, setTextures] = useState<Texture[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<string>('regular');

  useEffect(() => {
    fetchUserTextures();
  }, [username]);

  const fetchUserTextures = async () => {
    setLoading(true);

    // First, get the user profile to get rank
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('rank')
      .eq('username', username)
      .single();

    if (!profileError && userProfile) {
      setUserRank(userProfile.rank);
    }

    // Then get textures
    const { data, error } = await supabase
      .from('textures')
      .select('*')
      .eq('author', username)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTextures(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => onNavigate('browse')}
        className="flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Browse
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{username}'s Profile</h1>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Account Status:</span>
          {userRank === 'admin' && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded">Admin</span>
          )}
          {userRank === 'certified_maker' && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded">Trusted</span>
          )}
          {userRank === 'regular' && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">Regular</span>
          )}
        </div>
      </div>

      {textures.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No textures uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {textures.map((texture) => (
            <div
              key={texture.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
              onClick={() => onViewTexture(texture)}
            >
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-48 flex-shrink-0 p-4">
                  <div className="aspect-[3/2] w-full">
                    <img
                      src={texture.thumbnail_url}
                      alt={texture.title}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                </div>

                <div className="flex-1 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-lg mb-1">{texture.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">by {texture.author}</p>

                      {texture.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {texture.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {texture.aircraft}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {texture.category}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          {texture.texture_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
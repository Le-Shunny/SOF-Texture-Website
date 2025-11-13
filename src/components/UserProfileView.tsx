import { useState, useEffect } from 'react';
import { supabase, Texture } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';

interface UserProfileViewProps {
  onClose: () => void;
  onViewTexture: (texture: Texture) => void;
}

export default function UserProfileView({ onClose, onViewTexture }: UserProfileViewProps) {
  const { profile } = useAuth();
  const [textures, setTextures] = useState<Texture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.username) {
      fetchUserTextures();
    }
  }, [profile?.username]);

  const fetchUserTextures = async () => {
    if (!profile?.username) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('textures')
      .select('*')
      .eq('author', profile.username)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTextures(data);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">{profile?.username}'s Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Account Status:</span>
              {profile?.rank === 'admin' && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded">Admin</span>
              )}
              {profile?.rank === 'certified_maker' && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded">Trusted</span>
              )}
              {profile?.rank === 'regular' && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">Regular</span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-gray-500">Loading textures...</div>
            </div>
          ) : textures.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No textures uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {textures.map((texture) => (
                <div
                  key={texture.id}
                  className="bg-gray-50 rounded-lg overflow-hidden hover:bg-gray-100 transition cursor-pointer"
                  onClick={() => {
                    onClose();
                    onViewTexture(texture);
                  }}
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-32 flex-shrink-0 p-3">
                      <div className="aspect-[3/2] w-full">
                        <img
                          src={texture.thumbnail_url}
                          alt={texture.title}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    </div>

                    <div className="flex-1 p-3">
                      <h3 className="font-semibold text-gray-800 text-sm mb-1">{texture.title}</h3>
                      <p className="text-xs text-gray-600 mb-2">by {texture.author}</p>

                      {texture.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {texture.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          {texture.aircraft}
                        </span>
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          {texture.category}
                        </span>
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                          {texture.texture_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
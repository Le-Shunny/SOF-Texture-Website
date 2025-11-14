import { useState, useEffect } from 'react';
import { supabase, Texture } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Package } from 'lucide-react';

export default function CreatePack() {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [selectedTextures, setSelectedTextures] = useState<Texture[]>([]);
  const [availableTextures, setAvailableTextures] = useState<Texture[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserTextures();
    }
  }, [user]);

  const fetchUserTextures = async () => {
    const { data, error } = await supabase
      .from('textures')
      .select('*')
      .eq('user_id', user!.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAvailableTextures(data);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = () => setThumbnailPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleTextureSelection = (texture: Texture) => {
    setSelectedTextures(prev =>
      prev.find(t => t.id === texture.id)
        ? prev.filter(t => t.id !== texture.id)
        : [...prev, texture]
    );
  };

  const uploadThumbnail = async (): Promise<string | null> => {
    if (!thumbnailFile || !user) return null;

    const fileExt = thumbnailFile.name.split('.').pop();
    const fileName = `${user.id}/pack-thumbnails/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('textures')
      .upload(fileName, thumbnailFile);

    if (error) {
      console.error('Error uploading thumbnail:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('textures')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || selectedTextures.length === 0) return;

    setLoading(true);
    try {
      const thumbnailUrl = await uploadThumbnail();
      if (!thumbnailUrl) {
        alert('Failed to upload thumbnail');
        setLoading(false);
        return;
      }

      const { data: packData, error: packError } = await supabase
        .from('packs')
        .insert({
          user_id: user.id,
          title,
          description,
          author: profile.username,
          thumbnail_url: thumbnailUrl,
        })
        .select()
        .single();

      if (packError) throw packError;

      const packTexturesData = selectedTextures.map(texture => ({
        pack_id: packData.id,
        texture_id: texture.id,
      }));

      const { error: texturesError } = await supabase
        .from('pack_textures')
        .insert(packTexturesData);

      if (texturesError) throw texturesError;

      alert('Pack created successfully!');
      // Reset form
      setTitle('');
      setDescription('');
      setThumbnailFile(null);
      setThumbnailPreview('');
      setSelectedTextures([]);
    } catch (error) {
      console.error('Error creating pack:', error);
      alert('Failed to create pack');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center">
          <Package className="w-6 h-6 mr-2" />
          Create Pack
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pack Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thumbnail *
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="hidden"
                id="thumbnail-upload"
                required
              />
              <label
                htmlFor="thumbnail-upload"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Thumbnail
              </label>
              {thumbnailPreview && (
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="w-16 h-16 object-cover rounded"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Textures (at least 1) *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {availableTextures.map((texture) => (
                <div
                  key={texture.id}
                  className={`border rounded-lg p-3 cursor-pointer transition ${
                    selectedTextures.find(t => t.id === texture.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => toggleTextureSelection(texture)}
                >
                  <img
                    src={texture.thumbnail_url}
                    alt={texture.title}
                    className="w-full h-24 object-cover rounded mb-2"
                  />
                  <h3 className="font-medium text-sm">{texture.title}</h3>
                  <p className="text-xs text-gray-600">{texture.aircraft} - {texture.category}</p>
                  {selectedTextures.find(t => t.id === texture.id) && (
                    <div className="mt-2 text-blue-600 text-xs font-medium">Selected</div>
                  )}
                </div>
              ))}
            </div>
            {availableTextures.length === 0 && (
              <p className="text-gray-500">No approved textures found. Upload some textures first.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || selectedTextures.length === 0 || !title || !thumbnailFile}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Pack...' : 'Create Pack'}
          </button>
        </form>
      </div>
    </div>
  );
}
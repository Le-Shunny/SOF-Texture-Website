import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Texture } from '../lib/supabase';
import { deleteTextureFiles } from '../lib/storageUtils';

const AIRCRAFT_OPTIONS = [
  'Defiant',
  'Gladiator',
  'Hurricane',
  'Spitfire',
  'Whirlwind',
  'Blenheim',
  'Swordfish',
  'Bf-109 E',
  'Bf-109 F/V',
  'Bf-110',
  'Me-262',
  'He-111',
  'Ju-87',
  'Ju-88',
  'D.520',
  'H-75',
  'M.S.406',
  'Other/Modded Aircraft',
];

const CATEGORY_OPTIONS = [
  'Battle of Britain/France',
  'Historical',
  'Semi-historical',
  'Non-historical',
  'Captured',
  'Meme',
  'Other',
];

const TEXTURE_TYPE_OPTIONS = [
  'Simple Texture',
  'Detailed Texture',
  'Detailed and Weathered Texture',
  'Other',
];

interface EditTextureProps {
  texture: Texture;
  onClose: () => void;
  onUpdate: (updatedTexture: Texture) => void;
}

export default function EditTexture({ texture, onClose, onUpdate }: EditTextureProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState(texture.title);
  const [description, setDescription] = useState(texture.description);
  const [author, setAuthor] = useState(texture.author);
  const [aircraft, setAircraft] = useState(texture.aircraft);
  const [category, setCategory] = useState(texture.category);
  const [textureType, setTextureType] = useState(texture.texture_type);

  // File states
  const [textureFile, setTextureFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  // Original URLs for deletion
  const [originalTextureUrl, setOriginalTextureUrl] = useState(texture.texture_url);
  const [originalThumbnailUrl, setOriginalThumbnailUrl] = useState(texture.thumbnail_url);

  useEffect(() => {
    if (!user) {
      setError('You must be logged in to edit textures');
      return;
    }
    if (texture.user_id !== user.id) {
      setError('You can only edit your own textures');
      return;
    }
  }, [user, texture]);

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      let newTextureUrl = texture.texture_url;
      let newThumbnailUrl = texture.thumbnail_url;

      // Upload new files if provided
      if (textureFile) {
        newTextureUrl = await uploadFile(textureFile, 'textures');
      }
      if (thumbnailFile) {
        newThumbnailUrl = await uploadFile(thumbnailFile, 'thumbnails');
      }

      // Update texture in database
      const { data, error: updateError } = await supabase
        .from('textures')
        .update({
          title,
          description,
          author,
          aircraft,
          category,
          texture_type: textureType,
          texture_url: newTextureUrl,
          thumbnail_url: newThumbnailUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', texture.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Delete old files if new ones were uploaded
      if (textureFile && originalTextureUrl !== newTextureUrl) {
        await deleteTextureFiles(originalTextureUrl, ''); // Only delete texture file
      }
      if (thumbnailFile && originalThumbnailUrl !== newThumbnailUrl) {
        await deleteTextureFiles('', originalThumbnailUrl); // Only delete thumbnail file
      }

      setSuccess(true);
      onUpdate(data);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error updating texture:', err);
      setError(err.message || 'Failed to update texture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg max-h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Edit Texture</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          Texture updated successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Author *
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aircraft *
          </label>
          <select
            value={aircraft}
            onChange={(e) => setAircraft(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select aircraft</option>
            {AIRCRAFT_OPTIONS.map((aircraftOption) => (
              <option key={aircraftOption} value={aircraftOption}>
                {aircraftOption}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select category</option>
            {CATEGORY_OPTIONS.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption}>
                {categoryOption}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Texture Type *
          </label>
          <select
            value={textureType}
            onChange={(e) => setTextureType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select texture type</option>
            {TEXTURE_TYPE_OPTIONS.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {typeOption}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Texture File (leave empty to keep current)
          </label>
          <input
            type="file"
            accept="image/*,.dds,.tga,.png,.jpg,.jpeg,.bmp"
            onChange={(e) => setTextureFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Thumbnail File (leave empty to keep current)
          </label>
          <input
            type="file"
            accept="image/*,.png,.jpg,.jpeg,.bmp"
            onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Texture'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
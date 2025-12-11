import { useState, useEffect, useCallback } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import { supabase, Texture, Pack } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { deleteStorageFile } from '../lib/storageUtils';
import { Upload, X } from 'lucide-react';

interface DropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  accept: Accept;
  file: File | null;
  preview: string | null;
  clearFile: () => void;
  label: string;
  description: string;
}

function Dropzone({
  onDrop,
  accept,
  file,
  preview,
  clearFile,
  label,
  description,
}: DropzoneProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
  });

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        <span className="text-gray-500 text-xs ml-2">{description}</span>
      </label>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          isDragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <div className="relative mx-auto max-h-48 w-fit">
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 rounded"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {isMobile
                ? 'Tap to select a file'
                : isDragActive
                ? 'Drop the file here...'
                : "Drag 'n' drop a file here, or click to select, 10 MB max"}
            </p>
            {file && <p className="text-sm text-green-600 mt-2">{file.name}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

interface EditPackProps {
  pack: Pack;
  onUpdate: (updatedPack: Pack) => void;
  onClose: () => void;
}

export default function EditPack({ pack, onUpdate, onClose }: EditPackProps) {
  const { user, profile, isTrusted } = useAuth();
  const [title, setTitle] = useState(pack.title);
  const [description, setDescription] = useState(pack.description);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(pack.thumbnail_url);
  const [selectedTextures, setSelectedTextures] = useState<Texture[]>([]);
  const [availableTextures, setAvailableTextures] = useState<Texture[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [titleError, setTitleError] = useState('');
  const INVALID_TITLE_REGEX = /[<>:?\\\/\*|\"]/;

  useEffect(() => {
    if (user && user.id !== pack.user_id) {
      setError('You can only edit your own packs');
      return;
    }
    fetchUserTextures();
    fetchPackTextures();
  }, [user, pack]);

  useEffect(() => {
    // Revoke object URLs on unmount to prevent memory leaks
    return () => {
      if (thumbnailPreview && thumbnailPreview !== pack.thumbnail_url) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview, pack.thumbnail_url]);

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

  const fetchPackTextures = async () => {
    if (pack.texture_ids && pack.texture_ids.length > 0) {
      const { data, error } = await supabase
        .from('textures')
        .select('*')
        .in('id', pack.texture_ids);

      if (!error && data) {
        setSelectedTextures(data);
      }
    }
  };

  const onThumbnailDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Thumbnail must be an image file');
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Thumbnail file size must not exceed 10MB');
      return;
    }

    setThumbnailFile(file);
    if (thumbnailPreview && thumbnailPreview !== pack.thumbnail_url) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(URL.createObjectURL(file));
    setError('');
  }, [thumbnailPreview, pack.thumbnail_url]);

  const clearThumbnailFile = () => {
    setThumbnailFile(null);
    if (thumbnailPreview && thumbnailPreview !== pack.thumbnail_url) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(pack.thumbnail_url);
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
    if (!thumbnailFile || !user) return pack.thumbnail_url;

    const fileExt = thumbnailFile.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('pack-thumbnails')
      .upload(fileName, thumbnailFile);

    if (error) {
      console.error('Error uploading thumbnail:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('pack-thumbnails')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (INVALID_TITLE_REGEX.test(title)) {
      setError('Title contains invalid characters');
      setLoading(false);
      return;
    }

    try {
      if (selectedTextures.length === 0) {
        throw new Error('Please select at least one texture');
      }

      const thumbnailUrl = await uploadThumbnail();
      if (!thumbnailUrl) {
        throw new Error('Failed to upload thumbnail');
      }

      // Delete old thumbnail if changed
      if (thumbnailUrl !== pack.thumbnail_url) {
        await deleteStorageFile(pack.thumbnail_url, 'pack-thumbnails');
      }

      const textureIds = selectedTextures.map(texture => texture.id);

      const { data: packData, error: packError } = await supabase
        .from('packs')
        .update({
          title,
          description,
          thumbnail_url: thumbnailUrl,
          texture_ids: textureIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pack.id)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (packError) throw packError;

      // Delete old thumbnail if changed
      if (thumbnailFile && thumbnailUrl !== pack.thumbnail_url) {
        try {
          await deleteStorageFile(pack.thumbnail_url, 'pack-thumbnails');
        } catch (error) {
          console.error('Failed to delete old thumbnail:', error);
        }
      }

      setSuccess(true);
      onUpdate(packData);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pack');
    } finally {
      setLoading(false);
    }
  };

  if (user && user.id !== pack.user_id) {
    return (
      <div className="bg-[#cbd5e1] rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">You can only edit your own packs.</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#cbd5e1] rounded-lg shadow-xl max-w-lg w-full mx-auto max-h-[90vh] overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-xl font-bold">Edit Pack</h1>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition p-1 rounded hover:bg-gray-300"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              Pack updated successfully!
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Dropzone
              onDrop={onThumbnailDrop}
              accept={{ 'image/*': [] }}
              file={thumbnailFile}
              preview={thumbnailPreview}
              clearFile={clearThumbnailFile}
              label="Thumbnail"
              description="Recommended: 3:2 aspect ratio."
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pack Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  if (INVALID_TITLE_REGEX.test(newTitle)) {
                    setTitleError('Title cannot contain any of the following characters: < > : ? \\ / * | "');
                  } else {
                    setTitleError('');
                  }
                  setTitle(newTitle);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {titleError && <p className="text-sm text-red-600 mt-1">{titleError}</p>}
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
                Select Textures (at least 1) *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {availableTextures.map((texture) => {
                  const isSelected = selectedTextures.find(t => t.id === texture.id);
                  return (
                    <div
                      key={texture.id}
                      className={`border rounded-lg p-3 cursor-pointer transition relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => toggleTextureSelection(texture)}
                    >
                      <div className="absolute top-2 right-2">
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => toggleTextureSelection(texture)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <img
                        src={texture.thumbnail_url}
                        alt={texture.title}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                      <h3 className="font-medium text-sm">{texture.title}</h3>
                      <p className="text-xs text-gray-600">{texture.aircraft} - {texture.category}</p>
                      {isSelected && (
                        <div className="mt-2 text-blue-600 text-xs font-medium">Selected</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {availableTextures.length === 0 && (
                <p className="text-gray-500">No approved textures found. Upload some textures first.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || selectedTextures.length === 0 || !title || !!titleError}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating Pack...' : 'Update Pack'}
            </button>
          </form>
        </div>
      </div>
  );
}

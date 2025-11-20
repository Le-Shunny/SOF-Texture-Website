import { useState, useEffect, useCallback } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import { supabase, Texture } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Package, X } from 'lucide-react';

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

export default function CreatePack() {
  const { user, profile, isTrusted } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [selectedTextures, setSelectedTextures] = useState<Texture[]>([]);
  const [availableTextures, setAvailableTextures] = useState<Texture[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserTextures();
    }
  }, [user]);

  useEffect(() => {
    // Revoke object URLs on unmount to prevent memory leaks
    return () => {
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [thumbnailPreview]);

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
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(URL.createObjectURL(file));
    setError('');
  }, [thumbnailPreview]);

  const clearThumbnailFile = () => {
    setThumbnailFile(null);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(null);
    }
  };

  const toggleTextureSelection = (texture: Texture) => {
    setSelectedTextures(prev =>
      prev.find(t => t.id === texture.id)
        ? prev.filter(t => t.id !== texture.id)
        : [...prev, texture]
    );
  };

  const uploadThumbnail = async (packId: string): Promise<string | null> => {
    if (!thumbnailFile || !user) return null;

    const fileExt = thumbnailFile.name.split('.').pop();
    const fileName = `thumbnail_pack_${packId}_${Date.now()}.${fileExt}`;

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

    try {
      if (!thumbnailFile) {
        throw new Error('Please upload a thumbnail file');
      }

      if (selectedTextures.length === 0) {
        throw new Error('Please select at least one texture');
      }

      const packId = crypto.randomUUID();

      const thumbnailUrl = await uploadThumbnail(packId);
      if (!thumbnailUrl) {
        throw new Error('Failed to upload thumbnail');
      }

      const packStatus = isTrusted ? 'approved' : 'pending';

      const textureIds = selectedTextures.map(texture => texture.id);

      const { error: packError } = await supabase
        .from('packs')
        .insert({
          id: packId,
          user_id: user!.id,
          title,
          description,
          author: profile!.username,
          thumbnail_url: thumbnailUrl,
          status: packStatus,
          texture_ids: textureIds,
        });

      if (packError) throw packError;

      setSuccess(true);
      // Reset form
      setTitle('');
      setDescription('');
      clearThumbnailFile();
      setSelectedTextures([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pack');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Create Pack</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          Pack created successfully!{' '}
          {!isTrusted && 'It will be reviewed by admins before being published.'}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#cbd5e1] rounded-lg shadow-md p-6 space-y-6">
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
              placeholder="Tell us about your pack, you can put #tags here too!"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

        <Dropzone
          onDrop={onThumbnailDrop}
          accept={{ 'image/*': [] }}
          file={thumbnailFile}
          preview={thumbnailPreview}
          clearFile={clearThumbnailFile}
          label="Thumbnail *"
          description="Recommended: 3:2 aspect ratio."
        />

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
  );
}

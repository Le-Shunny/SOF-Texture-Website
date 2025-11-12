import { useState, useEffect, useCallback } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, X } from 'lucide-react';

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
                : label.includes('Texture')
                ? "Drag 'n' drop a file here, or click to select, 10 MB max"
                : "Drag 'n' drop a file here, or click to select, 5 MB max"}
            </p>
            {file && <p className="text-sm text-green-600 mt-2">{file.name}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UploadTexture() {
  const { user, profile, isCertifiedMaker } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    author: '',
    aircraft: '',
    category: '',
    textureType: '',
  });

  const [textureFile, setTextureFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [texturePreview, setTexturePreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  useEffect(() => {
    // Revoke object URLs on unmount to prevent memory leaks
    return () => {
      if (texturePreview) URL.revokeObjectURL(texturePreview);
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [texturePreview, thumbnailPreview]);

  const validateImageDimensions = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const isValid = img.width === img.height && img.width >= 2048 && img.width <= 4096;
        resolve(isValid);
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  };

  const onTextureDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.startsWith('image/png')) {
      setError('Texture must be a PNG file');
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Texture file size must not exceed 10MB');
      return;
    }

    const isValidSize = await validateImageDimensions(file);
    if (!isValidSize) {
      setError('Texture must be a 1:1 PNG between 2048x2048 and 4096x4096 pixels');
      return;
    }

    setTextureFile(file);
    if (texturePreview) URL.revokeObjectURL(texturePreview);
    setTexturePreview(URL.createObjectURL(file));
    setError('');
  }, [texturePreview]);

  const onThumbnailDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Thumbnail must be an image file');
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Thumbnail file size must not exceed 5MB');
      return;
    }

    setThumbnailFile(file);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(URL.createObjectURL(file));
    setError('');
  }, [thumbnailPreview]);

  const clearTextureFile = () => {
    setTextureFile(null);
    if (texturePreview) {
      URL.revokeObjectURL(texturePreview);
      setTexturePreview(null);
    }
  };

  const clearThumbnailFile = () => {
    setThumbnailFile(null);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(null);
    }
  };

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
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      if (!textureFile || !thumbnailFile) {
        throw new Error('Please upload both texture and thumbnail files');
      }

      const textureUrl = await uploadFile(textureFile, 'textures');
      const thumbnailUrl = await uploadFile(thumbnailFile, 'thumbnails');

      const authorName = formData.author || profile?.username || user?.id || 'Anonymous';
      const status = isCertifiedMaker ? 'approved' : 'pending';

      const { error: insertError } = await supabase.from('textures').insert({
        user_id: user?.id || null,
        title: formData.title,
        description: formData.description,
        author: authorName,
        aircraft: formData.aircraft,
        category: formData.category,
        texture_type: formData.textureType,
        texture_url: textureUrl,
        thumbnail_url: thumbnailUrl,
        status,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setFormData({
        title: '',
        description: '',
        author: '',
        aircraft: '',
        category: '',
        textureType: '',
      });
      clearTextureFile();
      clearThumbnailFile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload texture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Upload Texture</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          Texture uploaded successfully!{' '}
          {!isCertifiedMaker && 'It will be reviewed by admins before being published.'}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <Dropzone
          onDrop={onTextureDrop}
          accept={{ 'image/png': ['.png'] }}
          file={textureFile}
          preview={texturePreview}
          clearFile={clearTextureFile}
          label="Texture File *"
          description="(PNG, 1:1 2048x2048 to 4096x4096)"
        />

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
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>

        <div>
          <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
            Author
            <span className="text-gray-500 text-xs ml-2">
              (Leave empty to use your currrent username)
            </span>
          </label>
          <input
            id="author"
            type="text"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={user ? (profile?.username || user?.id || 'Unknown User') : 'Required for guest uploads'}
          />
        </div>

        <div>
          <label htmlFor="aircraft" className="block text-sm font-medium text-gray-700 mb-1">
            Aircraft *
          </label>
          <select
            id="aircraft"
            value={formData.aircraft}
            onChange={(e) => setFormData({ ...formData, aircraft: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select aircraft</option>
            {AIRCRAFT_OPTIONS.map((aircraft) => (
              <option key={aircraft} value={aircraft}>
                {aircraft}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select category</option>
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="textureType" className="block text-sm font-medium text-gray-700 mb-1">
            Texture Type *
          </label>
          <select
            id="textureType"
            value={formData.textureType}
            onChange={(e) => setFormData({ ...formData, textureType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select texture type</option>
            {TEXTURE_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading...' : 'Upload Texture'}
        </button>
      </form>
    </div>
  );
}

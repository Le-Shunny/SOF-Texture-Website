import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Texture } from '../lib/supabase';
import { deleteTextureFiles } from '../lib/storageUtils';
import { Upload, X, ArrowLeft } from 'lucide-react';

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

const Dropzone: React.FC<DropzoneProps> = ({ onDrop, accept, file, preview, clearFile, label, description }) => {
  const [isMobile, setIsMobile] = useState(false);
  const { profile } = useAuth();

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
          <div className="relative">
            <img src={preview} alt="Preview" className="max-w-full max-h-48 mx-auto rounded" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : file ? (
          <div className="text-gray-700">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-gray-500">Click to change or drag and drop</p>
          </div>
        ) : (
          <div className="text-gray-700">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="font-medium">Click to upload or drag and drop</p>
            <p className="text-sm text-gray-500">
              {isMobile
                ? 'Tap to select file'
                : isDragActive
                ? 'Drop the file here...'
                : label.includes('Texture')
                ? "Drag 'n' drop a file here, or click to select, 10 MB max"
                : "Drag 'n' drop a file here, or click to select, 5 MB max"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface EditTextureProps {
  texture: Texture;
  onUpdate: (updatedTexture: Texture) => void;
  onNavigate?: (page: string) => void;
  onClose?: () => void;
}

export default function EditTexture({ texture, onUpdate, onNavigate, onClose }: EditTextureProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: texture.title,
    description: texture.description,
    aircraft: texture.aircraft,
    category: texture.category,
    textureType: texture.texture_type,
  });

  // File states
  const [textureFile, setTextureFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [texturePreview, setTexturePreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [titleError, setTitleError] = useState('');
  const INVALID_TITLE_REGEX = /[<>:?\\\/\*|\"]/;

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

  const handleTextureDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.startsWith('image/png')) {
      setError('Texture must be a PNG file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Texture file size must not exceed 10MB');
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (img.width === img.height && img.width >= 2048 && img.width <= 4096) {
        setTextureFile(file);
        const reader = new FileReader();
        reader.onload = () => setTexturePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setError('Texture must be a 1:1 PNG between 2048x2048 and 4096x4096 pixels');
      }
    };
    img.src = URL.createObjectURL(file);
  }, []);

  const handleThumbnailDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Thumbnail must be an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Thumbnail file size must not exceed 5MB');
      return;
    }

    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = () => setThumbnailPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

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

    if (INVALID_TITLE_REGEX.test(formData.title)) {
      setError('Title contains invalid characters');
      setLoading(false);
      return;
    }

    try {
      let newTextureUrl = texture.texture_url;
      let newThumbnailUrl = texture.thumbnail_url;

      // Upload new files if provided
      if (textureFile) {
        newTextureUrl = await uploadFile(textureFile, 'textures');
      }
      if (thumbnailFile) {
        newThumbnailUrl = await uploadFile(thumbnailFile, 'texture-thumbnails');
      }

      // Update texture in database
      const { data, error: updateError } = await supabase
        .from('textures')
        .update({
          title: formData.title,
          description: formData.description,
          author: profile?.username || 'Anonymous',
          aircraft: formData.aircraft,
          category: formData.category,
          texture_type: formData.textureType,
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
        if (onClose) {
          onClose();
        } else if (onNavigate) {
          onNavigate('browse');
        }
      }, 2000);
    } catch (err: any) {
      console.error('Error updating texture:', err);
      setError(err.message || 'Failed to update texture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#cbd5e1] rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h1 className="text-xl font-bold">Edit Texture</h1>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              Texture updated successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
        <Dropzone
          onDrop={handleTextureDrop}
          accept={{ 'image/png': ['.png'] }}
          file={textureFile}
          preview={texturePreview}
          clearFile={() => setTextureFile(null)}
          label="Texture File *"
          description="(PNG, 1:1 2048x2048 to 4096x4096)"
        />

        <Dropzone
          onDrop={handleThumbnailDrop}
          accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.bmp'] }}
          file={thumbnailFile}
          preview={thumbnailPreview}
          clearFile={() => setThumbnailFile(null)}
          label="Thumbnail File *"
          description="(Image files - Max 5MB)"
        />

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => {
              const newTitle = e.target.value;
              if (INVALID_TITLE_REGEX.test(newTitle)) {
                setTitleError('Title cannot contain any of the following characters: < > : ? \\ / * | "');
              } else {
                setTitleError('');
              }
              setFormData({ ...formData, title: newTitle });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {titleError && <p className="text-sm text-red-600 mt-1">{titleError}</p>}
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
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
            {TEXTURE_TYPE_OPTIONS.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {typeOption}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !!titleError || !formData.title}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating...' : 'Update Texture'}
        </button>
          </form>
        </div>
      </div>
    </div>
  );
}

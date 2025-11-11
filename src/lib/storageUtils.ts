import { supabase } from './supabase';

/**
 * Check if a file exists in storage
 * @param filePath - The path to the file within the bucket
 * @param bucketName - The name of the storage bucket
 * @returns Promise that resolves to true if file exists, false otherwise
 */
export async function checkFileExists(filePath: string, bucketName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        search: filePath,
        limit: 1
      });

    if (error) {
      console.error(`Error checking file existence in ${bucketName}:`, error);
      return false;
    }

    return data.some(file => file.name === filePath);
  } catch (error) {
    console.error(`Failed to check if file exists: ${filePath}`, error);
    return false;
  }
}

/**
 * Extracts the file path from a Supabase storage public URL
 * @param url - The public URL from Supabase storage
 * @param bucketName - The name of the storage bucket
 * @returns The file path within the bucket
 */
export function extractFilePathFromUrl(url: string, bucketName: string): string {
  try {
    // Supabase storage URLs have the format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[file-path]
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Remove the storage API path prefix to get the actual file path
    const prefix = `/storage/v1/object/public/${bucketName}/`;
    if (pathname.startsWith(prefix)) {
      return pathname.substring(prefix.length);
    }
    
    // Fallback: if URL structure is different, try to extract filename
    const parts = pathname.split('/');
    const filename = parts[parts.length - 1];
    return filename;
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    // Fallback to extracting just the filename
    const parts = url.split('/');
    return parts[parts.length - 1];
  }
}

/**
 * Deletes files from Supabase storage
 * @param fileUrl - The public URL of the file to delete
 * @param bucketName - The name of the storage bucket
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteStorageFile(fileUrl: string, bucketName: string): Promise<void> {
  try {
    const filePath = extractFilePathFromUrl(fileUrl, bucketName);
    
    if (!filePath) {
      console.warn(`Could not extract file path from URL: ${fileUrl}`);
      return;
    }

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error(`Error deleting file from ${bucketName}:`, error);
      throw error;
    }

    console.log(`Successfully deleted file: ${filePath} from bucket: ${bucketName}`);
  } catch (error) {
    console.error(`Failed to delete storage file: ${fileUrl}`, error);
    throw error;
  }
}

/**
 * Deletes both texture and thumbnail files associated with a texture
 * @param textureUrl - The public URL of the texture file
 * @param thumbnailUrl - The public URL of the thumbnail file
 * @returns Promise that resolves when both files are deleted
 */
export async function deleteTextureFiles(textureUrl: string, thumbnailUrl: string): Promise<void> {
  const errors: string[] = [];
  
  try {
    // Delete both files in parallel for better performance
    const results = await Promise.allSettled([
      deleteStorageFile(textureUrl, 'textures'),
      deleteStorageFile(thumbnailUrl, 'thumbnails')
    ]);

    // Collect any errors but don't stop execution
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const fileType = index === 0 ? 'texture' : 'thumbnail';
        console.warn(`Failed to delete ${fileType} file:`, result.reason);
        errors.push(`Failed to delete ${fileType}: ${result.reason.message}`);
      }
    });

    // If both deletions failed, throw an error
    if (errors.length === 2) {
      throw new Error('Failed to delete both texture files');
    }

    // Log warnings if some files couldn't be deleted
    if (errors.length > 0) {
      console.warn('Some texture files could not be deleted:', errors);
    }
  } catch (error) {
    console.error('Error deleting texture files:', error);
    throw error;
  }
}

/**
 * Complete texture deletion including database record and storage files
 * @param textureId - The ID of the texture to delete
 * @param textureUrl - The public URL of the texture file
 * @param thumbnailUrl - The public URL of the thumbnail file
 * @returns Promise that resolves when complete deletion is done
 */
export async function deleteTextureCompletely(
  textureId: string,
  textureUrl: string,
  thumbnailUrl: string
): Promise<void> {
  try {
    // Try to delete the storage files first, but don't fail if this doesn't work
    // The database trigger will serve as a backup
    try {
      await deleteTextureFiles(textureUrl, thumbnailUrl);
    } catch (fileError) {
      console.warn('File deletion failed, but continuing with database deletion:', fileError);
    }
    
    // Then delete the database record
    const { error } = await supabase
      .from('textures')
      .delete()
      .eq('id', textureId);

    if (error) {
      console.error('Error deleting texture from database:', error);
      throw error;
    }

    console.log(`Successfully deleted texture record: ${textureId}`);
  } catch (error) {
    console.error('Complete texture deletion failed:', error);
    throw error;
  }
}
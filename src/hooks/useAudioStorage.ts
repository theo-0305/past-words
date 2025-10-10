import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateAudioFile, getAudioDuration, convertAudioFormat } from '@/utils/audioProcessing';

export interface UseAudioStorageReturn {
  uploadAudio: (audioBlob: Blob, userId: string, wordId: string) => Promise<string | null>;
  deleteAudio: (filePath: string) => Promise<boolean>;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

export interface AudioUploadOptions {
  maxRetries?: number;
  retryDelay?: number;
  onProgress?: (progress: number) => void;
  bucket?: string;
}

export function useAudioStorage(options: AudioUploadOptions = {}): UseAudioStorageReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { maxRetries = 3, retryDelay = 1000, onProgress, bucket = 'audio' } = options;

  // Upload audio file to Supabase Storage
  const uploadAudio = useCallback(async (
    audioBlob: Blob, 
    userId: string, 
    wordId: string
  ): Promise<string | null> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      // Validate audio file
      const validation = validateAudioFile(audioBlob);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid audio file');
      }

      // Convert to preferred format if needed
      const processedBlob = await convertAudioFormat(audioBlob);
      
      // Get audio duration
      const duration = await getAudioDuration(processedBlob);
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${userId}/${wordId}_${timestamp}.webm`;
      
      // Upload with retry mechanism
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Show progress for each attempt
          setUploadProgress((attempt - 1) / maxRetries * 50);
          
          const { data, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, processedBlob, {
              contentType: 'audio/webm',
              upsert: false, // Don't overwrite existing files
              cacheControl: '3600', // Cache for 1 hour
            });
          
          if (uploadError) {
            throw uploadError;
          }
          
          // Upload successful
          setUploadProgress(100);
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
          
          toast.success('Audio uploaded successfully');
          return publicUrl;
          
        } catch (error) {
          lastError = error as Error;
          console.error(`Upload attempt ${attempt} failed:`, error);
          
          if (attempt < maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            
            // Update progress for retry
            setUploadProgress((attempt / maxRetries) * 50);
          }
        }
      }
      
      // All retries failed
      throw lastError || new Error('Upload failed after maximum retries');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload audio';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
      
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [maxRetries, retryDelay]);

  // Delete audio file from storage
  const deleteAudio = useCallback(async (filePath: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Extract the path from the full URL if needed
      let storagePath = filePath;
      const bucketPrefix = `/storage/v1/object/public/${bucket}/`;
      if (filePath.includes(bucketPrefix)) {
        storagePath = filePath.split(bucketPrefix)[1];
      }
      
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([storagePath]);
      
      if (deleteError) {
        throw deleteError;
      }
      
      toast.success('Audio deleted successfully');
      return true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete audio';
      setError(errorMessage);
      console.error('Delete audio error:', error);
      return false;
    }
  }, []);

  return {
    uploadAudio,
    deleteAudio,
    isUploading,
    uploadProgress,
    error,
  };
}
import { toast } from 'sonner';

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
}

export interface AudioFormat {
  format: string;
  bitrate: number;
  samplerate: number;
}

export interface ProcessedAudio {
  blob: Blob;
  duration: number;
  format: string;
  size: number;
}

// Audio format configuration
export const AUDIO_CONFIG = {
  MAX_DURATION: 30000, // 30 seconds
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  SUPPORTED_FORMATS: ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/ogg'],
  PREFERRED_FORMAT: 'audio/webm',
  BITRATE: 128000, // 128 kbps
  SAMPLERATE: 44100, // 44.1 kHz
} as const;

// Validate audio file before processing
export function validateAudioFile(file: File | Blob): AudioValidationResult {
  // Check file size
  if (file.size > AUDIO_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Audio file too large. Maximum size is ${AUDIO_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  // Check MIME type
  if (file instanceof File && !AUDIO_CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported audio format. Supported formats: ${AUDIO_CONFIG.SUPPORTED_FORMATS.join(', ')}`
    };
  }

  return { valid: true };
}

// Convert audio blob to preferred format
export async function convertAudioFormat(
  audioBlob: Blob, 
  targetFormat: AudioFormat = {
    format: AUDIO_CONFIG.PREFERRED_FORMAT,
    bitrate: AUDIO_CONFIG.BITRATE,
    samplerate: AUDIO_CONFIG.SAMPLERATE
  }
): Promise<Blob> {
  // For now, we'll return the original blob if it's already in the right format
  // In a production environment, you might use libraries like lamejs for MP3 encoding
  if (audioBlob.type === targetFormat.format) {
    return audioBlob;
  }

  // TODO: Implement actual format conversion if needed
  // This would require additional libraries for audio encoding
  console.warn(`Format conversion from ${audioBlob.type} to ${targetFormat.format} not implemented`);
  return audioBlob;
}

// Get audio duration from blob
export function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(audioBlob);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(objectUrl);
      resolve(audio.duration * 1000); // Convert to milliseconds
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to get audio duration'));
    });
    
    audio.src = objectUrl;
  });
}

// Generate waveform data for visualization
export async function generateWaveformData(audioBlob: Blob): Promise<number[]> {
  try {
    const audioContext = new AudioContext();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0); // Get first channel
    const samples = 100; // Number of samples for visualization
    const blockSize = Math.floor(channelData.length / samples);
    const waveformData: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      const blockStart = i * blockSize;
      let sum = 0;
      
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[blockStart + j]);
      }
      
      waveformData.push(sum / blockSize);
    }
    
    audioContext.close();
    return waveformData;
  } catch (error) {
    console.error('Failed to generate waveform data:', error);
    return Array(100).fill(0.1); // Return default data
  }
}

// Format duration from milliseconds to MM:SS
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Check if browser supports audio recording
export function isAudioRecordingSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

// Request microphone permission
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    
    let errorMessage = 'Microphone access denied';
    
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Please allow microphone access to record audio';
          break;
        case 'NotFoundError':
          errorMessage = 'No microphone detected. Please connect a microphone';
          break;
        case 'NotReadableError':
          errorMessage = 'Microphone is already in use by another application';
          break;
      }
    }
    
    toast.error(errorMessage);
    return false;
  }
}

// Create audio blob from MediaRecorder chunks
export function createAudioBlob(chunks: BlobPart[], mimeType: string = AUDIO_CONFIG.PREFERRED_FORMAT): Blob {
  return new Blob(chunks, { type: mimeType });
}
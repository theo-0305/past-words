import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  AUDIO_CONFIG, 
  isAudioRecordingSupported, 
  requestMicrophonePermission,
  createAudioBlob
} from '@/utils/audioProcessing';

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  error: string | null;
  isSupported: boolean;
  hasPermission: boolean;
}

export interface UseAudioRecorderProps {
  maxDuration?: number;
  mimeType?: string;
  onRecordingComplete?: (blob: Blob, duration: number) => void;
  onRecordingError?: (error: string) => void;
}

export function useAudioRecorder({
  maxDuration = AUDIO_CONFIG.MAX_DURATION,
  mimeType = AUDIO_CONFIG.PREFERRED_FORMAT,
  onRecordingComplete,
  onRecordingError
}: UseAudioRecorderProps = {}): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isSupported = isAudioRecordingSupported();

  // Cleanup function
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
  }, []);

  // Update duration during recording
  const updateDuration = useCallback(() => {
    if (startTimeRef.current && !isPaused) {
      const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
      setDuration(Math.min(elapsed, maxDuration));

      // Auto-stop at max duration
      if (elapsed >= maxDuration) {
        // Avoid forward reference; directly stop the recorder
        try {
          mediaRecorderRef.current?.stop();
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to auto-stop recording';
          setError(msg);
          toast.error(msg);
        }
      }
    }
  }, [isPaused, maxDuration]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Check browser support
      if (!isSupported) {
        throw new Error('Audio recording is not supported in your browser');
      }

      // Request microphone permission
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        throw new Error('Microphone permission denied');
      }
      setHasPermission(true);

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = mediaRecorder;

      // Reset state
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setDuration(0);

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setIsPaused(false);
        toast.success('Recording started');
      };

      mediaRecorder.onpause = () => {
        setIsPaused(true);
        toast.info('Recording paused');
      };

      mediaRecorder.onresume = () => {
        setIsPaused(false);
        toast.info('Recording resumed');
      };

      mediaRecorder.onstop = () => {
        const audioBlob = createAudioBlob(chunksRef.current, mimeType);
        const finalDuration = Date.now() - startTimeRef.current - pausedTimeRef.current;
        
        cleanup();
        
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob, finalDuration);
        }
      };

      mediaRecorder.onerror = (event: Event) => {
        const anyEvent = event as unknown as { error?: unknown };
        const errVal = anyEvent?.error;
        const errorMessage = `Recording error: ${typeof errVal === 'string' ? errVal : (errVal instanceof Error ? errVal.message : 'Unknown error')}`;
        setError(errorMessage);
        cleanup();
        
        if (onRecordingError) {
          onRecordingError(errorMessage);
        }
        toast.error('Recording failed. Please try again');
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second

      // Start duration timer
      durationIntervalRef.current = setInterval(updateDuration, 100);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setError(errorMessage);
      cleanup();
      
      if (onRecordingError) {
        onRecordingError(errorMessage);
      }
      
      toast.error(errorMessage);
    }
  }, [isSupported, mimeType, onRecordingComplete, onRecordingError, cleanup, updateDuration]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording) {
      return Promise.reject(new Error('No active recording to stop'));
    }

    return new Promise<Blob>((resolve, reject) => {
      let finalBlob: Blob | null = null;

      const handleStop = () => {
        finalBlob = createAudioBlob(chunksRef.current, mimeType);
        resolve(finalBlob);
      };

      mediaRecorderRef.current!.onstop = () => {
        handleStop();
        const finalDuration = Date.now() - startTimeRef.current - pausedTimeRef.current;
        const blob = finalBlob ?? createAudioBlob(chunksRef.current, mimeType);
        cleanup();
        
        if (onRecordingComplete) {
          onRecordingComplete(blob, finalDuration);
        }
      };

      try {
        mediaRecorderRef.current!.stop();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording';
        reject(errorMessage);
        cleanup();
      }
    });
  }, [isRecording, mimeType, onRecordingComplete, cleanup]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording || isPaused) {
      return;
    }

    try {
      mediaRecorderRef.current.pause();
      pausedTimeRef.current += Date.now() - (startTimeRef.current + pausedTimeRef.current);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pause recording';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, [isRecording, isPaused]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording || !isPaused) {
      return;
    }

    try {
      mediaRecorderRef.current.resume();
      
      // Restart duration timer
      durationIntervalRef.current = setInterval(updateDuration, 100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume recording';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, [isRecording, isPaused, updateDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    isPaused,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error,
    isSupported,
    hasPermission,
  };
}
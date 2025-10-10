import React from 'react';
import { Mic, Square, Pause, Play, RefreshCw, Volume2 } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { formatDuration, AUDIO_CONFIG } from '@/utils/audioProcessing';

export interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onRecordingError?: (error: string) => void;
  maxDuration?: number;
  className?: string;
}

export function AudioRecorder({ 
  onRecordingComplete, 
  onRecordingError,
  maxDuration,
  className = ''
}: AudioRecorderProps) {
  const {
    isRecording,
    isPaused,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error,
    isSupported,
    hasPermission
  } = useAudioRecorder({
    maxDuration,
    onRecordingComplete,
    onRecordingError
  });

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  if (!isSupported) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-red-700">
          <Volume2 className="h-5 w-5" />
          <span className="text-sm font-medium">Audio recording is not supported in your browser</span>
        </div>
        <p className="mt-1 text-sm text-red-600">
          Please use a modern browser like Chrome, Firefox, Safari, or Edge.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-red-700">
          <Volume2 className="h-5 w-5" />
          <span className="text-sm font-medium">Recording Error</span>
        </div>
        <p className="mt-1 text-sm text-red-600">{error}</p>
        <button
          onClick={handleStartRecording}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Recording Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {isRecording && !isPaused && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-red-600">Recording</span>
            </div>
          )}
          {isPaused && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm font-medium text-yellow-600">Paused</span>
            </div>
          )}
          {!isRecording && !isPaused && (
            <span className="text-sm font-medium text-gray-600">Ready to record</span>
          )}
        </div>
        
        {/* Duration Display */}
        <div className="text-lg font-mono text-gray-700">
          {formatDuration(duration)}
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center justify-center space-x-3">
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            disabled={false}
            className="flex items-center justify-center w-16 h-16 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
            title="Start Recording"
          >
            <Mic className="h-8 w-8" />
          </button>
        ) : (
          <>
            {/* Stop Button */}
            <button
              onClick={handleStopRecording}
              className="flex items-center justify-center w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-red-300"
              title="Stop Recording"
            >
              <Square className="h-8 w-8" />
            </button>

            {/* Pause/Resume Button */}
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="flex items-center justify-center w-12 h-12 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-yellow-300"
              title={isPaused ? "Resume Recording" : "Pause Recording"}
            >
              {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
            </button>
          </>
        )}
      </div>

      {/* Progress Bar */}
      {isRecording && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-100 ${
                isPaused ? 'bg-yellow-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min((duration / (maxDuration || AUDIO_CONFIG.MAX_DURATION)) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatDuration(duration)}</span>
            <span>Max: {formatDuration(maxDuration || AUDIO_CONFIG.MAX_DURATION)}</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !error && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Click the microphone button to start recording your pronunciation
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Maximum duration: {formatDuration(maxDuration || AUDIO_CONFIG.MAX_DURATION)}
          </p>
        </div>
      )}
    </div>
  );
}
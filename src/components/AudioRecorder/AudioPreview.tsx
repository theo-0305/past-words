import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Volume2, RefreshCw, Trash2, Download } from 'lucide-react';
import { formatDuration } from '@/utils/audioProcessing';

export interface AudioPreviewProps {
  audioBlob: Blob;
  onReRecord?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  className?: string;
  showActions?: boolean;
}

export function AudioPreview({ 
  audioBlob, 
  onReRecord, 
  onDelete, 
  onSave,
  className = '',
  showActions = true
}: AudioPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Create object URL for the audio blob
  useEffect(() => {
    if (audioBlob) {
      const objectUrl = URL.createObjectURL(audioBlob);
      objectUrlRef.current = objectUrl;
      
      audioRef.current = new Audio(objectUrl);
      audioRef.current.volume = volume;
      
      // Get duration when metadata is loaded
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current!.duration * 1000);
      });
      
      // Update current time during playback
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current!.currentTime * 1000);
      });
      
      // Handle playback end
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
      
      // Handle errors
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
      });
      
      return () => {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
  }, [audioBlob, volume]);

  // Update volume when slider changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(error => {
        console.error('Playback failed:', error);
      });
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;

    const seekTime = (parseFloat(event.target.value) / 100) * duration;
    audioRef.current.currentTime = seekTime / 1000;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value) / 100;
    setVolume(newVolume);
  };

  const handleDownload = () => {
    if (!audioBlob) return;

    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`p-4 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Audio Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Volume2 className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Audio Preview</span>
        </div>
        <div className="text-sm text-gray-500">
          {formatDuration(duration)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <input
          type="range"
          min="0"
          max="100"
          value={progressPercentage}
          onChange={handleSeek}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${progressPercentage}%, #E5E7EB ${progressPercentage}%, #E5E7EB 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center space-x-3 mb-3">
        <button
          onClick={handlePlayPause}
          className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </button>

        <button
          onClick={handleStop}
          className="flex items-center justify-center w-10 h-10 bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-gray-300"
          title="Stop"
        >
          <Square className="h-5 w-5" />
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center justify-center w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-green-300"
          title="Download"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center space-x-2 mb-4">
        <Volume2 className="h-4 w-4 text-gray-500" />
        <input
          type="range"
          min="0"
          max="100"
          value={volume * 100}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #6B7280 0%, #6B7280 ${volume * 100}%, #E5E7EB ${volume * 100}%, #E5E7EB 100%)`
          }}
        />
        <span className="text-xs text-gray-500 w-8">{Math.round(volume * 100)}%</span>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {onReRecord && (
              <button
                onClick={onReRecord}
                className="flex items-center space-x-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Re-record</span>
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            )}
          </div>

          {onSave && (
            <button
              onClick={onSave}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-300"
            >
              Save Audio
            </button>
          )}
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useRef, useState } from 'react';
import { generateWaveformData } from '@/utils/audioProcessing';

export interface WaveformVisualizerProps {
  audioBlob: Blob;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  className?: string;
  height?: number;
  barCount?: number;
  barColor?: string;
  progressColor?: string;
}

export function WaveformVisualizer({
  audioBlob,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  className = '',
  height = 80,
  barCount = 50,
  barColor = '#E5E7EB',
  progressColor = '#3B82F6'
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate waveform data from audio blob
  useEffect(() => {
    let mounted = true;

    const generateWaveform = async () => {
      if (!audioBlob) return;

      setIsLoading(true);
      try {
        const data = await generateWaveformData(audioBlob);
        if (mounted) {
          setWaveformData(data);
        }
      } catch (error) {
        console.error('Failed to generate waveform:', error);
        // Fallback to simple data
        if (mounted) {
          setWaveformData(Array(barCount).fill(0.1));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    generateWaveform();

    return () => {
      mounted = false;
    };
  }, [audioBlob, barCount]);

  // Draw waveform on canvas
  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = canvas.width / barCount;
    const progressPercentage = duration > 0 ? currentTime / duration : 0;
    const progressBarIndex = Math.floor(progressPercentage * barCount);

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const barHeight = waveformData[i] * height * 0.8;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      // Choose color based on progress
      const color = i < progressBarIndex ? progressColor : barColor;
      
      // Draw rounded rectangle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x + barWidth * 0.1, y, barWidth * 0.8, barHeight, 2);
      ctx.fill();
    }
  }, [waveformData, currentTime, duration, height, barCount, barColor, progressColor]);

  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
        style={{ height: `${height}px` }}
      >
        <div className="text-gray-500 text-sm">Loading waveform...</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={barCount * 8} // 8px per bar
        height={height}
        className="w-full h-full rounded bg-gray-50"
      />
      
      {/* Progress indicator */}
      {duration > 0 && (
        <div 
          className="absolute top-0 bottom-0 bg-blue-200 opacity-30 pointer-events-none"
          style={{ 
            left: 0, 
            width: `${(currentTime / duration) * 100}%` 
          }}
        />
      )}
      
      {/* Playing animation overlay */}
      {isPlaying && (
        <div className="absolute inset-0 bg-blue-100 opacity-20 animate-pulse rounded" />
      )}
    </div>
  );
}

// Add roundRect method to CanvasRenderingContext2D if not available
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + width - radius, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.lineTo(x + width, y + height - radius);
    this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.lineTo(x + radius, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
  };
}
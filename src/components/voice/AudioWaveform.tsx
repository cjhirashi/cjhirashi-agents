'use client';

/**
 * AudioWaveform Component
 *
 * Visual representation of audio input level
 * Animated waveform bars for voice activity indication
 *
 * Related: Phase 7 - Tarea 1 (OpenAI gpt-realtime Integration)
 */

import { useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface AudioWaveformProps {
  audioLevel: number; // 0 to 1
  isActive: boolean;
  barCount?: number;
  height?: number;
  barWidth?: number;
  barGap?: number;
  color?: string;
  activeColor?: string;
}

// ═══════════════════════════════════════════════════════════
// AUDIO WAVEFORM COMPONENT
// ═══════════════════════════════════════════════════════════

export default function AudioWaveform({
  audioLevel,
  isActive,
  barCount = 40,
  height = 120,
  barWidth = 4,
  barGap = 2,
  color = '#9CA3AF',
  activeColor = '#3B82F6',
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const barHeights = useRef<number[]>(new Array(barCount).fill(0.1));
  const targetHeights = useRef<number[]>(new Array(barCount).fill(0.1));

  /**
   * Calculate bar heights based on audio level
   */
  const updateTargetHeights = (level: number) => {
    // Generate random variations around the audio level
    for (let i = 0; i < barCount; i++) {
      const variation = Math.random() * 0.3 - 0.15; // ±0.15
      const targetHeight = Math.max(0.1, Math.min(1, level + variation));
      targetHeights.current[i] = targetHeight;
    }
  };

  /**
   * Smoothly interpolate bar heights
   */
  const interpolateHeights = (smoothing: number = 0.15) => {
    for (let i = 0; i < barCount; i++) {
      const current = barHeights.current[i];
      const target = targetHeights.current[i];
      barHeights.current[i] = current + (target - current) * smoothing;
    }
  };

  /**
   * Draw waveform on canvas
   */
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate dimensions
    const totalBarWidth = barWidth + barGap;
    const canvasWidth = totalBarWidth * barCount - barGap;
    const canvasHeight = height;

    // Set canvas size
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const barHeight = barHeights.current[i] * canvasHeight;
      const x = i * totalBarWidth;
      const y = (canvasHeight - barHeight) / 2;

      // Set color based on active state
      ctx.fillStyle = isActive ? activeColor : color;

      // Draw rounded rectangle
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      ctx.fill();
    }
  };

  /**
   * Animation loop
   */
  const animate = () => {
    interpolateHeights();
    draw();
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  /**
   * Update waveform based on audio level
   */
  useEffect(() => {
    if (isActive) {
      updateTargetHeights(audioLevel);
    } else {
      // Fade to idle state
      updateTargetHeights(0.1);
    }
  }, [audioLevel, isActive, barCount]);

  /**
   * Start animation loop
   */
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="rounded-lg"
        style={{
          filter: isActive ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))' : 'none',
        }}
      />
    </div>
  );
}

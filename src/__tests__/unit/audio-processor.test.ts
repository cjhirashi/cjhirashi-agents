/**
 * Audio Processor Unit Tests
 *
 * Tests for audio encoding/decoding utilities
 *
 * Related: Phase 7 - Tarea 1 (OpenAI gpt-realtime Integration)
 */

import { describe, it, expect } from 'vitest';
import {
  createAudioChunk,
  mergeAudioChunks,
  base64ToPCM16,
  pcm16ToBase64,
  calculateDuration,
  calculateSampleCount,
  OPENAI_SAMPLE_RATE,
} from '@/lib/audio/audio-processor';

describe('Audio Processor - Utility Functions', () => {
  describe('createAudioChunk', () => {
    it('should create audio chunk with correct properties', () => {
      const data = new Int16Array([100, 200, 300]);
      const chunk = createAudioChunk(data, OPENAI_SAMPLE_RATE);

      expect(chunk.data).toEqual(data);
      expect(chunk.sampleRate).toBe(OPENAI_SAMPLE_RATE);
      expect(chunk.timestamp).toBeTypeOf('number');
      expect(chunk.timestamp).toBeGreaterThan(0);
    });

    it('should use default sample rate', () => {
      const data = new Int16Array([100, 200]);
      const chunk = createAudioChunk(data);

      expect(chunk.sampleRate).toBe(OPENAI_SAMPLE_RATE);
    });
  });

  describe('mergeAudioChunks', () => {
    it('should merge multiple audio chunks correctly', () => {
      const chunk1 = createAudioChunk(new Int16Array([1, 2, 3]));
      const chunk2 = createAudioChunk(new Int16Array([4, 5, 6]));
      const chunk3 = createAudioChunk(new Int16Array([7, 8, 9]));

      const merged = mergeAudioChunks([chunk1, chunk2, chunk3]);

      expect(merged.data.length).toBe(9);
      expect(Array.from(merged.data)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(merged.sampleRate).toBe(chunk1.sampleRate);
      expect(merged.timestamp).toBe(chunk1.timestamp);
    });

    it('should merge single chunk', () => {
      const chunk = createAudioChunk(new Int16Array([1, 2, 3]));
      const merged = mergeAudioChunks([chunk]);

      expect(merged.data).toEqual(chunk.data);
    });

    it('should throw error for empty array', () => {
      expect(() => mergeAudioChunks([])).toThrow('Cannot merge empty chunks array');
    });
  });

  describe('base64 conversion', () => {
    it('should convert PCM16 to base64 and back', () => {
      const original = new Int16Array([100, -200, 300, -400, 500]);
      const base64 = pcm16ToBase64(original);

      expect(base64).toBeTypeOf('string');
      expect(base64.length).toBeGreaterThan(0);

      const decoded = base64ToPCM16(base64);

      expect(decoded.length).toBe(original.length);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it('should handle empty PCM16 array', () => {
      const original = new Int16Array([]);
      const base64 = pcm16ToBase64(original);
      const decoded = base64ToPCM16(base64);

      expect(decoded.length).toBe(0);
    });

    it('should handle min/max values', () => {
      const original = new Int16Array([32767, -32768, 0]);
      const base64 = pcm16ToBase64(original);
      const decoded = base64ToPCM16(base64);

      expect(Array.from(decoded)).toEqual([32767, -32768, 0]);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration correctly', () => {
      const sampleCount = OPENAI_SAMPLE_RATE; // 1 second of audio
      const duration = calculateDuration(sampleCount, OPENAI_SAMPLE_RATE);

      expect(duration).toBe(1);
    });

    it('should calculate duration for half second', () => {
      const sampleCount = OPENAI_SAMPLE_RATE / 2;
      const duration = calculateDuration(sampleCount, OPENAI_SAMPLE_RATE);

      expect(duration).toBe(0.5);
    });

    it('should calculate duration for 100ms', () => {
      const sampleCount = OPENAI_SAMPLE_RATE * 0.1; // 100ms
      const duration = calculateDuration(sampleCount, OPENAI_SAMPLE_RATE);

      expect(duration).toBeCloseTo(0.1, 5);
    });

    it('should handle zero samples', () => {
      const duration = calculateDuration(0, OPENAI_SAMPLE_RATE);
      expect(duration).toBe(0);
    });
  });

  describe('calculateSampleCount', () => {
    it('should calculate sample count correctly', () => {
      const durationSeconds = 1;
      const sampleCount = calculateSampleCount(durationSeconds, OPENAI_SAMPLE_RATE);

      expect(sampleCount).toBe(OPENAI_SAMPLE_RATE);
    });

    it('should calculate sample count for half second', () => {
      const durationSeconds = 0.5;
      const sampleCount = calculateSampleCount(durationSeconds, OPENAI_SAMPLE_RATE);

      expect(sampleCount).toBe(OPENAI_SAMPLE_RATE / 2);
    });

    it('should calculate sample count for 100ms', () => {
      const durationSeconds = 0.1;
      const sampleCount = calculateSampleCount(durationSeconds, OPENAI_SAMPLE_RATE);

      expect(sampleCount).toBe(Math.floor(OPENAI_SAMPLE_RATE * 0.1));
    });

    it('should handle zero duration', () => {
      const sampleCount = calculateSampleCount(0, OPENAI_SAMPLE_RATE);
      expect(sampleCount).toBe(0);
    });
  });

  describe('duration and sample count roundtrip', () => {
    it('should convert duration to samples and back', () => {
      const originalDuration = 2.5; // 2.5 seconds

      const sampleCount = calculateSampleCount(originalDuration, OPENAI_SAMPLE_RATE);
      const resultDuration = calculateDuration(sampleCount, OPENAI_SAMPLE_RATE);

      // Account for floor rounding in calculateSampleCount
      expect(resultDuration).toBeCloseTo(originalDuration, 5);
    });
  });

  describe('OPENAI_SAMPLE_RATE constant', () => {
    it('should be 24kHz as required by OpenAI', () => {
      expect(OPENAI_SAMPLE_RATE).toBe(24000);
    });
  });
});

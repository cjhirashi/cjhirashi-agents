/**
 * Audio Processor
 *
 * Handles audio encoding/decoding for OpenAI Realtime API
 * Format: PCM16 (16-bit signed integer), 24kHz, mono
 *
 * Features:
 * - MediaStream to PCM16 encoding
 * - PCM16 to AudioBuffer decoding
 * - Sample rate conversion (native → 24kHz)
 * - Audio buffering and chunking
 * - Web Audio API integration
 *
 * Related: Phase 7 - Tarea 1 (OpenAI gpt-realtime Integration)
 */

import logger from '@/lib/logging/logger';

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/**
 * OpenAI Realtime API requires 24kHz PCM16
 */
export const OPENAI_SAMPLE_RATE = 24000;

/**
 * Number of audio channels (mono for voice)
 */
export const CHANNEL_COUNT = 1;

/**
 * Chunk size in milliseconds for processing
 */
export const CHUNK_DURATION_MS = 100; // 100ms chunks

/**
 * Bytes per sample (16-bit = 2 bytes)
 */
export const BYTES_PER_SAMPLE = 2;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface AudioProcessorOptions {
  sampleRate?: number;
  channelCount?: number;
  chunkDurationMs?: number;
  onAudioData?: (pcm16: Int16Array) => void;
  onError?: (error: Error) => void;
}

export interface AudioChunk {
  data: Int16Array;
  sampleRate: number;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════
// AUDIO PROCESSOR CLASS
// ═══════════════════════════════════════════════════════════

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sampleRate: number;
  private channelCount: number;
  private chunkDurationMs: number;
  private options: AudioProcessorOptions;
  private isProcessing = false;

  constructor(options: AudioProcessorOptions = {}) {
    this.sampleRate = options.sampleRate || OPENAI_SAMPLE_RATE;
    this.channelCount = options.channelCount || CHANNEL_COUNT;
    this.chunkDurationMs = options.chunkDurationMs || CHUNK_DURATION_MS;
    this.options = options;
  }

  /**
   * Start processing audio from MediaStream
   */
  async startProcessing(stream: MediaStream): Promise<void> {
    try {
      logger.info('[AudioProcessor] Starting audio processing', {
        sampleRate: this.sampleRate,
        channelCount: this.channelCount,
      });

      // Create AudioContext with desired sample rate
      this.audioContext = new AudioContext({
        sampleRate: this.sampleRate,
        latencyHint: 'interactive',
      });

      // Create source from MediaStream
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Create ScriptProcessorNode for raw audio access
      // Buffer size: 4096 samples (good balance between latency and performance)
      const bufferSize = 4096;
      this.processorNode = this.audioContext.createScriptProcessor(
        bufferSize,
        this.channelCount,
        this.channelCount
      );

      // Handle audio processing
      this.processorNode.onaudioprocess = (event) => {
        if (!this.isProcessing) return;

        try {
          const inputBuffer = event.inputBuffer;
          const channelData = inputBuffer.getChannelData(0); // Mono

          // Convert Float32 to Int16 (PCM16 format)
          const pcm16 = this.floatToPCM16(channelData);

          // Emit audio data
          if (this.options.onAudioData) {
            this.options.onAudioData(pcm16);
          }
        } catch (error) {
          logger.error('[AudioProcessor] Processing error', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          if (this.options.onError) {
            this.options.onError(
              error instanceof Error ? error : new Error('Unknown error')
            );
          }
        }
      };

      // Connect nodes
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isProcessing = true;

      logger.info('[AudioProcessor] Audio processing started', {
        contextSampleRate: this.audioContext.sampleRate,
        bufferSize,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');

      logger.error('[AudioProcessor] Failed to start processing', {
        error: err.message,
      });

      if (this.options.onError) {
        this.options.onError(err);
      }

      throw err;
    }
  }

  /**
   * Stop audio processing
   */
  stopProcessing(): void {
    logger.info('[AudioProcessor] Stopping audio processing');

    this.isProcessing = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Convert Float32Array to Int16Array (PCM16)
   */
  private floatToPCM16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length);

    for (let i = 0; i < float32.length; i++) {
      // Clamp to [-1, 1] range
      const clamped = Math.max(-1, Math.min(1, float32[i]));

      // Convert to 16-bit signed integer
      int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    return int16;
  }

  /**
   * Convert Int16Array (PCM16) to Float32Array
   */
  private pcm16ToFloat(int16: Int16Array): Float32Array {
    const float32 = new Float32Array(int16.length);

    for (let i = 0; i < int16.length; i++) {
      // Convert 16-bit signed integer to [-1, 1] range
      float32[i] = int16[i] < 0 ? int16[i] / 0x8000 : int16[i] / 0x7fff;
    }

    return float32;
  }

  /**
   * Check if processing is active
   */
  isActive(): boolean {
    return this.isProcessing && this.audioContext !== null;
  }

  /**
   * Get current AudioContext
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    logger.info('[AudioProcessor] Destroying audio processor');
    this.stopProcessing();
  }
}

// ═══════════════════════════════════════════════════════════
// AUDIO PLAYBACK CLASS
// ═══════════════════════════════════════════════════════════

export class AudioPlayback {
  private audioContext: AudioContext | null = null;
  private sampleRate: number;
  private bufferQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor(sampleRate: number = OPENAI_SAMPLE_RATE) {
    this.sampleRate = sampleRate;
  }

  /**
   * Initialize audio playback
   */
  async initialize(): Promise<void> {
    try {
      logger.info('[AudioPlayback] Initializing playback', {
        sampleRate: this.sampleRate,
      });

      this.audioContext = new AudioContext({
        sampleRate: this.sampleRate,
        latencyHint: 'interactive',
      });

      logger.info('[AudioPlayback] Playback initialized', {
        contextSampleRate: this.audioContext.sampleRate,
      });
    } catch (error) {
      logger.error('[AudioPlayback] Failed to initialize', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Play PCM16 audio data
   */
  async playPCM16(pcm16: Int16Array): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioPlayback not initialized');
    }

    try {
      // Convert PCM16 to Float32
      const float32 = this.pcm16ToFloat(pcm16);

      // Create AudioBuffer
      const audioBuffer = this.audioContext.createBuffer(
        CHANNEL_COUNT,
        float32.length,
        this.sampleRate
      );

      // Copy data to buffer
      audioBuffer.copyToChannel(float32 as Float32Array<ArrayBuffer>, 0);

      // Queue or play immediately
      if (this.isPlaying) {
        this.bufferQueue.push(audioBuffer);
      } else {
        await this.playBuffer(audioBuffer);
      }
    } catch (error) {
      logger.error('[AudioPlayback] Failed to play audio', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Play an AudioBuffer
   */
  private async playBuffer(buffer: AudioBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioPlayback not initialized');
    }

    return new Promise((resolve) => {
      const source = this.audioContext!.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext!.destination);

      source.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;

        // Play next buffer in queue
        if (this.bufferQueue.length > 0) {
          const nextBuffer = this.bufferQueue.shift()!;
          this.playBuffer(nextBuffer);
        }

        resolve();
      };

      this.currentSource = source;
      this.isPlaying = true;
      source.start(0);
    });
  }

  /**
   * Convert Int16Array (PCM16) to Float32Array
   */
  private pcm16ToFloat(int16: Int16Array): Float32Array {
    const float32 = new Float32Array(int16.length);

    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] < 0 ? int16[i] / 0x8000 : int16[i] / 0x7fff;
    }

    return float32;
  }

  /**
   * Stop playback
   */
  stop(): void {
    logger.info('[AudioPlayback] Stopping playback');

    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource.disconnect();
      this.currentSource = null;
    }

    this.bufferQueue = [];
    this.isPlaying = false;
  }

  /**
   * Check if audio is currently playing
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.bufferQueue.length;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    logger.info('[AudioPlayback] Destroying audio playback');

    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Create audio chunk from PCM16 data
 */
export function createAudioChunk(
  data: Int16Array,
  sampleRate: number = OPENAI_SAMPLE_RATE
): AudioChunk {
  return {
    data,
    sampleRate,
    timestamp: Date.now(),
  };
}

/**
 * Merge multiple audio chunks into one
 */
export function mergeAudioChunks(chunks: AudioChunk[]): AudioChunk {
  if (chunks.length === 0) {
    throw new Error('Cannot merge empty chunks array');
  }

  // Calculate total length
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.data.length, 0);

  // Create merged buffer
  const merged = new Int16Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk.data, offset);
    offset += chunk.data.length;
  }

  return {
    data: merged,
    sampleRate: chunks[0].sampleRate,
    timestamp: chunks[0].timestamp,
  };
}

/**
 * Convert base64 string to PCM16
 */
export function base64ToPCM16(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Int16Array(bytes.buffer);
}

/**
 * Convert PCM16 to base64 string
 */
export function pcm16ToBase64(pcm16: Int16Array): string {
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

/**
 * Calculate audio duration in seconds
 */
export function calculateDuration(
  sampleCount: number,
  sampleRate: number = OPENAI_SAMPLE_RATE
): number {
  return sampleCount / sampleRate;
}

/**
 * Calculate sample count from duration
 */
export function calculateSampleCount(
  durationSeconds: number,
  sampleRate: number = OPENAI_SAMPLE_RATE
): number {
  return Math.floor(durationSeconds * sampleRate);
}

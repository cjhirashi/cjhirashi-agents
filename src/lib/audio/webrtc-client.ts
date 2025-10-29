/**
 * WebRTC Audio Client
 *
 * Handles browser WebRTC API for audio capture and playback
 * Supports: Chrome, Firefox, Safari
 *
 * Features:
 * - Audio device enumeration
 * - getUserMedia for microphone access
 * - Audio stream management
 * - Device switching
 * - Error handling for permissions
 *
 * Related: Phase 7 - Tarea 1 (OpenAI gpt-realtime Integration)
 */

import logger from '@/lib/logging/logger';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  groupId: string;
}

export interface AudioConstraints {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
  channelCount?: number;
}

export interface WebRTCClientOptions {
  constraints?: AudioConstraints;
  onStreamReady?: (stream: MediaStream) => void;
  onDeviceChange?: (devices: AudioDevice[]) => void;
  onError?: (error: Error) => void;
}

// ═══════════════════════════════════════════════════════════
// DEFAULT AUDIO CONSTRAINTS
// ═══════════════════════════════════════════════════════════

const DEFAULT_CONSTRAINTS: AudioConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 24000, // OpenAI Realtime API requires 24kHz
  channelCount: 1, // Mono
};

// ═══════════════════════════════════════════════════════════
// WEBRTC CLIENT
// ═══════════════════════════════════════════════════════════

export class WebRTCClient {
  private stream: MediaStream | null = null;
  private constraints: AudioConstraints;
  private selectedDeviceId: string | null = null;
  private options: WebRTCClientOptions;

  constructor(options: WebRTCClientOptions = {}) {
    this.constraints = {
      ...DEFAULT_CONSTRAINTS,
      ...options.constraints,
    };
    this.options = options;

    // Listen for device changes
    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.handleDeviceChange();
      });
    }
  }

  /**
   * Check if WebRTC is supported in current browser
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof navigator.mediaDevices.enumerateDevices === 'function'
    );
  }

  /**
   * Request microphone permission and start audio capture
   */
  async startAudioCapture(deviceId?: string): Promise<MediaStream> {
    try {
      logger.info('[WebRTC] Starting audio capture', {
        deviceId,
        constraints: this.constraints,
      });

      // Check browser support
      if (!WebRTCClient.isSupported()) {
        throw new Error('WebRTC not supported in this browser');
      }

      // Build media constraints
      const mediaConstraints: MediaStreamConstraints = {
        audio: deviceId
          ? {
              deviceId: { exact: deviceId },
              ...this.constraints,
            }
          : this.constraints,
        video: false,
      };

      // Request user media
      const stream = await navigator.mediaDevices.getUserMedia(
        mediaConstraints
      );

      this.stream = stream;
      this.selectedDeviceId = deviceId || null;

      logger.info('[WebRTC] Audio capture started', {
        streamId: stream.id,
        tracks: stream.getAudioTracks().length,
      });

      // Notify callback
      if (this.options.onStreamReady) {
        this.options.onStreamReady(stream);
      }

      return stream;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');

      logger.error('[WebRTC] Failed to start audio capture', {
        error: err.message,
        name: err.name,
      });

      // Notify error callback
      if (this.options.onError) {
        this.options.onError(err);
      }

      throw err;
    }
  }

  /**
   * Stop audio capture and release microphone
   */
  stopAudioCapture(): void {
    if (this.stream) {
      logger.info('[WebRTC] Stopping audio capture', {
        streamId: this.stream.id,
      });

      // Stop all tracks
      this.stream.getTracks().forEach((track) => {
        track.stop();
      });

      this.stream = null;
      this.selectedDeviceId = null;
    }
  }

  /**
   * Get current audio stream
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Check if audio is currently being captured
   */
  isCapturing(): boolean {
    return this.stream !== null && this.stream.active;
  }

  /**
   * Enumerate available audio devices
   */
  async getAudioDevices(): Promise<{
    inputs: AudioDevice[];
    outputs: AudioDevice[];
  }> {
    try {
      logger.info('[WebRTC] Enumerating audio devices');

      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('Device enumeration not supported');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();

      const inputs: AudioDevice[] = [];
      const outputs: AudioDevice[] = [];

      devices.forEach((device) => {
        if (device.kind === 'audioinput') {
          inputs.push({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${inputs.length + 1}`,
            kind: 'audioinput',
            groupId: device.groupId,
          });
        } else if (device.kind === 'audiooutput') {
          outputs.push({
            deviceId: device.deviceId,
            label: device.label || `Speaker ${outputs.length + 1}`,
            kind: 'audiooutput',
            groupId: device.groupId,
          });
        }
      });

      logger.info('[WebRTC] Audio devices found', {
        inputs: inputs.length,
        outputs: outputs.length,
      });

      return { inputs, outputs };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');

      logger.error('[WebRTC] Failed to enumerate devices', {
        error: err.message,
      });

      throw err;
    }
  }

  /**
   * Switch to a different audio input device
   */
  async switchDevice(deviceId: string): Promise<MediaStream> {
    logger.info('[WebRTC] Switching audio device', { deviceId });

    // Stop current stream
    this.stopAudioCapture();

    // Start with new device
    return this.startAudioCapture(deviceId);
  }

  /**
   * Get audio level (volume) from current stream
   * Returns value between 0 and 1
   */
  getAudioLevel(): number {
    if (!this.stream) {
      return 0;
    }

    const audioTrack = this.stream.getAudioTracks()[0];
    if (!audioTrack) {
      return 0;
    }

    // Create AudioContext if needed (for volume analysis)
    // This is a simplified version - real implementation would use Web Audio API
    return audioTrack.enabled ? 0.5 : 0;
  }

  /**
   * Mute/unmute microphone
   */
  setMuted(muted: boolean): void {
    if (!this.stream) {
      return;
    }

    logger.info('[WebRTC] Setting mute state', { muted });

    this.stream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  /**
   * Check if microphone is currently muted
   */
  isMuted(): boolean {
    if (!this.stream) {
      return true;
    }

    const audioTrack = this.stream.getAudioTracks()[0];
    return audioTrack ? !audioTrack.enabled : true;
  }

  /**
   * Get current audio constraints
   */
  getConstraints(): AudioConstraints {
    return { ...this.constraints };
  }

  /**
   * Update audio constraints (requires restart)
   */
  updateConstraints(newConstraints: Partial<AudioConstraints>): void {
    this.constraints = {
      ...this.constraints,
      ...newConstraints,
    };

    logger.info('[WebRTC] Audio constraints updated', {
      constraints: this.constraints,
    });
  }

  /**
   * Handle device change event
   */
  private async handleDeviceChange(): Promise<void> {
    logger.info('[WebRTC] Device change detected');

    try {
      const devices = await this.getAudioDevices();

      // Notify callback
      if (this.options.onDeviceChange) {
        this.options.onDeviceChange([...devices.inputs, ...devices.outputs]);
      }

      // Check if selected device is still available
      if (this.selectedDeviceId) {
        const deviceStillExists = devices.inputs.some(
          (d) => d.deviceId === this.selectedDeviceId
        );

        if (!deviceStillExists && this.isCapturing()) {
          logger.warn('[WebRTC] Selected device disconnected, restarting with default');
          // Restart with default device
          this.stopAudioCapture();
          await this.startAudioCapture();
        }
      }
    } catch (error) {
      logger.error('[WebRTC] Error handling device change', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    logger.info('[WebRTC] Destroying WebRTC client');

    this.stopAudioCapture();

    // Remove event listener
    if (navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', () => {
        this.handleDeviceChange();
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════
// PERMISSION HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Check current microphone permission status
 */
export async function checkMicrophonePermission(): Promise<PermissionState> {
  if (!navigator.permissions || !navigator.permissions.query) {
    // Fallback for browsers that don't support Permissions API
    return 'prompt';
  }

  try {
    const result = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    });
    return result.state;
  } catch (error) {
    logger.warn('[WebRTC] Permission query failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 'prompt';
  }
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    logger.info('[WebRTC] Requesting microphone permission');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    // Permission granted, stop the stream immediately
    stream.getTracks().forEach((track) => track.stop());

    logger.info('[WebRTC] Microphone permission granted');
    return true;
  } catch (error) {
    logger.error('[WebRTC] Microphone permission denied', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

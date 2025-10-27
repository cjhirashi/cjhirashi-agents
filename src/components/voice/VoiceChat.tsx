'use client';

/**
 * VoiceChat Component
 *
 * Main component for voice conversations with AI agents
 * Integrates WebRTC audio capture + OpenAI Realtime API
 *
 * Features:
 * - Real-time voice conversation
 * - Audio waveform visualization
 * - Device selection (mic/speakers)
 * - Mute/unmute controls
 * - Transcript display
 * - Connection status
 *
 * Related: Phase 7 - Tarea 1 (OpenAI gpt-realtime Integration)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { WebRTCClient } from '@/lib/audio/webrtc-client';
import { AudioProcessor, AudioPlayback } from '@/lib/audio/audio-processor';
import { OpenAIRealtimeClient } from '@/lib/ai/openai-realtime';
import AudioWaveform from './AudioWaveform';
import VoiceControls from './VoiceControls';
import logger from '@/lib/logging/logger';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface VoiceChatProps {
  agentId: string;
  agentName: string;
  instructions?: string;
  onError?: (error: Error) => void;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ═══════════════════════════════════════════════════════════
// VOICE CHAT COMPONENT
// ═══════════════════════════════════════════════════════════

export default function VoiceChat({
  agentId,
  agentName,
  instructions,
  onError,
  onTranscript,
}: VoiceChatProps) {
  // State
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const webrtcClient = useRef<WebRTCClient | null>(null);
  const audioProcessor = useRef<AudioProcessor | null>(null);
  const audioPlayback = useRef<AudioPlayback | null>(null);
  const realtimeClient = useRef<OpenAIRealtimeClient | null>(null);

  /**
   * Initialize voice chat
   */
  const initialize = useCallback(async () => {
    try {
      setStatus('connecting');
      setError(null);

      logger.info('[VoiceChat] Initializing voice chat', { agentId });

      // Check WebRTC support
      if (!WebRTCClient.isSupported()) {
        throw new Error('WebRTC not supported in this browser');
      }

      // Get API key from backend
      const response = await fetch(`/api/v1/voice/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create voice session');
      }

      const { apiKey, sessionId } = await response.json();

      // Initialize WebRTC client
      webrtcClient.current = new WebRTCClient({
        onError: (err) => {
          logger.error('[VoiceChat] WebRTC error', { error: err.message });
          handleError(err);
        },
      });

      // Initialize audio processor
      audioProcessor.current = new AudioProcessor({
        onAudioData: (pcm16) => {
          // Send audio to OpenAI Realtime API
          if (realtimeClient.current?.isConnectionActive()) {
            realtimeClient.current.sendAudio(pcm16);
          }
        },
        onError: (err) => {
          logger.error('[VoiceChat] Audio processor error', { error: err.message });
          handleError(err);
        },
      });

      // Initialize audio playback
      audioPlayback.current = new AudioPlayback();
      await audioPlayback.current.initialize();

      // Initialize OpenAI Realtime client
      realtimeClient.current = new OpenAIRealtimeClient({
        apiKey,
        sessionConfig: {
          instructions:
            instructions ||
            `You are ${agentName}, a helpful AI assistant. Have natural voice conversations with the user.`,
          voice: 'alloy',
          turnDetection: {
            type: 'server_vad',
            threshold: 0.5,
            prefixPaddingMs: 300,
            silenceDurationMs: 500,
          },
        },
        onOpen: () => {
          logger.info('[VoiceChat] Realtime connection opened');
          setStatus('connected');
        },
        onClose: () => {
          logger.info('[VoiceChat] Realtime connection closed');
          setStatus('disconnected');
        },
        onError: (err) => {
          logger.error('[VoiceChat] Realtime error', { error: err.message });
          handleError(err);
        },
        onAudioDelta: (pcm16) => {
          // Play received audio
          if (audioPlayback.current) {
            audioPlayback.current.playPCM16(pcm16);
          }
        },
        onTranscriptDelta: (delta) => {
          setAssistantTranscript((prev) => prev + delta);
        },
        onTranscriptDone: (transcript) => {
          logger.info('[VoiceChat] Assistant transcript done', {
            length: transcript.length,
          });

          if (onTranscript) {
            onTranscript(transcript, 'assistant');
          }

          // Clear transcript after delay
          setTimeout(() => {
            setAssistantTranscript('');
          }, 3000);
        },
      });

      // Connect to OpenAI Realtime API
      await realtimeClient.current.connect();

      logger.info('[VoiceChat] Voice chat initialized successfully');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      logger.error('[VoiceChat] Initialization failed', { error: error.message });
      handleError(error);
    }
  }, [agentId, agentName, instructions, onTranscript]);

  /**
   * Start listening (capture audio)
   */
  const startListening = useCallback(async () => {
    try {
      if (!webrtcClient.current || !audioProcessor.current) {
        throw new Error('Voice chat not initialized');
      }

      logger.info('[VoiceChat] Starting to listen');

      // Start audio capture
      const stream = await webrtcClient.current.startAudioCapture();

      // Start audio processing
      await audioProcessor.current.startProcessing(stream);

      setIsListening(true);
      setUserTranscript('');

      logger.info('[VoiceChat] Listening started');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      logger.error('[VoiceChat] Failed to start listening', { error: error.message });
      handleError(error);
    }
  }, []);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    try {
      logger.info('[VoiceChat] Stopping listening');

      if (audioProcessor.current) {
        audioProcessor.current.stopProcessing();
      }

      if (webrtcClient.current) {
        webrtcClient.current.stopAudioCapture();
      }

      // Commit audio buffer to trigger response
      if (realtimeClient.current?.isConnectionActive()) {
        realtimeClient.current.commitAudio();
      }

      setIsListening(false);

      logger.info('[VoiceChat] Listening stopped');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      logger.error('[VoiceChat] Failed to stop listening', { error: error.message });
      handleError(error);
    }
  }, []);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    if (!webrtcClient.current) return;

    const newMutedState = !isMuted;
    webrtcClient.current.setMuted(newMutedState);
    setIsMuted(newMutedState);

    logger.info('[VoiceChat] Mute toggled', { muted: newMutedState });
  }, [isMuted]);

  /**
   * Handle errors
   */
  const handleError = useCallback(
    (err: Error) => {
      setError(err.message);
      setStatus('error');

      if (onError) {
        onError(err);
      }
    },
    [onError]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      logger.info('[VoiceChat] Cleaning up resources');

      if (audioProcessor.current) {
        audioProcessor.current.destroy();
      }

      if (audioPlayback.current) {
        audioPlayback.current.destroy();
      }

      if (webrtcClient.current) {
        webrtcClient.current.destroy();
      }

      if (realtimeClient.current) {
        realtimeClient.current.disconnect();
      }
    };
  }, []);

  /**
   * Update audio level (for visualization)
   */
  useEffect(() => {
    if (!isListening || !webrtcClient.current) return;

    const interval = setInterval(() => {
      const level = webrtcClient.current?.getAudioLevel() || 0;
      setAudioLevel(level);
    }, 100);

    return () => clearInterval(interval);
  }, [isListening]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Voice Chat with {agentName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Status:{' '}
            <span
              className={`font-medium ${
                status === 'connected'
                  ? 'text-green-600'
                  : status === 'connecting'
                  ? 'text-yellow-600'
                  : status === 'error'
                  ? 'text-red-600'
                  : 'text-gray-600'
              }`}
            >
              {status}
            </span>
          </p>
        </div>

        {/* Connection button */}
        {status === 'disconnected' && (
          <button
            onClick={initialize}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect
          </button>
        )}

        {status === 'connected' && (
          <button
            onClick={() => {
              if (realtimeClient.current) {
                realtimeClient.current.disconnect();
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
        {/* Audio waveform */}
        <AudioWaveform audioLevel={audioLevel} isActive={isListening} />

        {/* Transcripts */}
        <div className="w-full max-w-2xl space-y-3">
          {userTranscript && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                You:
              </p>
              <p className="text-gray-800 dark:text-gray-200">{userTranscript}</p>
            </div>
          )}

          {assistantTranscript && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                {agentName}:
              </p>
              <p className="text-gray-800 dark:text-gray-200">{assistantTranscript}</p>
            </div>
          )}
        </div>

        {/* Voice controls */}
        <VoiceControls
          isConnected={status === 'connected'}
          isListening={isListening}
          isMuted={isMuted}
          onStartListening={startListening}
          onStopListening={stopListening}
          onToggleMute={toggleMute}
        />
      </div>
    </div>
  );
}

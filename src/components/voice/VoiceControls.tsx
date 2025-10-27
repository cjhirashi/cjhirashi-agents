'use client';

/**
 * VoiceControls Component
 *
 * Control buttons for voice chat
 * - Push-to-talk / Hold-to-talk button
 * - Mute/Unmute toggle
 * - Device selection dropdown
 *
 * Related: Phase 7 - Tarea 1 (OpenAI gpt-realtime Integration)
 */

import { useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface VoiceControlsProps {
  isConnected: boolean;
  isListening: boolean;
  isMuted: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onToggleMute: () => void;
}

// ═══════════════════════════════════════════════════════════
// VOICE CONTROLS COMPONENT
// ═══════════════════════════════════════════════════════════

export default function VoiceControls({
  isConnected,
  isListening,
  isMuted,
  onStartListening,
  onStopListening,
  onToggleMute,
}: VoiceControlsProps) {
  const [mode, setMode] = useState<'push-to-talk' | 'hold-to-talk'>('push-to-talk');

  /**
   * Handle push-to-talk button click
   */
  const handlePushToTalk = () => {
    if (mode === 'push-to-talk') {
      if (isListening) {
        onStopListening();
      } else {
        onStartListening();
      }
    }
  };

  /**
   * Handle hold-to-talk button press
   */
  const handleHoldStart = () => {
    if (mode === 'hold-to-talk' && !isListening) {
      onStartListening();
    }
  };

  /**
   * Handle hold-to-talk button release
   */
  const handleHoldEnd = () => {
    if (mode === 'hold-to-talk' && isListening) {
      onStopListening();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Mode selector */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
        <button
          onClick={() => setMode('push-to-talk')}
          className={`px-3 py-1 rounded-lg transition-colors ${
            mode === 'push-to-talk'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Push to Talk
        </button>
        <button
          onClick={() => setMode('hold-to-talk')}
          className={`px-3 py-1 rounded-lg transition-colors ${
            mode === 'hold-to-talk'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          Hold to Talk
        </button>
      </div>

      {/* Main controls */}
      <div className="flex items-center space-x-4">
        {/* Mute toggle */}
        <button
          onClick={onToggleMute}
          disabled={!isConnected}
          className={`p-4 rounded-full transition-all ${
            isMuted
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>

        {/* Push/Hold to talk button */}
        <button
          onClick={handlePushToTalk}
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
          disabled={!isConnected || isMuted}
          className={`relative p-8 rounded-full transition-all transform ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-xl shadow-red-500/50'
              : 'bg-blue-500 hover:bg-blue-600 scale-100 shadow-lg'
          } text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100`}
          title={
            mode === 'push-to-talk'
              ? isListening
                ? 'Stop Talking'
                : 'Start Talking'
              : 'Hold to Talk'
          }
        >
          {isListening ? <MicOff size={32} /> : <Mic size={32} />}

          {/* Pulsing ring when listening */}
          {isListening && (
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
          )}
        </button>
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
        {!isConnected
          ? 'Connect to start voice chat'
          : isMuted
          ? 'Unmute to talk'
          : mode === 'push-to-talk'
          ? isListening
            ? 'Click again or wait to stop'
            : 'Click the microphone to start talking'
          : 'Press and hold the microphone to talk'}
      </p>
    </div>
  );
}

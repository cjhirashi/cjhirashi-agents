/**
 * OpenAI Realtime API Client
 *
 * WebSocket-based client for OpenAI's Realtime API (gpt-4o-realtime)
 * Supports voice conversations with low-latency streaming
 *
 * Features:
 * - WebSocket connection management
 * - Audio streaming (input/output)
 * - Function calling support
 * - Session configuration
 * - Event handling (conversation, audio, errors)
 *
 * API Reference: https://platform.openai.com/docs/api-reference/realtime
 *
 * Related: Phase 7 - Tarea 1 (OpenAI gpt-realtime Integration)
 */

import logger from '@/lib/logging/logger';
import { pcm16ToBase64, base64ToPCM16 } from '@/lib/audio/audio-processor';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type RealtimeModel = 'gpt-4o-realtime-preview' | 'gpt-4o-realtime-preview-2024-10-01';

export type Voice = 'alloy' | 'echo' | 'shimmer';

export type AudioFormat = 'pcm16' | 'g711_ulaw' | 'g711_alaw';

export type Modality = 'text' | 'audio';

export interface RealtimeSessionConfig {
  model?: RealtimeModel;
  voice?: Voice;
  instructions?: string;
  inputAudioFormat?: AudioFormat;
  outputAudioFormat?: AudioFormat;
  inputAudioTranscription?: {
    model: 'whisper-1';
  } | null;
  turnDetection?: {
    type: 'server_vad';
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
  } | null;
  tools?: RealtimeTool[];
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; name: string };
  temperature?: number;
  maxResponseOutputTokens?: number | 'inf';
  modalities?: Modality[];
}

export interface RealtimeTool {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface RealtimeClientOptions {
  apiKey: string;
  sessionConfig?: RealtimeSessionConfig;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  onAudioDelta?: (audio: Int16Array) => void;
  onTranscriptDelta?: (delta: string) => void;
  onTranscriptDone?: (transcript: string) => void;
  onFunctionCall?: (call: FunctionCall) => Promise<unknown>;
}

export interface FunctionCall {
  callId: string;
  name: string;
  arguments: string;
}

export interface ConversationItem {
  id: string;
  type: 'message' | 'function_call' | 'function_call_output';
  status: 'in_progress' | 'completed' | 'incomplete';
  role?: 'user' | 'assistant' | 'system';
  content?: Array<{
    type: 'input_text' | 'input_audio' | 'text' | 'audio';
    text?: string;
    transcript?: string;
    audio?: string; // base64
  }>;
}

// ═══════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════

interface BaseEvent {
  event_id?: string;
}

interface SessionCreatedEvent extends BaseEvent {
  type: 'session.created';
  session: {
    id: string;
    model: string;
    modalities: Modality[];
    instructions: string;
    voice: Voice;
    input_audio_format: AudioFormat;
    output_audio_format: AudioFormat;
    turn_detection: unknown;
    tools: RealtimeTool[];
  };
}

interface ConversationItemCreatedEvent extends BaseEvent {
  type: 'conversation.item.created';
  item: ConversationItem;
}

interface ResponseAudioDeltaEvent extends BaseEvent {
  type: 'response.audio.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string; // base64 PCM16 audio
}

interface ResponseAudioTranscriptDeltaEvent extends BaseEvent {
  type: 'response.audio_transcript.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
}

interface ResponseAudioTranscriptDoneEvent extends BaseEvent {
  type: 'response.audio_transcript.done';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  transcript: string;
}

interface ResponseFunctionCallArgumentsDeltaEvent extends BaseEvent {
  type: 'response.function_call_arguments.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  call_id: string;
  delta: string;
}

interface ResponseFunctionCallArgumentsDoneEvent extends BaseEvent {
  type: 'response.function_call_arguments.done';
  response_id: string;
  item_id: string;
  output_index: number;
  call_id: string;
  name: string;
  arguments: string;
}

interface ErrorEvent extends BaseEvent {
  type: 'error';
  error: {
    type: string;
    code: string;
    message: string;
    param?: string;
  };
}

type RealtimeEvent =
  | SessionCreatedEvent
  | ConversationItemCreatedEvent
  | ResponseAudioDeltaEvent
  | ResponseAudioTranscriptDeltaEvent
  | ResponseAudioTranscriptDoneEvent
  | ResponseFunctionCallArgumentsDeltaEvent
  | ResponseFunctionCallArgumentsDoneEvent
  | ErrorEvent;

// ═══════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════

const DEFAULT_SESSION_CONFIG: RealtimeSessionConfig = {
  model: 'gpt-4o-realtime-preview-2024-10-01',
  voice: 'alloy',
  inputAudioFormat: 'pcm16',
  outputAudioFormat: 'pcm16',
  inputAudioTranscription: {
    model: 'whisper-1',
  },
  turnDetection: {
    type: 'server_vad',
    threshold: 0.5,
    prefixPaddingMs: 300,
    silenceDurationMs: 500,
  },
  temperature: 0.8,
  maxResponseOutputTokens: 4096,
  modalities: ['text', 'audio'],
};

const WEBSOCKET_URL = 'wss://api.openai.com/v1/realtime';

// ═══════════════════════════════════════════════════════════
// OPENAI REALTIME CLIENT
// ═══════════════════════════════════════════════════════════

export class OpenAIRealtimeClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private sessionConfig: RealtimeSessionConfig;
  private options: RealtimeClientOptions;
  private isConnected = false;
  private sessionId: string | null = null;
  private pendingFunctionCalls = new Map<string, FunctionCall>();

  constructor(options: RealtimeClientOptions) {
    this.apiKey = options.apiKey;
    this.sessionConfig = {
      ...DEFAULT_SESSION_CONFIG,
      ...options.sessionConfig,
    };
    this.options = options;
  }

  /**
   * Connect to OpenAI Realtime API
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        logger.info('[OpenAI Realtime] Connecting to Realtime API');

        // Build WebSocket URL with auth
        const url = `${WEBSOCKET_URL}?model=${this.sessionConfig.model}`;

        // Create WebSocket connection
        // NOTE: Browser WebSocket doesn't support custom headers.
        // Authentication should be handled by the backend proxy or through
        // the OpenAI session configuration after connection is established.
        this.ws = new WebSocket(url);

        // Handle connection open
        this.ws.onopen = () => {
          logger.info('[OpenAI Realtime] WebSocket connected');
          this.isConnected = true;

          // Send session update to configure
          this.updateSession(this.sessionConfig);

          if (this.options.onOpen) {
            this.options.onOpen();
          }

          resolve();
        };

        // Handle messages
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        // Handle errors
        this.ws.onerror = (error) => {
          logger.error('[OpenAI Realtime] WebSocket error', { error });
          const err = new Error('WebSocket connection error');

          if (this.options.onError) {
            this.options.onError(err);
          }

          reject(err);
        };

        // Handle close
        this.ws.onclose = (event) => {
          logger.info('[OpenAI Realtime] WebSocket closed', {
            code: event.code,
            reason: event.reason,
          });

          this.isConnected = false;
          this.sessionId = null;

          if (this.options.onClose) {
            this.options.onClose();
          }
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error('[OpenAI Realtime] Failed to connect', {
          error: err.message,
        });

        if (this.options.onError) {
          this.options.onError(err);
        }

        reject(err);
      }
    });
  }

  /**
   * Disconnect from Realtime API
   */
  disconnect(): void {
    logger.info('[OpenAI Realtime] Disconnecting');

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.sessionId = null;
  }

  /**
   * Update session configuration
   */
  updateSession(config: Partial<RealtimeSessionConfig>): void {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to Realtime API');
    }

    logger.info('[OpenAI Realtime] Updating session', { config });

    this.sessionConfig = {
      ...this.sessionConfig,
      ...config,
    };

    this.send({
      type: 'session.update',
      session: this.sessionConfig,
    });
  }

  /**
   * Send audio data (PCM16)
   */
  sendAudio(pcm16: Int16Array): void {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to Realtime API');
    }

    // Convert to base64
    const base64Audio = pcm16ToBase64(pcm16);

    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    });
  }

  /**
   * Commit audio buffer (trigger response)
   */
  commitAudio(): void {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to Realtime API');
    }

    logger.info('[OpenAI Realtime] Committing audio buffer');

    this.send({
      type: 'input_audio_buffer.commit',
    });

    // Create response
    this.send({
      type: 'response.create',
    });
  }

  /**
   * Cancel current response
   */
  cancelResponse(): void {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to Realtime API');
    }

    logger.info('[OpenAI Realtime] Cancelling response');

    this.send({
      type: 'response.cancel',
    });
  }

  /**
   * Send text message
   */
  sendText(text: string): void {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to Realtime API');
    }

    logger.info('[OpenAI Realtime] Sending text message', {
      length: text.length,
    });

    // Create conversation item
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text,
          },
        ],
      },
    });

    // Create response
    this.send({
      type: 'response.create',
    });
  }

  /**
   * Submit function call output
   */
  submitFunctionOutput(callId: string, output: unknown): void {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to Realtime API');
    }

    logger.info('[OpenAI Realtime] Submitting function output', { callId });

    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(output),
      },
    });

    // Create response to continue conversation
    this.send({
      type: 'response.create',
    });
  }

  /**
   * Check if connected
   */
  isConnectionActive(): boolean {
    return this.isConnected && this.ws !== null;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Send event to WebSocket
   */
  private send(event: Record<string, unknown>): void {
    if (!this.ws || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify(event));
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(data: string): Promise<void> {
    try {
      const event = JSON.parse(data) as RealtimeEvent;

      // Log event for debugging
      if (event.type !== 'response.audio.delta') {
        // Too verbose
        logger.debug('[OpenAI Realtime] Event received', { type: event.type });
      }

      switch (event.type) {
        case 'session.created':
          this.handleSessionCreated(event);
          break;

        case 'response.audio.delta':
          this.handleAudioDelta(event);
          break;

        case 'response.audio_transcript.delta':
          this.handleTranscriptDelta(event);
          break;

        case 'response.audio_transcript.done':
          this.handleTranscriptDone(event);
          break;

        case 'response.function_call_arguments.done':
          await this.handleFunctionCall(event);
          break;

        case 'error':
          this.handleError(event);
          break;

        default:
          // Log other events for debugging
          logger.debug('[OpenAI Realtime] Unhandled event', { event });
      }
    } catch (error) {
      logger.error('[OpenAI Realtime] Failed to handle message', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle session created
   */
  private handleSessionCreated(event: SessionCreatedEvent): void {
    this.sessionId = event.session.id;

    logger.info('[OpenAI Realtime] Session created', {
      sessionId: this.sessionId,
      model: event.session.model,
    });
  }

  /**
   * Handle audio delta
   */
  private handleAudioDelta(event: ResponseAudioDeltaEvent): void {
    if (!this.options.onAudioDelta) return;

    try {
      // Decode base64 to PCM16
      const pcm16 = base64ToPCM16(event.delta);

      // Emit to callback
      this.options.onAudioDelta(pcm16);
    } catch (error) {
      logger.error('[OpenAI Realtime] Failed to decode audio delta', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle transcript delta
   */
  private handleTranscriptDelta(event: ResponseAudioTranscriptDeltaEvent): void {
    if (!this.options.onTranscriptDelta) return;

    this.options.onTranscriptDelta(event.delta);
  }

  /**
   * Handle transcript done
   */
  private handleTranscriptDone(event: ResponseAudioTranscriptDoneEvent): void {
    if (!this.options.onTranscriptDone) return;

    this.options.onTranscriptDone(event.transcript);
  }

  /**
   * Handle function call
   */
  private async handleFunctionCall(
    event: ResponseFunctionCallArgumentsDoneEvent
  ): Promise<void> {
    if (!this.options.onFunctionCall) {
      logger.warn('[OpenAI Realtime] Function call received but no handler defined');
      return;
    }

    const functionCall: FunctionCall = {
      callId: event.call_id,
      name: event.name,
      arguments: event.arguments,
    };

    logger.info('[OpenAI Realtime] Function call received', {
      callId: functionCall.callId,
      name: functionCall.name,
    });

    try {
      // Execute function call
      const result = await this.options.onFunctionCall(functionCall);

      // Submit result back
      this.submitFunctionOutput(functionCall.callId, result);
    } catch (error) {
      logger.error('[OpenAI Realtime] Function call execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        callId: functionCall.callId,
      });

      // Submit error as output
      this.submitFunctionOutput(functionCall.callId, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle error event
   */
  private handleError(event: ErrorEvent): void {
    const error = new Error(
      `OpenAI Realtime API error: ${event.error.message} (${event.error.code})`
    );

    logger.error('[OpenAI Realtime] API error', {
      type: event.error.type,
      code: event.error.code,
      message: event.error.message,
    });

    if (this.options.onError) {
      this.options.onError(error);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Create a Realtime client with default config
 */
export function createRealtimeClient(
  apiKey: string,
  options?: Partial<RealtimeClientOptions>
): OpenAIRealtimeClient {
  return new OpenAIRealtimeClient({
    apiKey,
    ...options,
  });
}

/**
 * Validate API key format
 */
export function isValidApiKey(apiKey: string): boolean {
  return apiKey.startsWith('sk-') && apiKey.length > 20;
}

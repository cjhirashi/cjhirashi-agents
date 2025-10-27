/**
 * DALL-E 3 API Client
 *
 * Wrapper for OpenAI DALL-E 3 image generation API
 *
 * Features:
 * - Image generation with configurable parameters
 * - Error handling (rate limits, content policy)
 * - Retry logic with exponential backoff
 * - Response validation
 *
 * API Reference: https://platform.openai.com/docs/api-reference/images
 *
 * Related: Phase 7 - Tarea 2 (DALL-E 3 Integration)
 */

import logger from '@/lib/logging/logger';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';
export type ImageQuality = 'standard' | 'hd';
export type ImageStyle = 'vivid' | 'natural';

export interface DALLE3GenerateOptions {
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
  n?: 1; // DALL-E 3 only supports n=1
  user?: string;
}

export interface DALLE3GenerateResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}

export interface GenerateImageResult {
  url: string;
  revisedPrompt?: string;
  created: Date;
}

// ═══════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════

export class DALLE3Error extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'DALLE3Error';
  }
}

export class ContentPolicyViolationError extends DALLE3Error {
  constructor(message: string) {
    super(message, 'content_policy_violation', 400);
    this.name = 'ContentPolicyViolationError';
  }
}

export class RateLimitError extends DALLE3Error {
  constructor(message: string) {
    super(message, 'rate_limit_exceeded', 429);
    this.name = 'RateLimitError';
  }
}

// ═══════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════

const DEFAULT_OPTIONS: Partial<DALLE3GenerateOptions> = {
  size: '1024x1024',
  quality: 'standard',
  style: 'vivid',
  n: 1,
};

const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// ═══════════════════════════════════════════════════════════
// DALL-E 3 CLIENT
// ═══════════════════════════════════════════════════════════

export class DALLE3Client {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL: string = OPENAI_API_URL) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  /**
   * Generate image with DALL-E 3
   */
  async generateImage(
    options: DALLE3GenerateOptions
  ): Promise<GenerateImageResult> {
    const startTime = Date.now();

    // Merge with defaults
    const config = {
      ...DEFAULT_OPTIONS,
      ...options,
      model: 'dall-e-3',
    };

    logger.info('[DALL-E 3] Generating image', {
      prompt: config.prompt.substring(0, 100),
      size: config.size,
      quality: config.quality,
      style: config.style,
    });

    try {
      // Validate prompt
      this.validatePrompt(config.prompt);

      // Generate with retry logic
      const response = await this.generateWithRetry(config);

      const duration = Date.now() - startTime;

      logger.info('[DALL-E 3] Image generated successfully', {
        duration,
        revised: !!response.data[0].revised_prompt,
      });

      return {
        url: response.data[0].url,
        revisedPrompt: response.data[0].revised_prompt,
        created: new Date(response.created * 1000),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('[DALL-E 3] Generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      throw error;
    }
  }

  /**
   * Generate with retry logic
   */
  private async generateWithRetry(
    config: DALLE3GenerateOptions & { model: string },
    attempt: number = 1
  ): Promise<DALLE3GenerateResponse> {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(config),
      });

      // Handle errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw await this.handleAPIError(response.status, errorData);
      }

      // Parse response
      const data: DALLE3GenerateResponse = await response.json();

      // Validate response
      if (!data.data || data.data.length === 0 || !data.data[0].url) {
        throw new DALLE3Error('Invalid API response: missing image URL');
      }

      return data;
    } catch (error) {
      // Retry on rate limit or server errors
      if (
        error instanceof RateLimitError ||
        (error instanceof DALLE3Error && error.statusCode && error.statusCode >= 500)
      ) {
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);

          logger.warn('[DALL-E 3] Retrying after error', {
            attempt,
            delay,
            error: error.message,
          });

          await this.sleep(delay);
          return this.generateWithRetry(config, attempt + 1);
        }
      }

      throw error;
    }
  }

  /**
   * Handle API errors
   */
  private async handleAPIError(status: number, errorData: unknown): Promise<Error> {
    const error = errorData as { error?: { message?: string; code?: string } };
    const message = error.error?.message || 'Unknown error';
    const code = error.error?.code;

    logger.error('[DALL-E 3] API error', {
      status,
      code,
      message,
    });

    // Content policy violation
    if (status === 400 && message.toLowerCase().includes('content policy')) {
      return new ContentPolicyViolationError(
        'Your prompt was rejected due to content policy. Please try a different description.'
      );
    }

    // Rate limit
    if (status === 429) {
      return new RateLimitError(
        'Rate limit exceeded. Please wait a moment and try again.'
      );
    }

    // Other errors
    return new DALLE3Error(message, code, status);
  }

  /**
   * Validate prompt
   */
  private validatePrompt(prompt: string): void {
    if (!prompt || prompt.trim().length === 0) {
      throw new DALLE3Error('Prompt cannot be empty');
    }

    if (prompt.length > 4000) {
      throw new DALLE3Error('Prompt is too long (max 4000 characters)');
    }

    // Basic content policy checks (pre-validation)
    const flaggedTerms = [
      'nude',
      'naked',
      'nsfw',
      'explicit',
      'violence',
      'blood',
      'gore',
    ];

    const lowerPrompt = prompt.toLowerCase();
    const containsFlagged = flaggedTerms.some((term) => lowerPrompt.includes(term));

    if (containsFlagged) {
      throw new ContentPolicyViolationError(
        'Prompt contains potentially inappropriate content'
      );
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Create DALL-E 3 client
 */
export function createDALLE3Client(apiKey?: string): DALLE3Client {
  const key = apiKey || process.env.OPENAI_API_KEY;

  if (!key) {
    throw new Error('OpenAI API key is required');
  }

  return new DALLE3Client(key);
}

/**
 * Calculate image generation cost
 * DALL-E 3 Pricing:
 * - Standard 1024×1024: $0.040/image
 * - Standard 1024×1792, 1792×1024: $0.080/image
 * - HD 1024×1024: $0.080/image
 * - HD 1024×1792, 1792×1024: $0.120/image
 */
export function calculateCost(size: ImageSize, quality: ImageQuality): number {
  if (quality === 'hd') {
    return size === '1024x1024' ? 0.08 : 0.12;
  } else {
    return size === '1024x1024' ? 0.04 : 0.08;
  }
}

/**
 * Validate if user can generate images based on tier
 */
export function canGenerateImage(
  tier: string,
  imagesGeneratedToday: number
): boolean {
  const limits: Record<string, number> = {
    FREE: 0, // No images for free tier
    BASIC: 3,
    PRO: 10,
    ENTERPRISE: Infinity,
    CUSTOM: Infinity,
    UNLIMITED: Infinity,
  };

  const limit = limits[tier] || 0;
  return imagesGeneratedToday < limit;
}

/**
 * Get remaining images for tier
 */
export function getRemainingImages(
  tier: string,
  imagesGeneratedToday: number
): number {
  const limits: Record<string, number> = {
    FREE: 0,
    BASIC: 3,
    PRO: 10,
    ENTERPRISE: Infinity,
    CUSTOM: Infinity,
    UNLIMITED: Infinity,
  };

  const limit = limits[tier] || 0;
  if (limit === Infinity) return Infinity;

  return Math.max(0, limit - imagesGeneratedToday);
}

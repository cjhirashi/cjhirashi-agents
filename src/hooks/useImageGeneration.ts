/**
 * useImageGeneration Hook
 *
 * React hook for image generation with DALL-E 3
 * Manages generation state, image list, and API calls
 *
 * Related: Phase 7 - Tarea 2 (DALL-E 3 Integration)
 */

import { useState, useCallback, useEffect } from 'react';
import { GeneratedImage } from '@/components/image-gen/ImageCard';
import { ImageGenerationConfig } from '@/components/image-gen/ImagePromptEditor';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface UseImageGenerationResult {
  images: GeneratedImage[];
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
  remaining: number | null;
  generate: (config: ImageGenerationConfig) => Promise<void>;
  deleteImage: (id: string) => Promise<void>;
  refreshImages: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

export function useImageGeneration(): UseImageGenerationResult {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  /**
   * Fetch images
   */
  const fetchImages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/v1/images');

      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();

      setImages(data.images || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch images:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Generate image
   */
  const generate = useCallback(
    async (config: ImageGenerationConfig) => {
      try {
        setIsGenerating(true);
        setError(null);

        const response = await fetch('/api/v1/images/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Failed to generate image');
        }

        // Add new image to the beginning of the list
        setImages((prev) => [data.image, ...prev]);

        // Update remaining count
        if (data.remaining !== undefined) {
          setRemaining(data.remaining);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Failed to generate image:', err);
        throw err; // Re-throw so caller can handle
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  /**
   * Delete image
   */
  const deleteImage = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/v1/images/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to delete image');
      }

      // Remove from list
      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to delete image:', err);
      throw err; // Re-throw so caller can handle
    }
  }, []);

  /**
   * Refresh images
   */
  const refreshImages = useCallback(async () => {
    await fetchImages();
  }, [fetchImages]);

  /**
   * Load images on mount
   */
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return {
    images,
    isGenerating,
    isLoading,
    error,
    remaining,
    generate,
    deleteImage,
    refreshImages,
  };
}

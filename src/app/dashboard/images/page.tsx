'use client';

/**
 * Image Generation Page
 *
 * Dashboard page for DALL-E 3 image generation
 *
 * Features:
 * - Prompt editor with templates
 * - Image gallery
 * - Usage limits display
 * - Error handling
 *
 * Related: Phase 7 - Tarea 2 (DALL-E 3 Integration)
 */

import { useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import ImagePromptEditor, {
  ImageGenerationConfig,
} from '@/components/image-gen/ImagePromptEditor';
import ImageGallery from '@/components/image-gen/ImageGallery';
import { useImageGeneration } from '@/hooks/useImageGeneration';

// ═══════════════════════════════════════════════════════════
// IMAGES PAGE COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ImagesPage() {
  const {
    images,
    isGenerating,
    isLoading,
    error,
    remaining,
    generate,
    deleteImage,
  } = useImageGeneration();

  const [config, setConfig] = useState<ImageGenerationConfig>({
    prompt: '',
    style: 'vivid',
    quality: 'standard',
    size: '1024x1024',
  });

  /**
   * Handle generate
   */
  const handleGenerate = async () => {
    try {
      await generate(config);
      // Clear prompt after successful generation
      setConfig((prev) => ({ ...prev, prompt: '' }));
    } catch (error) {
      // Error is handled by the hook
      console.error('Generation failed:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="text-purple-600" size={32} />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Image Generation
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Create stunning images with DALL-E 3. Describe what you want to see and let AI
          bring it to life.
        </p>
      </div>

      {/* Usage Limit Banner */}
      {remaining !== null && remaining !== Infinity && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Sparkles size={16} />
            <span className="text-sm font-medium">
              {remaining > 0 ? (
                <>
                  <strong>{remaining}</strong> generation
                  {remaining === 1 ? '' : 's'} remaining today
                </>
              ) : (
                <>
                  Daily limit reached. Upgrade your plan for more generations!
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-900 dark:text-red-100">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Prompt Editor - Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Create Image
            </h2>
            <ImagePromptEditor
              config={config}
              onChange={setConfig}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>
        </div>

        {/* Gallery - Main Content */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your Generated Images
              {images.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({images.length})
                </span>
              )}
            </h2>
          </div>

          <ImageGallery
            images={images}
            onDelete={deleteImage}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-12 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          💡 Tips for Better Results
        </h3>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>• Be specific and descriptive in your prompts</li>
          <li>• Include style keywords like &quot;photorealistic&quot;, &quot;digital art&quot;, &quot;3D render&quot;</li>
          <li>• Mention lighting, mood, and atmosphere for more control</li>
          <li>
            • Use the HD quality option for higher detail (available on Pro plan and
            above)
          </li>
          <li>• Choose the right aspect ratio for your use case</li>
        </ul>
      </div>
    </div>
  );
}

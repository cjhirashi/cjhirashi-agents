'use client';

/**
 * ImagePromptEditor Component
 *
 * Rich prompt editor for DALL-E 3 image generation
 * Features:
 * - Textarea with character count
 * - Prompt templates/suggestions
 * - Quality/style selectors
 * - Size selector
 *
 * Related: Phase 7 - Tarea 2 (DALL-E 3 Integration)
 */

import { useState } from 'react';
import { Sparkles, Wand2, Copy } from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface ImageGenerationConfig {
  prompt: string;
  style: 'vivid' | 'natural';
  quality: 'standard' | 'hd';
  size: '1024x1024' | '1792x1024' | '1024x1792';
}

interface ImagePromptEditorProps {
  config: ImageGenerationConfig;
  onChange: (config: ImageGenerationConfig) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
}

// ═══════════════════════════════════════════════════════════
// PROMPT TEMPLATES
// ═══════════════════════════════════════════════════════════

const PROMPT_TEMPLATES = [
  {
    name: 'Realistic Photo',
    prompt: 'A highly detailed, photorealistic image of',
    icon: '📷',
  },
  {
    name: 'Digital Art',
    prompt: 'A stunning digital artwork featuring',
    icon: '🎨',
  },
  {
    name: '3D Render',
    prompt: 'A professional 3D render of',
    icon: '🎭',
  },
  {
    name: 'Illustration',
    prompt: 'A beautiful hand-drawn illustration of',
    icon: '✏️',
  },
  {
    name: 'Concept Art',
    prompt: 'Epic concept art depicting',
    icon: '🖼️',
  },
  {
    name: 'Minimalist',
    prompt: 'A clean, minimalist design of',
    icon: '⚡',
  },
];

const STYLE_OPTIONS = [
  {
    value: 'vivid' as const,
    label: 'Vivid',
    description: 'Hyper-real and dramatic images',
  },
  {
    value: 'natural' as const,
    label: 'Natural',
    description: 'More natural, less hyper-real',
  },
];

const QUALITY_OPTIONS = [
  {
    value: 'standard' as const,
    label: 'Standard',
    description: 'Fast generation',
  },
  {
    value: 'hd' as const,
    label: 'HD',
    description: 'Higher quality, slower',
  },
];

const SIZE_OPTIONS = [
  {
    value: '1024x1024' as const,
    label: 'Square',
    aspect: '1:1',
    icon: '⬜',
  },
  {
    value: '1792x1024' as const,
    label: 'Landscape',
    aspect: '16:9',
    icon: '▭',
  },
  {
    value: '1024x1792' as const,
    label: 'Portrait',
    aspect: '9:16',
    icon: '▯',
  },
];

const MAX_PROMPT_LENGTH = 1000;

// ═══════════════════════════════════════════════════════════
// IMAGE PROMPT EDITOR COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ImagePromptEditor({
  config,
  onChange,
  onGenerate,
  isGenerating = false,
}: ImagePromptEditorProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  /**
   * Update prompt
   */
  const updatePrompt = (prompt: string) => {
    if (prompt.length <= MAX_PROMPT_LENGTH) {
      onChange({ ...config, prompt });
    }
  };

  /**
   * Apply template
   */
  const applyTemplate = (template: string) => {
    updatePrompt(template);
    setShowTemplates(false);
  };

  /**
   * Update style
   */
  const updateStyle = (style: 'vivid' | 'natural') => {
    onChange({ ...config, style });
  };

  /**
   * Update quality
   */
  const updateQuality = (quality: 'standard' | 'hd') => {
    onChange({ ...config, quality });
  };

  /**
   * Update size
   */
  const updateSize = (size: '1024x1024' | '1792x1024' | '1024x1792') => {
    onChange({ ...config, size });
  };

  /**
   * Check if can generate
   */
  const canGenerate = config.prompt.trim().length > 0 && !isGenerating;

  return (
    <div className="space-y-6">
      {/* Prompt Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Image Description
          </label>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Wand2 size={14} />
            Templates
          </button>
        </div>

        <textarea
          value={config.prompt}
          onChange={(e) => updatePrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          className="w-full min-h-[120px] px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={isGenerating}
        />

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {config.prompt.length} / {MAX_PROMPT_LENGTH} characters
          </span>
          {config.prompt && (
            <button
              onClick={() => navigator.clipboard.writeText(config.prompt)}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <Copy size={14} />
              Copy
            </button>
          )}
        </div>
      </div>

      {/* Templates */}
      {showTemplates && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PROMPT_TEMPLATES.map((template) => (
            <button
              key={template.name}
              onClick={() => applyTemplate(template.prompt)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <span className="text-2xl">{template.icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {template.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Style Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Style
        </label>
        <div className="grid grid-cols-2 gap-3">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateStyle(option.value)}
              disabled={isGenerating}
              className={`p-4 rounded-lg border-2 transition-all ${
                config.style === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="text-left">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {option.label}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {option.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quality Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Quality
        </label>
        <div className="grid grid-cols-2 gap-3">
          {QUALITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateQuality(option.value)}
              disabled={isGenerating}
              className={`p-4 rounded-lg border-2 transition-all ${
                config.quality === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="text-left">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {option.label}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {option.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Size Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Size
        </label>
        <div className="grid grid-cols-3 gap-3">
          {SIZE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateSize(option.value)}
              disabled={isGenerating}
              className={`p-4 rounded-lg border-2 transition-all ${
                config.size === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">{option.icon}</span>
                <div className="text-center">
                  <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {option.aspect}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        className="w-full py-4 px-6 rounded-lg font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles size={20} />
            Generate Image
          </>
        )}
      </button>
    </div>
  );
}

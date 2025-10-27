'use client';

/**
 * ImageCard Component
 *
 * Card component for displaying generated images
 * Features:
 * - Image preview with lazy loading
 * - Download button
 * - Delete button
 * - Metadata display (prompt, size, etc.)
 *
 * Related: Phase 7 - Tarea 2 (DALL-E 3 Integration)
 */

import { useState } from 'react';
import { Download, Trash2, Expand, Copy, Check } from 'lucide-react';
import Image from 'next/image';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface GeneratedImage {
  id: string;
  prompt: string;
  revisedPrompt?: string;
  url: string;
  size: string;
  style: string;
  quality: string;
  createdAt: Date;
}

interface ImageCardProps {
  image: GeneratedImage;
  onDelete?: (id: string) => void;
  onExpand?: (image: GeneratedImage) => void;
}

// ═══════════════════════════════════════════════════════════
// IMAGE CARD COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ImageCard({ image, onDelete, onExpand }: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Download image
   */
  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dalle-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  /**
   * Copy prompt to clipboard
   */
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(image.prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  /**
   * Delete image
   */
  const handleDelete = async () => {
    if (!onDelete) return;

    const confirmed = window.confirm('Are you sure you want to delete this image?');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete(image.id);
    } catch (error) {
      console.error('Failed to delete image:', error);
      setIsDeleting(false);
    }
  };

  /**
   * Format date
   */
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div
      className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-900">
        <Image
          src={image.url}
          alt={image.prompt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Overlay Actions */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 transition-opacity">
            <button
              onClick={() => onExpand?.(image)}
              className="p-3 rounded-full bg-white/90 hover:bg-white text-gray-900 transition-colors"
              title="Expand"
            >
              <Expand size={20} />
            </button>
            <button
              onClick={handleDownload}
              className="p-3 rounded-full bg-white/90 hover:bg-white text-gray-900 transition-colors"
              title="Download"
            >
              <Download size={20} />
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-3 rounded-full bg-red-500/90 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                title="Delete"
              >
                {isDeleting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 size={20} />
                )}
              </button>
            )}
          </div>
        )}

        {/* Quality Badge */}
        {image.quality === 'hd' && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold">
            HD
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Prompt */}
        <div className="space-y-1">
          <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
            {image.prompt}
          </p>
          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {copiedPrompt ? (
              <>
                <Check size={12} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={12} />
                Copy prompt
              </>
            )}
          </button>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
              {image.size}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 capitalize">
              {image.style}
            </span>
          </div>
          <span>{formatDate(image.createdAt)}</span>
        </div>

        {/* Revised Prompt (if available) */}
        {image.revisedPrompt && image.revisedPrompt !== image.prompt && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              Revised by DALL-E
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-300 line-clamp-3">
              {image.revisedPrompt}
            </p>
          </details>
        )}
      </div>
    </div>
  );
}

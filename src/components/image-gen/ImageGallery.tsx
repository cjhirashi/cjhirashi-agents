'use client';

/**
 * ImageGallery Component
 *
 * Grid layout for displaying generated images
 * Features:
 * - Responsive grid (1/2/3 columns)
 * - Image modal/lightbox
 * - Empty state
 * - Loading state
 *
 * Related: Phase 7 - Tarea 2 (DALL-E 3 Integration)
 */

import { useState } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import ImageCard, { GeneratedImage } from './ImageCard';
import Image from 'next/image';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ImageGalleryProps {
  images: GeneratedImage[];
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

// ═══════════════════════════════════════════════════════════
// IMAGE GALLERY COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ImageGallery({
  images,
  onDelete,
  isLoading = false,
}: ImageGalleryProps) {
  const [expandedImage, setExpandedImage] = useState<GeneratedImage | null>(null);

  /**
   * Download expanded image
   */
  const handleDownloadExpanded = async () => {
    if (!expandedImage) return;

    try {
      const response = await fetch(expandedImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dalle-${expandedImage.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  /**
   * Open in new tab
   */
  const handleOpenInNewTab = () => {
    if (!expandedImage) return;
    window.open(expandedImage.url, '_blank');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-6xl mb-4">🎨</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No images yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          Start generating images by describing what you want to create. Your generated
          images will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            onDelete={onDelete}
            onExpand={setExpandedImage}
          />
        ))}
      </div>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div
            className="relative max-w-6xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadExpanded}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Download"
                >
                  <Download size={20} />
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={20} />
                </button>
              </div>
              <button
                onClick={() => setExpandedImage(null)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Image */}
            <div className="relative flex-1 bg-black rounded-lg overflow-hidden">
              <Image
                src={expandedImage.url}
                alt={expandedImage.prompt}
                fill
                className="object-contain"
                sizes="90vw"
              />
            </div>

            {/* Info */}
            <div className="mt-4 p-4 bg-white/10 backdrop-blur-lg rounded-lg">
              <p className="text-white mb-2">{expandedImage.prompt}</p>
              <div className="flex items-center gap-3 text-sm text-white/70">
                <span className="px-2 py-1 rounded bg-white/10">{expandedImage.size}</span>
                <span className="px-2 py-1 rounded bg-white/10 capitalize">
                  {expandedImage.style}
                </span>
                {expandedImage.quality === 'hd' && (
                  <span className="px-2 py-1 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold">
                    HD
                  </span>
                )}
                <span>
                  {new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(expandedImage.createdAt))}
                </span>
              </div>
              {expandedImage.revisedPrompt &&
                expandedImage.revisedPrompt !== expandedImage.prompt && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-white/50 mb-1">Revised by DALL-E:</p>
                    <p className="text-sm text-white/80">{expandedImage.revisedPrompt}</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

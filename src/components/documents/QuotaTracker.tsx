/**
 * QuotaTracker Component
 *
 * Displays storage usage with tier limits and visual progress
 */

'use client';

import React from 'react';
import { HardDrive, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface QuotaTrackerProps {
  usedBytes: number;
  limitBytes: number;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'bg-red-500';
  if (percentage >= 60) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getTierColor(tier: string): string {
  switch (tier) {
    case 'FREE':
      return 'bg-gray-500';
    case 'PRO':
      return 'bg-blue-500';
    case 'ENTERPRISE':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function QuotaTracker({ usedBytes, limitBytes, tier }: QuotaTrackerProps) {
  const percentage = Math.min((usedBytes / limitBytes) * 100, 100);
  const isWarning = percentage > 80;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            Storage Usage
          </CardTitle>
          <Badge className={cn(getTierColor(tier), 'text-white')}>{tier}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all', getProgressColor(percentage))}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Usage label */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formatBytes(usedBytes)} / {formatBytes(limitBytes)}
          </span>
          <span className="font-medium">{percentage.toFixed(1)}%</span>
        </div>

        {/* Warning message */}
        {isWarning && (
          <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Storage almost full. Consider upgrading your plan.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

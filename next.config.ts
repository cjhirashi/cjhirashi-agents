import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Enable ESLint during builds for code quality enforcement
    ignoreDuringBuilds: false,
  },
  // NOTE: turbopack config removed as it's no longer in experimental in Next.js 15.5+
  // Turbopack is now enabled by default in development
  // Reference: INCOMPATIBILITIES-RESOLVED.md #2
};

export default nextConfig;

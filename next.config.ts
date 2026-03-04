import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 1. Manually define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Now path.resolve will work perfectly
const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  typescript: {
    ignoreBuildErrors: true, // Bypasses TS errors during Vercel build
  },
  eslint: {
    ignoreDuringBuilds: true, // Bypasses ESLint errors during Vercel build
  },
  turbopack: {
    rules: {
      "*.{jsx,tsx}": {
        loaders: [LOADER]
      }
    }
  }
};

export default nextConfig;
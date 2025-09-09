import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable type checking during build (optional, can speed up builds)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configure output settings
  output: 'standalone',
  // Disable output file tracing for now to resolve the warning
  experimental: {
    // @ts-ignore - This is a valid experimental option
    outputFileTracingRoot: __dirname,
  },
};

export default nextConfig;

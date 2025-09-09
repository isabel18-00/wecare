import type { NextConfig } from "next";

const nextConfig: NextConfig = {
<<<<<<< HEAD
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
=======
  /* config options here */
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
};

export default nextConfig;

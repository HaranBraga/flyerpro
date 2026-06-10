import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone server output for slim Docker images (Easypanel).
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // Server actions handle file uploads (logos/arts); raise the body limit.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

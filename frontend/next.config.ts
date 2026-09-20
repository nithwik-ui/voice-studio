import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // GitHub Pages usually deploys to /<repo-name>/ unless it's a User page
  basePath: '/voice-studio',
  images: {
    unoptimized: true, // Image optimization doesn't work out-of-the-box in static exports
  },
};

export default nextConfig;

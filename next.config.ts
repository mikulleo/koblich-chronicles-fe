import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Reduce production bundle size — no source maps for end users
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/media/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'koblich-chronicles-be-production.up.railway.app',
        pathname: '/api/media/**',
      },
    ],
  },
  experimental: {
    // Tree-shake large packages — only import what's actually used
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      '@radix-ui/react-icons',
      'framer-motion',
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['localhost', 'via.placeholder.com', 'koblich-chronicles-be-production.up.railway.app'],
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
};

export default nextConfig;

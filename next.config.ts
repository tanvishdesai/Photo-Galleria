import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    domains: ['localhost'],
  },
  experimental: {
    optimizePackageImports: ['three'],
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import type { Configuration } from 'webpack';

const nextConfig = {
  webpack: (config: Configuration, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.output = config.output || {};
      config.output.globalObject = 'self';
    }
    return config;
  },
}

export default nextConfig;

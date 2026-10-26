import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-build",
  experimental: {
    agentUpgrade: "security",
  },
  output: "standalone",
};

export default nextConfig;

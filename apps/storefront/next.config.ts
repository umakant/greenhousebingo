import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@repo/config",
    "@repo/db",
    "@repo/lib",
    "@repo/types",
    "@repo/ui",
  ],
};

export default nextConfig;

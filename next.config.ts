import { randomUUID } from "crypto";
import type { NextConfig } from "next";

// Nueva sesión dev en cada arranque de `next dev` / `next start`
if (!process.env.XSPACES_DEV_BOOT_ID) {
  process.env.XSPACES_DEV_BOOT_ID = randomUUID();
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;

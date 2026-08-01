import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  images: {
    // Frames/logos are arbitrary local files — serve them as-is.
    unoptimized: true,
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=()" },
      ],
    },
    {
      // The animated QR stream must not be aggressively cached.
      source: "/config/:path*",
      headers: [{ key: "Cache-Control", value: "no-cache" }],
    },
  ],
};

export default nextConfig;

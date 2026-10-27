import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Allow bluetooth for the thermal printer; block everything else by default.
          {
            key: "Permissions-Policy",
            value: "bluetooth=self, camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    qualities: [25, 50, 75, 100],
  },
};

export default nextConfig;

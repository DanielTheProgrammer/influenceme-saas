import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "unavatar.io" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "*.cdninstagram.com" },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https: http:",
            "media-src 'self' blob: https: http:",
            "connect-src 'self' https: wss: http://localhost:* ws://localhost:*",
            "frame-src https://js.stripe.com https://hooks.stripe.com",
            "font-src 'self' data:",
          ].join("; "),
        },
      ],
    },
  ],
};

export default nextConfig;

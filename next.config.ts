// next.config.ts
import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com', // 🚀 Izinkan gambar profil Google
        port: '',
        pathname: '/**',
      },
    ],
  },
  turbopack: {},
  
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.midtrans.com https://app.sandbox.midtrans.com https://snap-assets.midtrans.com https://www.googletagmanager.com https://*.sanity.io;
              style-src 'self' 'unsafe-inline';
              font-src 'self' data: https://design-system-static.sanity.io;
              img-src 'self' data: https://cdn.sanity.io https://www.google-analytics.com https://app.midtrans.com https://app.sandbox.midtrans.com https://*.googleusercontent.com https://*.gstatic.com https://*.sanity.io;
              frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com https://api.midtrans.com;
              connect-src 'self' https://vnneqinjvfxqkukvcyzm.supabase.co https://api.midtrans.com https://api.sandbox.midtrans.com https://app.midtrans.com https://app.sandbox.midtrans.com https://www.google-analytics.com https://stats.g.doubleclick.net https://ks29ggv6.api.sanity.io https://ks29ggv6.sanity.io wss://ks29ggv6.api.sanity.io https://*.sanity.io;
            `.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
} as any;

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
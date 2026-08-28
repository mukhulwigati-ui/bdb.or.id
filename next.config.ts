// next.config.ts

import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';

// ============================================================
// CSP
// ============================================================

const contentSecurityPolicy = `
  default-src 'self';

  script-src
    'self'
    'unsafe-inline'
    'unsafe-eval'
    https://app.midtrans.com
    https://app.sandbox.midtrans.com
    https://snap-assets.midtrans.com
    https://www.googletagmanager.com
    https://www.google-analytics.com
    https://*.sanity.io;

  style-src
    'self'
    'unsafe-inline'
    https://fonts.googleapis.com;

  font-src
    'self'
    data:
    https://fonts.gstatic.com
    https://design-system-static.sanity.io;

  img-src
    'self'
    data:
    blob:
    https://cdn.sanity.io
    https://www.google-analytics.com
    https://www.googletagmanager.com
    https://app.midtrans.com
    https://app.sandbox.midtrans.com
    https://*.googleusercontent.com
    https://*.gstatic.com
    https://*.sanity.io;

  frame-src
    'self'
    https://accounts.google.com
    https://app.midtrans.com
    https://app.sandbox.midtrans.com
    https://api.midtrans.com
    https://api.sandbox.midtrans.com;

  connect-src
    'self'
    https://*.supabase.co
    wss://*.supabase.co
    https://api.midtrans.com
    https://api.sandbox.midtrans.com
    https://app.midtrans.com
    https://app.sandbox.midtrans.com
    https://www.google-analytics.com
    https://analytics.google.com
    https://stats.g.doubleclick.net
    https://*.sanity.io
    wss://*.sanity.io;

  worker-src
    'self'
    blob:;

  manifest-src
    'self';

  media-src
    'self'
    blob:;

  object-src
    'none';

  base-uri
    'self';

  form-action
    'self'
    https://accounts.google.com
    https://*.supabase.co;

  frame-ancestors
    'self';

  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, ' ')
  .trim();

// ============================================================
// NEXT CONFIG
// ============================================================

const nextConfig: NextConfig = {
  // ==========================================================
  // IMAGE
  // ==========================================================

  images: {
    remotePatterns: [
      // Sanity CDN
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/**',
      },

      // Google avatar/profile
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
        port: '',
        pathname: '/**',
      },

      // Google static assets
      {
        protocol: 'https',
        hostname: '**.gstatic.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // ==========================================================
  // TURBOPACK
  // ==========================================================

  turbopack: {},

  // ==========================================================
  // GLOBAL SECURITY HEADERS
  // ==========================================================

  async headers() {
    return [
      {
        source: '/:path*',

        headers: [
          // ====================================================
          // CONTENT SECURITY POLICY
          // ====================================================

          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },

          // ====================================================
          // SECURITY HEADERS
          // ====================================================

          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },

          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },

          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },

          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
    ];
  },
};

// ============================================================
// PWA
// ============================================================

export default withPWA({
  dest: 'public',

  cacheOnFrontEndNav: true,

  aggressiveFrontEndNavCaching: true,

  reloadOnOnline: true,

  disable:
    process.env.NODE_ENV === 'development',
})(nextConfig);
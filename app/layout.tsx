// app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LayoutClientWrapper from "@/components/LayoutClientWrapper";
import BottomNav from "@/components/BottomNav";
import Script from "next/script";
import "./globals.css";

// ============================================================
// FONT
// ============================================================

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ============================================================
// KONFIGURASI WEBSITE
//
// PENTING:
// Gunakan SATU domain secara konsisten.
// Kita pakai WWW karena URL campaign dan debugger Anda
// menggunakan https://www.bdb.or.id
// ============================================================

const SITE_URL = "https://www.bdb.or.id";

// Versioning ini membantu crawler melihat gambar sebagai URL baru.
// Ubah angkanya jika suatu saat banner diganti lagi.
const OG_IMAGE_VERSION = "20260830-2";

const HOME_OG_IMAGE =
  `${SITE_URL}/images/banner.png?v=${OG_IMAGE_VERSION}`;

const SITE_TITLE =
  "bdb.or.id | Balai Dakwah Banjarnegara - Platform Sedekah, Zakat, dan Wakaf Terpercaya";

const SITE_DESCRIPTION =
  "Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui Balai Dakwah Banjarnegara. Tunaikan donasi dengan mudah, amanah, dan transparan.";

// ============================================================
// MASTER METADATA
// ============================================================

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  // ----------------------------------------------------------
  // TITLE
  // ----------------------------------------------------------

  title: {
    default: SITE_TITLE,
    template: "%s | Balai Dakwah Banjarnegara",
  },

  // ----------------------------------------------------------
  // DESCRIPTION
  // ----------------------------------------------------------

  description: SITE_DESCRIPTION,

  applicationName:
    "Balai Dakwah Banjarnegara",

  generator:
    "Next.js",

  // ----------------------------------------------------------
  // PWA
  // ----------------------------------------------------------

  manifest:
    "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Balai Dakwah Banjarnegara",
  },

  // ----------------------------------------------------------
  // KEYWORDS
  // ----------------------------------------------------------

  keywords: [
    "bdb",
    "bdb or id",
    "bdb.or.id",
    "Balai Dakwah Banjarnegara",
    "sedekah online",
    "infak online",
    "infaq online",
    "zakat online",
    "bayar zakat online",
    "wakaf online",
    "wakaf quran",
    "sedekah subuh",
    "donasi online",
    "donasi yatim",
    "donasi dhuafa",
    "donasi Banjarnegara",
    "lembaga sosial Banjarnegara",
    "donasi QRIS",
  ],

  // ----------------------------------------------------------
  // AUTHOR
  // ----------------------------------------------------------

  authors: [
    {
      name: "Balai Dakwah Banjarnegara",
      url: SITE_URL,
    },
  ],

  creator:
    "Balai Dakwah Banjarnegara",

  publisher:
    "Balai Dakwah Banjarnegara",

  // ----------------------------------------------------------
  // FORMAT DETECTION
  // ----------------------------------------------------------

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // ----------------------------------------------------------
  // CANONICAL
  // ==========================================================

  alternates: {
    canonical: `${SITE_URL}/`,

    languages: {
      "id-ID": `${SITE_URL}/`,
    },
  },

  // ==========================================================
  // OPEN GRAPH
  //
  // Facebook, WhatsApp, Telegram, dll.
  // ==========================================================

  openGraph: {
    type: "website",

    locale:
      "id_ID",

    url:
      `${SITE_URL}/`,

    siteName:
      "Balai Dakwah Banjarnegara",

    title:
      SITE_TITLE,

    description:
      SITE_DESCRIPTION,

    images: [
      {
        url:
          HOME_OG_IMAGE,

        secureUrl:
          HOME_OG_IMAGE,

        width:
          1200,

        height:
          630,

        type:
          "image/png",

        alt:
          "Balai Dakwah Banjarnegara - Sedekah, Zakat dan Wakaf",
      },
    ],
  },

  // ==========================================================
  // TWITTER / X
  // ==========================================================

  twitter: {
    card:
      "summary_large_image",

    title:
      SITE_TITLE,

    description:
      SITE_DESCRIPTION,

    images: [
      HOME_OG_IMAGE,
    ],
  },

  // ==========================================================
  // ROBOTS
  // ==========================================================

  robots: {
    index: true,
    follow: true,
    nocache: false,

    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,

      "max-video-preview": -1,

      "max-image-preview":
        "large",

      "max-snippet": -1,
    },
  },

  category:
    "Nonprofit & Charity",
};

// ============================================================
// ROOT LAYOUT
// ============================================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  // ==========================================================
  // JSON-LD
  // ==========================================================

  const jsonLd = {
    "@context":
      "https://schema.org",

    "@type":
      "NGO",

    name:
      "Balai Dakwah Banjarnegara",

    alternateName:
      "bdb.or.id",

    url:
      `${SITE_URL}/`,

    // Untuk logo organisasi sebaiknya nanti gunakan
    // file logo asli, bukan banner.
    image:
      `${SITE_URL}/images/banner.png`,

    description:
      SITE_DESCRIPTION,

    address: {
      "@type":
        "PostalAddress",

      addressLocality:
        "Banjarnegara",

      addressRegion:
        "Jawa Tengah",

      addressCountry:
        "ID",
    },
  };

  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        {/* ====================================================
            STRUCTURED DATA
        ==================================================== */}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html:
              JSON.stringify(jsonLd),
          }}
        />
      </head>

      <body
        className="min-h-screen bg-slate-100 flex flex-col text-slate-800"
        suppressHydrationWarning
      >
        {/* ====================================================
            GOOGLE ANALYTICS GA4
        ==================================================== */}

        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-FG813S8GLF"
        />

        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];

              function gtag(){
                dataLayer.push(arguments);
              }

              gtag('js', new Date());

              gtag('config', 'G-FG813S8GLF', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />

        {/* ====================================================
            MIDTRANS SNAP
        ==================================================== */}

        <Script
          src="https://app.midtrans.com/snap/snap.js"
          data-client-key={
            process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ||
            "Mid-client-NVjY5ccbH7M47czA"
          }
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />

        {/* ====================================================
            CONTENT
        ==================================================== */}

        <LayoutClientWrapper>
          {children}
        </LayoutClientWrapper>

        {/* ====================================================
            BOTTOM NAVIGATION
        ==================================================== */}

        <BottomNav />
      </body>
    </html>
  );
}
// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LayoutClientWrapper from "@/components/LayoutClientWrapper"; 
import BottomNav from "@/components/BottomNav"; 
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🚀 MASTER SEO & SOCIAL MEDIA SHARING METADATA (100% Didukung di Server Component)
export const metadata: Metadata = {
  metadataBase: new URL("https://bdb.or.id"),
  title: {
    default: "bdb.or.id | Balai Dakwah Banjarnegara - Platform Sedekah, Infaq & Zakat Online Amanah",
    template: "%s | bdb.or.id"
  },
  description: "Salurkan sedekah, infaq, zakat, dan wakaf Anda secara instan dan amanah melalui bdb.or.id (Balai Dakwah Banjarnegara). Mengalirkan keberkahan dan kepedulian untuk pemberdayaan ummat, yatim, dhuafa, dan program sosial kemanusiaan.",
  applicationName: "Balai Dakwah Banjarnegara",
  generator: "Next.js",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Balai Dakwah Banjarnegara",
  },
  keywords: [
    "bdb",
    "bdb or id",
    "balai dakwah banjarnegara",
    "sedekah online",
    "infaq online",
    "bayar zakat online",
    "wakaf quran",
    "sedekah subuh",
    "donasi yatim dhuafa",
    "lembaga amil zakat amanah",
    "donasi qris instant",
    "banjarnegara beramal",
  ],
  authors: [{ name: "Balai Dakwah Banjarnegara", url: "https://bdb.or.id" }],
  creator: "Balai Dakwah Banjarnegara",
  publisher: "Balai Dakwah Banjarnegara",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://bdb.or.id",
    languages: {
      'id-ID': 'https://bdb.or.id',
    },
  },
  openGraph: {
    title: "bdb.or.id | Balai Dakwah Banjarnegara - Platform Sedekah, Infaq & Zakat Online Amanah",
    description: "Tunaikan kepedulian Anda dengan mudah bersama Balai Dakwah Banjarnegara (bdb.or.id). Salurkan sedekah subuh, infaq produktif, dan zakat secara transparan dan otomatis via QRIS & Virtual Account.",
    url: "https://bdb.or.id",
    siteName: "Balai Dakwah Banjarnegara",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://bdb.or.id/images/banner.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "bdb.or.id - Balai Dakwah Banjarnegara - Mengalirkan Keberkahan Melalui Sedekah dan Infaq",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "bdb.or.id | Balai Dakwah Banjarnegara - Sedekah & Infaq Online Mudah",
    description: "Platform resmi galang donasi, sedekah, infaq, dan zakat amanah bersama bdb.or.id (Balai Dakwah Banjarnegara).",
    images: ["https://bdb.or.id/images/banner.png"],
    creator: "@balaidakwah",
    site: "@balaidakwah",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "masukkan-google-site-verification-anda",
    yandex: "yandex-verification-token",
  },
  category: "Nonprofit & Charity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 🚀 JSON-LD Structured Data untuk SEO Maksimal di Mata Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NGO",
    "name": "Balai Dakwah Banjarnegara",
    "alternateName": "bdb.or.id",
    "url": "https://bdb.or.id",
    "logo": "https://bdb.or.id/images/banner.png",
    "description": "Platform sedekah, infaq, zakat, dan wakaf online amanah di Banjarnegara.",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Banjarnegara",
      "addressRegion": "Jawa Tengah",
      "addressCountry": "ID"
    },
    "sameAs": [
      "https://instagram.com/",
      "https://facebook.com/"
    ]
  };

  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <head>
        {/* 🚀 Inject JSON-LD Schema.org Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-slate-100 flex flex-col text-slate-800" suppressHydrationWarning>
        
        {/* 🚀 GOOGLE ANALYTICS SCRIPT (GA4) */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-FG813S8GLF`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-FG813S8GLF', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />

        {/* 🚀 MIDTRANS SNAP SCRIPT UTAMA */}
        <Script
          src="https://app.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "Mid-client-NVjY5ccbH7M47czA"}
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />

        {/* 🚀 LAYOUT CLIENT WRAPPER */}
        <LayoutClientWrapper>
          {children}
        </LayoutClientWrapper>

        {/* 🚀 GLOBAL BOTTOM NAVIGATION */}
        <BottomNav />

      </body>
    </html>
  );
}
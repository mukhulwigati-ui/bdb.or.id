// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LayoutClientWrapper from "@/components/LayoutClientWrapper";
import BottomNav from "@/components/BottomNav"; // 🚀 Import BottomNav Global
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🚀 MASTER SEO & PWA METADATA BDB.OR.ID (Balai Dakwah Banjarnegara)
export const metadata: Metadata = {
  title: {
    default: "bdb.or.id | Balai Dakwah Banjarnegara - Platform Sedekah, Infaq & Zakat Online Amanah",
    template: "%s | bdb.or.id"
  },
  description: "Salurkan sedekah, infaq, zakat, dan wakaf Anda secara instan dan amanah melalui bdb.or.id (Balai Dakwah Banjarnegara). Mengalirkan keberkahan dan kepedulian untuk pemberdayaan ummat, yatim, dhuafa, dan program sosial kemanusiaan.",
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
  ],
  authors: [{ name: "bdb.or.id", url: "https://bdb.or.id" }],
  creator: "bdb.or.id",
  publisher: "bdb.or.id",
  metadataBase: new URL("https://bdb.or.id"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "bdb.or.id | Balai Dakwah Banjarnegara - Platform Sedekah, Infaq & Zakat Online Amanah",
    description: "Tunaikan kepedulian Anda dengan mudah bersama Balai Dakwah Banjarnegara (bdb.or.id). Salurkan sedekah subuh, infaq produktif, dan zakat mal/fitrah secara transparan dan otomatis via QRIS & Virtual Account.",
    url: "https://bdb.or.id",
    siteName: "bdb.or.id",
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
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "google-site-verification-token-anda",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-gray-100 flex flex-col text-gray-800" suppressHydrationWarning>
        
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
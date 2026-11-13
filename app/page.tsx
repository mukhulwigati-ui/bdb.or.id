// app/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@sanity/client';
import Hero, { HeroBanner } from '@/components/Hero';
import TotalAccumulationWidget from '@/components/TotalAccumulationWidget';
import Campaign from '@/components/Campaign';
import News from '@/components/News';
import Footer from '@/components/Footer';

// 🚀 MASTER METADATA & OPEN GRAPH UNTUK SOSIAL MEDIA SHARING
export const metadata: Metadata = {
  metadataBase: new URL('https://bdb.or.id'),
  title: 'bdb.or.id | Balai Dakwah Banjarnegara - Platform Sedekah, Zakat, dan Wakaf Terpercaya',
  description: 'Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui program terpercaya di bdb.or.id.',
  applicationName: 'Balai Dakwah Banjarnegara',
  generator: 'Next.js',
  keywords: [
    'bdb',
    'bdb or id',
    'balai dakwah banjarnegara',
    'sedekah online',
    'infaq online',
    'bayar zakat online',
    'wakaf quran',
    'sedekah subuh',
    'donasi yatim dhuafa',
  ],
  authors: [{ name: 'Balai Dakwah Banjarnegara', url: 'https://bdb.or.id' }],
  creator: 'Balai Dakwah Banjarnegara',
  publisher: 'Balai Dakwah Banjarnegara',
  alternates: {
    canonical: 'https://bdb.or.id',
  },
  openGraph: {
    title: 'bdb.or.id | Balai Dakwah Banjarnegara - Platform Sedekah, Zakat, dan Wakaf Terpercaya',
    description: 'Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui program terpercaya di bdb.or.id.',
    url: 'https://bdb.or.id',
    siteName: 'Balai Dakwah Banjarnegara',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: 'https://bdb.or.id/images/banner.png',
        width: 1200,
        height: 630,
        alt: 'bdb.or.id - Balai Dakwah Banjarnegara - Platform Kebaikan',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bdb.or.id | Balai Dakwah Banjarnegara - Platform Sedekah, Zakat, dan Wakaf Terpercaya',
    description: 'Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui program terpercaya di bdb.or.id.',
    images: ['https://bdb.or.id/images/banner.png'],
    creator: '@balaidakwah',
    site: '@balaidakwah',
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
};

// 🚀 INITIALIZE SANITY CLIENT (Clean & Public Safe)
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'ks29gg6v';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

if (!projectId) {
  throw new Error('🔥 GAGAL: NEXT_PUBLIC_SANITY_PROJECT_ID belum disetel di environment variables.');
}

const serverClient = createClient({
  projectId,
  dataset,
  useCdn: false,
  apiVersion: '2026-08-31',
  perspective: 'published',
});

export const dynamic = 'force-dynamic';
export const revalidate = 0; // 🚀 Pastikan tidak ada cache agar data selalu real-time

export default async function HomePage() {
  let heroBanners: HeroBanner[] = [];
  let mendesakPrograms: any[] = [];
  let unggulanPrograms: any[] = [];
  let pilihanPrograms: any[] = [];

  try {
    // 🚀 Ambil data menggunakan Promise.all secara terpisah agar aman dari error Failed to fetch global
    const [rawBanners, rawMendesak, rawUnggulan, rawPilihan] = await Promise.all([
      serverClient.fetch(
        `*[_type in ["heroBanner", "banner"] && active != false] | order(order asc, _createdAt desc)[0...10] {
          "id": _id,
          "title": coalesce(title, name),
          "imageUrl": coalesce(image.asset->url, banner.asset->url),
          "linkUrl": link
        }`
      ).catch(() => []),

      serverClient.fetch(
        `*[_type == "program" && sectionType == "mendesak"] | order(_createdAt desc)[0...5] {
          "id": _id,
          "title": title,
          "slug": slug.current,
          "image": image.asset->url,
          "collectedAmount": coalesce(collectedAmount, collectedRaw, 0),
          "targetAmount": coalesce(targetAmount, 50000000),
          "daysLeft": daysLeft,
          "donors": donors
        }`
      ).catch(() => []),

      serverClient.fetch(
        `*[_type == "program" && sectionType == "unggulan"] | order(_createdAt desc)[0...5] {
          "id": _id,
          "title": title,
          "slug": slug.current,
          "image": image.asset->url,
          "collectedAmount": coalesce(collectedAmount, collectedRaw, 0),
          "targetAmount": coalesce(targetAmount, 50000000),
          "donors": donors
        }`
      ).catch(() => []),

      serverClient.fetch(
        `*[_type == "program" && (sectionType == "pilihan" || !defined(sectionType))] | order(_createdAt desc)[0...5] {
          "id": _id,
          "title": title,
          "slug": slug.current,
          "image": image.asset->url,
          "collectedAmount": coalesce(collectedAmount, collectedRaw, 0),
          "targetAmount": coalesce(targetAmount, 50000000),
          "donorsCount": count(donors),
          "donors": donors
        }`
      ).catch(() => [])
    ]);

    // Mapping Hero Banners
    if (Array.isArray(rawBanners)) {
      heroBanners = rawBanners
        .filter((item: any) => item && item.imageUrl)
        .map((item: any) => ({
          _id: item.id || Math.random().toString(),
          title: item.title,
          imageUrl: item.imageUrl,
          linkUrl: item.linkUrl || undefined,
        }));
    }

    mendesakPrograms = Array.isArray(rawMendesak) ? rawMendesak : [];
    unggulanPrograms = Array.isArray(rawUnggulan) ? rawUnggulan : [];
    pilihanPrograms = Array.isArray(rawPilihan) ? rawPilihan : [];

  } catch (err) {
    console.error('🔥 Gagal mengambil data homepage dari Sanity:', err);
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-start w-full overflow-x-hidden pb-24">
      <div className="w-full max-w-md mx-auto px-3 py-4 space-y-4">
        
        {/* Pass data banners dari server component langsung ke Hero */}
        <Hero initialBanners={heroBanners} />
        
        <TotalAccumulationWidget />
        
        {/* Komponen Campaign dengan props data yang sudah dipisah per section */}
        <Campaign 
          mendesak={mendesakPrograms} 
          unggulan={unggulanPrograms} 
          pilihan={pilihanPrograms} 
        />
        
        <News />
        <Footer />
        
      </div>
    </main>
  );
}
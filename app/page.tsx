// app/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@sanity/client';
import Hero, { HeroBanner } from '@/components/Hero';
import TotalAccumulationWidget from '@/components/TotalAccumulationWidget';
import Campaign from '@/components/Campaign';
import News from '@/components/News';
import Footer from '@/components/Footer';

// 🚀 METADATA OPEN GRAPH UNTUK SOSIAL MEDIA SHARING
export const metadata: Metadata = {
  title: 'Islami.or.id | Platform Sedekah, Zakat, dan Wakaf Terpercaya',
  description: 'Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui program terpercaya di Islami.or.id.',
  alternates: {
    canonical: 'https://www.islami.or.id',
  },
  openGraph: {
    title: 'Islami.or.id | Platform Sedekah, Zakat, dan Wakaf Terpercaya',
    description: 'Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui program terpercaya di Islami.or.id.',
    url: 'https://www.islami.or.id',
    siteName: 'Islami.or.id',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: 'https://www.islami.or.id/images/banner.png',
        width: 1200,
        height: 630,
        alt: 'Islami.or.id - Platform Kebaikan',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Islami.or.id | Platform Sedekah, Zakat, dan Wakaf Terpercaya',
    description: 'Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui program terpercaya di Islami.or.id.',
    images: ['https://www.islami.or.id/images/banner.png'],
  },
};

// 🚀 INITIALIZE SANITY CLIENT
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'xqggeww8';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

if (!projectId) {
  throw new Error('🔥 GAGAL: NEXT_PUBLIC_SANITY_PROJECT_ID belum disetel di environment variables.');
}

const serverClient = createClient({
  projectId,
  dataset,
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
});

export const dynamic = 'force-dynamic';
export const revalidate = 0; // 🚀 Pastikan tidak ada cache agar data selalu real-time

export default async function HomePage() {
  let heroBanners: HeroBanner[] = [];
  let mendesakPrograms: any[] = [];
  let unggulanPrograms: any[] = [];
  let pilihanPrograms: any[] = [];

  try {
    // 🚀 Perbaikan Query GROQ: Mengutamakan collectedAmount agar langsung terbaca akurat
    const query = `{
      "heroBanners": *[_type in ["heroBanner", "banner"] && active != false] | order(order asc, _createdAt desc)[0...10] {
        "id": _id,
        "title": coalesce(title, name),
        "imageUrl": coalesce(image.asset->url, banner.asset->url),
        "linkUrl": link
      },
      "mendesak": *[_type == "program" && sectionType == "mendesak"] | order(_createdAt desc)[0...5] {
        "id": _id,
        "title": title,
        "slug": slug.current,
        "image": image.asset->url,
        "collectedAmount": coalesce(collectedAmount, collectedRaw, 0),
        "collectedRaw": coalesce(collectedAmount, collectedRaw, 0),
        "targetAmount": coalesce(targetAmount, 50000000),
        "daysLeft": daysLeft,
        "donors": donors
      },
      "unggulan": *[_type == "program" && sectionType == "unggulan"] | order(_createdAt desc)[0...5] {
        "id": _id,
        "title": title,
        "slug": slug.current,
        "image": image.asset->url,
        "collectedAmount": coalesce(collectedAmount, collectedRaw, 0),
        "collectedRaw": coalesce(collectedAmount, collectedRaw, 0),
        "targetAmount": coalesce(targetAmount, 50000000),
        "donors": donors
      },
      "pilihan": *[_type == "program" && (sectionType == "pilihan" || !defined(sectionType))] | order(_createdAt desc)[0...5] {
        "id": _id,
        "title": title,
        "slug": slug.current,
        "image": image.asset->url,
        "collectedAmount": coalesce(collectedAmount, collectedRaw, 0),
        "collectedRaw": coalesce(collectedAmount, collectedRaw, 0),
        "targetAmount": coalesce(targetAmount, 50000000),
        "donorsCount": count(donors),
        "donors": donors
      }
    }`;

    const data = await serverClient.fetch(query);

    // Mapping Hero Banners
    if (data.heroBanners && Array.isArray(data.heroBanners)) {
      heroBanners = data.heroBanners
        .filter((item: any) => item && item.imageUrl)
        .map((item: any) => ({
          _id: item.id || Math.random().toString(),
          title: item.title,
          imageUrl: item.imageUrl,
          linkUrl: item.linkUrl || undefined,
        }));
    }

    mendesakPrograms = data.mendesak || [];
    unggulanPrograms = data.unggulan || [];
    pilihanPrograms = data.pilihan || [];

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
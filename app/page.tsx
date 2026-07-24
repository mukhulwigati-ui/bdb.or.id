// app/page.tsx
import React from 'react';
import { createClient } from '@sanity/client';
import Hero, { HeroBanner } from '@/components/Hero';
import TotalAccumulationWidget from '@/components/TotalAccumulationWidget';
import Campaign from '@/components/Campaign';
import News from '@/components/News';
import Footer from '@/components/Footer';

// 🚀 INITIALIZE SANITY CLIENT (Murni dari Environment Variables tanpa fallback ID lama)
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
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

export default async function HomePage() {
  let heroBanners: HeroBanner[] = [];
  let mendesakPrograms: any[] = [];
  let unggulanPrograms: any[] = [];
  let pilihanPrograms: any[] = [];

  try {
    // 🚀 Jalankan pengambilan data secara paralel untuk Hero Banners dan Campaign
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
        "collectedRaw": coalesce(collectedRaw, collectedAmount, 0),
        "targetAmount": coalesce(targetAmount, 50000000),
        "daysLeft": daysLeft,
        "donors": donors
      },
      "unggulan": *[_type == "program" && sectionType == "unggulan"] | order(_createdAt desc)[0...5] {
        "id": _id,
        "title": title,
        "slug": slug.current,
        "image": image.asset->url,
        "collectedRaw": coalesce(collectedRaw, collectedAmount, 0),
        "targetAmount": coalesce(targetAmount, 50000000),
        "donors": donors
      },
      "pilihan": *[_type == "program" && (sectionType == "pilihan" || !defined(sectionType))] | order(_createdAt desc)[0...5] {
        "id": _id,
        "title": title,
        "slug": slug.current,
        "image": image.asset->url,
        "collectedRaw": coalesce(collectedRaw, collectedAmount, 0),
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
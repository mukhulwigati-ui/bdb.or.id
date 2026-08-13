// app/program/page.tsx
import React from 'react';
import { createClient } from '@sanity/client';
import Campaign from '@/components/Campaign';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Inisialisasi Sanity Client di level server
const serverClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'xqggeww8',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
});

async function getProgramsData() {
  try {
    // 🚀 Perbaikan GROQ: Menyertakan pengambilan field donors & perhitungan jumlah donatur
    const data = await serverClient.fetch(
      `*[_type in ["program", "campaign"] && active != false] | order(order asc, _createdAt desc) {
        "id": _id,
        "title": title,
        "slug": slug.current,
        "image": coalesce(mainImage.asset->url, image.asset->url, banner.asset->url),
        "category": category,
        "collectedRaw": coalesce(collectedAmount, collected, 0),
        "targetRaw": coalesce(targetAmount, 50000000),
        "daysLeft": daysLeft,
        "donors": donors,
        "donorsCount": coalesce(donorsCount, count(donors), 0)
      }`
    );

    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        id: item.id || Math.random().toString(),
        title: item.title,
        slug: item.slug || '',
        image: item.image || '/images/placeholder.jpg',
        category: item.category || 'Kebaikan',
        collectedRaw: item.collectedRaw,
        targetRaw: item.targetRaw,
        daysLeft: item.daysLeft || null,
        donors: item.donors || [],
        donorsCount: item.donorsCount || (item.donors ? item.donors.length : 0),
      }));
    }
    return [];
  } catch (error) {
    console.error('🔥 Server Fetch Error di Halaman Program:', error);
    return [];
  }
}

export default async function ProgramPage() {
  const initialPrograms = await getProgramsData();

  return (
    <div className="min-h-screen bg-stone-50 pt-6 pb-24">
      {/* 🚀 KUNCI FRAME MOBILE-FIRST (max-w-md mx-auto) */}
      <div className="w-full max-w-md mx-auto px-3 space-y-4">
        
        {/* Header Judul Halaman Mobile */}
        <div className="text-center space-y-1 bg-white p-5 border border-stone-200/80 shadow-xs">
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            Semua Program Kebaikan
          </h1>
          <p className="text-xs text-stone-500 font-normal">
            Pilih dan tunaikan infak terbaik Anda secara instan & amanah
          </p>
        </div>

        {/* List Card Program */}
        <div className="pt-2">
          <Campaign initialData={initialPrograms} />
        </div>

      </div>
    </div>
  );
}
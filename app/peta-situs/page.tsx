// app/peta-situs/page.tsx
export const dynamic = 'force-dynamic';

import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@sanity/client';

// 🚀 CONFIG SANITY CLIENT (Murni dari Environment Variables)
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

if (!projectId) {
  throw new Error('🔥 GAGAL: NEXT_PUBLIC_SANITY_PROJECT_ID belum disetel di environment variables.');
}

const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2026-06-20',
  useCdn: false,
});

// ===================================================================
// META DATA SEO (OPEN GRAPH & METADATA LENGKAP BDB)
// ===================================================================
export const metadata: Metadata = {
  title: 'Peta Situs Resmi (Sitemap) | bdb.or.id',
  description: 'Indeks navigasi lengkap seluruh program donasi, zakat digital, infak kemanusiaan, wakaf, dan kabar berita pembaruan bdb.or.id.',
  alternates: {
    canonical: 'https://www.bdb.or.id/peta-situs',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Peta Situs Resmi (Sitemap) | bdb.or.id',
    description: 'Akses cepat seluruh struktur halaman program kebaikan dan transparansi laporan bdb.or.id.',
    url: 'https://www.bdb.or.id/peta-situs',
    siteName: 'bdb.or.id',
    locale: 'id_ID',
    type: 'website',
  },
};

// Interface Data Fetching
interface SitemapItem {
  title: string;
  slug: string;
  _createdAt?: string;
}

export default async function PetaSitusPage() {
  let programs: SitemapItem[] = [];
  let news: SitemapItem[] = [];

  try {
    // Ambil data agregat langsung dari Sanity secara simultan
    const query = `{
      "programs": *[_type == "program"] | order(_createdAt desc) { title, "slug": slug.current },
      "news": *[_type == "news"] | order(publishedAt desc) { title, "slug": slug.current }
    }`;
    
    const data = await sanityClient.fetch(query);
    programs = data.programs || [];
    news = data.news || [];
  } catch (error) {
    console.error('Gagal memuat data peta situs untuk SEO:', error);
  }

  // Struktur Halaman Statis Inti Internal
  const halamanInti = [
    { title: 'Beranda / Halaman Utama', url: '/' },
    { title: 'Kalkulator Zakat Otomatis', url: '/zakat' },
    { title: 'Portal Fundraiser & Statistik', url: '/fundraiser/stats' },
    { title: 'Tentang Kami & Legalitas', url: '/tentang-kami' },
    { title: 'Hubungi Kami (Layanan Amil)', url: '/hubungi-kami' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-3 sm:py-12 text-left">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER SECTION */}
        <div className="bg-white border border-gray-200/90 shadow-sm rounded-2xl p-5 space-y-2">
          <h1 className="text-base sm:text-xl font-extrabold text-gray-900 tracking-tight">
            🗺️ Peta Situs Resmi (HTML Sitemap)
          </h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            Halaman ini disediakan untuk mempermudah perayapan indeks robot mesin pencari sekaligus membantu donatur menavigasi seluruh struktur direktori URL <span className="font-semibold text-gray-700">bdb.or.id</span> secara transparan.
          </p>
        </div>

        {/* STRUCTURE SITEMAP GRID (Mobile-First 1 Kolom ke 3 Kolom) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* KOLOM 1: HALAMAN UTAMA & INTERNAL */}
          <div className="bg-white border border-gray-200/90 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3">
            <h2 className="text-[11px] font-extrabold text-[#0d5c91] bg-sky-50 px-2.5 py-1 rounded-lg uppercase tracking-wider inline-block">
              📂 Halaman Utama & Fitur
            </h2>
            <ul className="space-y-2.5 text-xs font-medium text-gray-700">
              {halamanInti.map((item, idx) => (
                <li key={idx} className="border-b border-gray-100 pb-2 last:border-none">
                  <a href={item.url} className="hover:text-[#0d5c91] transition block font-bold">
                    {item.title} <span className="text-[10px] text-gray-400 font-normal block mt-0.5">{`https://www.bdb.or.id${item.url}`}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* KOLOM 2: PROGRAM KAMPANYE AKTIF (DYNAMIC SANITY) */}
          <div className="bg-white border border-gray-200/90 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3">
            <h2 className="text-[11px] font-extrabold text-[#0d5c91] bg-sky-50 px-2.5 py-1 rounded-lg uppercase tracking-wider inline-block">
              📦 Program Kebaikan ({programs.length})
            </h2>
            {programs.length > 0 ? (
              <ul className="space-y-2.5 text-xs font-medium text-gray-700 max-h-[400px] overflow-y-auto pr-1">
                {programs.map((item, idx) => (
                  <li key={idx} className="border-b border-gray-100 pb-2 last:border-none">
                    <a href={`/campaign/${item.slug}`} className="hover:text-[#0d5c91] transition block font-bold">
                      {item.title} <span className="text-[10px] text-gray-400 font-normal block mt-0.5">{`https://www.bdb.or.id/campaign/${item.slug}`}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-gray-400 italic">Belum ada program kampanye aktif.</p>
            )}
          </div>

          {/* KOLOM 3: BERITA KEMANUSIAAN (DYNAMIC SANITY) */}
          <div className="bg-white border border-gray-200/90 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3">
            <h2 className="text-[11px] font-extrabold text-[#0d5c91] bg-sky-50 px-2.5 py-1 rounded-lg uppercase tracking-wider inline-block">
              📰 Berita & Kabar ({news.length})
            </h2>
            {news.length > 0 ? (
              <ul className="space-y-2.5 text-xs font-medium text-gray-700 max-h-[400px] overflow-y-auto pr-1">
                {news.map((item, idx) => (
                  <li key={idx} className="border-b border-gray-100 pb-2 last:border-none">
                    <a href={`/news/${item.slug}`} className="hover:text-[#0d5c91] transition block font-bold">
                      {item.title} <span className="text-[10px] text-gray-400 font-normal block mt-0.5">{`https://www.bdb.or.id/news/${item.slug}`}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-gray-400 italic">Belum ada artikel berita diterbitkan.</p>
            )}
          </div>

        </div>

        {/* FOOTER METRICS INFO */}
        <div className="text-center text-[10px] text-gray-400 font-medium tracking-wide pt-2">
          © {new Date().getFullYear()} bdb.or.id. Nilai tautan peta situs dipetakan otomatis terintegrasi skema indeks.
        </div>

      </div>
    </div>
  );
}
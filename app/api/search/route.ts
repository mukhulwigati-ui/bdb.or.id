// app/api/search/route.ts

// 🚀 JURUS SAKTI 1: Paksa Next.js mengabaikan optimasi statis agar lolos "npm run build"
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from 'next-sanity';

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '', // 🚀 AMAN: Fallback string kosong jika env belum terbaca saat build
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-06-20',
  useCdn: false,
});

export async function GET(request: Request) {
  // Proteksi runtime: Jika projectId kosong saat diakses, berikan respon aman
  if (!sanityClient.config().projectId) {
    return NextResponse.json(
      { success: false, error: 'Sanity Project ID belum terkonfigurasi di Environment Variables.' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (!q.trim()) {
      return NextResponse.json({ success: true, data: [] });
    }

    // ===================================================================
    // 🚀 JURUS SAKTI 2: Logika Kondisional Kategori (String vs Reference)
    // ===================================================================
    // Karena 'program' menggunakan type string biasa, sedangkan 'news' kemungkinan mereferensikan dokumen kategori,
    // kita gunakan fungsi select() atau pengondisian agar tipe datanya tidak bentrok/null.
    const query = `*[(_type == "news" || _type == "program") && title match $keyword] {
      "id": _id,
      "type": _type,
      "slug": slug.current,
      title,
      "category": select(
        _type == "program" => category,
        _type == "news" => category->title,
        null
      ),
      publishedAt,
      _createdAt
    }`;

    const results = await sanityClient.fetch(query, { keyword: `*${q}*` });
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Search API Route error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
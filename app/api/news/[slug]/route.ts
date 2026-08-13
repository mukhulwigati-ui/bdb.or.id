// app/api/news/[slug]/route.ts
import { NextResponse } from 'next/server';
// 🚀 OPTIMASI UTAMA: Menggunakan clientPublik dari utilitas lib yang mengaktifkan Edge CDN gratis
import { clientPublik as client } from '@/lib/sanity';

// 🚀 PROTEKSI 1: Ubah jendela revalidate menjadi 60 detik agar Next.js menahan render statis di sisi server
export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> } // Struktur Next.js 15+
) {
  try {
    // Menunggu Promise params diselesaikan dengan aman sesuai standar Next.js terbaru
    const { slug } = await context.params;
    
    console.log("=== MEMPROSES API DETAIL NEWS UNTUK SLUG ===", slug);

    // 🚀 QUERY GROQ LENGKAP DIPERTAHANKAN STRUKTUR DEREFERENCE-NYA
    const query = `{
      "article": *[_type == "news" && lower(slug.current) == lower($slug)][0] {
        "id": _id,
        title,
        "slug": slug.current,
        "imageUrl": image.asset->url,
        "caption": image.caption,
        "alt": image.alt,
        publishedAt,
        category,
        content[] {
          ...,
          asset-> {
            ...,
            url
          },
          markDefs[] {
            ...,
            _type == "reference" => {
              "slug": @->slug.current
            }
          }
        }
      },
      "allNews": *[_type == "news"] | order(publishedAt desc)[0..5] {
        "id": _id,
        title,
        "slug": slug.current,
        "imageUrl": image.asset->url,
        publishedAt,
        category
      },
      "sidebarCampaigns": *[_type == "program"] | order(_createdAt desc)[0..2] {
        "id": _id,
        "slug": slug.current,
        title,
        collectedRaw,
        targetAmount
      }
    }`;

    // 🚀 PROTEKSI 2: Eksekusi fetch murni memanfaatkan CDN gratis tanpa properti no-store perusak kuota
    const data = await client.fetch(query, { slug });

    if (!data.article) {
      return NextResponse.json(
        { success: false, error: `Artikel dengan slug '${slug}' tidak ditemukan di Sanity.` },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 🚀 PROTEKSI 3: Terapkan Cache-Control berbasis stale-while-revalidate tingkat tinggi
    return NextResponse.json(
      { success: true, data },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    );

  } catch (error: any) {
    console.error('🔥 API Detail News Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
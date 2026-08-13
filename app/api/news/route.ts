// app/api/news/route.ts
import { NextResponse } from 'next/server';
// 🚀 OPTIMASI UTAMA: Menggunakan clientPublik yang diarahkan ke Edge CDN Gratis Sanity
import { clientPublik as client } from '@/lib/sanity';

// 🚀 PROTEKSI 1: Hapus revalidate = 0, ganti dengan durasi simpan 60 detik di sisi server Next.js
export const dynamic = 'force-dynamic';
export const revalidate = 60;

function timeAgo(dateString: string) {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${diffDays} hari lalu`;
}

export async function GET() {
  try {
    // 🚀 QUERY GROQ TETAP DIJAGA KUALITASNYA
    const query = `*[_type == "news"] | order(publishedAt desc)[0..11] {
      "id": _id,
      "slug": slug.current,
      title,
      "image": image.asset->url,
      "category": coalesce(category->title, category, "Kabar Terbaru"),
      publishedAt
    }`;

    // 🚀 PROTEKSI 2: Hapus properti no-store, percayakan penanganan cache pada Next.js + CDN
    const sanityNews = await client.fetch(query);

    const formattedNews = sanityNews.map((item: any) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      image: item.image || '/images/placeholder.jpg',
      category: item.category,
      publishedAt: item.publishedAt,
      timeAgo: timeAgo(item.publishedAt),
    }));

    // 🚀 PROTEKSI 3: Gunakan Cache-Control tingkat server Next.js selama 1 menit (Bebas Bebas Kuota)
    return NextResponse.json(
      { success: true, data: formattedNews },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    );

  } catch (error: any) {
    console.error('🔥 Fetch News API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
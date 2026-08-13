// app/api/campaign/[slug]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: false, // Wajib false agar data langsung ditarik real-time
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
});

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    // 🚀 Query lengkap untuk menarik data kampanye, gambar, serta relasi donatur & laporan
    const query = `*[(_type == "program" || _type == "campaign") && (slug.current == $slug || slug == $slug)][0] {
      _id,
      title,
      "slug": coalesce(slug.current, slug),
      category,
      description,
      targetAmount,
      collectedRaw,
      "mainImageUrl": mainImage.asset->url,
      "imageUrl": image.asset->url,
      "thumbnailUrl": thumbnail.asset->url,
      "bannerUrl": banner.asset->url,
      "donors": *[_type == "donationTransaction" && (programId == ^._id || programName == ^.title) && status == "success"] {
        "name": donorName,
        "amount": amount,
        "date": _createdAt
      },
      "reports": reports[]{
        title,
        content,
        "date": _createdAt
      }
    }`;

    const data = await client.fetch(query, { slug });

    if (!data) {
      return NextResponse.json({ success: false, message: 'Campaign tidak ditemukan' }, { status: 404 });
    }

    // 🚀 MASTER LOGIC: Pilih gambar mana pun yang tersedia dari database Sanity
    const finalImageUrl = data.mainImageUrl || data.imageUrl || data.thumbnailUrl || data.bannerUrl || null;

    return NextResponse.json({ 
      success: true, 
      data: {
        _id: data._id,
        title: data.title,
        slug: data.slug,
        category: data.category,
        description: data.description,
        targetAmount: data.targetAmount || 50000000,
        collectedRaw: data.collectedRaw || 0,
        image: finalImageUrl, // Disamakan agar sesuai dengan pemanggilan di komponen frontend
        donors: data.donors || [],
        reports: data.reports || []
      }
    });
  } catch (error: any) {
    console.error('🔥 Gagal memuat detail campaign:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
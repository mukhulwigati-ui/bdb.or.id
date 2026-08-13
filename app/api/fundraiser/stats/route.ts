// app/api/fundraiser/stats/route.ts
import { NextResponse } from 'next/server';
// 🚀 OPTIMASI: Pastikan menggunakan client publik atau client Sanity yang sesuai project Anda
import { clientPublik as client } from '@/lib/sanity';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ success: false, message: 'Nomor WhatsApp wajib disertakan.' }, { status: 400 });
    }

    // Bersihkan format nomor untuk pencarian database (Samakan dengan format inputan pendaftaran)
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }
    const rawPhone = phone.trim();
    const localPhone = formattedPhone.startsWith('62') ? '0' + formattedPhone.slice(2) : phone;

    // 🚀 GROQ MULTI-QUERY LENGKAP:
    // 1. Mengambil profil fundraiser beserta program spesifik yang didukung (supportedPrograms)
    // 2. Mengambil riwayat donasi sukses berdasarkan nomor HP relawan
    // 3. Mengambil seluruh program aktif sebagai cadangan jika supportedPrograms kosong
    const query = `{
      "profile": *[_type == "fundraiser" && (phone == $phone || phone == $rawPhone || phone == $localPhone)][0] {
        name,
        feePaid,
        "supportedPrograms": supportedPrograms[]->{
          title,
          "slug": slug.current
        }
      },
      "donations": *[_type == "donationTransaction" && status == "success" && (fundraiserPhone == $phone || fundraiserPhone == $rawPhone || fundraiserPhone == $localPhone)] | order(_createdAt desc) {
        amount,
        donorName,
        slug,
        "programTitle": *[_type == "program" && slug.current == ^.slug][0].title,
        _createdAt
      },
      "allPrograms": *[_type == "program" && !(_id in path('drafts.**'))] {
        title,
        "slug": slug.current
      }
    }`;

    const data = await client.fetch(query, { 
      phone: formattedPhone,
      rawPhone: rawPhone,
      localPhone: localPhone
    });

    if (!data.profile) {
      return NextResponse.json({ success: false, message: 'Nomor WhatsApp belum terdaftar sebagai fundraiser.' }, { status: 404 });
    }

    // Jika fundraiser tidak memilih program khusus, berikan akses ke seluruh program aktif
    const targetPrograms = (data.profile.supportedPrograms && data.profile.supportedPrograms.length > 0)
      ? data.profile.supportedPrograms
      : data.allPrograms;

    // Hitung akumulasi pendapatan bersih dari link afiliasi relawan
    const totalEarnings = data.donations.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);

    return NextResponse.json(
      { 
        success: true, 
        profile: {
          name: data.profile.name,
          feePaid: data.profile.feePaid || 0,
        },
        totalEarnings,
        donationCount: data.donations.length,
        history: data.donations,
        programs: targetPrograms // Menyuplai daftar program untuk dropdown afiliasi frontend
      },
      {
        status: 200,
        headers: {
          // Mencegah cache agar penambahan donasi instan langsung terbaca di halaman statistik
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    );

  } catch (error: any) {
    console.error('🔥 API Fundraiser Stats Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
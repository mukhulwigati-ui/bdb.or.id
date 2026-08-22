// app/api/fundraiser/stats/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';

const serverClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'xqggeww8',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ success: false, message: 'Nomor WhatsApp wajib disertakan.' }, { status: 400 });
    }

    // Bersihkan format nomor untuk pencarian database
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }
    const rawPhone = phone.trim();
    const localPhone = formattedPhone.startsWith('62') ? '0' + formattedPhone.slice(2) : phone;
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    // 🚀 PERBAIKAN GROQ: Menggunakan tanda kurung yang benar untuk mengelompokkan kondisi tipe dokumen dan nomor HP
    const query = `{
      "donations": *[(_type == "donationStatus" || _type == "donationTransaction") && (status == "success" || status == "paid" || status == "settlement" || status == "capture") && (fundraiserPhone == $phone || fundraiserPhone == $rawPhone || fundraiserPhone == $localPhone || fundraiserPhone == $cleanPhone)] | order(_createdAt desc) {
        amount,
        donorName,
        "programTitle": programName->title,
        _createdAt
      },
      "allPrograms": *[_type == "program" && !(_id in path('drafts.**'))] {
        title,
        "slug": slug.current
      }
    }`;

    // Jalankan query dengan menyertakan berbagai variasi format nomor HP
    const data = await serverClient.fetch(query, { 
      phone: formattedPhone,
      rawPhone: rawPhone,
      localPhone: localPhone,
      cleanPhone: cleanPhone
    });

    const donations = data.donations || [];

    // Hitung akumulasi pendapatan dari link afiliasi
    const totalEarnings = donations.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);

    return NextResponse.json(
      { 
        success: true, 
        profile: {
          name: 'Dermawan Afiliasi',
          feePaid: 0,
        },
        totalEarnings,
        donationCount: donations.length,
        history: donations,
        programs: data.allPrograms || []
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    );

  } catch (error: any) {
    console.error('🔥 API Fundraiser Stats Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
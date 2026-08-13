// app/api/fundraiser/register/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

// 🚀 KLIEN KHUSUS WRITE: Menggunakan token tulis dari Vercel
const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'xqggeww8',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN, // Mengambil langsung dari Vercel
  useCdn: false,
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json({ success: false, message: 'Data pendaftaran kosong' }, { status: 400 });
    }

    const { name, phone } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, message: 'Nama dan nomor WhatsApp wajib diisi.' }, { status: 400 });
    }

    // Normalisasi nomor telepon
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }
    const rawPhone = phone.trim();
    const localPhone = formattedPhone.startsWith('62') ? '0' + formattedPhone.slice(2) : phone;

    // Cek apakah nomor sudah terdaftar sebelumnya
    const existingQuery = `*[_type == "fundraiser" && (phone == $phone || phone == $rawPhone || phone == $localPhone)][0]`;
    const existing = await writeClient.fetch(existingQuery, { 
      phone: formattedPhone, 
      rawPhone: rawPhone, 
      localPhone: localPhone 
    });

    let newFundraiser;
    if (existing) {
      newFundraiser = existing;
    } else {
      // Simpan data baru ke Sanity menggunakan token write
      newFundraiser = await writeClient.create({
        _type: 'fundraiser',
        name: name,
        phone: formattedPhone,
        feePaid: 0,
      });
    }

    // Kirim WhatsApp via Fonnte secara langsung
    try {
      const fonnteToken = process.env.FONNTE_TOKEN || process.env.TOKEN_FONNTE;

      if (fonnteToken) {
        const messageText = 
          `*Pendaftaran Fundraiser yaibadurrohman.or.id Berhasil!* 🎉\n\n` +
          `Assalamu'alaikum *${name}*,\n\n` +
          `Alhamdulillah, pendaftaran Anda sebagai fundraiser telah resmi *AKTIF*.\n\n` +
          `Yuk, ambil tautan afiliasi unik Anda dan pantau perolehan donasi secara transparan melalui halaman resmi berikut:\n` +
          `👉 https://www.yaibadurrohman.or.id/fundraiser/stats\n\n` +
          `Cukup masukkan nomor WhatsApp Anda (*${formattedPhone}*) pada halaman tersebut untuk memunculkan link dan melihat riwayat donatur.\n\n` +
          `Jazakumullah Khairan Katsiran atas kontribusi terbaik Anda! 🙏`;

        await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { 'Authorization': fonnteToken },
          body: new URLSearchParams({
            target: formattedPhone,
            message: messageText,
          }),
        });
      }
    } catch (waError) {
      console.error('⚠️ Gagal kirim WA Fonnte:', waError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pendaftaran berhasil dan akun langsung aktif!',
      data: newFundraiser 
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 Register Fundraiser Error:', error.message || error);
    return NextResponse.json({ success: false, message: `Gagal server: ${error.message || 'Kesalahan tidak diketahui'}` }, { status: 500 });
  }
}
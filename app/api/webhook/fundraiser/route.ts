// app/api/webhook/fundraiser/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    
    console.log('🚨 WEBHOOK SANITY FUNDRAISER MASUK:', JSON.stringify(body));

    if (!body) {
      return NextResponse.json({ success: false, message: 'Payload kosong' }, { status: 400 });
    }

    const name = body.name || body.result?.name;
    const phone = body.phone || body.result?.phone;
    const status = body.status || body.result?.status;

    const isApproved = status === 'approved' || status === 'Disetujui (Aktif)';

    if (isApproved && phone) {
      const fonnteToken = process.env.FONNTE_TOKEN || process.env.TOKEN_FONNTE;
      
      if (!fonnteToken) {
        console.error('🔥 Token Fonnte kosong di environment Vercel');
        return NextResponse.json({ success: false, message: 'Token WA tidak ditemukan' }, { status: 500 });
      }

      let formattedPhone = phone.replace(/[^0-9]/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.slice(1);
      }

      const messageText = 
        `*Pendaftaran Fundraiser islami.or.id Disetujui!* 🎉\n\n` +
        `Assalamu'alaikum *${name || 'Relawan'}*,\n\n` +
        `Alhamdulillah, pengajuan Anda sebagai fundraiser telah resmi *DISETUJUI & DIAKTIFKAN* oleh admin.\n\n` +
        `Yuk, ambil tautan afiliasi unik Anda dan pantau perolehan donasi secara transparan melalui halaman resmi berikut:\n` +
        `👉 https://www.islami.or.id/fundraiser/stats\n\n` +
        `Cukup masukkan nomor WhatsApp Anda (*${formattedPhone}*) pada halaman tersebut untuk memunculkan link dan melihat riwayat donatur.\n\n` +
        `Jazakumullah Khairan Katsiran atas kontribusi terbaik Anda! 🙏`;

      const resFonnte = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': fonnteToken },
        body: new URLSearchParams({
          target: formattedPhone,
          message: messageText,
        }),
      });

      const resJson = await resFonnte.json();
      console.log('📌 Response Fonnte Webhook:', resJson);
    }

    return NextResponse.json({ success: true, message: 'Webhook processed successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 Webhook Fundraiser Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
// app/api/webhook/pakasir/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';

// 🚀 Inisialisasi Sanity Client dengan Write Token
const client = createClient({
  projectId: 'ks29gg6v', 
  dataset: 'production',
  useCdn: false,
  apiVersion: '2026-07-18',
  token: process.env.SANITY_API_WRITE_TOKEN || 'skTkgR8oTccSIXr6lsYEhhShtcblvWtNod41Oq1DSARiIqwBqTEpWqaaO3AFWwLKCch2Z0SviYoIOftVnn6S37ypRTvvCPmHtC9fELz2EbMnlh0Vt70al8UZZHWE6y8VvsqRA2GUYo7uhz9WhdFWkG4BPwTbwotrE3KfB3MZthvBbIo6QxrK', 
});

// Fungsi helper untuk kirim WhatsApp via Fonnte
async function sendFonnteNotification(targetPhone: string, donorName: string, amount: number, programTitle: string, orderId: string) {
  const fonnteToken = process.env.FONNTE_API_TOKEN || '';
  if (!fonnteToken) {
    console.warn('[Fonnte Warning] FONNTE_API_TOKEN belum diatur di environment variables.');
    return;
  }

  let formattedPhone = targetPhone.replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.slice(1);
  }

  const message = `Alhamdulillah, jazakumullahu khairan *${donorName}*! 🙏\n\nDonasi Anda sebesar *Rp ${amount.toLocaleString('id-ID')}* untuk program *${programTitle}* telah berhasil dikonfirmasi dan terverifikasi otomatis.\n\nNo. Invoice: \`${orderId}\`\n\nSemoga menjadi amal jariyah yang berlipat ganda, mendatangkan keberkahan, serta diberikan ganti yang lebih baik oleh Allah SWT. Aamiin ya Rabbal 'alamin. 🤲\n\n*Balai Dakwah Banjarnegara*`;

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fonnteToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: formattedPhone,
        message: message,
        countryCode: '62',
      }),
    });

    const result = await response.json();
    if (result.status) {
      console.log(`[Fonnte] Pesan WhatsApp berhasil dikirim ke ${formattedPhone}`);
    } else {
      console.error('[Fonnte Error] Gagal mengirim pesan:', result);
    }
  } catch (err) {
    console.error('[Fonnte Exception] Kesalahan koneksi ke API Fonnte:', err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Tangkap order_id dari payload Pakasir dan simpan ke variabel orderId
    const { amount, order_id, project, status, payment_method, completed_at } = body;
    const orderId = order_id;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    console.log(`[Pakasir Webhook] Menerima webhook untuk Order ID: ${orderId} dengan status: ${status}`);

    if (status === 'completed' || status === 'success') {
      
      // 1. Cari dokumen transaksi berdasarkan orderId di Sanity
      const query = `*[_type == "donationTransaction" && orderId == $orderId][0]`;
      const transaction = await client.fetch(query, { orderId });

      let programTitle = 'Program Kebaikan';
      let donorPhone = '';
      let donorName = 'Hamba Allah';

      if (transaction) {
        donorPhone = transaction.donorPhone || '';
        donorName = transaction.donorName || 'Hamba Allah';

        // Perbarui status dokumen di Sanity menjadi 'success'
        await client
          .patch(transaction._id)
          .set({ 
            status: 'success',
            paymentMethod: payment_method || transaction.paymentMethod 
          })
          .commit();

        console.log(`[Sanity] Transaksi ${orderId} berhasil diperbarui menjadi SUCCESS.`);

        if (transaction.slug) {
          const progQuery = `*[_type == "program" && slug.current == $slug][0]`;
          const programDoc = await client.fetch(progQuery, { slug: transaction.slug });

          if (programDoc) {
            programTitle = programDoc.title || programTitle;
            const currentCollected = Number(programDoc.collectedAmount || 0);
            const donationAmount = Number(transaction.amount || amount || 0);
            const newCollected = currentCollected + donationAmount;

            const newDonorEntry = {
              _key: Math.random().toString(36).substring(2),
              name: donorName,
              amount: donationAmount,
              date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            };

            await client
              .patch(programDoc._id)
              .set({ collectedAmount: newCollected })
              .append('donors', [newDonorEntry])
              .commit();

            console.log(`[Sanity] Dana program ${transaction.slug} berhasil diakumulasikan.`);
          }
        }
      } else {
        console.warn(`[Sanity Warning] Transaksi dengan orderId ${orderId} tidak ditemukan di database.`);
      }

      // 2. Kirim pesan WhatsApp otomatis via Fonnte
      if (donorPhone) {
        const finalAmount = Number(amount || transaction?.amount || 0);
        await sendFonnteNotification(donorPhone, donorName, finalAmount, programTitle, orderId);
      }

      // 3. Sinkronkan status sukses ke Google Sheet (Opsional)
      const googleSheetScriptUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || '';
      if (googleSheetScriptUrl && googleSheetScriptUrl.trim()) {
        try {
          await fetch(googleSheetScriptUrl.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderId,
              status: 'success',
              completedAt: completed_at || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
            }),
          });
          console.log(`[Google Sheet] Status sukses disinkronkan untuk ${orderId}`);
        } catch (sheetErr) {
          console.error('[Google Sheet Error] Gagal memperbarui status ke sheet:', sheetErr);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Webhook processed successfully' });
    
  } catch (error: any) {
    console.error('Pakasir Webhook Server Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
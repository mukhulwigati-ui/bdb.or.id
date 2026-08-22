// app/api/doku/notify/route.ts
import { NextResponse } from 'next/server';
import { createClient } from 'next-sanity';

// Konfigurasi Sanity Client dengan Token Write/Editor agar bisa melakukan mutasi/update data
const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-05-01',
  token: process.env.SANITY_API_WRITE_TOKEN, // Pastikan token write sudah diset di .env
  useCdn: false, // Wajib false untuk proses mutasi/update data real-time
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('🔔 DOKU NOTIFICATION RECEIVED:', JSON.stringify(body));

    const invoiceNumber = body.order?.invoice_number;
    const amount = Number(body.order?.amount || 0);
    const transactionStatus = body.transaction?.status || body.result?.status;

    if (transactionStatus === 'SUCCESS' || transactionStatus === 'PAID') {
      console.log(`✅ Pembayaran Invoice ${invoiceNumber} sebesar Rp ${amount} Berhasil.`);

      // 1. Cari dokumen transaksi atau donasi di Sanity berdasarkan invoiceNumber
      const query = `*[_type == "donation" && invoiceNumber == $invoiceNumber][0]`;
      const donationDoc = await sanityClient.fetch(query, { invoiceNumber });

      if (donationDoc && donationDoc.status !== 'PAID') {
        // 2. Update status dokumen donasi di Sanity menjadi PAID
        await sanityClient
          .patch(donationDoc._id)
          .set({ status: 'PAID' })
          .commit();

        // 3. Jika donasi terhubung ke campaign tertentu, tambahkan nominal ke campaign tersebut
        if (donationDoc.campaign?._ref) {
          const campaignId = donationDoc.campaign._ref;
          
          // Ambil data campaign saat ini untuk menjumlahkan nominal lama dengan yang baru
          const campaignDoc = await sanityClient.fetch(`*[_id == $id][0]`, { id: campaignId });
          
          if (campaignDoc) {
            const currentCollected = Number(campaignDoc.collectedAmount || 0);
            const newCollected = currentCollected + amount;

            // Update total terkumpul di Sanity
            await sanityClient
              .patch(campaignId)
              .set({ collectedAmount: newCollected })
              .commit();

            console.log(`🎉 Berhasil memperbarui campaign di Sanity. Total terkumpul sekarang: Rp ${newCollected}`);
          }
        }
      } else {
        console.log(`⚠️ Dokumen donasi dengan invoice ${invoiceNumber} tidak ditemukan di Sanity atau sudah berstatus PAID.`);
      }
    }

    return NextResponse.json({ status: 'SUCCESS' }, { status: 200 });
  } catch (error) {
    console.error('🔥 Error webhook Sanity:', error);
    return NextResponse.json({ status: 'ERROR', message: 'Internal Server Error' }, { status: 500 });
  }
}
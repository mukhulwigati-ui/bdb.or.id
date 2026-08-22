// app/api/callback/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import { google } from 'googleapis';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// 🚀 BYPASS CLIENT: Murni untuk update data esensial program website
const client = createClient({
  projectId: 'ks29gg6v',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: 'skTkgR8oTccSIXr6lsYEhhShtcblvWtNod41Oq1DSARiIqwBqTEpWqaaO3AFWwLKCch2Z0SviYoIOftVnn6S37ypRTvvCPmHtC9fELz2EbMnlh0Vt70al8UZZHWE6y8VvsqRA2GUYo7uhz9WhdFWkG4BPwTbwotrE3KfB3MZthvBbIo6QxrK',
});

// ===================================================================
// 📊 OTOMATISASI PENULISAN DATABASE KE GOOGLE SHEETS
// ===================================================================
async function appendToGoogleSheets(data: {
  orderId: string;
  name: string;
  phone: string;
  amount: number;
  program: string;
  date: string;
}) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    let cleanPhone = data.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const whatsappFormula = cleanPhone 
      ? `=HYPERLINK("https://wa.me/${cleanPhone}"; "${data.phone}")` 
      : '-';

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[data.date, data.orderId, data.name, whatsappFormula, data.amount, data.program]],
      },
    });
    console.log('📊 MUTASI GOOGLE SHEETS SUKSES.');
  } catch (err) {
    console.error('🔥 GOOGLE SHEETS ERROR:', err);
  }
}

// ===================================================================
// MAIN WEBHOOK CONTROLLER (DUITKU CALLBACK)
// ===================================================================
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // 🚀 Duitku Parameter Mapping
    const merchantCode = payload.merchantCode;
    const amount = payload.amount;
    const merchantOrderId = payload.merchantOrderId || payload.order_id;
    const signature = payload.signature;
    const resultCode = payload.resultCode; // '00' menandakan sukses di Duitku

    const cleanOrderId = merchantOrderId ? String(merchantOrderId).trim() : '';
    if (!cleanOrderId) {
      return NextResponse.json({ success: false, message: "Order ID tidak ditemukan." }, { status: 400 });
    }

    // 🚀 VALIDASI SIGNATURE DUITKU (Keamanan Callback)
    const duitkuApiKey = process.env.DUITKU_API_KEY || '';
    const duitkuMerchantCode = process.env.DUITKU_MERCHANT_CODE || merchantCode;

    if (duitkuApiKey && signature) {
      const calculatedSignature = crypto
        .createHash('md5')
        .update(`${duitkuMerchantCode}${amount}${cleanOrderId}${duitkuApiKey}`)
        .digest('hex');

      if (signature !== calculatedSignature) {
        console.warn(`⚠️ Warning: Invalid Duitku signature for order: ${cleanOrderId}`);
        return NextResponse.json({ success: false, message: 'Invalid Signature' }, { status: 400 });
      }
    }

    // Cek apakah status dari Duitku sukses (resultCode '00' atau status sukses lainnya)
    const isSuccess = resultCode === '00' || payload.status === 'completed' || payload.status === 'success' || payload.status === 'paid';
    
    if (!isSuccess) {
      return NextResponse.json({ success: true, message: `Status pembayaran (${resultCode || payload.status}) diabaikan / belum sukses.` });
    }

    // 1. Ambil Data Transaksi dari Sanity
    const transactionQuery = `*[_type == "donationTransaction" && orderId == $orderId][0]`;
    const pendingTransaction = await client.fetch(transactionQuery, { orderId: cleanOrderId });

    let donorNameFromForm = "Hamba Allah";
    let donorPhoneFromForm = "";
    let programSlug = "sedekah-subuh"; 
    let paymentMethodUsed = "QRIS";

    if (pendingTransaction) {
      if (pendingTransaction.status === 'success') {
        return NextResponse.json({ success: true, message: "Sudah diproses sebelumnya." });
      }
      if (pendingTransaction.donorName) donorNameFromForm = String(pendingTransaction.donorName).trim();
      if (pendingTransaction.donorPhone) donorPhoneFromForm = String(pendingTransaction.donorPhone).trim();
      if (pendingTransaction.slug) programSlug = String(pendingTransaction.slug).toLowerCase().trim();
      if (pendingTransaction.paymentMethod) paymentMethodUsed = String(pendingTransaction.paymentMethod).toUpperCase();
    }

    // 2. Ambil Program di Sanity
    const findQuery = `*[_type == "program" && slug.current == $slug][0] { _id, title, collectedRaw, donors }`;
    const finalProgram = await client.fetch(findQuery, { slug: programSlug });
    
    if (!finalProgram) {
      return NextResponse.json({ success: false, message: `Program tidak ditemukan.` }, { status: 404 });
    }

    const donationAmount = Number(amount) || Number(pendingTransaction?.amount) || 0;
    const currentDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const currentFullTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // ===================================================================
    // 3. JALANKAN MUTASI SANITY & LOGIKA AFILIASI
    // ===================================================================
    if (pendingTransaction) {
      // Tandai sukses transaksi
      await client.patch(pendingTransaction._id).set({ status: 'success' }).commit();

      // 🚀 CEK AFILIASI: Hitung Ujrah 10%
      const refPhone = pendingTransaction.fundraiserPhone;
      if (refPhone) {
        let formattedRefPhone = refPhone.replace(/[^0-9]/g, '');
        let alternativeRefPhone = formattedRefPhone;
        
        if (formattedRefPhone.startsWith('0')) {
          alternativeRefPhone = '62' + formattedRefPhone.slice(1);
        } else if (formattedRefPhone.startsWith('62')) {
          alternativeRefPhone = '0' + formattedRefPhone.slice(2);
        }

        const fundraiser = await client.fetch(
          `*[_type == "fundraiser" && (phone == $phone || phone == $altPhone)][0]`, 
          { phone: refPhone.trim(), altPhone: alternativeRefPhone }
        );

        if (fundraiser) {
          const ujrah = donationAmount * 0.1;
          await client.patch(fundraiser._id)
            .setIfMissing({ totalDanaDihimpun: 0, sisaSaldoFee: 0, totalTransaksiSukses: 0 })
            .inc({ totalDanaDihimpun: donationAmount, sisaSaldoFee: ujrah, totalTransaksiSukses: 1 })
            .commit();
          console.log(`✅ Ujrah Rp ${ujrah} berhasil ditambahkan ke saldo ${fundraiser.name}`);
        }
      }
    }

    // Update Progress Bar Program & Tambah Donatur
    await client.patch(finalProgram._id)
      .setIfMissing({ collectedRaw: 0, donors: [] })
      .inc({ collectedRaw: donationAmount }) 
      .append('donors', [{
        _key: `donor-${cleanOrderId}-${Math.random().toString(36).substring(2, 5)}`,
        orderId: cleanOrderId,
        name: donorNameFromForm,
        amount: donationAmount,
        date: currentDate
      }])
      .commit();

    // 📊 Catat Mutasi ke Google Sheets
    await appendToGoogleSheets({ 
      date: currentDate, 
      orderId: cleanOrderId, 
      name: donorNameFromForm, 
      phone: donorPhoneFromForm, 
      amount: donationAmount, 
      program: finalProgram.title 
    });

    // ===================================================================
    // 📲 NOTIFIKASI WHATSAPP PREMIUM VIA FONNTE
    // ===================================================================
    if (donorPhoneFromForm) {
      let formattedPhone = donorPhoneFromForm.replace(/[^0-9]/g, '');
      if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
      
      const messageText = `*DONASI BERHASIL DITERIMA* 🎉
  
Jazakumullah khairan, Kak *${donorNameFromForm}*. Donasi Anda telah berhasil kami verifikasi dengan detail berikut:

📝 *No. Invoice:* ${cleanOrderId}
📌 *Program:* ${finalProgram.title}
💰 *Nominal:* Rp ${donationAmount.toLocaleString('id-ID')}
💳 *Metode:* ${paymentMethodUsed}
⏰ *Tanggal:* ${currentDate} - ${currentFullTime} WIB

Semoga sedekah yang ditunaikan menjadi penggugur dosa, pembuka pintu rezeki, dan membawa keberkahan yang berlipat ganda untuk Anda beserta keluarga. Aamiin Yaa Rabbal 'Aalamiin.

----------------------------
*Yayasan Islam Ibadurrohman Cilacap*
_Salurkan kepedulian Anda secara amanah & transparan di yaibadurrohman.or.id_`;

      try {
        await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { 'Authorization': process.env.FONNTE_TOKEN || '' },
          body: new URLSearchParams({ target: formattedPhone, message: messageText }),
        });
      } catch (err) { 
        console.error('🔥 Fonnte error:', err); 
      }
    }

    return NextResponse.json({ success: true, message: "Sukses diproses." });

  } catch (error: any) {
    console.error('🔥 CRITICAL WEBHOOK ERROR:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
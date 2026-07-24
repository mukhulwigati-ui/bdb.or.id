// app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// 🚀 INITIALIZE SANITY CLIENT DENGAN TOKEN BYPASS EDITOR
const client = createClient({
  projectId: 'ks29gg6v', 
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: 'skTkgR8oTccSIXr6lsYEhhShtcblvWtNod41Oq1DSARiIqwBqTEpWqaaO3AFWwLKCch2Z0SviYoIOftVnn6S37ypRTvvCPmHtC9fELz2EbMnlh0Vt70al8UZZHWE6y8VvsqRA2GUYo7uhz9WhdFWkG4BPwTbwotrE3KfB3MZthvBbIo6QxrK', 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const slug = body.slug || '';
    const donorName = body.donorName || body.name || 'Hamba Allah';
    const donorPhone = body.donorPhone || body.phone || body.whatsapp || ''; 
    
    // 🚀 LOGIKA AFILIASI: Tangkap nomor WhatsApp fundraiser yang dioper oleh frontend
    const fundraiserPhone = body.fundraiserPhone || body.referral || '';
    
    // 🚀 DUKUNGAN METODE PEMBAYARAN DUITKU (Default 'GQ' untuk QRIS, atau sesuai kode pilihan user)
    const paymentMethod = body.paymentMethod || 'GQ'; 
    const cleanMethod = String(paymentMethod).toUpperCase().trim();
    
    const rawAmount = body.amount || body.nominal || 0;
    const cleanAmountNumber = Number(String(rawAmount).replace(/\D/g, ''));

    // Validasi dasar transaksi minimal Rp 1.000
    if (!slug || !cleanAmountNumber || cleanAmountNumber < 1000) {
      return NextResponse.json(
        { success: false, error: 'Data tidak valid. Minimal donasi adalah Rp 1.000' },
        { status: 400 }
      );
    }

    // Kustomisasi invoice prefix berdasarkan slug program donasi
    const cleanSlug = String(slug).toUpperCase();
    const prefix = cleanSlug.includes('BERAS') ? 'BERAS' : cleanSlug.includes('MUALAF') ? 'MUALAF' : 'SUBUH';
    const generatedOrderId = `INV-${prefix}-${Date.now()}`;

    // 🚀 KONFIGURASI KREDENSIAL DUITKU RESMI (Merchant Code: D23767)
    const merchantCode = process.env.DUITKU_MERCHANT_CODE || 'D23767';
    const apiKey = process.env.DUITKU_API_KEY || '';

    if (!merchantCode || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Internal Server Error: Kredensial Duitku (API Key) belum disetel di Environment Variables.' },
        { status: 500 }
      );
    }

    // Tentukan URL API Duitku (Gunakan production karena status merchant aktif / sandbox jika uji coba)
    const isProduction = process.env.NODE_ENV === 'production';
    const duitkuBaseUrl = isProduction ? 'https://api-prod.duitku.com' : 'https://api-sandbox.duitku.com';
    const targetDuitkuUrl = `${duitkuBaseUrl}/webapi/api/merchant/v2/inquiry`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yaibadurrohman.or.id';
    const callbackUrl = `${siteUrl}/api/callback`;
    const returnUrl = `${siteUrl}/thank-you?order_id=${generatedOrderId}`;

    // 🚀 GENERATE SIGNATURE DUITKU
    // Rumus: MD5(merchantCode + orderId + amount + apiKey)
    const signature = crypto
      .createHash('md5')
      .update(`${merchantCode}${generatedOrderId}${cleanAmountNumber}${apiKey}`)
      .digest('hex');

    const duitkuPayload = {
      merchantCode: merchantCode,
      paymentAmount: cleanAmountNumber,
      paymentMethod: cleanMethod,
      merchantOrderId: generatedOrderId,
      productDetails: `Donasi Program ${slug}`,
      email: donorPhone ? `${donorPhone.replace(/[^0-9]/g, '')}@yaibadurrohman.or.id` : 'donatur@yaibadurrohman.or.id',
      phoneNumber: donorPhone,
      customerVaName: donorName,
      callbackUrl: callbackUrl,
      returnUrl: returnUrl,
      signature: signature,
      expiryPeriod: 1440, // Masa berlaku 24 jam
    };

    const duitkuResponse = await fetch(targetDuitkuUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(duitkuPayload),
    });

    const responseText = await duitkuResponse.text();
    let duitkuData;

    try {
      duitkuData = JSON.parse(responseText);
    } catch (e) {
      console.error('🔥 Respon mentah bukan JSON dari Duitku:', responseText);
      return NextResponse.json(
        { success: false, error: 'Gagal memproses respons dari gateway Duitku (Invalid JSON).' },
        { status: 500 }
      );
    }

    // Memeriksa kegagalan respon dari API Duitku
    if (!duitkuResponse.ok || duitkuData.statusCode !== '00') {
      throw new Error(duitkuData.statusMessage || `Gagal membuat transaksi ke gateway Duitku.`);
    }

    const paymentUrl = duitkuData.paymentUrl || '';
    const paymentNumber = duitkuData.vaNumber || duitkuData.qrString || '';
    const totalPayment = Number(duitkuData.amount || cleanAmountNumber);

    // 🚀 1. MENULIS DATA TRANSAKSI LENGKAP KE SANITY
    await client.create({
      _type: 'donationTransaction',
      orderId: String(generatedOrderId),
      donorName: String(donorName),
      donorPhone: String(donorPhone),
      amount: Number(cleanAmountNumber),         
      totalAmount: Number(totalPayment), 
      status: 'pending',
      slug: String(slug),
      paymentMethod: String(cleanMethod), 
      paymentUrl: String(paymentUrl), 
      paymentNumber: String(paymentNumber), 
      fundraiserPhone: fundraiserPhone ? String(fundraiserPhone).trim() : '',
    });

    console.log(`🔒 TRANSAKSI DUITKU DICATAT DI SANITY: ${generatedOrderId} | Fundraiser: ${fundraiserPhone || 'Non-Afiliasi'}`);

    // 🚀 2. SYNC KE GOOGLE SHEET
    const googleSheetScriptUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || '';

    if (googleSheetScriptUrl && googleSheetScriptUrl.trim()) {
      try {
        await fetch(googleSheetScriptUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: generatedOrderId,
            donorName: String(donorName),
            donorPhone: `'${String(donorPhone)}`, 
            amount: cleanAmountNumber,
            programSlug: String(slug),
            paymentMethod: cleanMethod,
            fundraiserPhone: fundraiserPhone ? `'${String(fundraiserPhone)}` : '-',
            status: 'pending',
            createdAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
          }),
        });
        console.log(`📊 DATA SINKRON KE GOOGLE SHEET: ${generatedOrderId}`);
      } catch (sheetError) {
        console.error('🔥 Gagal mengirim data transaksi ke Google Sheet:', sheetError);
      }
    } else {
      console.warn('⚠️ GOOGLE_SHEET_WEBHOOK_URL belum dipasang di environment variables.');
    }

    // Mengembalikan response sukses ke frontend
    return NextResponse.json({
      success: true,
      orderId: generatedOrderId,
      amount: cleanAmountNumber,
      paymentMethod: cleanMethod,
      paymentUrl: paymentUrl,       
      paymentNumber: paymentNumber, 
    });

  } catch (error: any) {
    console.error('🔥 BACKEND CHECKOUT ERROR VIA API DUITKU:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
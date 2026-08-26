// app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

export const dynamic = 'force-dynamic';

// 🚀 INITIALIZE SANITY CLIENT (ID Proyek: ks29gg6v)
const client = createClient({
  projectId: 'ks29gg6v', 
  dataset: 'production',
  useCdn: false,
  apiVersion: '2026-07-18',
  token: process.env.SANITY_API_WRITE_TOKEN || 'skTkgR8oTccSIXr6lsYEhhShtcblvWtNod41Oq1DSARiIqwBqTEpWqaaO3AFWwLKCch2Z0SviYoIOftVnn6S37ypRTvvCPmHtC9fELz2EbMnlh0Vt70al8UZZHWE6y8VvsqRA2GUYo7uhz9WhdFWkG4BPwTbwotrE3KfB3MZthvBbIo6QxrK', 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const slug = body.slug || '';
    const donorName = body.donorName || body.name || 'Hamba Allah';
    const donorPhone = body.donorPhone || body.phone || body.whatsapp || ''; 
    
    // 🚀 LOGIKA AFILIASI: Tangkap nomor WhatsApp fundraiser
    const fundraiserPhone = body.fundraiserPhone || body.referral || '';
    
    // 🚀 PILIHAN METODE PEMBAYARAN PAKASIR (Default 'qris')
    const paymentMethod = body.paymentMethod || 'qris';
    const cleanMethod = String(paymentMethod).toLowerCase().trim();
    
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
    const generatedOrderId = `INV-BDB-${prefix}-${Date.now()}`;

    // 🚀 KONFIGURASI KREDENSIAL PAKASIR
    const projectSlug = process.env.PAKASIR_PROJECT_SLUG || 'depodomain';
    const apiKey = process.env.PAKASIR_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Internal Server Error: PAKASIR_API_KEY belum disetel di Environment Variables.' },
        { status: 500 }
      );
    }

    // 🚀 ENDPOINT API TRANSACTION CREATE PAKASIR
    const targetPakasirUrl = `https://app.pakasir.com/api/transactioncreate/${cleanMethod}`;

    const pakasirPayload = {
      project: projectSlug,
      order_id: generatedOrderId,
      amount: cleanAmountNumber,
      api_key: apiKey,
    };

    const pakasirResponse = await fetch(targetPakasirUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pakasirPayload),
    });

    const responseText = await pakasirResponse.text();
    let pakasirData;

    try {
      pakasirData = JSON.parse(responseText);
    } catch (e) {
      console.error('🔥 Respon mentah bukan JSON dari Pakasir:', responseText);
      return NextResponse.json(
        { success: false, error: 'Gagal memproses respons dari gateway Pakasir (Invalid JSON).' },
        { status: 500 }
      );
    }

    // Memeriksa kegagalan respon dari API Pakasir
    if (!pakasirResponse.ok || !pakasirData.payment) {
      throw new Error(pakasirData.error || `Gagal membuat transaksi ke gateway Pakasir.`);
    }

    const paymentInfo = pakasirData.payment;
    const paymentNumber = paymentInfo.payment_number || '';
    const totalPayment = Number(paymentInfo.total_payment || cleanAmountNumber);
    const expiredAt = paymentInfo.expired_at || '';

    // URL Redirect sukses milik bdb.or.id
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bdb.or.id';
    const returnUrl = `${siteUrl}/thank-you?order_id=${generatedOrderId}`;

    // 🚀 MEMBUAT URL PEMBAYARAN RESMI PAKASIR
    const pakasirPayUrl = `https://app.pakasir.com/pay/${projectSlug}/${cleanAmountNumber}?order_id=${generatedOrderId}&redirect=${encodeURIComponent(returnUrl)}`;

    // 🚀 1. MENULIS DATA TRANSAKSI LENGKAP KE SANITY (Menggunakan URL Pembayaran Pakasir yang benar)
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
      paymentUrl: String(pakasirPayUrl), // 🚀 Diperbaiki: Mengarah ke URL Pembayaran Pakasir
      paymentNumber: String(paymentNumber), 
      fundraiserPhone: fundraiserPhone ? String(fundraiserPhone).trim() : '',
    });

    console.log(`🔒 TRANSAKSI PAKASIR DICATAT DI SANITY: ${generatedOrderId} | Fundraiser: ${fundraiserPhone || 'Non-Afiliasi'}`);

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
      totalPayment: totalPayment,
      paymentMethod: cleanMethod,
      paymentNumber: paymentNumber, 
      expiredAt: expiredAt,
      returnUrl: returnUrl,
      paymentUrl: pakasirPayUrl,
    });

  } catch (error: any) {
    console.error('🔥 BACKEND CHECKOUT ERROR VIA API PAKASIR:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
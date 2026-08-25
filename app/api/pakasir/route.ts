// app/api/pakasir/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, amount, method = 'qris' } = body;

    const projectSlug = process.env.PAKASIR_PROJECT_SLUG || 'depodomain';
    const apiKey = process.env.PAKASIR_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'PAKASIR_API_KEY belum diatur di environment variables.' },
        { status: 500 }
      );
    }

    const cleanMethod = String(method).toLowerCase().trim();
    const targetUrl = `https://app.pakasir.com/api/transactioncreate/${cleanMethod}`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: projectSlug,
        order_id: order_id,
        amount: Number(amount),
        api_key: apiKey,
      }),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Response bukan JSON:', responseText);
      return NextResponse.json(
        { success: false, error: 'Gagal memproses respons dari Pakasir' },
        { status: 500 }
      );
    }

    if (!response.ok || !data.payment) {
      return NextResponse.json(
        { success: false, error: data.error || 'Gagal membuat transaksi dengan Pakasir' },
        { status: response.status || 500 }
      );
    }

    // Normalisasi struktur data agar sesuai dengan yang dibaca oleh frontend
    return NextResponse.json({
      success: true,
      orderId: data.payment.order_id || order_id,
      amount: data.payment.amount || amount,
      totalPayment: data.payment.total_payment || amount,
      paymentMethod: cleanMethod,
      paymentNumber: data.payment.payment_number || '',
      expiredAt: data.payment.expired_at || '',
    });

  } catch (error: any) {
    console.error('Pakasir API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server saat menghubungi Pakasir' },
      { status: 500 }
    );
  }
}
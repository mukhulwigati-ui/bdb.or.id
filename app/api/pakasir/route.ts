// app/api/pakasir/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, amount, method = 'qris' } = body;

    // Ambil kredensial dari environment variables
    const projectSlug = process.env.PAKASIR_PROJECT_SLUG || 'depodomain';
    const apiKey = process.env.PAKASIR_API_KEY || 'xxx123';

    // Panggil API Pakasir Transaction Create
    const response = await fetch(`https://app.pakasir.com/api/transactioncreate/${method}`, {
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

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Gagal membuat transaksi dengan Pakasir' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Pakasir API Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server saat menghubungi Pakasir' },
      { status: 500 }
    );
  }
}
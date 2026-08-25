// app/api/webhook/pakasir/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Struktur data yang dikirimkan oleh Pakasir via webhook POST
    const { amount, order_id, project, status, payment_method, completed_at } = body;

    // Validasi data dasar dari payload webhook
    if (!order_id || !status) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Lakukan pengecekan status transaksi
    if (status === 'completed') {
      // TODO: Perbarui status transaksi/invoice di database Anda menjadi 'sukses' / 'completed'
      // Contoh: 
      // await db.transaction.update({
      //   where: { order_id },
      //   data: { status: 'completed', paymentMethod: payment_method, completedAt: completed_at }
      // });
      
      console.log(`[Pakasir Webhook] Transaksi ${order_id} senilai ${amount} dengan metode ${payment_method} telah BERHASIL.`);
    }

    // Berikan respons sukses 200 OK ke server Pakasir agar webhook tidak dikirim ulang (retry)
    return NextResponse.json({ success: true, message: 'Webhook received successfully' });
    
  } catch (error) {
    console.error('Pakasir Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
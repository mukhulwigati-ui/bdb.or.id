// app/api/midtrans/notification/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@sanity/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Inisialisasi Sanity Client
const serverClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'xqggeww8',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
});

// Inisialisasi Supabase Admin Client
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const notification = await request.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = notification;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return NextResponse.json({ success: false, message: 'Invalid notification payload' }, { status: 400 });
    }

    // 1. Validasi Signature Key (Menggunakan Environment Variable yang AMAN)
    // Pastikan MIDTRANS_SERVER_KEY sudah terisi di .env.local Anda
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    
    if (!serverKey) {
      console.error('❌ MIDTRANS_SERVER_KEY tidak ditemukan di environment variables!');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    const computedSignature = crypto
      .createHash('sha512')
      .update(order_id + status_code + gross_amount + serverKey)
      .digest('hex');

    if (computedSignature !== signature_key) {
      console.warn(`⚠️ Invalid Midtrans signature for order: ${order_id}`);
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 403 });
    }

    // 2. Tentukan status transaksi berdasarkan aturan Midtrans
    let newStatus = 'pending';
    if (transaction_status === 'capture' && fraud_status === 'accept') {
      newStatus = 'success';
    } else if (transaction_status === 'settlement') {
      newStatus = 'success';
    } else if (
      ['cancel', 'deny', 'expire'].includes(transaction_status)
    ) {
      newStatus = 'failed';
    }

    console.log(`🔔 Midtrans Webhook: Order ${order_id} status diperbarui ke: ${newStatus}`);

    // 3. Perbarui status di Sanity CMS
    const sanityQuery = `*[_type == "donationTransaction" && orderId == $orderId][0]`;
    const existingTx = await serverClient.fetch(sanityQuery, { orderId: order_id });

    if (existingTx && existingTx._id) {
      await serverClient.patch(existingTx._id).set({ status: newStatus }).commit();
    }

    // 4. Perbarui status di Supabase tabel `donations`
    const { error: supabaseError } = await supabaseAdmin
      .from('donations')
      .update({ status: newStatus })
      .eq('invoice_id', order_id);

    if (supabaseError) {
      console.error(`🔥 Gagal update Supabase:`, supabaseError.message);
    }

    return NextResponse.json({ success: true, message: 'Notification processed' });
  } catch (error: any) {
    console.error('🔥 Error Webhook:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
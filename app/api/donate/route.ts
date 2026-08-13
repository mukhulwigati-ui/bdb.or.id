// app/api/donate/route.ts
import { NextResponse } from 'next/server';
// @ts-ignore
import midtransClient from 'midtrans-client';
import { createClient } from '@sanity/client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const serverClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'xqggeww8',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
});

// Inisialisasi Midtrans Snap API Client
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_ENV === 'production',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '',
});

export async function POST(request: Request) {
  try {
    // 1. Validasi Environment Key di awal
    if (!process.env.MIDTRANS_SERVER_KEY) {
      throw new Error('Midtrans Server Key tidak dikonfigurasi.');
    }

    const body = await request.json();
    const { donorName, amount, programId, phone, email, fundraiserPhone, programTitle, category } = body;

    const cleanAmount = Number(String(amount || '').replace(/[^0-9]/g, ''));

    if (!cleanAmount || cleanAmount < 1000) {
      return NextResponse.json({ success: false, message: 'Nominal donasi minimal Rp 1.000.' }, { status: 400 });
    }

    const orderId = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Buat transaksi Midtrans
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: cleanAmount,
      },
      customer_details: {
        first_name: donorName || 'Hamba Allah',
        email: email || 'support@islami.or.id',
        phone: phone || '081225147373',
      },
      item_details: [
        {
          id: programId || 'DONASI-UMUM',
          price: cleanAmount,
          quantity: 1,
          name: (programTitle || 'Sedekah / Infaq Online').substring(0, 50),
        },
      ],
    };

    const transaction = await snap.createTransaction(parameter);
    
    if (!transaction.token) {
        throw new Error('Gagal mendapatkan token dari Midtrans.');
    }

    // 3. Simpan ke Sanity CMS
    await serverClient.create({
      _type: 'donationTransaction',
      orderId,
      donorName: donorName || 'Hamba Allah',
      donorPhone: phone || '',
      donorEmail: email || '',
      amount: cleanAmount,
      fundraiserPhone: fundraiserPhone || '',
      programName: programId ? { _type: 'reference', _ref: programId } : undefined,
      status: 'pending',
      paymentUrl: transaction.redirect_url,
      transactionId: orderId,
    });

    // 4. Simpan ke Supabase (Aman meskipun user tidak login / anonim)
    try {
      await supabase.from('donations').insert([
        {
          user_id: user ? user.id : null,
          donor_name: donorName || 'Hamba Allah',
          program_name: programTitle || 'Sedekah Umum',
          category: category || 'Kemanusiaan',
          amount: cleanAmount,
          status: 'pending',
          payment_url: transaction.redirect_url,
          invoice_id: orderId,
        },
      ]);
    } catch (supabaseError) {
      console.warn('⚠️ Gagal mencatat ke tabel Supabase (Lanjut proses Midtrans):', supabaseError);
    }

    return NextResponse.json({
      success: true,
      token: transaction.token,
      paymentUrl: transaction.redirect_url,
      orderId,
    });

  } catch (error: any) {
    console.error('🔥 Error Transaksi Midtrans:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Terjadi kesalahan sistem.' 
    }, { status: 500 });
  }
}
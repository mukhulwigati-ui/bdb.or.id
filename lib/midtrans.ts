// lib/midtrans.ts
import midtransClient from 'midtrans-client';

// Inisialisasi Core API untuk backend request (membuat transaksi / snap token)
export const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_ENV === 'production',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
});
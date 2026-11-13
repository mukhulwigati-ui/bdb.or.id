// app/donation/error/page.tsx
'use client';

import Link from 'next/link';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';

export default function DonationErrorPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm text-center border border-slate-200">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 border border-rose-200 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>
        
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">Pembayaran Belum Selesai</h1>
        <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
          Transaksi QRIS Anda dibatalkan, kadaluarsa, atau mengalami kendala saat diproses oleh sistem pembayaran. Silakan ulangi kembali untuk membuat transaksi baru.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full bg-[#0d5c91] hover:bg-sky-900 text-white font-bold py-3 px-4 rounded-xl transition text-xs sm:text-sm uppercase tracking-wider shadow-sm"
          >
            <Home className="w-4 h-4" />
            Kembali ke Beranda
          </Link>

          <Link
            href="javascript:history.back()"
            className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition text-xs sm:text-sm uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Coba Ulangi Donasi
          </Link>
        </div>
      </div>
    </main>
  );
}
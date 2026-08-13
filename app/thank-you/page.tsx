// app/thank-you/page.tsx
'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// 1. Komponen Utama Konten Thank You yaibadurrohman.or.id
function ThankYouContent() {
  const searchParams = useSearchParams();
  
  // 🚀 DOKU COMPATIBILITY: Menangkap parameter invoice atau order id dari redirect DOKU
  const orderId = searchParams.get('invoice_number') || searchParams.get('order_id') || searchParams.get('id') || 'INV-YAIBADURROHMAN-XXXXXX';

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-col justify-between text-center space-y-5">
      <div>
        {/* Ikon Centang Estetik Tanpa Rounded */}
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        {/* Judul & Kalimat Apresiasi */}
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Alhamdulillah!
        </h1>
        <p className="text-xs sm:text-sm font-extrabold text-emerald-600 uppercase tracking-wider mt-1">
          Donasi Terverifikasi Otomatis
        </p>
        
        <p className="text-xs sm:text-sm text-slate-700 mt-3 mb-5 leading-relaxed font-normal">
          Infak/Sedekah Anda telah berhasil diproses melalui sistem pembayaran resmi <span className="font-semibold text-slate-900">yaibadurrohman.or.id</span>. Terima kasih banyak atas kepercayaan Anda menyalurkan dana kebajikan melalui kami, semoga menjadi aliran amal jariyah yang berlipat ganda serta mendatangkan keberkahan bagi Anda sekeluarga. Aamiin.
        </p>

        {/* Kotak Status Detail Transaksi */}
        <div className="bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-left">
          <div className="flex justify-between items-center text-xs sm:text-sm font-medium">
            <span className="text-slate-400 uppercase tracking-wider">No. Invoice</span>
            <span className="text-slate-900 font-bold font-mono">{orderId}</span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm font-medium border-t border-slate-200 pt-2.5">
            <span className="text-slate-400 uppercase tracking-wider">Status Dana</span>
            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 font-black text-xs uppercase tracking-wider border border-emerald-200">
              Paid / Success
            </span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm font-medium border-t border-slate-200 pt-2.5">
            <span className="text-slate-400 uppercase tracking-wider">Metode Pembayaran</span>
            <span className="text-slate-800 font-bold uppercase tracking-wider text-xs">
              DOKU Checkout Resmi
            </span>
          </div>
        </div>
      </div>

      {/* Tombol Aksi Menuju Beranda Utama */}
      <div className="pt-2">
        <Link 
          href="/" 
          className="block w-full text-center bg-[#0d5c91] hover:bg-sky-900 text-white font-bold py-3.5 transition text-xs sm:text-sm uppercase tracking-wider shadow-sm"
        >
          Kembali ke Beranda 🚀
        </Link>
      </div>
    </div>
  );
}

// 2. Wrapper Halaman Utama dengan Suspense Boundary (Mengatasi Build Error)
export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Memuat Halaman Sukses...</div>}>
        <ThankYouContent />
      </Suspense>
    </div>
  );
}
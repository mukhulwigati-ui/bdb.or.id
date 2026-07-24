// app/thank-you/page.tsx
'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// 1. Komponen Utama Konten Thank You bdb.or.id
function ThankYouContent() {
  const searchParams = useSearchParams();
  
  // 🚀 PAKASIR COMPATIBILITY: Menangkap parameter 'order_id' atau 'id' yang dilempar otomatis oleh redirect gateway Pakasir
  const orderId = searchParams.get('order_id') || searchParams.get('id') || 'INV-YAIBADURROHMAN-XXXXXX';

  return (
    <div className="max-w-md w-full bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200/90 flex flex-col justify-between text-center space-y-4">
      <div>
        {/* Ikon Centang Animasi & Estetik */}
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        {/* Judul & Kalimat Apresiasi */}
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
          Alhamdulillah!
        </h1>
        <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider mt-1">
          Donasi Terverifikasi Otomatis
        </p>
        
        <p className="text-xs sm:text-sm text-gray-600 mt-3 mb-5 leading-relaxed font-normal">
          Infak/Sedekah Anda telah berhasil diterima oleh sistem <span className="font-semibold text-gray-800">yaibadurrohman.or.id</span> secara otomatis. Terima kasih banyak atas kepercayaan Anda menyalurkan dana kebajikan melalui kami, semoga menjadi aliran amal jariyah yang berlipat ganda serta mendatangkan keberkahan bagi Anda sekeluarga. Aamiin.
        </p>

        {/* Kotak Status Detail Transaksi */}
        <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3.5 space-y-2 text-left">
          <div className="flex justify-between items-center text-[11px] font-medium">
            <span className="text-gray-400 uppercase tracking-wider">No. Invoice</span>
            <span className="text-gray-800 font-bold tracking-mono text-xs">{orderId}</span>
          </div>
          <div className="flex justify-between items-center text-[11px] font-medium border-t border-gray-200/60 pt-2">
            <span className="text-gray-400 uppercase tracking-wider">Status Dana</span>
            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider border border-emerald-200">
              Paid / Success
            </span>
          </div>
          <div className="flex justify-between items-center text-[11px] font-medium border-t border-gray-200/60 pt-2">
            <span className="text-gray-400 uppercase tracking-wider">Metode Pembayaran</span>
            <span className="text-gray-700 font-bold uppercase tracking-wider text-[10px]">
              QRIS Otomatis
            </span>
          </div>
        </div>
      </div>

      {/* Tombol Aksi Menuju Beranda Utama */}
      <div className="pt-2">
        <Link 
          href="/" 
          className="block w-full text-center bg-[#0d5c91] hover:bg-sky-900 text-white font-bold py-3 rounded-xl transition text-[11px] uppercase tracking-wider shadow-md"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

// 2. Wrapper Halaman Utama dengan Suspense Boundary (Mengatasi Build Error)
export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Memuat Halaman Sukses...</div>}>
        <ThankYouContent />
      </Suspense>
    </div>
  );
}
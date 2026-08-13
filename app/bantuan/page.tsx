// app/bantuan/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pusat Bantuan | islami.or.id',
  description: 'Butuh bantuan terkait layanan donasi, metode pembayaran, atau informasi platform? Tim Admin islami.or.id siap membantu kebutuhan Anda.',
  alternates: {
    canonical: '/bantuan',
  },
};

export default function BantuanPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-4 px-3 pb-28">
      {/* MODEL MOBILE FIRST: Disesuaikan dengan lebar card mobile yang ringkas, rapi, tanpa sudut lengkung */}
      <div className="w-full max-w-md mx-auto bg-white border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
        
        {/* HEADER BANTUAN */}
        <div className="border-b border-sky-600 pb-3 space-y-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-sky-600 uppercase tracking-widest block">
            PUSAT LAYANAN PENGGUNA
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#333333] tracking-tight">
            Bagaimana Kami Bisa Membantu?
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Temukan panduan cepat atau hubungi tim operasional kami untuk kendala seputar donasi, pembayaran, dan layanan digital di islami.or.id.
          </p>
        </div>

        {/* GRID OPSYI BANTUAN */}
        <div className="grid grid-cols-1 gap-3.5">
          
          {/* Card 1: Konfirmasi / Kendala Akses */}
          <div className="border border-slate-200 p-3.5 space-y-1.5 hover:border-sky-500 transition-colors">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Kendala Akun & Donasi</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Mengalami kendala saat verifikasi WhatsApp atau riwayat donasi yang belum terupdate? Tim kami siap membantu memeriksa transaksi Anda.
            </p>
          </div>

          {/* Card 2: Layanan & Informasi */}
          <div className="border border-slate-200 p-3.5 space-y-1.5 hover:border-sky-500 transition-colors">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Metode Pembayaran</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Informasi lengkap seputar pembayaran via QRIS, Virtual Account (VA), dan dompet digital yang didukung secara otomatis via DOKU.
            </p>
          </div>

          {/* Card 3: Status & Update */}
          <div className="border border-slate-200 p-3.5 space-y-1.5 hover:border-sky-500 transition-colors">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Transparansi Penyaluran</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Seluruh dana yang terkumpul disalurkan secara transparan dan dilaporkan berkala pada menu laporan di setiap program.
            </p>
          </div>

          {/* Card 4: Pertanyaan Umum */}
          <div className="border border-slate-200 p-3.5 space-y-1.5 hover:border-sky-500 transition-colors">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">FAQ Umum</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Jawaban atas pertanyaan-pertanyaan yang paling sering diajukan oleh para dermawan kepada tim islami.or.id.
            </p>
          </div>
        </div>

        {/* SECTION KONTAK LANGSUNG */}
        <div className="bg-[#0d5c91] text-white p-4 sm:p-5 space-y-4 mt-6">
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide">Hubungi Tim Layanan</h2>
            <p className="text-xs text-sky-200 font-medium">Admin siap melayani pada hari kerja (Senin - Jumat, 08.00 - 16.00 WIB)</p>
          </div>
          
          <div className="flex flex-col gap-2.5">
            <Link 
              href="https://wa.me/6281234567890" 
              target="_blank"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs sm:text-sm uppercase tracking-wider py-3 transition shadow-sm"
            >
              Chat via WhatsApp (Respon Cepat) 💬
            </Link>
            <div className="text-center text-xs text-sky-200">
              Atau kirim email ke: info@islami.or.id
            </div>
          </div>
        </div>

        {/* TOMBOL KEMBALI KE AKUN */}
        <div className="pt-2">
          <Link 
            href="/akun"
            className="w-full block text-center border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm uppercase tracking-wider py-3 transition"
          >
            ← Kembali ke Menu Akun
          </Link>
        </div>

      </div>
    </div>
  );
}
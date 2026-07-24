// app/syarat-ketentuan/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

// 🚀 OPTIMASI SEO MASTER
export const metadata: Metadata = {
  title: 'Syarat & Ketentuan | bdb.or.id',
  description: 'Syarat dan ketentuan resmi penggunaan platform layanan digital bdb.or.id. Pelajari panduan hak, kewajiban pengguna, dan mekanisme operasional.',
  keywords: ['syarat ketentuan bdb', 'regulasi online', 'kebijakan', 'panduan'],
  alternates: {
    canonical: '/syarat-ketentuan',
  },
};

export default function SyaratKetentuanPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-4 px-3 pb-24">
      {/* 🚀 MODEL MOBILE FIRST: Disesuaikan dengan lebar card mobile yang ringkas, rapi, dan konsisten */}
      <div className="w-full max-w-sm mx-auto bg-white border border-slate-200 shadow-sm p-4 space-y-4">
        
        {/* HEADLINE UTAMA */}
        <div className="border-b border-sky-600 pb-2.5 space-y-1">
          <span className="text-[9px] font-bold text-sky-600 uppercase tracking-widest block">
            DOKUMEN REGULASI RESMI
          </span>
          <h1 className="text-xl font-extrabold text-[#333333] tracking-tight">
            Syarat & Ketentuan Penggunaan
          </h1>
          <p className="text-[10px] text-slate-400 font-medium">
            Terakhir diperbarui: Juli 2026
          </p>
        </div>

        {/* ISI KONTEN HUKUM / REGULASI */}
        <div className="text-slate-700 text-xs leading-relaxed space-y-3.5 text-left">
          <p>
            Selamat datang di platform digital resmi <strong>bdb.or.id</strong>. Sebelum Anda melanjutkan proses penggunaan layanan, mohon luangkan waktu sejenak untuk membaca dan memahami seluruh Syarat & Ketentuan yang berlaku di bawah ini.
          </p>
          <p>
            Dengan mengakses, menggunakan, atau melakukan interaksi di dalam platform ini, Anda dianggap telah membaca, memahami, dan menyetujui untuk mengikatkan diri pada seluruh aturan regulasi yang ditetapkan oleh pengelola.
          </p>

          {/* BARIS POIN-POIN REGULASI */}
          <div className="space-y-3.5 pt-1">
            
            {/* 1. Ketentuan Pengguna */}
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-sky-600">01.</span> Ketentuan Pengguna
              </h2>
              <ul className="list-disc list-inside pl-3 text-[11px] text-slate-600 space-y-0.5">
                <li>Pengguna wajib mematuhi seluruh norma dan ketentuan hukum yang berlaku di wilayah hukum terkait.</li>
                <li>Pengguna menjamin bahwa segala data atau informasi yang disalurkan melalui platform bersumber dari hal yang sah, benar, dan tidak melanggar hukum.</li>
                <li>Pengisian data kontak atau nomor WhatsApp digunakan demi kelancaran pengiriman notifikasi sistem secara optimal.</li>
              </ul>
            </div>

            {/* 2. Mekanisme & Transaksi */}
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-sky-600">02.</span> Mekanisme Layanan & Transaksi
              </h2>
              <ul className="list-disc list-inside pl-3 text-[11px] text-slate-600 space-y-0.5">
                <li>Seluruh pemrosesan sistem atau transaksi digital didukung penuh oleh infrastruktur teknologi dan integrasi sistem yang aman.</li>
                <li>Ketentuan nominal minimal atau ketentuan teknis layanan disesuaikan dengan standar operasional platform yang berlaku.</li>
                <li>Setiap aktivitas atau transaksi yang statusnya telah dinyatakan berhasil oleh sistem memiliki ketentuan final sesuai regulasi sistem.</li>
              </ul>
            </div>

            {/* 3. Pengelolaan & Penyaluran */}
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-sky-600">03.</span> Pengelolaan & Kebijakan Platform
              </h2>
              <p className="text-[11px] text-slate-600 pl-3">
                Pengelola bdb.or.id memiliki hak penuh dalam mengelola, mengatur, serta mengoptimalkan jalannya program maupun fitur layanan berdasarkan prinsip prioritas kemaslahatan, akuntabilitas, dan manajemen operasional yang transparan.
              </p>
            </div>

            {/* 4. Keamanan Data */}
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-sky-600">04.</span> Perlindungan Data Pribadi
              </h2>
              <p className="text-[11px] text-slate-600 pl-3">
                Kami berkomitmen menjaga kerahasiaan data pribadi seperti nama, nomor kontak, serta histori log aktivitas yang tersimpan di dalam database sistem kami, serta tidak akan memperjualbelikannya kepada pihak ketiga di luar keperluan sistem.
              </p>
            </div>

          </div>
        </div>

        {/* SECTION FOOTER CALL TO ACTION */}
        <div className="bg-slate-50 border border-slate-200 p-3 text-center rounded-lg space-y-2.5 mt-4">
          <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
            Memiliki kendala teknis atau pertanyaan lebih lanjut terkait interpretasi regulasi penggunaan di atas? Silakan hubungi pusat bantuan admin kami.
          </p>
          <div className="flex flex-col gap-2 pt-0.5">
            <Link 
              href="/kontak"
              className="w-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider py-2 rounded-md transition"
            >
              Hubungi Admin ✉️
            </Link>
            <Link 
              href="/"
              className="w-full bg-[#0d5c91] hover:bg-sky-900 text-white font-bold text-[10px] uppercase tracking-wider py-2 rounded-md transition shadow-sm"
            >
              Kembali ke Beranda 🚀
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
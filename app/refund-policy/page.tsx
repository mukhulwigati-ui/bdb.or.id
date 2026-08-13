// app/refund-policy/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

// 🚀 OPTIMASI SEO MASTER
export const metadata: Metadata = {
  title: 'Kebijakan Pengembalian Dana (Refund) | islami.or.id',
  description: 'Pelajari kebijakan dan ketentuan pengembalian dana (refund) untuk transaksi donasi, infak, zakat, atau layanan sosial di platform islami.or.id.',
  keywords: ['kebijakan refund islami.or.id', 'pengembalian dana donasi', 'syarat refund', 'bantuan transaksi'],
  alternates: {
    canonical: '/refund-policy',
  },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-4 px-3 pb-24">
      {/* 🚀 MODEL MOBILE FIRST: Disesuaikan dengan lebar card mobile yang ringkas, rapi, dan konsisten */}
      <div className="w-full max-w-sm mx-auto bg-white border border-slate-200 shadow-sm p-4 space-y-4">
        
        {/* HEADLINE UTAMA */}
        <div className="border-b border-sky-600 pb-2.5 space-y-1">
          <span className="text-[9px] font-bold text-sky-600 uppercase tracking-widest block">
            KEBIJAKAN KEUANGAN & DONASI
          </span>
          <h1 className="text-xl font-extrabold text-[#333333] tracking-tight">
            Kebijakan Pengembalian Dana
          </h1>
          <p className="text-[10px] text-slate-400 font-medium">
            Terakhir diperbarui: Juli 2026
          </p>
        </div>

        {/* ISI KONTEN KEBIJAKAN REFUND */}
        <div className="text-slate-700 text-xs leading-relaxed space-y-3.5 text-left">
          <p>
            Terima kasih telah berpartisipasi dan menyalurkan kebaikan melalui platform digital resmi <strong>islami.or.id</strong>. Kami menjunjung tinggi prinsip transparansi, amanah, dan akuntabilitas dalam setiap pengelolaan dana sosial.
          </p>
          <p>
            Mengingat sifat transaksi yang berupa donasi, infak, zakat, maupun wakaf, berikut adalah ketentuan umum terkait kebijakan pengembalian dana (refund) yang berlaku di platform kami:
          </p>

          {/* BARIS POIN-POIN KEBIJAKAN */}
          <div className="space-y-3.5 pt-1">
            
            {/* 1. Sifat Dana Donasi */}
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-sky-600">01.</span> Sifat Final Transaksi Donasi
              </h2>
              <p className="text-[11px] text-slate-600 pl-3">
                Dana yang telah berhasil ditunaikan dan dinyatakan sukses oleh sistem pembayaran (seperti QRIS, Virtual Account, atau metode instan lainnya) umumnya bersifat final dan dikategorikan sebagai dana kebajikan yang langsung dialokasikan untuk program sosial.
              </p>
            </div>

            {/* 2. Kondisi Khusus Pengajuan Refund */}
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-sky-600">02.</span> Kondisi Khusus Pengajuan Refund
              </h2>
              <ul className="list-disc list-inside pl-3 text-[11px] text-slate-600 space-y-0.5">
                <li>Pengembalian dana dapat dipertimbangkan apabila terjadi kesalahan teknis sistem yang mengakibatkan pendebetan ganda (double charging) pada akun atau rekening donatur.</li>
                <li>Terjadi kesalahan input nominal transaksi secara tidak sengaja yang terbukti melalui verifikasi data log sistem perbankan/gateway.</li>
              </ul>
            </div>

            {/* 3. Prosedur Klaim & Verifikasi */}
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-sky-600">03.</span> Prosedur Klaim & Verifikasi
              </h2>
              <p className="text-[11px] text-slate-600 pl-3">
                Donatur yang mengalami kendala duplikasi transaksi atau kesalahan nominal wajib melaporkannya dalam kurun waktu maksimal 2 x 24 jam sejak transaksi dilakukan dengan menyertakan bukti transfer, nomor pesanan, serta detail kendala kepada tim admin melalui halaman kontak resmi.
              </p>
            </div>

            {/* 4. Proses Eksekusi */}
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-sky-600">04.</span> Proses & Waktu Eksekusi
              </h2>
              <p className="text-[11px] text-slate-600 pl-3">
                Jika pengajuan refund disetujui setelah melalui tahap audit verifikasi sistem, proses pengembalian dana akan dikoordinasikan dengan penyedia layanan pembayaran terkait dan membutuhkan waktu kerja standar perbankan.
              </p>
            </div>

          </div>
        </div>

        {/* SECTION FOOTER CALL TO ACTION */}
        <div className="bg-slate-50 border border-slate-200 p-3 text-center rounded-lg space-y-2.5 mt-4">
          <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
            Mengalami kendala duplikasi pembayaran atau kesalahan nominal donasi? Segera hubungi pusat layanan bantuan kami.
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
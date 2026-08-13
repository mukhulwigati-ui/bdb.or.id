// app/faq/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

// 🚀 MASTER SEO METADATA
export const metadata: Metadata = {
  title: 'FAQ / Pertanyaan Umum | islami.or.id',
  description: 'Temukan jawaban atas pertanyaan seputar cara berdonasi, pembayaran QRIS, penyaluran zakat, infak, dan sedekah online di islami.or.id.',
  keywords: ['faq islami.or.id', 'cara sedekah online', 'pertanyaan seputar zakat', 'bantuan donasi'],
  alternates: {
    canonical: '/faq',
  },
};

interface FaqItem {
  question: string;
  answer: string;
}

const faqList: FaqItem[] = [
  {
    question: 'Bagaimana cara melakukan donasi atau sedekah di islami.or.id?',
    answer: 'Anda cukup memilih program kebaikan atau campaign yang ingin didukung, tentukan nominal donasi, isi data diri (atau pilih opsi Hamba Allah), lalu ikuti instruksi pembayaran instan melalui QRIS atau Virtual Account yang tersedia.',
  },
  {
    question: 'Apakah transaksi donasi di islami.or.id aman dan terpercaya?',
    answer: 'Ya, seluruh transaksi dikelola secara transparan dan amanah menggunakan sistem pembayaran terstandarisasi serta terhubung langsung dengan pencatatan program sosial kemanusiaan.',
  },
  {
    question: 'Metode pembayaran apa saja yang didukung?',
    answer: 'Kami mendukung berbagai metode pembayaran instan seperti QRIS (bisa scan pakai GoPay, OVO, Dana, ShopeePay, m-Banking), serta transfer Virtual Account dari berbagai bank nasional.',
  },
  {
    question: 'Bagaimana cara mengonfirmasi donasi jika terjadi kendala?',
    answer: 'Jika Anda mengalami kendala teknis atau memiliki pertanyaan seputar konfirmasi donasi, Anda dapat langsung menghubungi tim layanan kami melalui halaman Kontak atau via WhatsApp resmi di nomor +62 812-2514-7373.',
  },
  {
    question: 'Apakah dana donasi langsung disalurkan kepada yang berhak?',
    answer: 'Tentu. Dana yang terkumpul dari setiap campaign akan dihimpun dan disalurkan secara berkala kepada para penerima manfaat yang berhak (fakir, miskin, yatim, dhuafa, serta program sosial keagamaan lainnya).',
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-4 px-3 pb-28">
      {/* 🚀 MODEL MOBILE FIRST: Disesuaikan dengan lebar card mobile yang ringkas, rapi, tanpa sudut lengkung */}
      <div className="w-full max-w-md mx-auto bg-white border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
        
        {/* HEADER FAQ */}
        <div className="border-b border-sky-600 pb-3 space-y-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-sky-600 uppercase tracking-widest block">
            PUSAT BANTUAN
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#333333] tracking-tight">
            Pertanyaan yang Sering Diajukan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Temukan jawaban lengkap seputar prosedur donasi, transparansi penyaluran, dan layanan platform islami.or.id di sini.
          </p>
        </div>

        {/* DAFTAR FAQ ACCORDION / LIST */}
        <div className="space-y-4">
          {faqList.map((item, index) => (
            <div 
              key={index} 
              className="border border-slate-200 bg-gray-50/50 p-4 space-y-2 hover:border-sky-500 transition-colors text-left"
            >
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-start gap-2.5">
                <span className="text-sky-600 font-extrabold shrink-0">Q{index + 1}.</span>
                <span>{item.question}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-6">
                {item.answer}
              </p>
            </div>
          ))}
        </div>

        {/* CALL TO ACTION BANTUAN LANJUTAN */}
        <div className="bg-slate-50 border border-slate-200 p-4 text-center space-y-3 mt-6">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
            Masih memiliki pertanyaan lain?
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Tim layanan donatur kami siap membantu Anda memberikan informasi secara cepat dan ramah.
          </p>
          <div className="pt-1 flex flex-col gap-2.5">
            <Link
              href="/kontak"
              className="w-full inline-flex items-center justify-center bg-[#0d5c91] hover:bg-sky-900 text-white font-bold text-xs sm:text-sm uppercase tracking-wider py-3 transition shadow-sm"
            >
              Hubungi Kami 💬
            </Link>
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm uppercase tracking-wider py-3 transition"
            >
              Kembali ke Beranda 🚀
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
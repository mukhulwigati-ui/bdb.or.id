// app/kontak/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

// 🚀 MASTER SEO METADATA
export const metadata: Metadata = {
  title: 'Hubungi Kami | Layanan Donatur islami.or.id',
  description: 'Memiliki pertanyaan mengenai program infak, sedekah subuh, atau cara pembayaran QRIS? Hubungi tim admin resmi islami.or.id sekarang.',
  keywords: ['kontak islami.or.id', 'nomor whatsapp islami', 'alamat islami.or.id', 'layanan donatur'],
  alternates: {
    canonical: '/kontak',
  },
};

export default function KontakPage() {
  // Nomor WA resmi tanpa spasi/minus untuk integrasi API chat langsung
  const officialWa = '6281225147373';
  const defaultText = encodeURIComponent('Assalamualaikum Admin islami.or.id, saya ingin bertanya mengenai...');
  const waChatUrl = `https://api.whatsapp.com/send?phone=${officialWa}&text=${defaultText}`;

  return (
    <div className="min-h-screen bg-slate-50 py-4 px-3 pb-28">
      {/* 🚀 MODEL MOBILE FIRST: Disesuaikan dengan lebar card mobile yang ringkas, rapi, tanpa sudut lengkung */}
      <div className="w-full max-w-md mx-auto bg-white border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
        
        {/* HEADER KONTAK */}
        <div className="border-b border-sky-600 pb-3 space-y-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-sky-600 uppercase tracking-widest block">
            LAYANAN PUSAT INFORMASI
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#333333] tracking-tight">
            Hubungi Tim Kantor Kami
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Pintu komunikasi kami selalu terbuka lebar. Jangan ragu untuk mendiskusikan kebutuhan konsultasi zakat maal maupun kerja sama program kebaikan bersama kami.
          </p>
        </div>

        {/* 2. AREA KARTU INFORMASI UTAMA */}
        <div className="space-y-4">
          
          {/* KARTU KIRI: DETAIL KONTAK FISIK */}
          <div className="border border-slate-200 bg-gray-50/50 p-4 sm:p-5 space-y-4">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-gray-200 pb-2 w-full">
              Saluran Informasi Resmi
            </h2>
            
            <div className="space-y-3.5 text-left">
              <div className="flex items-start space-x-3">
                <span className="text-lg shrink-0">📍</span>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">Alamat Pusat</h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                    Kantor Pelayanan islami.or.id <br />
                    Indonesia
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-lg shrink-0">✉️</span>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">Email Korespondensi</h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    support@islami.or.id
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-lg shrink-0">⏰</span>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">Waktu Operasional</h4>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Senin – Sabtu | 08.00 - 16.00 WIB
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <p className="text-[11px] text-slate-400 font-medium italic">
                *Konfirmasi data donasi manual/kendala sistem pembayaran akan diproses secara instan pada jam operasional kerja.
              </p>
            </div>
          </div>

          {/* KARTU KANAN: CHAT ACTION BOX */}
          <div className="border border-emerald-200 bg-emerald-50/30 p-4 sm:p-5 space-y-4 text-left">
            <h2 className="text-xs sm:text-sm font-bold text-emerald-900 uppercase tracking-wider border-b border-emerald-200 pb-2 w-full">
              Konsultasi Instan WhatsApp
            </h2>
            <p className="text-xs sm:text-sm text-emerald-800/80 leading-relaxed font-medium">
              Lebih menyukai obrolan cepat melalui aplikasi ponsel? Hubungi nomor WhatsApp resmi penanganan layanan donatur kami untuk mendapatkan panduan cepat dari tim Customer Support islami.or.id.
            </p>
            
            <div className="bg-white border border-emerald-200 p-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hotline Care</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-800 tracking-wide block mt-0.5">+62 812-2514-7373</span>
            </div>

            <div className="pt-1">
              <a
                href={waChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full text-center bg-[#25D366] hover:bg-[#20ba56] text-white font-bold text-xs sm:text-sm uppercase tracking-wider py-3.5 transition shadow-sm"
              >
                Mulai Chat Sekarang 💬
              </a>
            </div>
          </div>

        </div>

        {/* 3. GOOGLE MAPS EMBED SECTION */}
        <div className="w-full bg-slate-100 h-56 border border-slate-200 overflow-hidden">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3958.764011972125!2d108.80878867454426!3d-7.153261370176541!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6f9d8bcc713919%3A0x7304909c6d3d6f48!2sPondok%20Pesantren%20Khoiro%20Ummah!5e0!3m2!1sid!2sid!4v1783431371414!5m2!1sid!2sid"
            className="w-full h-full border-0"
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>

        {/* TOMBOL KEMBALI */}
        <div className="pt-2">
          <Link 
            href="/"
            className="w-full block text-center border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm uppercase tracking-wider py-3 transition"
          >
            Kembali ke Beranda 🚀
          </Link>
        </div>

      </div>
    </div>
  );
}
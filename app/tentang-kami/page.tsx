// app/tentang-kami/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

// 🚀 OPTIMASI SEO HALAMAN TENTANG KAMI
export const metadata: Metadata = {
  title: 'Tentang Kami | Profil Lembaga Resmi Balai Dakwah Banjarnegara',
  description: 'Mengenal lebih dekat Balai Dakwah Banjarnegara (bdb.or.id), lembaga amil zakat, infaq, dan sedekah terpercaya yang berkhidmat untuk kemaslahatan ummat, pendidikan quran, serta pemberdayaan dhuafa.',
  keywords: ['profil balai dakwah banjarnegara', 'tentang bdb.or.id', 'lembaga zakat amanah', 'sedekah online banjarnegara'],
  alternates: {
    canonical: '/tentang-kami',
  },
};

export default function TentangKamiPage() {
  return (
    <div className="min-h-screen bg-white">
      
      {/* 1. HERO SECTION BANNER */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white py-16 px-4 md:px-16 text-center rounded-none relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-3 py-1 rounded-none uppercase tracking-widest border border-emerald-500/30">
            PROFIL LEMBAGA
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Mengalirkan Keberkahan, <br />Wujudkan Kesejahteraan Ummat
          </h1>
          <p className="text-sm md:text-base text-emerald-100/80 max-w-2xl mx-auto font-light leading-relaxed">
            Balai Dakwah Banjarnegara hadir sebagai jembatan amanah untuk mengelola dan mendistribusikan Zakat, Infaq, Sedekah, serta Wakaf secara transparan, profesional, dan akuntabel.
          </p>
        </div>
      </div>

      {/* 2. KONTEN SEJARAH & VISI MISI */}
      <div className="max-w-5xl mx-auto py-12 px-4 md:px-16 grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        
        {/* KOLOM KIRI: NARASI UTAMA */}
        <div className="lg:col-span-2 space-y-6 text-gray-700 leading-relaxed text-sm md:text-base">
          <h2 className="text-xl md:text-2xl font-black text-[#333333] uppercase tracking-wide border-b-2 border-emerald-600 pb-2 w-fit">
            Siapa Kami?
          </h2>
          <p>
            <strong className="text-emerald-600 font-bold">Balai Dakwah Banjarnegara (bdb.or.id)</strong> adalah lembaga sosial kemanusiaan dan pengelolaan dana filantropi Islam yang berkomitmen penuh dalam menggerakkan kepedulian masyarakat. Kami fokus pada pendayagunaan dana Ziswaf yang disalurkan secara produktif, tepat sasaran, dan membawa dampak nyata jangka panjang bagi para penerima manfaat.
          </p>
          <p>
            Berawal dari gerakan kepedulian terhadap pendidikan Al-Quran, pengentasan kemiskinan dhuafa, serta aksi tanggap kemanusiaan, kami terus bertransformasi mengadopsi integrasi teknologi digital otomasi pembayaran untuk memudahkan ribuan donatur mengalirkan kebaikan mereka kapan saja dan di mana saja.
          </p>

          {/* VISI MISI BOX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="bg-gray-50 border-l-4 border-emerald-600 p-5 rounded-none shadow-sm">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">Visi Kami</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Menjadi lembaga pengelola Ziswaf terkemuka, tepercaya, dan profesional dalam mentransformasikan mustahik menjadi muzakki demi terwujudnya tatanan masyarakat yang mandiri dan berkah.
              </p>
            </div>
            <div className="bg-gray-50 border-l-4 border-emerald-600 p-5 rounded-none shadow-sm">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">Misi Kami</h3>
              <ul className="text-xs text-gray-600 list-disc list-inside space-y-1.5 leading-relaxed">
                <li>Mengoptimalkan penghimpunan zakat, infaq, dan sedekah berbasis layanan digital modern.</li>
                <li>Menyelenggarakan program pendayagunaan inklusif di bidang pendidikan, kesehatan, dan ekonomi.</li>
                <li>Menjaga transparansi audit keuangan laporan dana donatur secara berkala.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: STATISTIK & LEGALITAS (SIDEBAR) */}
        <div className="space-y-6 lg:sticky lg:top-24 w-full">
          
          {/* NILAI UTAMA */}
          <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-none space-y-4">
            <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider border-b border-emerald-200 pb-2 flex items-center gap-1.5">
              <span>🛡️</span> Nilai Dasar Kinerja
            </h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-black text-emerald-900">1. Amanah & Transparan</h4>
                <p className="text-[11px] text-emerald-700 leading-normal">Setiap rupiah yang dititipkan dicatat penuh di sistem CMS dan disalurkan secara terbuka.</p>
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-900">2. Profesional & Responsif</h4>
                <p className="text-[11px] text-emerald-700 leading-normal">Melayani konsultasi ibadah zakat dan pengelolaan kampanye dengan standar pelayanan terbaik.</p>
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-900">3. Berkelanjutan (Sustainable)</h4>
                <p className="text-[11px] text-emerald-700 leading-normal">Orientasi program difokuskan agar mampu memberikan kemandirian ekonomi bagi dhuafa.</p>
              </div>
            </div>
          </div>

          {/* LEGALITAS CHIP */}
          <div className="bg-gray-50 border border-gray-200 p-5 rounded-none space-y-2">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">Legalitas Resmi</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Seluruh operasional penyaluran infak, pengelolaan zakat maal/fitrah, dan kampanye sosial berada di bawah payung hukum legalitas resmi yayasan serta diawasi secara syariah untuk menjamin keabsahan penyaluran dana ummat.
            </p>
          </div>

        </div>
      </div>

      {/* 3. CALL TO ACTION SECTION */}
      <div className="bg-gray-50 border-t border-gray-100 py-12 px-4 text-center rounded-none">
        <div className="max-w-xl mx-auto space-y-4">
          <span className="text-2xl block">🌱</span>
          <h2 className="text-lg md:text-xl font-black text-gray-800 uppercase tracking-wide">
            Mulai Alirkan Keberkahan Hari Ini
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Sedikit dari kita adalah tumpuan harapan besar bagi mereka. Bergabunglah bersama ribuan #OrangBaik lainnya untuk menghadirkan perubahan nyata bagi ummat.
          </p>
          <div className="pt-2">
            <Link 
              href="/program"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-none shadow-md shadow-emerald-100 transition duration-150"
            >
              Lihat Program Donasi 🚀
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
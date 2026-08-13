// app/tentang-kami/page.tsx
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

// 🚀 OPTIMASI SEO HALAMAN TENTANG KAMI
export const metadata: Metadata = {
  title: 'Tentang Kami | Profil Lembaga Resmi Yayasan Wasilah Hidayah Nusantara',
  description: 'Mengenal lebih dekat Yayasan Wasilah Hidayah Nusantara (yaibadurrohman.or.id), lembaga sosial kemanusiaan dan keagamaan yang berkhidmat untuk kemaslahatan ummat, pendidikan quran, serta pemberdayaan dhuafa.',
  keywords: ['profil yayasan wasilah hidayah nusantara', 'tentang yaibadurrohman', 'lembaga sosial amanah', 'sedekah online'],
  alternates: {
    canonical: '/tentang-kami',
  },
};

export default function TentangKamiPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-4 px-3 pb-28 text-left">
      {/* 🚀 MODEL MOBILE FIRST: Lebar card mobile konsisten (max-w-md), tanpa sudut lengkung */}
      <div className="w-full max-w-md mx-auto space-y-4">
        
        {/* 1. HERO SECTION BANNER */}
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white p-6 sm:p-8 text-center space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="relative z-10 space-y-2">
            <span className="bg-emerald-500/25 text-emerald-300 text-[10px] font-bold px-3 py-1 uppercase tracking-widest border border-emerald-500/30 inline-block">
              PROFIL LEMBAGA
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">
              Mengalirkan Keberkahan, Wujudkan Kesejahteraan Ummat
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 font-light leading-relaxed">
              Yayasan Wasilah Hidayah Nusantara hadir sebagai jembatan amanah untuk mengelola dan mendistribusikan Zakat, Infaq, Sedekah, serta Wakaf secara transparan, profesional, dan akuntabel.
            </p>
          </div>
        </div>

        {/* 2. KONTEN SEJARAH & VISI MISI */}
        <div className="bg-white border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-wide border-b-2 border-emerald-600 pb-2 w-full">
              Siapa Kami?
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              <strong className="text-emerald-700 font-bold">Yayasan Wasilah Hidayah Nusantara (yaibadurrohman.or.id)</strong> adalah lembaga sosial kemanusiaan dan pengelolaan dana filantropi Islam yang berkomitmen penuh dalam menggerakkan kepedulian masyarakat. Kami fokus pada pendayagunaan dana ziswaf yang disalurkan secara produktif, tepat sasaran, dan membawa dampak nyata jangka panjang bagi para penerima manfaat.
            </p>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              Berawal dari gerakan kepedulian terhadap pendidikan Al-Quran, pengentasan kemiskinan dhuafa, serta aksi tanggap kemanusiaan, kami terus bertransformasi mengadopsi integrasi teknologi digital otomasi pembayaran untuk memudahkan ribuan donatur mengalirkan kebaikan mereka kapan saja dan di mana saja.
            </p>
          </div>

          {/* VISI MISI BOX */}
          <div className="space-y-4 pt-2">
            <div className="bg-gray-50 border-l-4 border-emerald-600 p-4 space-y-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">Visi Kami</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Menjadi lembaga pengelola ziswaf terkemuka, tepercaya, dan profesional dalam mentransformasikan mustahik menjadi muzakki demi terwujudnya tatanan masyarakat yang mandiri dan berkah.
              </p>
            </div>
            
            <div className="bg-gray-50 border-l-4 border-emerald-600 p-4 space-y-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">Misi Kami</h3>
              <ul className="text-xs sm:text-sm text-slate-600 list-disc list-inside space-y-1.5 leading-relaxed">
                <li>Mengoptimalkan penghimpunan zakat, infaq, dan sedekah berbasis layanan digital modern.</li>
                <li>Menyelenggarakan program pendayagunaan inklusif di bidang pendidikan, kesehatan, dan ekonomi.</li>
                <li>Menjaga transparansi audit keuangan laporan dana donatur secara berkala.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 3. NILAI UTAMA & LEGALITAS (SIDEBAR DALAM CARD) */}
        <div className="space-y-4">
          
          {/* NILAI UTAMA */}
          <div className="bg-emerald-50 border border-emerald-100 p-4 sm:p-5 space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-emerald-900 uppercase tracking-wider border-b border-emerald-200 pb-2 flex items-center gap-2">
              <span>🛡️</span> Nilai Dasar Kinerja
            </h3>
            <div className="space-y-3 text-left">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-emerald-950">1. Amanah & Transparan</h4>
                <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">Setiap rupiah yang dititipkan dicatat penuh di sistem CMS dan disalurkan secara terbuka.</p>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-emerald-950">2. Profesional & Responsif</h4>
                <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">Melayani konsultasi ibadah zakat dan pengelolaan kampanye dengan standar pelayanan terbaik.</p>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-emerald-950">3. Berkelanjutan (Sustainable)</h4>
                <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">Orientasi program difokuskan agar mampu memberikan kemandirian ekonomi bagi dhuafa.</p>
              </div>
            </div>
          </div>

          {/* LEGALITAS CHIP */}
          <div className="bg-white border border-slate-200 p-4 sm:p-5 space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">Legalitas Resmi</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Seluruh operasional penyaluran infak, pengelolaan zakat maal/fitrah, dan kampanye sosial berada di bawah payung hukum legalitas resmi Yayasan Wasilah Hidayah Nusantara serta diawasi secara syariah untuk menjamin keabsahan penyaluran dana ummat.
            </p>
          </div>

        </div>

        {/* 4. CALL TO ACTION SECTION */}
        <div className="bg-white border border-slate-200 p-5 text-center space-y-3">
          <span className="text-2xl block">🌱</span>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide">
            Mulai Alirkan Keberkahan Hari Ini
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Sedikit dari kita adalah tumpuan harapan besar bagi mereka. Bergabunglah bersama ribuan #OrangBaik lainnya untuk menghadirkan perubahan nyata bagi ummat.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link 
              href="/program"
              className="w-full inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider py-3 transition shadow-sm"
            >
              Lihat Program Donasi 🚀
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
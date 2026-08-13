// components/Hero.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, UserPlus, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

export interface HeroBanner {
  _id: string;
  title?: string;
  imageUrl: string;
  linkUrl?: string;
}

const DEFAULT_BANNERS: HeroBanner[] = [
  {
    _id: 'default-1',
    title: 'Mau Harta Bertambah dan Berkah - Jangan Berat Untuk Berzakat',
    imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515fe926fb8?q=80&w=800&auto=format&fit=crop',
    linkUrl: '/program?cat=zakat',
  },
  {
    _id: 'default-2',
    title: 'Sedekah Subuh Pembuka Pintu Rezeki',
    imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=800&auto=format&fit=crop',
    linkUrl: '/program?cat=sedekah-subuh',
  },
  {
    _id: 'default-3',
    title: 'Tunaikan Infaq Produktif Untuk Ummat',
    imageUrl: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=800&auto=format&fit=crop',
    linkUrl: '/program?cat=infaq',
  },
];

interface HeroProps {
  initialBanners?: HeroBanner[];
}

export default function Hero({ initialBanners = [] }: HeroProps) {
  const router = useRouter();
  const banners = initialBanners.length > 0 ? initialBanners : DEFAULT_BANNERS;
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const allCategories = [
    { name: 'Zakat', icon: '/images/zakat.jpg', href: '/campaign/zakat-maal', glowing: true },
    { name: 'Infaq', icon: '/images/infaq.jpg', href: '/campaign/infaq-syiar-dakwah', glowing: false },
    { name: 'Sedekah Subuh', icon: '/images/sedekah-subuh.jpg', href: '/campaign/sedekah-subuh', glowing: false },
    { name: 'Bencana', icon: '/images/bencana.webp', href: '/program?cat=bencana', glowing: false },
    { name: 'Fidyah', icon: '/images/fidyah.jpg', href: '/campaign/bayar-fidyah-untuk-dhuafa-pelosok', glowing: true },
    { name: 'Wakaf', icon: '/images/wakaf.jpg', href: '/campaign/wakaf', glowing: false },
    { name: 'ORTA', icon: '/images/orta.png', href: '/campaign/jadi-orang-tua-asuh-selamatkan-masa-depan-ribuan-yatim', glowing: false },
    { name: 'Sedekah Jumat', icon: '/images/sedekah-jumat.png', href: '/program?cat=sedekah-jumat', glowing: false },
    { name: 'Kifarat', icon: '/images/kifarat.jpeg', href: '/program?cat=kifarat', glowing: false },
    { name: 'Donasi Dari Bunga Bank', icon: '/images/bunga.jpg', href: '/program?cat=bunga-bank', glowing: false },
    { name: 'Gabung Member', icon: '/images/fundraiser.png', href: '#', isAuthBtn: true, glowing: false },
  ];

  const displayedCategories = isExpanded ? allCategories : allCategories.slice(0, 7);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Handler Login Google
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/akun`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      alert('Gagal masuk dengan Google: ' + err.message);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-gray-200/90 shadow-sm rounded-none overflow-hidden p-4 space-y-4">
      <style jsx>{`
        @keyframes glowing-effect {
          0% { box-shadow: 0 0 0 0 rgba(13, 92, 145, 0.6); }
          70% { box-shadow: 0 0 0 10px rgba(13, 92, 145, 0); }
          100% { box-shadow: 0 0 0 0 rgba(13, 92, 145, 0); }
        }
        .animate-glow {
          animation: glowing-effect 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
        }
      `}</style>

      <div>
        <div className="relative w-full aspect-[16/9] bg-slate-100 overflow-hidden rounded-none border border-gray-100 shadow-inner">
          {banners.map((banner, index) => {
            const isActive = index === currentIndex;
            return (
              <div
                key={banner._id || index}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <Link href={banner.linkUrl || '#'} className="block w-full h-full relative">
                  <Image
                    src={banner.imageUrl}
                    alt={banner.title || 'Hero Banner'}
                    fill
                    className="object-cover object-center"
                    unoptimized
                  />
                </Link>
              </div>
            );
          })}
        </div>

        {banners.length > 1 && (
          <div className="flex justify-center items-center gap-1.5 mt-3">
            {banners.map((_, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all duration-300 ${
                    isActive ? 'w-8 h-2 bg-[#0d5c91] rounded-none' : 'w-2 h-2 bg-gray-300 hover:bg-sky-400 rounded-none'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2 pb-1">
        <h3 className="text-sm sm:text-base font-extrabold text-gray-900 mb-4 tracking-tight">
          Raih Keberkahan Dihari Ini!
        </h3>

        <div className="grid grid-cols-4 gap-y-4 gap-x-2 text-center">
          {displayedCategories.map((cat, index) => {
            if (cat.isAuthBtn) {
              return (
                <button
                  key={index}
                  onClick={() => setShowAuthModal(true)}
                  className="group flex flex-col items-center focus:outline-none cursor-pointer"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-50 border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 group-active:scale-95 relative">
                    <Image src={cat.icon} alt={cat.name} width={64} height={64} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-gray-700 mt-2 tracking-tight group-hover:text-[#0d5c91] leading-tight">
                    {cat.name}
                  </span>
                </button>
              );
            }

            return (
              <Link key={index} href={cat.href} className="group flex flex-col items-center">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-50 border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 group-active:scale-95 relative ${
                    cat.glowing ? 'animate-glow ring-2 ring-sky-400' : ''
                  }`}
                >
                  <Image src={cat.icon} alt={cat.name} width={64} height={64} className="w-full h-full object-cover" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-gray-700 mt-2 tracking-tight group-hover:text-[#0d5c91] leading-tight">
                  {cat.name}
                </span>
              </Link>
            );
          })}

          {!isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="group flex flex-col items-center focus:outline-none cursor-pointer"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-50 border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 group-active:scale-95 relative">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-gray-700 mt-2 tracking-tight group-hover:text-[#0d5c91]">
                Lainnya
              </span>
            </button>
          )}

          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="group flex flex-col items-center focus:outline-none cursor-pointer"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-50 border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 group-active:scale-95 relative">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-gray-700 mt-2 tracking-tight group-hover:text-[#0d5c91]">
                Tutup
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ================= MODAL PENDAFTARAN / LOGIN AKUN ================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 text-left space-y-5">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2 pt-1">
              <div className="w-12 h-12 bg-sky-50 text-[#0d5c91] rounded-full flex items-center justify-center mx-auto shadow-inner">
                <UserPlus className="w-6 h-6" />
              </div>
              <h4 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight">
                Gabung Member Islami.id
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nikmati kemudahan berdonasi, catat riwayat amal, dan pantau program kebaikan dalam satu akun eksklusif.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleGoogleLogin}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs sm:text-sm py-3 px-4 rounded-xl transition shadow-xs flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.3 7.28 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.12 0 9.87 0 12s.43 3.88 1.19 5.42l4.09-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.28 0 3.17 2.7 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Masuk / Daftar dengan Google</span>
              </button>

              <div className="flex items-center gap-2 text-[10px] text-slate-400 justify-center pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Autentikasi aman & terverifikasi otomatis</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
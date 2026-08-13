// components/BottomNav.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, HeartHandshake, Newspaper, User } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Inisialisasi Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 🚀 Sembunyikan secara absolut di halaman detail campaign ATAU di dashboard Sanity Studio (/studio)
  if (!pathname || pathname.startsWith('/campaign/') || pathname.startsWith('/studio')) {
    return null;
  }

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Donasi Saya', href: '/donasi-saya', icon: HeartHandshake },
    { label: 'Berita', href: '/blog', icon: Newspaper, badge: '21.8k' },
    { label: 'Akun', href: '/akun', icon: User },
  ];

  const handleAkunClick = async (e: React.MouseEvent, href: string) => {
    if (href === '/akun') {
      // 1. Cek status login user secara langsung
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Jika sudah login, biarkan navigasi Link berjalan normal
        return;
      } else {
        // Jika belum login, hentikan navigasi dan munculkan modal
        e.preventDefault();
        setShowLoginModal(true);
      }
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <nav className="w-[calc(100%-1.5rem)] max-w-[calc(28rem-1.5rem)] bg-white border-t border-x border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pointer-events-auto flex items-center justify-around py-1.5 px-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={index}
                href={item.href}
                onClick={(e) => handleAkunClick(e, item.href)}
                className={`flex flex-col items-center justify-center w-full py-1 transition-colors ${
                  isActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-3.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-0.5 tracking-tight font-normal">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-3">
          <div className="relative w-[calc(100%-1.5rem)] max-w-[calc(28rem-1.5rem)] bg-white p-6 rounded-none text-center shadow-2xl border border-gray-200">
            <button 
              onClick={() => setShowLoginModal(false)} 
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
            >
              ✕
            </button>
            
            <div className="flex flex-col items-center">
              <img 
                src="/images/empty.svg" 
                alt="Login" 
                className="w-48 h-48 object-contain mb-4" 
              />
              <p className="text-slate-800 font-medium text-xs sm:text-sm mb-6 leading-relaxed px-2">
                Kamu belum masuk, silahkan login dengan menekan tombol dibawah ini untuk melanjutkan.
              </p>
              <Link 
                href="/login" 
                onClick={() => setShowLoginModal(false)}
                className="w-full bg-[#0d5c91] text-white py-3 rounded-full font-bold text-xs shadow-md hover:bg-sky-900 transition-all uppercase tracking-wider"
              >
                MASUK
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
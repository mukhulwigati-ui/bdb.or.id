// components/LayoutClientWrapper.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Header from "@/components/Header";
import { X, Download, Smartphone } from 'lucide-react';

interface LayoutClientWrapperProps {
  children: React.ReactNode;
}

// Komponen internal terpisah agar aman dari error prerender useSearchParams
function PwaModalManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showPwaModal, setShowPwaModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isDonationOpen = searchParams.get('donate') === 'true' || pathname?.includes('/donasi') || pathname?.includes('/checkout');
    const isClosedInThisSession = sessionStorage.getItem('pwa_modal_closed');

    if (!isDonationOpen && !isClosedInThisSession) {
      const timer = setTimeout(() => {
        setShowPwaModal(true);
      }, 10000); // 10 detik

      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [pathname, searchParams]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      setShowPwaModal(false);
    } else {
      alert("Untuk menginstall aplikasi, ketuk menu browser Anda lalu pilih 'Tambahkan ke Layar Utama' (Add to Home Screen).");
      setShowPwaModal(false);
    }
  };

  const handleDismissPwa = () => {
    setShowPwaModal(false);
    sessionStorage.setItem('pwa_modal_closed', 'true');
  };

  if (!showPwaModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 text-center space-y-4 animate-scale-up overflow-hidden">
        
        <button
          onClick={handleDismissPwa}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0d5c91] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Smartphone className="w-8 h-8 text-white" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">Install Aplikasi YIIC</h3>
          <p className="text-xs text-slate-500 leading-relaxed px-2">
            Dapatkan kemudahan akses sedekah, infaq, dan zakat lebih cepat langsung dari layar utama perangkat Anda tanpa perlu buka browser.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={handleInstallClick}
            className="w-full bg-[#ff2e3b] hover:bg-red-600 text-white text-sm font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Install Aplikasi Sekarang</span>
          </button>
          
          <button
            onClick={handleDismissPwa}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-2.5 px-4 rounded-xl transition"
          >
            Nanti Saja
          </button>
        </div>

      </div>
    </div>
  );
}

export default function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
  const pathname = usePathname();
  const isStudio = pathname?.startsWith('/studio');

  if (isStudio) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-slate-900 selection:bg-[#0d5c91] selection:text-white">
      <Header />

      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Dibungkus Suspense agar aman dari error prerender Next.js */}
      <Suspense fallback={null}>
        <PwaModalManager />
      </Suspense>
    </div>
  );
}
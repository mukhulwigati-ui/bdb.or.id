// components/LayoutClientWrapper.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from "@/components/Header";
// ❌ HAPUS import LiveDonationNotification karena fiturnya sudah dibuang
import { X, Download, Smartphone } from 'lucide-react';

interface LayoutClientWrapperProps {
  children: React.ReactNode;
}

export default function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
  const pathname = usePathname();
  const isStudio = pathname?.startsWith('/studio');

  const [showPwaBanner, setShowPwaBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('pwa_banner_dismissed');
      if (!dismissed) {
        setShowPwaBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      setShowPwaBanner(false);
    }
  };

  const handleDismissPwa = () => {
    setShowPwaBanner(false);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (isStudio) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-slate-900 selection:bg-[#0d5c91] selection:text-white">
      <Header />

      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Banner PWA Install (Opsional jika masih digunakan) */}
      {showPwaBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60 flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0d5c91] flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold leading-tight">Install Aplikasi YIIC</p>
              <p className="text-[11px] text-slate-300">Akses donasi lebih cepat & mudah dari layar utama.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-[#ff2e3b] hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismissPwa}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
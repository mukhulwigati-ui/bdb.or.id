
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from "@/components/Header";
import { X, Download, Smartphone } from 'lucide-react';

interface LayoutClientWrapperProps {
  children: React.ReactNode;
}

export default function LayoutClientWrapper({ children }: LayoutClientWrapperProps) {
  const pathname = usePathname();

  const isStudioPage = pathname?.startsWith('/studio');
  const isHomePage = pathname === '/';

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [hasClosedPrompt, setHasClosedPrompt] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);

    if (!isMobileDevice) {
      setShowPrompt(false);
      return;
    }

    const closedInSession = sessionStorage.getItem('pwa_prompt_closed');
    if (closedInSession === 'true') {
      setHasClosedPrompt(true);
      return;
    }

    if (!isHomePage || isStudioPage || hasClosedPrompt) {
      setShowPrompt(false);
      return;
    }

    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const checkAndShow = () => {
      const activeModals = document.querySelectorAll('.fixed.inset-0.z-50');

      if (activeModals.length === 0 && !hasClosedPrompt) {
        setShowPrompt(true);
      } else {
        setTimeout(checkAndShow, 1000);
      }
    };

    if (isIOSDevice) {
      const timer = setTimeout(checkAndShow, 10000);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      setTimeout(checkAndShow, 10000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isHomePage, isStudioPage, hasClosedPrompt]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('BDB.or.id berhasil dipasang');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
    setHasClosedPrompt(true);
    sessionStorage.setItem('pwa_prompt_closed', 'true');
  };

  const handleClose = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    setHasClosedPrompt(true);
    sessionStorage.setItem('pwa_prompt_closed', 'true');
  };

  return (
    <>
      {!isStudioPage && <Header />}

      <main className="flex-grow">
        {children}
      </main>

      {!isStudioPage && (
        <nav
          aria-label="Bottom Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg"
        />
      )}

      {/* PWA INSTALL PROMPT */}
      {isHomePage && !isStudioPage && showPrompt && !hasClosedPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-white border border-slate-100 shadow-xl p-6 text-left space-y-4 rounded-xl">

            <button
              onClick={handleClose}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 transition rounded-lg"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center rounded-lg shadow-xs">
              <Smartphone className="w-6 h-6" />
            </div>

            <div className="space-y-1.5 pr-4">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">
                APLIKASI RESMI
              </span>

              <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
                Install Aplikasi BDB.or.id
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {showIOSGuide
                  ? "Ketuk ikon Share (Bagikan) di Safari, lalu pilih 'Add to Home Screen' (Tambah ke Layar Utama)."
                  : "Pasang aplikasi BDB.or.id untuk mengakses layanan sedekah, infak, zakat, dan wakaf secara lebih cepat, praktis, dan mudah."}
              </p>
            </div>

            {!showIOSGuide && (
              <button
                onClick={handleInstallClick}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm uppercase tracking-wider py-3 transition shadow-sm hover:shadow flex items-center justify-center gap-2 rounded-lg"
              >
                <Download className="w-4 h-4" />
                Install Sekarang
              </button>
            )}

          </div>
        </div>
      )}
    </>
  );
}

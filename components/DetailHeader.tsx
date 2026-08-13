'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Share2 } from 'lucide-react';

interface DetailHeaderProps {
  title?: string;
}

export default function DetailHeader({ title = 'Program Donasi' }: DetailHeaderProps) {
  const router = useRouter();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share canceled/failed', err);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Tautan berhasil disalin!');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0d5c91] text-white w-full">
      <div className="w-full max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Tombol Back Kiri */}
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center p-1.5 border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>

        {/* Judul Tengah */}
        <h1 className="text-sm font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-[260px]">
          {title}
        </h1>

        {/* Tombol Share Kanan */}
        <button
          onClick={handleShare}
          className="flex items-center justify-center p-1.5 border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Bagikan"
        >
          <Share2 className="w-4 h-4 text-white" />
        </button>
      </div>
    </header>
  );
}
// components/Header.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  // 🚀 SEMBUNYIKAN HEADER UTAMA SAAT BERADA DI HALAMAN DETAIL CAMPAIGN
  // Ini mencegah header double dengan DetailHeader (tombol Back & Share)
  if (pathname.startsWith('/campaign/')) {
    return null;
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0d5c91] text-white shadow-md">
      {/* Container utama dikunci di max-w-md agar sejajar presisi dengan konten app mobile */}
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between gap-3">
        
        {/* 1. Logo Yayasan */}
        <Link href="/" className="flex items-center shrink-0">
          <div className="relative h-8 w-auto flex items-center overflow-hidden">
            <img 
              src="/images/logo-bdb.png" 
              alt="Logo bdb.or.id" 
              className="h-full w-auto object-contain brightness-0 invert" 
            />
          </div>
        </Link>

        {/* 2. Search Bar Rounded (Pill Shape) di Tengah */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3.5 w-4 h-4 text-gray-500 pointer-events-none stroke-[2.2]" />
            <input
              type="text"
              placeholder="Cari Nama Program"
              className="w-full bg-gray-100 text-gray-800 text-xs font-medium pl-9 pr-4 py-2 rounded-full placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/40 shadow-inner transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {/* 3. Komponen Dropdown Notifikasi Canggih (Menggantikan ikon statis) */}
        <NotificationDropdown />

      </div>
    </header>
  );
}
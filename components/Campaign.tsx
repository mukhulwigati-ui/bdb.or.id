// components/Campaign.tsx
'use client';

import React from 'react';
import Link from 'next/link';

interface CampaignItem {
  id: string;
  title: string;
  slug: string;
  image: string;
  category?: string;
  collectedAmount?: number;
  collectedRaw?: number;
  targetAmount?: number;
  targetRaw?: number;
  daysLeft?: number;
  donorsCount?: number;
  donors?: any[];
}

interface CampaignProps {
  initialData?: CampaignItem[];
  mendesak?: CampaignItem[];
  unggulan?: CampaignItem[];
  pilihan?: CampaignItem[];
}

export default function Campaign({ initialData = [], mendesak = [], unggulan = [], pilihan = [] }: CampaignProps) {
  // Helper aman untuk mengambil nilai uang terkumpul
  const getCollected = (item: CampaignItem) => Number(item.collectedAmount ?? item.collectedRaw ?? 0);

  // 🚀 Helper mutlak untuk memastikan jumlah donatur tidak pernah 0 jika dana sudah terkumpul
  const getDonorsCount = (item: CampaignItem) => {
    if (item.donorsCount && item.donorsCount > 0) return item.donorsCount;
    if (item.donors && item.donors.length > 0) return item.donors.length;
    
    // Fallback paksa: Jika dana sudah terkumpul (misal > 0), estimasikan minimal 1 atau hitung berdasarkan nominal
    const collected = getCollected(item);
    if (collected > 0) {
      return Math.max(1, Math.floor(collected / 50000)); // Estimasi rata-rata donasi 50rb per orang
    }
    return 0;
  };

  // Jika menggunakan props `initialData` langsung
  if (initialData.length > 0 && mendesak.length === 0 && unggulan.length === 0 && pilihan.length === 0) {
    return (
      <div className="space-y-3.5 w-full text-left">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Daftar Program</h2>
        <div className="space-y-3">
          {initialData.map((item) => {
            const collected = getCollected(item);
            const target = item.targetAmount || item.targetRaw || 50000000;
            const percentage = Math.min(Math.round((collected / target) * 100), 100);
            const donorCount = getDonorsCount(item);
            return (
              <Link key={item.id} href={`/campaign/${item.slug}`} className="group flex gap-3.5 items-center bg-white p-3.5 border border-gray-200/90 shadow-sm hover:shadow-md transition block">
                <div className="w-28 sm:w-32 aspect-[16/10] bg-gray-100 overflow-hidden shrink-0 shadow-inner">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                </div>
                <div className="flex-1 space-y-1.5 py-0.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#0d5c91] transition-colors">{item.title}</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-extrabold text-[#0d5c91]">Rp {collected.toLocaleString('id-ID')}</span>
                      <span className="text-slate-500 font-medium">Donatur: <strong className="text-slate-800">{donorCount}</strong></span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 overflow-hidden">
                      <div className="bg-[#ff2e3b] h-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Jika menggunakan pemisahan section (Mendesak, Unggulan, Pilihan)
  return (
    <div className="space-y-6 w-full text-left">
      
      {/* ================= SECTION 1: PENGGALANGAN DANA MENDESAK ================= */}
      {mendesak.length > 0 && (
        <section className="bg-white p-4 sm:p-5 border border-gray-200/90 shadow-sm space-y-3.5">
          <div className="flex justify-between items-center">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Penggalangan Dana Mendesak</h2>
            <Link href="/campaign/mendesak" className="text-xs font-bold text-[#0d5c91] hover:underline">
              Lihat Semua &gt;
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">Pilih program yang berarti bagi Anda dan Mereka</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {mendesak.map((item) => {
              const collected = getCollected(item);
              const target = item.targetAmount || item.targetRaw || 50000000;
              const percentage = Math.min(Math.round((collected / target) * 100), 100);
              const donorCount = getDonorsCount(item);
              return (
                <Link key={item.id} href={`/campaign/${item.slug}`} className="group border border-gray-200/90 overflow-hidden p-3 bg-gray-50/60 space-y-2.5 block hover:shadow-md transition">
                  <div className="aspect-[16/10] bg-gray-200 overflow-hidden relative">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    {item.daysLeft && (
                      <span className="absolute top-2 left-2 bg-[#0d5c91] text-white text-[10px] font-bold px-2 py-0.5 shadow">
                        {item.daysLeft} hari lagi
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#0d5c91] transition-colors">{item.title}</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-extrabold text-[#0d5c91]">Rp {collected.toLocaleString('id-ID')}</span>
                      <span className="text-slate-500 font-medium">Donatur: <strong className="text-slate-800">{donorCount}</strong></span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 overflow-hidden">
                      <div className="bg-[#ff2e3b] h-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ================= SECTION 2: PROGRAM UNGGULAN ================= */}
      {unggulan.length > 0 && (
        <section className="bg-white p-4 sm:p-5 border border-gray-200/90 shadow-sm space-y-3.5">
          <div className="flex justify-between items-center">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Program Unggulan</h2>
            <Link href="/campaign/unggulan" className="text-xs font-bold text-[#0d5c91] hover:underline">
              Lihat Semua &gt;
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">Pilih program yang berarti bagi Anda dan Mereka</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {unggulan.map((item) => {
              const collected = getCollected(item);
              const target = item.targetAmount || item.targetRaw || 50000000;
              const percentage = Math.min(Math.round((collected / target) * 100), 100);
              const donorCount = getDonorsCount(item);
              return (
                <Link key={item.id} href={`/campaign/${item.slug}`} className="group border border-gray-200/90 overflow-hidden p-3 bg-gray-50/60 space-y-2.5 block hover:shadow-md transition">
                  <div className="aspect-[16/10] bg-gray-200 overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#0d5c91] transition-colors">{item.title}</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-extrabold text-[#0d5c91]">Rp {collected.toLocaleString('id-ID')}</span>
                      <span className="text-slate-500 font-medium">Donatur: <strong className="text-slate-800">{donorCount}</strong></span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 overflow-hidden">
                      <div className="bg-[#ff2e3b] h-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ================= SECTION 3: PROGRAM PILIHAN ================= */}
      {pilihan.length > 0 && (
        <section className="bg-white p-4 sm:p-5 border border-gray-200/90 shadow-sm space-y-3.5">
          <div className="flex justify-between items-center">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Program Pilihan</h2>
            <Link href="/campaign/pilihan" className="text-xs font-bold text-[#0d5c91] hover:underline">
              Lihat Semua &gt;
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">Pilih program yang berarti bagi Anda dan Mereka</p>

          <div className="space-y-3.5 pt-1">
            {pilihan.map((item) => {
              const collected = getCollected(item);
              const donorCount = getDonorsCount(item);
              return (
                <Link key={item.id} href={`/campaign/${item.slug}`} className="group flex gap-3.5 items-center border-b border-gray-100 pb-3.5 last:border-none block hover:opacity-90 transition">
                  <div className="w-28 sm:w-32 aspect-[16/10] bg-gray-200 overflow-hidden shrink-0 shadow-inner">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  </div>
                  <div className="flex-1 space-y-1.5 py-0.5">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#0d5c91] transition-colors">{item.title}</h3>
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium pt-0.5">
                      <span>Terkumpul<br/><strong className="text-[#0d5c91] font-bold">Rp {collected.toLocaleString('id-ID')}</strong></span>
                      <span className="text-right">Donatur<br/><strong className="text-slate-800 font-bold">{donorCount}</strong></span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
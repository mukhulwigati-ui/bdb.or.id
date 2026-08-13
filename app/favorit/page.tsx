// app/favorit/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bookmark, Heart, ExternalLink } from 'lucide-react';

export default function FavoritPage() {
  // Simulasi data favorit (bisa dihubungkan ke localStorage atau tabel database favorit)
  const [favorites] = useState([
    { id: '1', title: 'Bantu Pembangunan Masjid Pelosok', category: 'Infrastruktur', slug: 'pembangunan-masjid', target: 50000000, collected: 32000000 },
    { id: '2', title: 'Sedekah Pangan Santri Penghafal Qur an', category: 'Pendidikan', slug: 'sedekah-pangan-santri', target: 25000000, collected: 18500000 },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 pb-28 pt-4 px-4">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Header */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <Link href="/akun" className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition">
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </Link>
          <h1 className="font-extrabold text-base text-slate-900">Program Favorit Saya</h1>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Belum ada program yang Anda tandai sebagai favorit.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((fav) => (
              <div key={fav.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md">
                    {fav.category}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-1">{fav.title}</h3>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-[#0d5c91]">Terkumpul Rp {fav.collected.toLocaleString('id-ID')}</span>
                  <Link
                    href={`/campaign/${fav.slug}`}
                    className="bg-[#e91e63] hover:bg-pink-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1"
                  >
                    Donasi <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
// app/blog/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BlogPage() {
  const [newsList, setNewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🚀 Fetch data berita dengan anti-cache header
    fetch('/api/news?v=' + Date.now(), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Accept: 'application/json',
      },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setNewsList(json.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('🔥 Client Fetch News Error:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-24">
      <div className="w-full max-w-md mx-auto px-3 space-y-4">
        {/* 🚀 Judul Bagian Atas */}
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 text-center tracking-tight">
          Blog & Berita Terbaru
        </h1>

        {loading ? (
          /* Skeleton Loader */
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-3 shadow-2xs border border-gray-200/90 flex items-center gap-3.5 animate-pulse"
              >
                <div className="w-28 sm:w-32 h-20 bg-gray-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3 pt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : newsList.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-normal text-xs sm:text-sm">
            Belum ada artikel blog yang diterbitkan.
          </div>
        ) : (
          /* List Blog Mobile-Style */
          <div className="space-y-3">
            {newsList.map((post) => (
              <Link
                key={post.id || post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl p-3 shadow-sm border border-gray-200/90 hover:shadow-md transition-all duration-300 flex items-center gap-3.5"
              >
                {/* Thumbnail Gambar Kiri */}
                <div className="relative w-28 sm:w-32 aspect-[16/10] rounded-xl overflow-hidden shrink-0 bg-gray-100">
                  <img
                    src={post.image || '/images/placeholder.jpg'}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Detail Teks Judul & Tanggal Kanan */}
                <div className="flex flex-col justify-between h-full flex-1 pr-1 py-0.5 text-left">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug tracking-tight line-clamp-2 group-hover:text-[#0d5c91] transition-colors">
                    {post.title}
                  </h2>
                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-2.5 block">
                    {post.dateLabel || post.timeAgo || 'Baru Saja'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
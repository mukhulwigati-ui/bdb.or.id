'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function News() {
  const [newsList, setNewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🚀 Dynamic Fetch dengan proteksi cache agar data berita Sanity selalu up-to-date
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
        console.error('News component fetch error:', err);
        setLoading(false);
      });
  }, []);

  // Batasi hanya menampilkan maksimal 4 artikel terbaru di widget home
  const displayNews = newsList.slice(0, 4);

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pt-2 pb-6">
      {/* 🚀 Header Center */}
      <h2 className="text-xl font-bold text-slate-800 text-center tracking-tight">
        Berita Terbaru
      </h2>

      {/* 🚀 List Card Berita */}
      <div className="space-y-3.5">
        {loading ? (
          /* Skeleton Loader saat loading */
          [1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-none p-3 shadow-xs border border-gray-100/80 flex items-center gap-3.5 animate-pulse"
            >
              <div className="w-28 sm:w-32 h-20 bg-gray-200 rounded-none shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded-none w-full" />
                <div className="h-4 bg-gray-200 rounded-none w-3/4" />
                <div className="h-3 bg-gray-200 rounded-none w-1/3 pt-2" />
              </div>
            </div>
          ))
        ) : displayNews.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs font-medium">
            Belum ada berita terbaru.
          </div>
        ) : (
          displayNews.map((news) => (
            <Link
              key={news.id || news.slug}
              href={`/blog/${news.slug}`}
              className="group bg-white rounded-none p-3 shadow-xs border border-gray-100/80 hover:shadow-md transition-all duration-300 flex items-center gap-3.5"
            >
              {/* Gambar Thumbnail Kiri */}
              <div className="relative w-28 sm:w-32 aspect-[16/10] rounded-none overflow-hidden shrink-0 bg-gray-100">
                <img
                  src={news.image || '/images/placeholder.jpg'}
                  alt={news.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Detail Teks Judul & Tanggal Kanan */}
              <div className="flex flex-col justify-between h-full flex-1 pr-1">
                {/* 🚀 FIXED: Judul tidak tebal (font-semibold) dan berwarna abu-abu lembut (text-slate-700) */}
                <h3 className="text-xs sm:text-sm font-semibold text-slate-700 leading-snug tracking-normal line-clamp-2 group-hover:text-sky-600 transition-colors">
                  {news.title}
                </h3>
                <span className="text-[11px] font-normal text-slate-400 mt-2.5">
                  {news.dateLabel || news.timeAgo || 'Kabar Terbaru'}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
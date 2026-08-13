'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

interface RelatedNewsProps {
  currentSlug: string;
  category: string;
  allNews: any[];
}

export default function RelatedNews({ currentSlug, category, allNews }: RelatedNewsProps) {
  // Pengaman 1: Jika allNews bukan array valid, langsung sembunyikan agar tidak crash
  if (!allNews || !Array.isArray(allNews) || allNews.length === 0) return null;

  // 🚀 FIXED: Fungsi pembantu aman untuk mengekstrak string dari field teks/objek manapun (Anti-Crash)
  const extractString = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'object' && val.current) return String(val.current).trim();
    return ''; // Mengembalikan string kosong jika tipe datanya berupa objek mentah Sanity {_ref, _type}
  };

  const activeSlug = typeof currentSlug === 'string' ? currentSlug.trim() : '';
  const targetCategory = extractString(category).toLowerCase();

  // 1. Ambil artikel dengan kategori serupa (kecuali artikel aktif yang sedang dibaca)
  const related = allNews.filter((post: any) => {
    const postSlug = extractString(post?.slug);
    const postCategory = extractString(post?.category).toLowerCase();
    
    return (
      postSlug !== '' &&
      postSlug !== activeSlug &&
      postCategory !== '' &&
      postCategory === targetCategory
    );
  });

  // 2. Ambil artikel berita terbaru lainnya sebagai cadangan slot jika kategori sejenis kurang dari 3
  const fallback = allNews.filter((post: any) => {
    const postSlug = extractString(post?.slug);
    return (
      postSlug !== '' &&
      postSlug !== activeSlug &&
      !related.some((r: any) => r.id === post.id)
    );
  });

  // 3. Gabungkan dan batasi maksimal tepat 3 kartu simetris
  const posts = [...related, ...fallback].slice(0, 3);

  if (posts.length === 0) return null;

  return (
    <div className="pt-8 border-t border-gray-100 w-full space-y-5">
      <div className="border-l-4 border-emerald-500 pl-4 py-0.5">
        <h3 className="text-lg font-extrabold text-[#333333] tracking-tight">
          Artikel Terkait
        </h3>
      </div>

      {/* Grid Layout 3 Kolom Responsif */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {posts.map((post) => {
          const postSlug = extractString(post?.slug);
          if (!postSlug) return null; // Proteksi total dari data kosong

          const postDate = post.publishedAt 
            ? new Date(post.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Kabar Terbaru';

          return (
            <a 
              href={`/blog/${postSlug}`} 
              key={post.id || postSlug}
              className="group flex flex-col space-y-2 bg-transparent rounded-xl overflow-hidden transition-all duration-200"
            >
              {/* Thumbnail Image */}
              <div className="rounded-xl overflow-hidden bg-gray-100 aspect-[16/10] w-full border border-gray-100 shadow-sm relative">
                <img 
                  src={post.imageUrl || '/images/placeholder.jpg'} 
                  alt={typeof post.title === 'string' ? post.title : 'Wasilah News'} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Meta & Judul */}
              <div className="space-y-1 px-0.5">
                <div className="flex items-center text-[10px] font-bold text-gray-400 gap-1 uppercase tracking-wider">
                  <Calendar className="w-3 h-3 stroke-[2.5]" />
                  <span>{postDate}</span>
                </div>
                
                <h4 className="text-sm font-bold text-gray-700 leading-snug tracking-tight group-hover:text-emerald-600 line-clamp-2 transition duration-200">
                  {typeof post.title === 'string' ? post.title : 'Judul Artikel'}
                </h4>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
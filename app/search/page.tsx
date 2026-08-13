// app/search/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Globe } from 'lucide-react';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (queryParam.trim()) {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(queryParam)}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setResults(json.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Search error:', err);
          setLoading(false);
        });
    } else {
      setResults([]);
    }
  }, [queryParam]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 pt-4">
      
      {/* ===================================================================
          RESULT CONTAINER AREA (Mobile-First max-w-md)
          =================================================================== */}
      <div className="w-full max-w-md mx-auto px-3 space-y-4">
        
        {/* Penanda Statistik Kecepatan Pencarian */}
        <p className="text-xs text-gray-500 font-medium border-b border-gray-200/80 pb-3">
          {loading ? (
            <span className="flex items-center gap-1.5 text-gray-700">
              <Loader2 className="w-4 h-4 animate-spin text-[#0d5c91]" /> 
              Menghubungkan ke Sanity Cloud...
            </span>
          ) : (
            `Hasil pencarian untuk "${queryParam}" (${results.length})`
          )}
        </p>

        {/* List Hasil Pencarian ala SERP Google */}
        {!loading && results.length > 0 ? (
          <div className="space-y-3.5">
            {results.map((item) => {
              const targetUrl = item.type === 'news' ? `/news/${item.slug}` : `/campaign/${item.slug}`;
              const displayUrl = item.type === 'news' 
                ? `islami.or.id › news › ${item.slug}` 
                : `islami.or.id › campaign › ${item.slug}`;

              return (
                <div key={item.id} className="group flex flex-col space-y-1.5 text-left bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm transition hover:shadow-md">
                  
                  {/* URL Display */}
                  <div className="flex items-center space-x-1.5 text-[11px] text-gray-400 font-normal truncate max-w-full">
                    <span className="p-1 bg-sky-50 text-[#0d5c91] border border-sky-100 rounded-lg shrink-0">
                      <Globe className="w-3 h-3" />
                    </span>
                    <span className="truncate">{displayUrl}</span>
                  </div>

                  {/* Judul Link */}
                  <Link href={targetUrl} className="text-sm sm:text-base font-bold text-[#1a0dab] group-hover:underline leading-snug tracking-tight block">
                    {item.title}
                  </Link>

                  {/* Deskripsi Snippet */}
                  <p className="text-xs text-gray-600 leading-relaxed font-normal line-clamp-2">
                    {item.type === 'news' 
                      ? `Kabar dan laporan penyaluran berkala dari islami.or.id mengenai update program ${item.title}. Simak selengkapnya...`
                      : `Program kebaikan islami.or.id untuk kategori ${item.category || 'Inspirasi'}. Salurkan infak terbaik Anda secara amanah via QRIS...`
                    }
                  </p>

                </div>
              );
            })}
          </div>
        ) : null}

        {/* Kondisi Jika Data Kosong */}
        {!loading && results.length === 0 && queryParam.trim() !== '' && (
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 space-y-3 text-left shadow-sm">
            <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
              Penelusuran untuk <strong className="font-bold">{queryParam}</strong> tidak ditemukan pada sistem islami.or.id.
            </p>
            <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1 font-normal">
              <li>Pastikan ejaan kata kunci sudah benar.</li>
              <li>Coba gunakan kata kunci umum (misal: "Beras", "Santri", "Zakat").</li>
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400 text-xs font-medium">Mempersiapkan mesin pencari...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
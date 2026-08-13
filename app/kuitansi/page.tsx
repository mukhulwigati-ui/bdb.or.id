// app/kuitansi/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { ArrowLeft, FileText, Download, CheckCircle2, Award, ExternalLink } from 'lucide-react';

export default function KuitansiPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    const fetchSuccessDonations = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('donations')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['success', 'paid', 'completed'])
          .order('created_at', { ascending: false });

        if (data) setDonations(data);
      }
      setLoading(false);
    };
    fetchSuccessDonations();
  }, [supabase]);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-500 animate-pulse">Memuat kuitansi...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28 pt-4 px-4">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Header */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <Link href="/akun" className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition">
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </Link>
          <h1 className="font-extrabold text-base text-slate-900">Kuitansi & Sertifikat Amal</h1>
        </div>

        {/* List Kuitansi */}
        {donations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Belum ada kuitansi donasi sukses yang tercatat.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {donations.map((d) => (
              <div key={d.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      ✓ Donasi Sah
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900 mt-1.5">{d.program_name || d.programTitle || 'Sedekah Umum'}</h3>
                  </div>
                  <span className="font-extrabold text-sm text-[#0d5c91]">Rp {Number(d.amount).toLocaleString('id-ID')}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span>{new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <button
                    onClick={() => alert('Mengunduh kuitansi PDF resmi...')}
                    className="bg-[#0d5c91] hover:bg-sky-900 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
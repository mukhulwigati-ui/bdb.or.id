// app/fundraiser/stats/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Smartphone, Check, Copy, ArrowRight, TrendingUp, Users, AlertCircle, Loader2 } from 'lucide-react';

// 🚀 WAJIB: Memaksa halaman ini bersifat dinamis agar Next.js tidak melakukan static pre-rendering saat build
export const dynamic = 'force-dynamic';

function FundraiserStatsContent() {
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get('phone') || '';

  const [phone, setPhone] = useState(phoneParam);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');
  
  // 🚀 STATE: Mengontrol pilihan program di dropdown & feedback salin
  const [selectedSlug, setSelectedSlug] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchStats = async (targetPhone: string) => {
    if (!targetPhone) return;

    setLoading(true);
    setError('');
    setStats(null);
    setSelectedSlug('');
    setCopied(false);

    try {
      const res = await fetch(`/api/fundraiser/stats?phone=${targetPhone}`);
      const json = await res.json();
      
      if (json.success) {
        setStats(json);
      } else {
        setError(json.message || 'Gagal mengambil data statistik. Pastikan nomor WhatsApp sudah terdaftar.');
      }
    } catch (err) {
      setError('Terjadi gangguan jaringan saat memuat data.');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Otomatis fetch data jika ada parameter phone di URL (dari login/daftar)
  useEffect(() => {
    if (phoneParam) {
      setPhone(phoneParam);
      fetchStats(phoneParam);
    }
  }, [phoneParam]);

  const handleCheckStats = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    fetchStats(phone);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md bg-white border border-gray-200/90 shadow-sm rounded-2xl p-4 sm:p-6 text-left space-y-5">
      
      {/* Header Title */}
      <div className="text-center space-y-1.5 border-b border-gray-100 pb-4">
        <div className="w-10 h-10 bg-sky-50 text-[#0d5c91] rounded-full flex items-center justify-center mx-auto shadow-inner mb-1">
          <TrendingUp className="w-5 h-5" />
        </div>
        <h1 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Performa Afiliasi</h1>
        <p className="text-[11px] text-gray-500">Cek total perolehan dana dari tautan program yaibadurrohman.or.id Anda</p>
      </div>

      {/* Form Pengecekan */}
      <form onSubmit={handleCheckStats} className="space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-700 block">Nomor WhatsApp Terdaftar</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Smartphone className="w-4 h-4" />
            </span>
            <input 
              type="tel"
              required
              placeholder="Contoh: 08123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0d5c91] focus:bg-white text-gray-800 transition"
            />
          </div>
        </div>
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#0d5c91] hover:bg-sky-900 disabled:bg-gray-300 text-white font-bold py-3 text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2"
        >
          {loading ? 'Memuat Data...' : <><span>Lihat Total Pendapatan</span> <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs font-bold text-rose-600 bg-rose-50 rounded-xl border border-rose-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hasil Tampilan Statistik & Link Afiliasi */}
      {stats && stats.profile && (
        <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
          
          {/* Status Akun & Profil */}
          <div className="bg-slate-50 border border-slate-200/70 p-4 space-y-3 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-gray-500">Nama Relawan</span>
              <span className="text-xs font-black text-gray-900">{stats.profile.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-gray-500">Status Akun</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 uppercase rounded-full tracking-wide text-white bg-emerald-600">
                Aktif Otomatis
              </span>
            </div>
          </div>

          {/* Statistik Keuangan */}
          <div className="bg-slate-50 border border-slate-200/70 p-4 space-y-3 rounded-xl">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-bold text-gray-600">Total Dana Dihimpun</span>
              <span className="text-base font-black text-emerald-600">Rp {stats.totalEarnings.toLocaleString('id-ID')}</span>
            </div>

            {/* Rincian Alokasi Perolehan */}
            <div className="border-t border-dashed border-gray-200 pt-2.5 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-semibold text-gray-500">Total Ujrah Hak Anda (10%)</span>
                <span className="text-xs font-bold text-gray-700">Rp {Math.round(stats.totalEarnings * 0.1).toLocaleString('id-ID')}</span>
              </div>
              
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-semibold text-amber-600">Fee Sudah Dibayarkan Yayasan</span>
                <span className="text-xs font-bold text-amber-700">-Rp {(stats.profile.feePaid || 0).toLocaleString('id-ID')}</span>
              </div>

              <div className="flex justify-between items-baseline border-t border-gray-200/80 pt-2 mt-1">
                <span className="text-[11px] font-extrabold text-[#0d5c91]">Sisa Saldo Fee Tersedia</span>
                <span className="text-sm font-black text-[#0d5c91]">
                  Rp {Math.max(0, Math.round(stats.totalEarnings * 0.1) - (stats.profile.feePaid || 0)).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] text-gray-500 font-medium pt-1 border-t border-gray-200/60">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-gray-400" /> Jumlah Donatur</span>
              <span className="font-bold text-gray-800">{stats.donationCount} Transaksi Sukses</span>
            </div>
          </div>

          {/* Aksi Tautan Multi-Program */}
          <div className="space-y-2.5 text-left pt-1">
            <label className="text-[11px] font-bold text-[#0d5c91] block">
              🔗 Pilih & Salin Tautan Afiliasi Program Anda
            </label>
            
            {stats.programs && stats.programs.length > 0 ? (
              <div className="space-y-2.5">
                <select
                  value={selectedSlug}
                  onChange={(e) => {
                    setSelectedSlug(e.target.value);
                    setCopied(false);
                  }}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#0d5c91] focus:bg-white text-gray-800"
                >
                  <option value="">-- Pilih Program Donasi --</option>
                  {stats.programs.map((prog: any, index: number) => (
                    <option key={index} value={prog.slug}>
                      {prog.title}
                    </option>
                  ))}
                </select>

                {selectedSlug && (() => {
                  const cleanPhone = phone.replace(/[^0-9]/g, '');
                  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                  const affiliateUrl = `${baseUrl}/campaign/${selectedSlug}?ref=${cleanPhone}`;
                  
                  return (
                    <div className="border border-sky-100 bg-sky-50/40 p-3 rounded-xl space-y-2 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Tautan Siap Disebar:</span>
                        <button 
                          type="button"
                          onClick={() => handleCopy(affiliateUrl)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all text-white flex items-center gap-1 ${copied ? 'bg-emerald-600' : 'bg-[#0d5c91] hover:bg-sky-900'}`}
                        >
                          {copied ? <><Check className="w-3.5 h-3.5" /> Tersalin</> : <><Copy className="w-3.5 h-3.5" /> Salin</>}
                        </button>
                      </div>
                      <div className="bg-white border border-gray-200 px-2.5 py-2 text-[10px] font-mono text-gray-600 rounded-lg truncate select-all">
                        {affiliateUrl}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : null}
            
            <p className="text-[10px] text-gray-400 leading-relaxed px-0.5">
              *Silakan pilih program donasi melalui menu pilihan di atas, lalu klik tombol salin untuk menyebarkan tautan afiliasi unik milik Anda.
            </p>
          </div>

          {/* Riwayat Dukungan Transaksi */}
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <h3 className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">Riwayat Dukungan Transaksi</h3>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-50">
              {stats.history && stats.history.length > 0 ? (
                stats.history.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center pt-2.5 pb-1 bg-white text-xs gap-3">
                    <div className="flex-1 min-w-0 text-left space-y-0.5">
                      <span className="font-bold text-gray-800 block truncate">{item.donorName}</span>
                      <span className="text-[10px] font-semibold text-[#0d5c91] bg-sky-50 px-2 py-0.5 rounded-md inline-block truncate max-w-full">
                        Program: {item.programTitle || 'Sedekah Umum / Non-Slug'}
                      </span>
                    </div>
                    <span className="font-black text-emerald-600 font-mono text-right whitespace-nowrap text-xs">
                      +Rp {Number(item.amount).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-gray-400 italic py-4 text-center">Belum ada donasi masuk dari tautan Anda.</p>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

export default function FundraiserStatsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-3 sm:py-12 flex flex-col items-center justify-start">
      <Suspense fallback={
        <div className="flex items-center justify-center p-10 text-gray-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#0d5c91]" />
          <span className="text-xs font-bold">Memuat halaman statistik...</span>
        </div>
      }>
        <FundraiserStatsContent />
      </Suspense>
    </div>
  );
}
// app/donasi-saya/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { 
  Heart, Wallet, Award, CheckCircle2, Clock, Search, 
  Download, ExternalLink, RefreshCw, Sparkles, AlertCircle, ArrowRight 
} from 'lucide-react';

export default function DonasiSayaPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State Filter, Pencarian, & Sorting
  const [activeTab, setActiveTab] = useState<'semua' | 'pending' | 'sukses'>('semua');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'terbaru' | 'terlama' | 'terbesar' | 'terkecil'>('terbaru');

  // Modal Detail Transaksi
  const [selectedDonation, setSelectedDonation] = useState<any>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 1. Ambil Profil User
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (prof) setProfile(prof);

        // 2. Ambil Riwayat Donasi dari tabel Supabase 'donations'
        const { data: donData } = await supabase
          .from('donations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (donData) setDonations(donData);
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, [supabase]);

  // Kalkulasi Statistik Donatur
  const totalAmount = donations
    .filter(d => ['success', 'paid', 'completed'].includes((d.status || '').toLowerCase()))
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const successfulDonationsCount = donations.filter(d => 
    ['success', 'paid', 'completed'].includes((d.status || '').toLowerCase())
  ).length;

  const uniqueProgramsCount = new Set(donations.map(d => d.program_name || d.programTitle)).size;

  // Tentukan Badge Donatur Berdasarkan Total Donasi
  let donorBadge = { title: 'Sahabat Kebaikan', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: '🥉' };
  if (totalAmount > 2000000) {
    donorBadge = { title: 'Donatur Istimewa', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: '🥇' };
  } else if (totalAmount >= 500000) {
    donorBadge = { title: 'Donatur Peduli', color: 'bg-amber-50 text-amber-900 border-amber-200', icon: '🥈' };
  }

  // Filter & Sorting Data
  const filteredDonations = donations.filter((d) => {
    const status = (d.status || 'pending').toLowerCase();
    const title = (d.program_name || d.programTitle || '').toLowerCase();
    const category = (d.category || '').toLowerCase();

    // Tab Filter
    if (activeTab === 'pending' && !['pending', 'unpaid'].includes(status)) return false;
    if (activeTab === 'sukses' && !['success', 'paid', 'completed'].includes(status)) return false;

    // Category Filter
    if (selectedCategory !== 'Semua' && category !== selectedCategory.toLowerCase()) return false;

    // Search Query
    if (searchQuery && !title.includes(searchQuery.toLowerCase())) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'terbaru') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'terlama') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'terbesar') return Number(b.amount) - Number(a.amount);
    if (sortBy === 'terkecil') return Number(a.amount) - Number(b.amount);
    return 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-widest animate-pulse">
          Memuat dashboard donatur...
        </div>
      </div>
    );
  }

  const memberSince = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) 
    : 'Juli 2026';

  return (
    <div className="min-h-screen bg-stone-50 pb-28 pt-4 px-4">
      <div className="max-w-md mx-auto space-y-5">
        
        {/* ================= 1. RINGKASAN PROFIL & STATISTIK ================= */}
        <div className="bg-gradient-to-br from-[#4a2e1b] to-[#2b180d] text-white p-5 shadow-lg space-y-4 relative overflow-hidden border-b-2 border-[#c59b27]">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 blur-xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile?.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#c59b27]/40" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-stone-100 text-[#4a2e1b] flex items-center justify-center font-bold text-lg border-2 border-[#c59b27]/40">
                  {(profile?.name || 'D').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="font-extrabold text-base sm:text-lg text-white leading-tight">{profile?.name || 'Dermawan Islami'}</h2>
                <p className="text-xs text-amber-200/80">Member sejak {memberSince}</p>
              </div>
            </div>
            
            <span className={`text-[11px] font-extrabold px-3 py-1.5 border shadow-sm flex items-center gap-1 ${donorBadge.color}`}>
              <span>{donorBadge.icon}</span> {donorBadge.title}
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 border border-white/15 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-amber-200/80 uppercase tracking-wider block">Total Donasi</span>
              <span className="text-sm sm:text-base font-extrabold text-white">Rp {totalAmount >= 1000000 ? `${(totalAmount/1000000).toFixed(1)}jt` : totalAmount.toLocaleString('id-ID')}</span>
            </div>
            <div className="border-x border-white/15">
              <span className="text-[10px] text-amber-200/80 uppercase tracking-wider block">Berhasil</span>
              <span className="text-sm sm:text-base font-extrabold text-white">{successfulDonationsCount}x</span>
            </div>
            <div>
              <span className="text-[10px] text-amber-200/80 uppercase tracking-wider block">Program</span>
              <span className="text-sm sm:text-base font-extrabold text-white">{uniqueProgramsCount}</span>
            </div>
          </div>
        </div>

        {/* ================= 2. DAMPAK DONASI ANDA ================= */}
        <div className="bg-amber-50/70 border border-amber-200 p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#c59b27]" /> Dampak Donasi Anda
          </div>
          <p className="text-xs text-amber-900/90 leading-relaxed">
            Alhamdulillah, melalui kebaikan Anda sejauh ini tercatat telah membantu:
          </p>
          <ul className="text-xs text-amber-900 font-medium space-y-1 pl-1">
            <li>✓ Penyaluran logistik & pangan yatim dhuafa</li>
            <li>✓ Pembangunan fasilitas ibadah umat</li>
            <li>✓ Program pendidikan dan beasiswa santri</li>
          </ul>
        </div>

        {/* ================= 3. PENCARIAN & FILTER ================= */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Cari nama program donasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-stone-200 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-stone-800 focus:outline-[#4a2e1b]"
            />
          </div>

          <div className="flex bg-stone-200/70 p-1 text-xs font-bold text-stone-600">
            <button
              onClick={() => setActiveTab('semua')}
              className={`flex-1 py-2 transition cursor-pointer ${activeTab === 'semua' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'}`}
            >
              Semua ({donations.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-2 transition cursor-pointer ${activeTab === 'pending' ? 'bg-white text-amber-700 shadow-xs' : 'hover:text-stone-900'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('sukses')}
              className={`flex-1 py-2 transition cursor-pointer ${activeTab === 'sukses' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-stone-900'}`}
            >
              Berhasil
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-stone-200 px-3 py-2 font-semibold text-stone-700 focus:outline-none"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="zakat">Zakat</option>
              <option value="infak">Infak</option>
              <option value="wakaf">Wakaf</option>
              <option value="kemanusiaan">Kemanusiaan</option>
            </select>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-white border border-stone-200 px-3 py-2 font-semibold text-stone-700 focus:outline-none"
            >
              <option value="terbaru">Terbaru</option>
              <option value="terlama">Terlama</option>
              <option value="terbesar">Nominal Terbesar</option>
              <option value="terkecil">Nominal Terkecil</option>
            </select>
          </div>
        </div>

        {/* ================= 4. DAFTAR RIWAYAT TRANSAKSI ================= */}
        {filteredDonations.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white border border-stone-200 shadow-xs space-y-4">
            <div className="w-12 h-12 bg-amber-50 text-[#4a2e1b] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-stone-800 font-bold text-sm">Tidak ada riwayat ditemukan</p>
              <p className="text-xs text-stone-400 mt-1">Coba ubah filter pencarian atau mulai berdonasi sekarang.</p>
            </div>
            <Link 
              href="/" 
              className="inline-block bg-[#4a2e1b] hover:bg-[#3b2314] text-white px-6 py-3 font-bold text-xs uppercase tracking-wider transition shadow-sm"
            >
              Mulai Berdonasi
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDonations.map((d: any) => {
              const status = (d.status || 'pending').toLowerCase();
              const isPending = status === 'pending' || status === 'unpaid';

              return (
                <div key={d.id} className="bg-white p-4 border border-stone-200/80 shadow-xs space-y-3 hover:border-[#c59b27] transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider bg-amber-50 px-2 py-0.5 border border-amber-200">
                        {d.category || 'Kemanusiaan'}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-stone-900 mt-1 leading-snug">{d.program_name || d.programTitle || 'Sedekah Umum'}</h3>
                    </div>

                    {isPending ? (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1">
                        <CheckCircle2 className="w-3 h-3" /> Berhasil
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                    <span className="text-stone-400 font-medium">Nominal</span>
                    <span className="font-extrabold text-sm text-[#4a2e1b]">Rp {Number(d.amount || 0).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                    <span>{new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDonation(d)}
                        className="text-stone-600 hover:text-[#4a2e1b] font-bold underline cursor-pointer text-xs"
                      >
                        Detail
                      </button>

                      {isPending && d.payment_url && (
                        <a
                          href={d.payment_url}
                          className="bg-[#c59b27] hover:bg-amber-700 text-white font-bold px-3 py-1.5 flex items-center gap-1 transition shadow-xs text-xs"
                        >
                          Bayar <ArrowRight className="w-3 h-3" />
                        </a>
                      )}

                      {!isPending && (
                        <Link
                          href={`/campaign/${d.slug || ''}`}
                          className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-3 py-1.5 transition text-xs"
                        >
                          Donasi Lagi
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ================= 5. MODAL DETAIL TRANSAKSI ================= */}
      {selectedDonation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-5 space-y-4 shadow-2xl border border-stone-200 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wide">Rincian Transaksi</h3>
              <button 
                onClick={() => setSelectedDonation(null)}
                className="text-stone-400 hover:text-stone-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between py-1.5 border-b border-stone-50">
                <span className="text-stone-400">Program</span>
                <span className="font-bold text-stone-900 text-right">{selectedDonation.program_name || selectedDonation.programTitle}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-50">
                <span className="text-stone-400">Nominal Donasi</span>
                <span className="font-extrabold text-[#4a2e1b]">Rp {Number(selectedDonation.amount || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-50">
                <span className="text-stone-400">Status</span>
                <span className="font-bold text-emerald-700">{selectedDonation.status || 'Berhasil'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-50">
                <span className="text-stone-400">Metode Pembayaran</span>
                <span className="font-semibold text-stone-800 uppercase">{selectedDonation.payment_method || 'QRIS / VA'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-50">
                <span className="text-stone-400">Waktu Transaksi</span>
                <span className="font-semibold text-stone-800">{new Date(selectedDonation.created_at).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-stone-400">Invoice ID</span>
                <span className="font-mono text-stone-600 text-xs">{selectedDonation.invoice_id || selectedDonation.id}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => alert('Fitur unduh kuitansi PDF segera hadir.')}
                className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2.5 transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Unduh Kuitansi
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  alert('Tautan platform berhasil disalin untuk dibagikan!');
                }}
                className="flex-1 bg-[#4a2e1b] hover:bg-[#3b2314] text-white font-bold py-2.5 transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Bagikan Kebaikan ❤️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// app/donasi-saya/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import {
  Heart,
  Wallet,
  Award,
  CheckCircle2,
  Clock,
  Search,
  Download,
  RefreshCw,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  X,
  ShieldCheck,
} from 'lucide-react';

export default function DonasiSayaPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<
    'semua' | 'pending' | 'sukses'
  >('semua');

  const [selectedCategory, setSelectedCategory] =
    useState<string>('Semua');

  const [searchQuery, setSearchQuery] = useState('');

  const [sortBy, setSortBy] = useState<
    'terbaru' | 'terlama' | 'terbesar' | 'terkecil'
  >('terbaru');

  const [selectedDonation, setSelectedDonation] =
    useState<any>(null);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const meta = user.user_metadata || {};
        const googleAvatar = meta.avatar_url || meta.picture || '';
        const googleName = meta.full_name || meta.name || user.email?.split('@')[0] || 'Dermawan';

        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (prof) {
          setProfile({
            ...prof,
            avatar: prof.avatar || googleAvatar,
            name: prof.name || googleName,
          });
        } else {
          setProfile({
            id: user.id,
            email: user.email,
            name: googleName,
            avatar: googleAvatar,
            phone: '',
          });
        }

        const { data: donData } = await supabase
          .from('donations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          });

        if (donData) {
          setDonations(donData);
        }
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [supabase]);

  const successfulStatuses = [
    'success',
    'paid',
    'completed',
  ];

  const totalAmount = donations
    .filter((d) =>
      successfulStatuses.includes(
        (d.status || '').toLowerCase()
      )
    )
    .reduce(
      (acc, curr) => acc + Number(curr.amount || 0),
      0
    );

  const successfulDonationsCount = donations.filter((d) =>
    successfulStatuses.includes(
      (d.status || '').toLowerCase()
    )
  ).length;

  const uniqueProgramsCount = new Set(
    donations.map(
      (d) => d.program_name || d.programTitle
    )
  ).size;

  let donorBadge = {
    title: 'Sahabat Kebaikan',
    level: 'LEVEL 1',
    icon: '♡',
  };

  if (totalAmount > 2000000) {
    donorBadge = {
      title: 'Donatur Istimewa',
      level: 'LEVEL 3',
      icon: '✦',
    };
  } else if (totalAmount >= 500000) {
    donorBadge = {
      title: 'Donatur Peduli',
      level: 'LEVEL 2',
      icon: '◆',
    };
  }

  const filteredDonations = donations
    .filter((d) => {
      const status = (
        d.status || 'pending'
      ).toLowerCase();

      const title = (
        d.program_name ||
        d.programTitle ||
        ''
      ).toLowerCase();

      const category = (
        d.category || ''
      ).toLowerCase();

      if (
        activeTab === 'pending' &&
        !['pending', 'unpaid'].includes(status)
      ) {
        return false;
      }

      if (
        activeTab === 'sukses' &&
        !successfulStatuses.includes(status)
      ) {
        return false;
      }

      if (
        selectedCategory !== 'Semua' &&
        category !== selectedCategory.toLowerCase()
      ) {
        return false;
      }

      if (
        searchQuery &&
        !title.includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'terbaru') {
        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      }

      if (sortBy === 'terlama') {
        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );
      }

      if (sortBy === 'terbesar') {
        return Number(b.amount) - Number(a.amount);
      }

      if (sortBy === 'terkecil') {
        return Number(a.amount) - Number(b.amount);
      }

      return 0;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-11 h-11 rounded-none bg-[#102a43] flex items-center justify-center shadow-lg">
            <RefreshCw className="w-4 h-4 text-white animate-spin" />
          </div>

          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Memuat riwayat donasi
          </p>
        </div>
      </div>
    );
  }

  const memberSince = profile?.created_at
    ? new Date(
        profile.created_at
      ).toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
      })
    : 'Juli 2026';

  return (
    <div className="min-h-screen bg-[#f8f8f6] text-slate-900 pb-28 pt-5 px-3 flex justify-center">
      <div className="w-[calc(100%-1.5rem)] max-w-[calc(28rem-1.5rem)] space-y-4">

        {/* =====================================================
            PREMIUM HEADER
        ====================================================== */}
        <section className="relative overflow-hidden rounded-none bg-[#102a43] shadow-[0_18px_50px_rgba(16,42,67,0.16)]">

          <div className="absolute -right-16 -top-16 w-48 h-48 border border-white/8" />

          <div className="absolute right-5 bottom-[-70px] w-40 h-40 border border-[#d8b76c]/10" />

          <div className="relative z-10 p-5">

            <div className="flex items-start justify-between gap-3">

              <div className="flex items-center gap-3 min-w-0">

                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-[58px] h-[58px] rounded-full object-cover border border-[#d7b66a]/50 shadow-xl"
                  />
                ) : (
                  <div className="w-[58px] h-[58px] shrink-0 rounded-full bg-white/10 border border-[#d7b66a]/40 flex items-center justify-center text-white font-bold text-xl">
                    {(profile?.name || 'D')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">

                  <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-[#d7b66a]">
                    Donation Center
                  </p>

                  <h1 className="mt-1 text-[16px] font-bold text-white truncate">
                    {profile?.name ||
                      'Dermawan Islami'}
                  </h1>

                  <p className="mt-1 text-[9px] text-slate-300">
                    Member sejak {memberSince}
                  </p>

                </div>
              </div>

              <div className="shrink-0 text-right">

                <div className="inline-flex items-center gap-1.5 rounded-none bg-white/8 border border-white/10 px-2.5 py-1.5">

                  <span className="text-[#d7b66a] text-[10px]">
                    {donorBadge.icon}
                  </span>

                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#e6d19d]">
                    {donorBadge.level}
                  </span>

                </div>

                <p className="mt-1.5 text-[8px] text-slate-300">
                  {donorBadge.title}
                </p>

              </div>
            </div>

            {/* TOTAL DONASI */}
            <div className="mt-6">

              <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-slate-400">
                Total Donasi Berhasil
              </p>

              <div className="mt-2 flex items-end justify-between gap-3">

                <p className="text-[26px] leading-none font-bold tracking-tight text-white">
                  Rp{' '}
                  {totalAmount.toLocaleString(
                    'id-ID'
                  )}
                </p>

                <div className="flex items-center gap-1.5 text-[8px] text-[#d7b66a] font-semibold uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3" />
                  Terverifikasi
                </div>

              </div>

            </div>

            {/* STATISTICS */}
            <div className="mt-5 grid grid-cols-3 border-t border-white/10 pt-4">

              <div>
                <p className="text-[8px] uppercase tracking-wider text-slate-400">
                  Berhasil
                </p>

                <p className="mt-1 text-[15px] font-bold text-white">
                  {successfulDonationsCount}x
                </p>
              </div>

              <div className="border-x border-white/10 px-4">

                <p className="text-[8px] uppercase tracking-wider text-slate-400">
                  Program
                </p>

                <p className="mt-1 text-[15px] font-bold text-white">
                  {uniqueProgramsCount}
                </p>

              </div>

              <div className="pl-4">

                <p className="text-[8px] uppercase tracking-wider text-slate-400">
                  Transaksi
                </p>

                <p className="mt-1 text-[15px] font-bold text-white">
                  {donations.length}
                </p>

              </div>

            </div>
          </div>

          <div className="h-[3px] bg-gradient-to-r from-[#a37c32] via-[#e0c37e] to-[#a37c32]" />

        </section>

        {/* =====================================================
            IMPACT CARD
        ====================================================== */}
        <section className="relative overflow-hidden rounded-none bg-white border border-slate-200/70 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">

          <div className="absolute right-0 top-0 w-24 h-24 bg-[#f7f2e7] -translate-y-1/2 translate-x-1/2" />

          <div className="relative">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-none bg-[#f7f2e7] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#a37c32]" />
              </div>

              <div>

                <p className="text-[8px] uppercase tracking-[0.18em] font-bold text-slate-400">
                  Your Impact
                </p>

                <h2 className="mt-0.5 text-[12px] font-bold text-[#102a43]">
                  Kebaikan yang Anda Titipkan
                </h2>

              </div>

            </div>

            <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
              Alhamdulillah, setiap donasi Anda menjadi
              bagian dari ikhtiar menghadirkan manfaat
              bagi mereka yang membutuhkan.
            </p>

            <div className="mt-4 space-y-2">

              {[
                'Penyaluran logistik & pangan yatim dhuafa',
                'Pembangunan fasilitas ibadah umat',
                'Program pendidikan & beasiswa santri',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-5 h-5 rounded-full bg-[#f5f8f6] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  </div>

                  <span className="text-[9px] font-medium text-slate-600">
                    {item}
                  </span>
                </div>
              ))}

            </div>
          </div>

        </section>

        {/* =====================================================
            SEARCH & FILTER
        ====================================================== */}
        <section className="space-y-3">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-slate-400">
                Activity
              </p>

              <h2 className="mt-1 text-[14px] font-bold text-[#102a43]">
                Riwayat Donasi
              </h2>
            </div>

            <span className="text-[9px] font-semibold text-slate-400">
              {filteredDonations.length} transaksi
            </span>

          </div>

          {/* SEARCH */}
          <div className="relative">

            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />

            <input
              type="text"
              placeholder="Cari program donasi..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="w-full h-12 rounded-none bg-white border border-slate-200/80 pl-11 pr-4 text-[10px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#b18a3c] focus:ring-4 focus:ring-[#b18a3c]/8"
            />

          </div>

          {/* STATUS TABS */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-none bg-slate-100">

            <button
              onClick={() => setActiveTab('semua')}
              className={`rounded-none py-2.5 text-[9px] font-bold transition ${
                activeTab === 'semua'
                  ? 'bg-white text-[#102a43] shadow-sm'
                  : 'text-slate-400'
              }`}
            >
              Semua
              <span className="ml-1 opacity-60">
                {donations.length}
              </span>
            </button>

            <button
              onClick={() =>
                setActiveTab('pending')
              }
              className={`rounded-none py-2.5 text-[9px] font-bold transition ${
                activeTab === 'pending'
                  ? 'bg-white text-[#a37c32] shadow-sm'
                  : 'text-slate-400'
              }`}
            >
              Pending
            </button>

            <button
              onClick={() =>
                setActiveTab('sukses')
              }
              className={`rounded-none py-2.5 text-[9px] font-bold transition ${
                activeTab === 'sukses'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-400'
              }`}
            >
              Berhasil
            </button>

          </div>

          {/* SELECTS */}
          <div className="grid grid-cols-2 gap-2">

            <div className="relative">

              <select
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(
                    e.target.value
                  )
                }
                className="appearance-none w-full h-10 rounded-none bg-white border border-slate-200 px-3 pr-8 text-[9px] font-semibold text-slate-600 outline-none focus:border-[#b18a3c]"
              >
                <option value="Semua">
                  Semua Kategori
                </option>
                <option value="zakat">
                  Zakat
                </option>
                <option value="infak">
                  Infak
                </option>
                <option value="wakaf">
                  Wakaf
                </option>
                <option value="kemanusiaan">
                  Kemanusiaan
                </option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />

            </div>

            <div className="relative">

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | 'terbaru'
                      | 'terlama'
                      | 'terbesar'
                      | 'terkecil'
                  )
                }
                className="appearance-none w-full h-10 rounded-none bg-white border border-slate-200 px-3 pr-8 text-[9px] font-semibold text-slate-600 outline-none focus:border-[#b18a3c]"
              >
                <option value="terbaru">
                  Terbaru
                </option>
                <option value="terlama">
                  Terlama
                </option>
                <option value="terbesar">
                  Nominal Terbesar
                </option>
                <option value="terkecil">
                  Nominal Terkecil
                </option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />

            </div>

          </div>
        </section>

        {/* =====================================================
            TRANSACTION LIST
        ====================================================== */}
        {filteredDonations.length === 0 ? (
          <section className="rounded-none bg-white border border-slate-200/70 p-8 text-center shadow-[0_8px_30px_rgba(15,23,42,0.04)]">

            <div className="w-14 h-14 rounded-none bg-[#f7f2e7] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-[#a37c32]" />
            </div>

            <h3 className="mt-5 text-[13px] font-bold text-[#102a43]">
              Belum ada riwayat ditemukan
            </h3>

            <p className="mt-2 text-[9px] leading-relaxed text-slate-400">
              Coba ubah filter pencarian atau
              mulailah menebar kebaikan hari ini.
            </p>

            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 rounded-none bg-[#102a43] px-5 py-3 text-[9px] font-bold uppercase tracking-wider text-white shadow-lg shadow-[#102a43]/10 hover:bg-[#173d5d] transition"
            >
              Mulai Berdonasi
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

          </section>
        ) : (
          <section className="space-y-3">

            {filteredDonations.map((d: any) => {
              const status = (
                d.status || 'pending'
              ).toLowerCase();

              const isPending =
                status === 'pending' ||
                status === 'unpaid';

              const isSuccessful =
                successfulStatuses.includes(
                  status
                );

              return (
                <article
                  key={d.id}
                  className="group rounded-none bg-white border border-slate-200/70 p-4 shadow-[0_7px_25px_rgba(15,23,42,0.035)] hover:border-[#d7b66a]/60 hover:shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition-all"
                >

                  {/* TOP */}
                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                      <span className="inline-flex items-center rounded-none bg-[#f7f2e7] border border-[#eadfca] px-2.5 py-1 text-[7px] font-bold uppercase tracking-wider text-[#98752d]">
                        {d.category ||
                          'Kemanusiaan'}
                      </span>

                      <h3 className="mt-2 text-[12px] sm:text-[13px] font-bold leading-snug text-[#102a43]">
                        {d.program_name ||
                          d.programTitle ||
                          'Sedekah Umum'}
                      </h3>

                    </div>

                    {isPending ? (
                      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-none bg-[#fff8e9] border border-[#f0dfb7] px-2.5 py-1.5 text-[7px] font-bold uppercase tracking-wider text-[#a37c32]">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    ) : isSuccessful ? (
                      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-none bg-[#f0f8f4] border border-[#d6ebe0] px-2.5 py-1.5 text-[7px] font-bold uppercase tracking-wider text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />
                        Berhasil
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex rounded-none bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-[7px] font-bold uppercase tracking-wider text-slate-500">
                        {d.status ||
                          'Diproses'}
                      </span>
                    )}

                  </div>

                  {/* AMOUNT */}
                  <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">

                    <div>
                      <p className="text-[7px] uppercase tracking-[0.18em] font-bold text-slate-400">
                        Nominal Donasi
                      </p>

                      <p className="mt-1 text-[16px] font-bold tracking-tight text-[#102a43]">
                        Rp{' '}
                        {Number(
                          d.amount || 0
                        ).toLocaleString(
                          'id-ID'
                        )}
                      </p>
                    </div>

                    <div className="text-right">

                      <p className="text-[7px] uppercase tracking-wider font-bold text-slate-400">
                        Tanggal
                      </p>

                      <p className="mt-1 text-[9px] font-semibold text-slate-500">
                        {new Date(
                          d.created_at
                        ).toLocaleDateString(
                          'id-ID',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        )}
                      </p>

                    </div>

                  </div>

                  {/* ACTIONS */}
                  <div className="mt-3 flex items-center justify-between gap-2">

                    <button
                      onClick={() =>
                        setSelectedDonation(d)
                      }
                      className="text-[8px] font-bold uppercase tracking-wider text-slate-400 hover:text-[#a37c32] transition"
                    >
                      Lihat Detail
                    </button>

                    <div className="flex items-center gap-2">

                      {isPending &&
                        d.payment_url && (
                          <a
                            href={
                              d.payment_url
                            }
                            className="inline-flex items-center gap-1.5 rounded-none bg-[#102a43] hover:bg-[#173d5d] text-white px-3 py-2 text-[8px] font-bold uppercase tracking-wider transition shadow-sm"
                          >
                            Bayar
                            <ArrowRight className="w-3 h-3" />
                          </a>
                        )}

                      {!isPending && (
                        <Link
                          href={`/campaign/${
                            d.slug || ''
                          }`}
                          className="inline-flex items-center gap-1.5 rounded-none bg-slate-100 hover:bg-[#f7f2e7] text-slate-600 hover:text-[#98752d] px-3 py-2 text-[8px] font-bold uppercase tracking-wider transition"
                        >
                          Donasi Lagi
                        </Link>
                      )}

                    </div>

                  </div>

                </article>
              );
            })}

          </section>
        )}

      </div>

      {/* =====================================================
          DETAIL MODAL
      ====================================================== */}
      {selectedDonation && (
        <div className="fixed inset-0 bg-[#071521]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">

          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-none bg-white shadow-[0_30px_80px_rgba(0,0,0,0.25)]">

            <div className="h-[3px] bg-gradient-to-r from-[#a37c32] via-[#dfc27e] to-[#a37c32]" />

            <div className="p-5">

              {/* MODAL HEADER */}
              <div className="flex items-start justify-between gap-3">

                <div>

                  <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-slate-400">
                    Transaction Details
                  </p>

                  <h3 className="mt-1 text-[15px] font-bold text-[#102a43]">
                    Rincian Transaksi
                  </h3>

                </div>

                <button
                  onClick={() =>
                    setSelectedDonation(null)
                  }
                  className="w-9 h-9 rounded-none bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>

              </div>

              {/* PROGRAM HERO */}
              <div className="mt-5 rounded-none bg-[#102a43] p-4">

                <p className="text-[7px] uppercase tracking-[0.18em] font-bold text-[#d7b66a]">
                  Program Donasi
                </p>

                <p className="mt-1.5 text-[12px] leading-relaxed font-bold text-white">
                  {selectedDonation.program_name ||
                    selectedDonation.programTitle}
                </p>

                <div className="mt-4">

                  <p className="text-[7px] uppercase tracking-wider text-slate-400">
                    Nominal
                  </p>

                  <p className="mt-1 text-[20px] font-bold text-white">
                    Rp{' '}
                    {Number(
                      selectedDonation.amount || 0
                    ).toLocaleString(
                      'id-ID'
                    )}
                  </p>

                </div>

              </div>

              {/* DETAILS */}
              <div className="mt-4 rounded-none border border-slate-100 overflow-hidden">

                <div className="divide-y divide-slate-100">

                  <div className="flex justify-between gap-4 px-4 py-3">

                    <span className="text-[9px] text-slate-400">
                      Status
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-600">
                      <CheckCircle2 className="w-3 h-3" />
                      {selectedDonation.status ||
                        'Berhasil'}
                    </span>

                  </div>

                  <div className="flex justify-between gap-4 px-4 py-3">

                    <span className="text-[9px] text-slate-400">
                      Metode Pembayaran
                    </span>

                    <span className="text-[9px] font-bold uppercase text-slate-700 text-right">
                      {selectedDonation.payment_method ||
                        'QRIS / VA'}
                    </span>

                  </div>

                  <div className="flex justify-between gap-4 px-4 py-3">

                    <span className="text-[9px] text-slate-400">
                      Waktu Transaksi
                    </span>

                    <span className="text-[9px] font-semibold text-slate-700 text-right">
                      {new Date(
                        selectedDonation.created_at
                      ).toLocaleString(
                        'id-ID'
                      )}
                    </span>

                  </div>

                  <div className="flex justify-between gap-4 px-4 py-3">

                    <span className="text-[9px] text-slate-400">
                      Invoice ID
                    </span>

                    <span className="font-mono text-[8px] text-slate-600 text-right break-all">
                      {selectedDonation.invoice_id ||
                        selectedDonation.id}
                    </span>

                  </div>

                </div>

              </div>

              {/* BUTTONS */}
              <div className="mt-4 grid grid-cols-2 gap-2">

                <button
                  onClick={() =>
                    alert(
                      'Fitur unduh kuitansi PDF segera hadir.'
                    )
                  }
                  className="rounded-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 text-[8px] uppercase tracking-wider transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Kuitansi
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      window.location.origin
                    );

                    alert(
                      'Tautan platform berhasil disalin untuk dibagikan!'
                    );
                  }}
                  className="rounded-none bg-[#102a43] hover:bg-[#173d5d] text-white font-bold py-3 text-[8px] uppercase tracking-wider transition flex items-center justify-center gap-1.5"
                >
                  <Heart className="w-3.5 h-3.5" />
                  Bagikan
                </button>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
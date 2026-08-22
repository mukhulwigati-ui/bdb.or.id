```tsx
// app/referral/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  Loader2,
  Search,
  Lock,
  Wallet,
  Users,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

export default function ReferralPage() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  const [selectedSlug, setSelectedSlug] = useState('');
  const [searchProgram, setSearchProgram] = useState('');
  const [copied, setCopied] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    const fetchProfileStatsAndPrograms = async () => {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (prof) {
            setProfile(prof);

            if (prof.phone) {
              setStatsLoading(true);

              try {
                const resStats = await fetch(
                  `/api/fundraiser/stats?phone=${prof.phone}`
                );

                const jsonStats = await resStats.json();

                if (jsonStats.success) {
                  setStats(jsonStats);
                } else {
                  setStats({
                    totalEarnings: 0,
                    donationCount: 0,
                    history: [],
                  });
                }
              } catch (err) {
                console.error('Gagal memuat statistik afiliasi:', err);

                setStats({
                  totalEarnings: 0,
                  donationCount: 0,
                  history: [],
                });
              } finally {
                setStatsLoading(false);
              }
            } else {
              setStats({
                totalEarnings: 0,
                donationCount: 0,
                history: [],
              });
            }
          }
        }

        const resProg = await fetch('/api/programs');
        const jsonProg = await resProg.json();

        if (jsonProg.success && jsonProg.data) {
          setAllPrograms(jsonProg.data);
        }
      } catch (err) {
        console.error('Error loading referral data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileStatsAndPrograms();
  }, [supabase]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-[#0b2742] flex items-center justify-center shadow-lg">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>

          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.22em]">
            Memuat pusat afiliasi
          </span>
        </div>
      </div>
    );
  }

  const hasPhone = Boolean(
    profile?.phone && profile.phone.trim().length >= 9
  );

  const cleanPhone = hasPhone
    ? profile.phone.replace(/[^0-9]/g, '')
    : '';

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : '';

  const defaultReferralLink = hasPhone
    ? `${baseUrl}/?ref=${cleanPhone}`
    : '';

  const filteredPrograms = allPrograms.filter((p) =>
    (p.title || '')
      .toLowerCase()
      .includes(searchProgram.toLowerCase())
  );

  const totalEarnings = stats?.totalEarnings || 0;
  const donationCount = stats?.donationCount || 0;
  const totalUjrah = Math.round(totalEarnings * 0.1);
  const feePaid = stats?.profile?.feePaid || 0;
  const availableFee = Math.max(0, totalUjrah - feePaid);

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900 pb-24">
      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">

        {/* HEADER */}
        <header className="flex items-center justify-between">
          <Link
            href="/akun"
            className="group w-10 h-10 rounded-2xl bg-white border border-slate-200/70 flex items-center justify-center shadow-[0_4px_18px_rgba(15,23,42,0.04)] transition hover:border-slate-300"
          >
            <ArrowLeft className="w-[17px] h-[17px] text-slate-600 group-hover:-translate-x-0.5 transition" />
          </Link>

          <div className="text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Fundraiser Center
            </p>

            <h1 className="text-[15px] font-bold tracking-tight text-[#102a43]">
              Afiliasi & Performa
            </h1>
          </div>

          <div className="w-10 h-10 rounded-2xl bg-[#102a43] flex items-center justify-center shadow-[0_6px_20px_rgba(16,42,67,0.18)]">
            <Sparkles className="w-[16px] h-[16px] text-[#d8b76a]" />
          </div>
        </header>

        {/* PREMIUM HERO */}
        <section className="relative overflow-hidden rounded-[28px] bg-[#102a43] p-6 shadow-[0_18px_45px_rgba(16,42,67,0.18)]">
          <div className="absolute -right-16 -top-20 w-48 h-48 rounded-full border border-white/10" />
          <div className="absolute -right-8 -top-12 w-32 h-32 rounded-full border border-[#d8b76a]/20" />
          <div className="absolute right-5 bottom-5 w-20 h-20 rounded-full bg-[#d8b76a]/5 blur-2xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/8 border border-white/10 px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d8b76a]" />
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#e8d7aa]">
                Program Kebaikan Berkelanjutan
              </span>
            </div>

            <h2 className="mt-5 text-[23px] leading-[1.2] font-bold tracking-tight text-white">
              Sebarkan Kebaikan.
              <br />
              Tumbuhkan Kebermanfaatan.
            </h2>

            <p className="mt-3 max-w-[290px] text-[11px] leading-[1.8] text-slate-300">
              Bagikan campaign melalui tautan afiliasi Anda dan pantau
              setiap dukungan yang berhasil dihimpun secara transparan.
            </p>

            <div className="mt-5 flex items-center gap-2 text-[#d8b76a]">
              <span className="h-px w-8 bg-[#d8b76a]/50" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.15em]">
                Berbagi • Menghimpun • Memberi Manfaat
              </span>
            </div>
          </div>
        </section>

        {/* LOCKED STATE */}
        {!hasPhone ? (
          <section className="bg-white rounded-[26px] border border-slate-200/70 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-[20px] bg-[#fff8e8] border border-[#f0dfb5] flex items-center justify-center">
                <Lock className="w-6 h-6 text-[#b4862c]" />
              </div>

              <h3 className="mt-4 text-[14px] font-bold text-[#102a43]">
                Aktivasi Afiliasi Diperlukan
              </h3>

              <p className="mt-2 text-[11px] leading-[1.7] text-slate-500 max-w-[280px]">
                Lengkapi nomor WhatsApp Anda untuk mengaktifkan
                kode referral dan mendapatkan tautan promosi pribadi.
              </p>

              <Link
                href="/pengaturan"
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#102a43] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-[#102a43]/10 transition hover:bg-[#173d5d]"
              >
                Lengkapi Sekarang
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* PERFORMANCE */}
            {statsLoading ? (
              <section className="bg-white rounded-[26px] border border-slate-200/70 p-6 text-center">
                <Loader2 className="w-5 h-5 text-[#102a43] animate-spin mx-auto" />

                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Mengambil performa
                </p>
              </section>
            ) : (
              <section className="bg-white rounded-[26px] border border-slate-200/70 overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <div className="px-5 pt-5 pb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Performance Overview
                    </p>

                    <h3 className="mt-1 text-[14px] font-bold text-[#102a43]">
                      Statistik Penghimpunan
                    </h3>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-700">
                      Aktif
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 border-t border-slate-100">
                  <div className="p-5 border-r border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Wallet className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">
                        Dana Dihimpun
                      </span>
                    </div>

                    <p className="mt-3 text-[20px] font-bold tracking-tight text-[#102a43]">
                      Rp {totalEarnings.toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">
                        Transaksi
                      </span>
                    </div>

                    <p className="mt-3 text-[20px] font-bold tracking-tight text-[#102a43]">
                      {donationCount}
                    </p>

                    <p className="mt-0.5 text-[9px] text-slate-400">
                      transaksi berhasil
                    </p>
                  </div>
                </div>

                {/* FEE SUMMARY */}
                <div className="m-4 rounded-2xl bg-[#f8f7f3] border border-[#eee9dc] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      Ringkasan Ujrah
                    </span>

                    <span className="text-[9px] font-semibold text-[#9b7528]">
                      10%
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">
                        Total hak Anda
                      </span>

                      <span className="text-[11px] font-bold text-slate-700">
                        Rp {totalUjrah.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">
                        Telah dibayarkan
                      </span>

                      <span className="text-[11px] font-semibold text-slate-600">
                        Rp {feePaid.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-[#e9e3d4] flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[#102a43]">
                        Saldo tersedia
                      </span>

                      <span className="text-[14px] font-bold text-[#9b7528]">
                        Rp {availableFee.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* LINK GENERATOR */}
            <section className="bg-white rounded-[26px] border border-slate-200/70 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Referral Tools
                  </p>

                  <h3 className="mt-1 text-[14px] font-bold text-[#102a43]">
                    Tautan Afiliasi
                  </h3>
                </div>

                <div className="w-9 h-9 rounded-xl bg-[#f3f6f8] flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-[#102a43]" />
                </div>
              </div>

              {/* GENERAL LINK */}
              <div className="mt-5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Tautan Umum Platform
                </label>

                <div className="mt-2 flex items-center gap-2 p-1.5 rounded-2xl bg-[#f7f8fa] border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={defaultReferralLink}
                    className="min-w-0 flex-1 bg-transparent px-2 text-[10px] font-mono text-slate-600 outline-none truncate"
                  />

                  <button
                    onClick={() => handleCopy(defaultReferralLink)}
                    className={`shrink-0 rounded-xl px-3.5 py-2.5 text-[9px] font-bold flex items-center gap-1.5 transition ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#102a43] text-white hover:bg-[#173d5d]'
                    }`}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}

                    {copied ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
              </div>

              {/* CAMPAIGN SELECTOR */}
              <div className="mt-5 pt-5 border-t border-slate-100">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Campaign Spesifik
                </label>

                <div className="relative mt-2">
                  <Search className="absolute left-3.5 top-3 w-3.5 h-3.5 text-slate-400" />

                  <input
                    type="text"
                    placeholder="Cari campaign..."
                    value={searchProgram}
                    onChange={(e) =>
                      setSearchProgram(e.target.value)
                    }
                    className="w-full rounded-xl bg-[#f7f8fa] border border-slate-200 pl-10 pr-3 py-3 text-[10px] font-medium text-slate-700 outline-none transition focus:border-[#9b7528]"
                  />
                </div>

                <div className="relative mt-2">
                  <select
                    value={selectedSlug}
                    onChange={(e) => {
                      setSelectedSlug(e.target.value);
                      setCopied(false);
                    }}
                    className="appearance-none w-full rounded-xl bg-[#f7f8fa] border border-slate-200 px-3.5 py-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-[#9b7528]"
                  >
                    <option value="">
                      Pilih dari {filteredPrograms.length} campaign
                    </option>

                    {filteredPrograms.map(
                      (prog: any, index: number) => (
                        <option
                          key={prog._id || index}
                          value={prog.slug}
                        >
                          {prog.title}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* GENERATED LINK */}
                {selectedSlug &&
                  (() => {
                    const affiliateUrl = `${baseUrl}/campaign/${selectedSlug}?ref=${cleanPhone}`;

                    return (
                      <div className="mt-3 rounded-2xl bg-[#f8f7f3] border border-[#eee9dc] p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[8px] font-bold uppercase tracking-wider text-[#9b7528]">
                              Link Campaign
                            </p>

                            <p className="mt-1 text-[9px] text-slate-500">
                              Siap dibagikan
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(affiliateUrl)
                            }
                            className={`rounded-xl px-3 py-2 text-[9px] font-bold flex items-center gap-1.5 text-white ${
                              copied
                                ? 'bg-emerald-600'
                                : 'bg-[#102a43]'
                            }`}
                          >
                            {copied ? (
                              <>
                                <Check className="w-3 h-3" />
                                Tersalin
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Salin
                              </>
                            )}
                          </button>
                        </div>

                        <div className="mt-3 rounded-xl bg-white border border-slate-200 px-3 py-2.5">
                          <p className="text-[9px] font-mono text-slate-500 truncate">
                            {affiliateUrl}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </section>

            {/* HISTORY */}
            <section className="bg-white rounded-[26px] border border-slate-200/70 overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="px-5 py-5 flex items-center justify-between border-b border-slate-100">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Activity
                  </p>

                  <h3 className="mt-1 text-[14px] font-bold text-[#102a43]">
                    Riwayat Dukungan
                  </h3>
                </div>

                <TrendingUp className="w-4 h-4 text-[#9b7528]" />
              </div>

              {stats?.history &&
              stats.history.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {stats.history.map(
                    (item: any, idx: number) => (
                      <div
                        key={idx}
                        className="px-5 py-4 flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-emerald-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate">
                            {item.donorName}
                          </p>

                          <p className="mt-1 text-[9px] text-slate-400 truncate">
                            {item.programTitle ||
                              'Sedekah Umum'}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-bold text-emerald-600">
                            +Rp{' '}
                            {Number(item.amount).toLocaleString(
                              'id-ID'
                            )}
                          </p>

                          <p className="mt-1 text-[8px] text-slate-400">
                            Berhasil
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 mx-auto flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-slate-300" />
                  </div>

                  <p className="mt-3 text-[11px] font-semibold text-slate-500">
                    Belum ada transaksi
                  </p>

                  <p className="mt-1 text-[9px] leading-relaxed text-slate-400">
                    Transaksi melalui tautan afiliasi Anda
                    akan muncul di sini.
                  </p>
                </div>
              )}
            </section>

            {/* FOOTNOTE */}
            <div className="text-center px-6 pt-1">
              <p className="text-[8px] leading-relaxed text-slate-400">
                Terima kasih telah menjadi bagian dari gerakan
                kebaikan dan membantu memperluas manfaat.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

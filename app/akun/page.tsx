// app/akun/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  History,
  FileText,
  Bookmark,
  Phone,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Target,
  Sparkles,
  X,
  Loader2,
  Eye,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';

export default function AkunPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [referralClicks, setReferralClicks] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const router = useRouter();

  useEffect(() => {
    const fetchAkunData = async () => {
      setLoading(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/login');
        return;
      }

      setUser(user);

      let { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!prof) {
        const meta = user.user_metadata || {};

        prof = {
          id: user.id,
          email: user.email,
          name:
            meta.full_name ||
            meta.name ||
            user.email?.split('@')[0] ||
            'Dermawan',
          avatar: meta.avatar_url || meta.picture || '',
          phone: '',
        };

        await supabase.from('profiles').upsert(prof);
      }

      setProfile(prof);
      setNewPhone(prof.phone || '');

      const { data: donData } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', user.id);

      if (donData) {
        setDonations(donData);
      }

      try {
        const phoneKey = prof?.phone || user.id;

        const { count, error: countErr } = await supabase
          .from('referral_visits')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('ref_code', phoneKey);

        if (!countErr && count !== null) {
          setReferralClicks(count);
        }
      } catch (err) {
        console.log('Belum ada tabel pelacakan referral.');
      }

      setLoading(false);
    };

    fetchAkunData();
  }, [supabase, router]);

  const successfulDonations = donations.filter((d) =>
    ['success', 'paid', 'completed'].includes(
      (d.status || '').toLowerCase()
    )
  );

  const totalAmount = successfulDonations.reduce(
    (acc, curr) => acc + Number(curr.amount || 0),
    0
  );

  const uniqueProgramsCount = new Set(
    donations.map(
      (d) => d.program_name || d.programTitle
    )
  ).size;

  let levelInfo = {
    name: 'Dermawan',
    level: 'LEVEL 1',
    min: 0,
    next: 500000,
  };

  if (totalAmount >= 5000000) {
    levelInfo = {
      name: 'Wakif',
      level: 'LEVEL 5',
      min: 5000000,
      next: 10000000,
    };
  } else if (totalAmount >= 2000000) {
    levelInfo = {
      name: 'Muhsin',
      level: 'LEVEL 4',
      min: 2000000,
      next: 5000000,
    };
  } else if (totalAmount >= 1000000) {
    levelInfo = {
      name: 'Pejuang',
      level: 'LEVEL 3',
      min: 1000000,
      next: 2000000,
    };
  } else if (totalAmount >= 500000) {
    levelInfo = {
      name: 'Sahabat',
      level: 'LEVEL 2',
      min: 500000,
      next: 1000000,
    };
  }

  const targetBulanan = 500000;

  const progressPercent = Math.min(
    Math.round((totalAmount / targetBulanan) * 100),
    100
  );

  const handleUpdatePhone = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const clean = newPhone.replace(/[^0-9]/g, '');

    if (clean.length < 9) {
      alert('Masukkan nomor WhatsApp yang valid!');
      return;
    }

    setSavingPhone(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: clean,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setProfile((prev: any) => ({
        ...prev,
        phone: clean,
      }));

      setIsModalOpen(false);

      alert('Nomor WhatsApp berhasil diperbarui!');
    } catch (err: any) {
      alert('Gagal memperbarui: ' + err.message);
    } finally {
      setSavingPhone(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();

    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-[#102a43] flex items-center justify-center shadow-lg">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>

          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Memuat akun
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6] text-slate-900 pb-28 pt-5 px-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* =========================================================
            HEADER PROFILE
        ========================================================= */}
        <section className="relative overflow-hidden rounded-[28px] bg-[#102a43] p-5 shadow-[0_18px_45px_rgba(16,42,67,0.16)]">

          <div className="absolute -right-14 -top-16 w-44 h-44 rounded-full border border-white/8" />

          <div className="absolute -right-4 -bottom-16 w-32 h-32 rounded-full border border-[#d7b66a]/15" />

          <div className="relative z-10 flex items-center gap-4">

            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-[62px] h-[62px] rounded-[22px] object-cover border border-[#d7b66a]/50 shadow-xl"
              />
            ) : (
              <div className="w-[62px] h-[62px] rounded-[22px] bg-white/10 border border-[#d7b66a]/40 flex items-center justify-center text-white font-bold text-xl">
                {(profile?.name || 'D')
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#d7b66a]">
                Member Area
              </p>

              <h1 className="mt-1 text-[17px] font-bold text-white truncate">
                {profile?.name || 'Dermawan Islami'}
              </h1>

              <p className="mt-0.5 text-[10px] text-slate-300 truncate">
                {profile?.email}
              </p>

              <div className="mt-2 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-[#d7b66a]" />

                <span className="text-[8px] font-semibold uppercase tracking-wider text-[#e7d5a4]">
                  Member Islami.or.id
                </span>
              </div>
            </div>

            <Link
              href="/pengaturan"
              className="w-9 h-9 shrink-0 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition"
            >
              <Settings className="w-4 h-4 text-slate-300" />
            </Link>
          </div>
        </section>

        {/* =========================================================
            DONATION SUMMARY
        ========================================================= */}
        <section className="rounded-[28px] bg-white border border-slate-200/70 shadow-[0_8px_30px_rgba(15,23,42,0.04)] overflow-hidden">

          <div className="p-5">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Total Donasi
                </p>

                <p className="mt-2 text-[25px] leading-none font-bold tracking-tight text-[#102a43]">
                  Rp {totalAmount.toLocaleString('id-ID')}
                </p>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center rounded-full bg-[#f7f2e7] border border-[#eadfca] px-2.5 py-1">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#98752d]">
                    {levelInfo.level}
                  </span>
                </span>

                <p className="mt-2 text-[11px] font-bold text-[#102a43]">
                  {levelInfo.name}
                </p>
              </div>

            </div>

            <div className="mt-5 grid grid-cols-3 border-t border-slate-100 pt-4">

              <div className="text-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  Program
                </p>

                <p className="mt-1.5 text-[15px] font-bold text-[#102a43]">
                  {uniqueProgramsCount}
                </p>
              </div>

              <div className="border-x border-slate-100 text-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  Berhasil
                </p>

                <p className="mt-1.5 text-[15px] font-bold text-[#102a43]">
                  {successfulDonations.length}x
                </p>
              </div>

              <div className="text-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  Referral
                </p>

                <p className="mt-1.5 flex items-center justify-center gap-1 text-[15px] font-bold text-[#102a43]">
                  <Eye className="w-3 h-3 text-[#b18a3c]" />
                  {referralClicks}
                </p>
              </div>

            </div>
          </div>

          {/* GOLD ACCENT */}
          <div className="h-[3px] bg-gradient-to-r from-[#b08a3d] via-[#dfc27e] to-[#b08a3d]" />

        </section>

        {/* =========================================================
            TARGET SEDEKAH
        ========================================================= */}
        <section className="rounded-[26px] bg-white border border-slate-200/70 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-[#f7f2e7] flex items-center justify-center">
                <Target className="w-[17px] h-[17px] text-[#a37c32]" />
              </div>

              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Personal Goal
                </p>

                <h3 className="mt-0.5 text-[12px] font-bold text-[#102a43]">
                  Target Sedekah Bulanan
                </h3>
              </div>

            </div>

            <span className="text-[10px] font-bold text-[#a37c32]">
              {progressPercent}%
            </span>

          </div>

          <div className="mt-5">

            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-slate-400">
                Rp {totalAmount.toLocaleString('id-ID')}
              </span>

              <span className="text-[9px] font-semibold text-slate-500">
                Target Rp {targetBulanan.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">

              <div
                className="h-full rounded-full bg-gradient-to-r from-[#a37c32] to-[#d6b96f] transition-all duration-700"
                style={{
                  width: `${progressPercent}%`,
                }}
              />

            </div>

          </div>

        </section>

        {/* =========================================================
            WHATSAPP
        ========================================================= */}
        <section className="rounded-[24px] bg-white border border-slate-200/70 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-[#f3f7f5] flex items-center justify-center">
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>

              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Kontak Referral
                </p>

                <p className="mt-1 text-[11px] font-bold text-[#102a43]">
                  {profile?.phone || 'Belum diatur'}
                </p>
              </div>

            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-[9px] font-bold uppercase tracking-wider text-[#102a43] hover:bg-slate-50 transition cursor-pointer"
            >
              Ubah
            </button>

          </div>

        </section>

        {/* =========================================================
            MENU
        ========================================================= */}
        <section className="rounded-[26px] bg-white border border-slate-200/70 overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.04)]">

          <div className="px-5 pt-5 pb-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Account Center
            </p>

            <h3 className="mt-1 text-[13px] font-bold text-[#102a43]">
              Menu Akun
            </h3>
          </div>

          <div className="px-3 pb-3 space-y-1">

            <Link
              href="/donasi-saya"
              className="group flex items-center justify-between rounded-2xl px-3 py-3.5 hover:bg-[#f8f8f6] transition"
            >
              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-xl bg-[#f5f6f7] flex items-center justify-center group-hover:bg-[#f7f2e7] transition">
                  <History className="w-4 h-4 text-[#102a43]" />
                </div>

                <span className="text-[11px] font-semibold text-slate-700">
                  Riwayat Donasi
                </span>

              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#a37c32] transition" />
            </Link>

            <Link
              href="/kuitansi"
              className="group flex items-center justify-between rounded-2xl px-3 py-3.5 hover:bg-[#f8f8f6] transition"
            >
              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-xl bg-[#f5f6f7] flex items-center justify-center group-hover:bg-[#f7f2e7] transition">
                  <FileText className="w-4 h-4 text-[#102a43]" />
                </div>

                <span className="text-[11px] font-semibold text-slate-700">
                  Kuitansi & Sertifikat
                </span>

              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#a37c32] transition" />
            </Link>

            <Link
              href="/favorit"
              className="group flex items-center justify-between rounded-2xl px-3 py-3.5 hover:bg-[#f8f8f6] transition"
            >
              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-xl bg-[#f5f6f7] flex items-center justify-center group-hover:bg-[#f7f2e7] transition">
                  <Bookmark className="w-4 h-4 text-[#102a43]" />
                </div>

                <span className="text-[11px] font-semibold text-slate-700">
                  Program Favorit
                </span>

              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#a37c32] transition" />
            </Link>

            <Link
              href="/referral"
              className="group flex items-center justify-between rounded-2xl px-3 py-3.5 hover:bg-[#f8f8f6] transition"
            >
              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-xl bg-[#f7f2e7] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#a37c32]" />
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-700 block">
                    Ajak Teman
                  </span>

                  <span className="text-[8px] text-slate-400">
                    Program referral & kebaikan
                  </span>
                </div>

              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#a37c32] transition" />
            </Link>

            <Link
              href="/pengaturan"
              className="group flex items-center justify-between rounded-2xl px-3 py-3.5 hover:bg-[#f8f8f6] transition"
            >
              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-xl bg-[#f5f6f7] flex items-center justify-center">
                  <Settings className="w-4 h-4 text-[#102a43]" />
                </div>

                <span className="text-[11px] font-semibold text-slate-700">
                  Pengaturan Akun
                </span>

              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#a37c32] transition" />
            </Link>

            <Link
              href="/bantuan"
              className="group flex items-center justify-between rounded-2xl px-3 py-3.5 hover:bg-[#f8f8f6] transition"
            >
              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-xl bg-[#f5f6f7] flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-[#102a43]" />
                </div>

                <span className="text-[11px] font-semibold text-slate-700">
                  Bantuan & FAQ
                </span>

              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#a37c32] transition" />
            </Link>

          </div>
        </section>

        {/* =========================================================
            LOGOUT
        ========================================================= */}
        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar dari Akun
        </button>

        <div className="text-center pt-1">
          <p className="text-[8px] text-slate-300">
            Terima kasih telah menjadi bagian dari gerakan
            kebaikan.
          </p>
        </div>

      </div>

      {/* =========================================================
          MODAL WHATSAPP
      ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#071521]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">

          <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-[0_25px_70px_rgba(0,0,0,0.25)]">

            <div className="h-1 bg-gradient-to-r from-[#a37c32] via-[#dfc27e] to-[#a37c32]" />

            <div className="p-5">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Account Settings
                  </p>

                  <h3 className="mt-1 text-[14px] font-bold text-[#102a43]">
                    Nomor WhatsApp
                  </h3>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

              </div>

              <form
                onSubmit={handleUpdatePhone}
                className="mt-5 space-y-4"
              >

                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Nomor WhatsApp Baru
                  </label>

                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={newPhone}
                    onChange={(e) =>
                      setNewPhone(e.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8f8f6] px-4 py-3.5 text-[12px] font-semibold text-slate-800 outline-none transition focus:border-[#a37c32] focus:bg-white"
                  />

                  <p className="mt-2 text-[8px] leading-relaxed text-slate-400">
                    Nomor ini digunakan untuk identitas
                    referral dan komunikasi terkait akun.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={savingPhone}
                  className="w-full rounded-2xl bg-[#102a43] hover:bg-[#173d5d] text-white font-bold py-3.5 text-[9px] uppercase tracking-[0.16em] transition disabled:bg-slate-300 shadow-lg shadow-[#102a43]/10 cursor-pointer"
                >
                  {savingPhone
                    ? 'Menyimpan...'
                    : 'Simpan Nomor Baru'}
                </button>

              </form>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// components/CampaignDetailClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PortableText } from '@portabletext/react';
import { ArrowLeft, Share2, Copy, Check, MessageCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client'; // 🚀 Menggunakan instance tunggal yang konsisten

// Deklarasi global agar TypeScript mengenali window.snap dari Midtrans
declare global {
  interface Window {
    snap: any;
  }
}

// ===================================================================
// 1. HEADER KHUSUS DETAIL PROGRAM
// ===================================================================
function DetailHeader({ title = 'Program Donasi', onOpenShare }: { title?: string; onOpenShare: () => void }) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 bg-[#0d5c91] text-white w-full shadow-sm">
      <div className="w-full max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center p-2 border border-white/30 hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-[220px] sm:max-w-[280px]">
          {title}
        </h1>

        <button
          onClick={onOpenShare}
          className="flex items-center justify-center p-2 border border-white/30 hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Bagikan"
        >
          <Share2 className="w-5 h-5 text-white" />
        </button>
      </div>
    </header>
  );
}

// ===================================================================
// 2. IN-LINE WIDGET KALKULATOR ZAKAT
// ===================================================================
function EmbeddedZakatCalculator({ onApplyAmount }: { onApplyAmount: (val: string) => void }) {
  const [activeTab, setActiveTab] = useState<'penghasilan' | 'maal' | 'emas'>('penghasilan');
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');

  const HARGA_EMAS = 1400000; 
  const NISHAB_TAHUNAN = 85 * HARGA_EMAS;
  const NISHAB_BULANAN = Math.round(NISHAB_TAHUNAN / 12);

  const formatRupiah = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    return raw ? Number(raw).toLocaleString('id-ID') : '';
  };
  const getNum = (val: string) => Number(val.replace(/\./g, '')) || 0;

  let totalZakat = 0;
  let isWajib = false;

  if (activeTab === 'penghasilan') {
    const total = getNum(input1) + getNum(input2);
    isWajib = total >= NISHAB_BULANAN;
    totalZakat = isWajib ? Math.round(total * 0.025) : 0;
  } else if (activeTab === 'maal') {
    const total = getNum(input1) + getNum(input2);
    isWajib = total >= NISHAB_TAHUNAN;
    totalZakat = isWajib ? Math.round(total * 0.025) : 0;
  } else if (activeTab === 'emas') {
    const berat = Number(input1) || 0;
    isWajib = berat >= 85;
    totalZakat = isWajib ? Math.round((berat * HARGA_EMAS) * 0.025) : 0;
  }

  return (
    <div className="border border-gray-200 bg-white overflow-hidden my-4 shadow-sm rounded-xl">
      <div className="flex border-b border-gray-200 text-xs font-bold bg-gray-50">
        <button
          onClick={() => { setActiveTab('penghasilan'); setInput1(''); setInput2(''); }}
          className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${activeTab === 'penghasilan' ? 'text-[#0d5c91] border-[#0d5c91] bg-white' : 'text-slate-500 border-transparent'}`}
        >
          PENGHASILAN
        </button>
        <button
          onClick={() => { setActiveTab('maal'); setInput1(''); setInput2(''); }}
          className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${activeTab === 'maal' ? 'text-[#0d5c91] border-[#0d5c91] bg-white' : 'text-slate-500 border-transparent'}`}
        >
          MAAL
        </button>
        <button
          onClick={() => { setActiveTab('emas'); setInput1(''); setInput2(''); }}
          className={`flex-1 py-3 text-center border-b-2 transition cursor-pointer ${activeTab === 'emas' ? 'text-[#0d5c91] border-[#0d5c91] bg-white' : 'text-slate-500 border-transparent'}`}
        >
          EMAS
        </button>
      </div>
      <div className="p-4 space-y-4 text-left">
        {activeTab !== 'emas' ? (
          <>
            <div>
              <label className="text-xs sm:text-sm font-medium text-slate-600 block mb-1.5">Pendapatan Utama / Tabungan Per Bulan (Rp)</label>
              <input
                type="text"
                className="w-full border border-gray-300 px-3.5 py-2.5 text-sm sm:text-base font-semibold text-slate-800 focus:outline-[#0d5c91] rounded-lg"
                placeholder="0"
                value={input1}
                onChange={(e) => setInput1(formatRupiah(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-slate-600 block mb-1.5">Tunjangan / Bonus / THR (Rp)</label>
              <input
                type="text"
                className="w-full border border-gray-300 px-3.5 py-2.5 text-sm sm:text-base font-semibold text-slate-800 focus:outline-[#0d5c91] rounded-lg"
                placeholder="0"
                value={input2}
                onChange={(e) => setInput2(formatRupiah(e.target.value))}
              />
            </div>
          </>
        ) : (
          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-600 block mb-1.5">Total Berat Emas (Gram)</label>
            <input
              type="number"
              className="w-full border border-gray-300 px-3.5 py-2.5 text-sm sm:text-base font-semibold text-slate-800 focus:outline-[#0d5c91] rounded-lg"
              placeholder="Contoh: 90"
              value={input1}
              onChange={(e) => setInput1(e.target.value)}
            />
          </div>
        )}
        <div className="bg-sky-50/60 border border-sky-100 p-4 text-center space-y-2 rounded-xl">
          <span className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wide block">Estimasi Wajib Zakat Anda</span>
          <span className="text-xl sm:text-2xl font-extrabold text-[#0d5c91] block">Rp {totalZakat.toLocaleString('id-ID')}</span>
          <button
            disabled={totalZakat <= 0}
            onClick={() => onApplyAmount(totalZakat.toLocaleString('id-ID'))}
            className="w-full bg-[#0d5c91] hover:bg-sky-900 text-white text-xs sm:text-sm font-bold py-2.5 uppercase tracking-wider disabled:bg-gray-300 transition shadow-sm cursor-pointer rounded-lg"
          >
            Masukkan ke Form Nominal 📥
          </button>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-400 text-center">Nilai di atas adalah estimasi. Zakat wajib ditunaikan jika harta mencapai nishab dan haul.</p>
      </div>
    </div>
  );
}

// ===================================================================
// 3. FORM DONASI PROFESIONAL (SISTEM PROFILES TABEL)
// ===================================================================
const DonationFormFields = ({
  profile,
  setProfile,
  amount,
  setAmount,
  handleDonate,
  handleInlineSavePhone,
  submitting,
  isLoggedIn,
  inlinePhone,
  setInlinePhone,
  savingPhone,
}: any) => {
  const PRESET_AMOUNTS = [10000, 15000, 25000, 50000, 100000, 250000];
  const cleanAmountNum = Number(String(amount || '').replace(/[^0-9]/g, '')) || 0;

  const hasPhone = Boolean(profile?.phone && profile.phone.trim().length >= 9);

  return (
    <div className="space-y-4 text-left">
      {/* Pilihan Nominal Kotak-Kotak */}
      <div>
        <label className="text-xs sm:text-sm font-extrabold text-slate-900 block mb-2">Pilih Nominal Donasi</label>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_AMOUNTS.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setAmount(val.toLocaleString('id-ID'))}
              className={`py-3 px-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                cleanAmountNum === val
                  ? 'bg-sky-50 text-[#0d5c91] border-[#0d5c91] shadow-2xs ring-1 ring-[#0d5c91]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Rp {val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
            </button>
          ))}
        </div>
      </div>

      {/* Input Nominal Lainnya */}
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-1">Masukkan Donasi Lainnya</label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-sm font-bold text-slate-400">Rp</span>
          <input
            type="text"
            placeholder="Min. 1.000"
            className="w-full border border-gray-300 pl-10 pr-3.5 py-2.5 text-sm sm:text-base font-bold text-slate-900 focus:outline-[#0d5c91] rounded-xl bg-white"
            value={amount}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, '');
              setAmount(raw ? Number(raw).toLocaleString('id-ID') : '');
            }}
          />
        </div>
      </div>

      <hr className="border-slate-100 my-2" />

      {/* 🚀 LOGIKA ALUR PROFIL & WHATSAPP BERDASARKAN KONSISTENSI SESSION */}
      {isLoggedIn ? (
        hasPhone ? (
          /* KONDISI 1: SUDAH LOGIN & NOMOR WA ADA -> BERSIH TANPA FORM APA PUN */
          <div className="bg-emerald-50 border border-emerald-200/80 p-3.5 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5 overflow-hidden">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide block">Login ✓ • {profile?.name}</span>
              <p className="text-xs font-extrabold text-slate-900 truncate">WhatsApp: {profile?.phone}</p>
            </div>
            <span className="text-[11px] bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-full shrink-0">Siap Donasi</span>
          </div>
        ) : (
          /* KONDISI 2: SUDAH LOGIN TAPI NOMOR WA BELUM ADA -> MINTA ISI SEKALI SAJA */
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
            <div>
              <span className="text-xs font-bold text-amber-900 block mb-0.5">Halo, {profile?.name || 'Dermawan'}!</span>
              <p className="text-[11px] text-amber-700">Lengkapi nomor WhatsApp Anda sekali ini saja untuk pengiriman kuitansi dan laporan donasi.</p>
            </div>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="Contoh: 081234567890"
                className="flex-1 border border-amber-300 px-3 py-2 text-xs font-semibold text-slate-900 rounded-lg bg-white focus:outline-[#0d5c91]"
                value={inlinePhone}
                onChange={(e) => setInlinePhone(e.target.value)}
              />
              <button
                type="button"
                onClick={handleInlineSavePhone}
                disabled={savingPhone}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 text-xs rounded-lg transition shrink-0 cursor-pointer disabled:opacity-50"
              >
                {savingPhone ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        )
      ) : (
        /* KONDISI 3: BELUM LOGIN (GUEST) -> TAMPILKAN INPUT MANUAL */
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Donatur</label>
            <input
              type="text"
              placeholder="Hamba Allah (Boleh Kosong)"
              className="w-full border border-gray-300 px-3.5 py-2.5 text-sm text-slate-800 rounded-xl bg-white"
              value={profile?.name || ''}
              onChange={(e) => setProfile((prev: any) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Nomor WhatsApp *</label>
            <input
              type="tel"
              placeholder="Contoh: 081234567890"
              className="w-full border border-gray-300 px-3.5 py-2.5 text-sm text-slate-800 rounded-xl bg-white"
              value={profile?.phone || ''}
              onChange={(e) => setProfile((prev: any) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Tombol Pembayaran */}
      <button
        type="button"
        onClick={handleDonate}
        disabled={submitting || (isLoggedIn && !hasPhone)}
        className="w-full bg-[#e91e63] hover:bg-pink-700 active:scale-[0.99] text-white font-extrabold py-4 transition text-sm sm:text-base uppercase tracking-wider disabled:bg-gray-300 shadow-md flex items-center justify-center gap-2 cursor-pointer rounded-xl mt-3"
      >
        {submitting ? 'Memproses...' : 'Lanjut pembayaran'}
      </button>
    </div>
  );
};

// ===================================================================
// 4. MAIN DETAIL CLIENT COMPONENT (MOBILE-FIRST)
// ===================================================================
interface CampaignDetailClientProps {
  slug: string;
  referral: string | null;
}

export default function CampaignDetailClient({ slug, referral }: CampaignDetailClientProps) {
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('10.000'); 
  
  // State Profile Database & Auth Session
  const [profile, setProfile] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inlinePhone, setInlinePhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'cerita' | 'donatur' | 'laporan'>('cerita');

  // 🚀 Menggunakan loadProfileFromDatabase dengan getSession() & onAuthStateChange()
  useEffect(() => {
    async function loadProfileFromDatabase() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setIsLoggedIn(false);
          return;
        }

        const user = session.user;
        setIsLoggedIn(true);

        const meta = user.user_metadata || {};
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (prof) {
          setProfile(prof);
        } else {
          setProfile({
            id: user.id,
            name: meta.full_name || meta.name || user.email?.split('@')[0] || 'Dermawan',
            email: user.email,
            avatar: meta.avatar_url || meta.picture || '',
            phone: '',
          });
        }
      } catch (e) {
        console.error(e);
        setIsLoggedIn(false);
      }
    }

    loadProfileFromDatabase();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadProfileFromDatabase();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fungsi simpan nomor WA kilat dari dalam popup donasi
  const handleInlineSavePhone = async () => {
    const clean = inlinePhone.replace(/[^0-9]/g, '');
    if (clean.length < 9) {
      alert('Masukkan nomor WhatsApp yang valid!');
      return;
    }

    setSavingPhone(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Sesi habis, silakan login ulang.');

      const { error } = await supabase
        .from('profiles')
        .update({ phone: clean, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);

      if (error) throw error;

      setProfile((prev: any) => ({ ...prev, phone: clean }));
      setInlinePhone('');
      alert('Nomor WhatsApp berhasil disimpan! Silakan lanjutkan donasi.');
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSavingPhone(false);
    }
  };

  const handleDonate = async () => {
    const cleanAmount = Number(String(amount || '').replace(/[^0-9]/g, ''));
    if (!cleanAmount || isNaN(cleanAmount) || cleanAmount < 1000) {
      alert('Masukkan nominal minimal Rp 1.000!');
      return;
    }

    const activePhone = profile?.phone || inlinePhone;
    const cleanPhone = String(activePhone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      alert('Nomor WhatsApp wajib diisi!');
      return;
    }

    const resolvedProgramId = program?._id || program?.id;
    if (!resolvedProgramId) {
      alert('ID Program tidak ditemukan.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: resolvedProgramId,
          programTitle: program?.title || 'Sedekah Umum',
          slug: program?.slug,
          amount: cleanAmount,
          donorName: profile?.name?.trim() || 'Hamba Allah',
          phone: cleanPhone,
          email: profile?.email?.trim() || '',
          fundraiserPhone: referral,
        }),
      });

      const json = await res.json();
      
      // 🚀 Integrasi Midtrans Snap Popup Pembayaran dengan Penanganan Callbacks yang Benar
      if (json.success && json.token) {
        if (typeof window !== 'undefined' && window.snap) {
          window.snap.pay(json.token, {
            onSuccess: function (result: any) {
              // Hanya dialihkan ke halaman sukses jika pembayaran benar-benar selesai/berhasil
              window.location.href = `/donation/success?orderId=${json.orderId}`;
            },
            onPending: function (result: any) {
              // Jika transaksi tertunda (belum dibayar, misal metode QRIS/VA baru dimunculkan)
              // Berikan opsi atau arahkan ke halaman pending/sukses dengan status pending
              window.location.href = `/donation/success?orderId=${json.orderId}`;
            },
            onError: function (result: any) {
              alert("Pembayaran gagal, silakan coba lagi.");
              setSubmitting(false);
            },
            onClose: function () {
              // JIKA POPUP DITUTUP SEBELUM BAYAR: Jangan redirect, cukup aktifkan tombol kembali!
              setSubmitting(false);
            }
          });
        } else {
          // Fallback jika script snap belum termuat
          if (json.paymentUrl) {
            window.location.href = json.paymentUrl;
          } else {
            alert('Midtrans Snap tidak tersedia.');
            setSubmitting(false);
          }
        }
      } else {
        alert(json.message || 'Gagal memproses transaksi.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi.');
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetch(`/api/programs?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const cleanParamSlug = decodeURIComponent(slug).toLowerCase().replace(/[^a-z0-9]/g, '');
          
          const found = json.data.find((p: any) => {
            const cleanDbSlug = (p.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanDbSlug === cleanParamSlug || p.slug === slug || p._id === slug;
          });

          setProgram(found);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch detail campaign error:', err);
        setLoading(false);
      });
  }, [slug]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <DetailHeader title="Program Donasi" onOpenShare={() => setIsShareModalOpen(true)} />
      <div className="text-center py-20 text-slate-500 font-medium text-sm sm:text-base">Memuat detail program...</div>
    </div>
  );

  if (!program) return (
    <div className="min-h-screen bg-gray-50">
      <DetailHeader title="Program Donasi" onOpenShare={() => setIsShareModalOpen(true)} />
      <div className="text-center py-20 text-red-500 font-medium text-sm sm:text-base">Program tidak ditemukan.</div>
    </div>
  );

  const rawTarget = program.targetAmount || 50000000;
  const currentCollected = Number(program.collectedAmount || 0);
  const percentage = Math.min(Math.round((currentCollected / rawTarget) * 100), 100);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <DetailHeader title="Program Donasi" onOpenShare={() => setIsShareModalOpen(true)} />

      {/* Konten Utama */}
      <div className="w-full max-w-md mx-auto px-3 pt-4 space-y-4">
        <div className="bg-white p-4 sm:p-6 shadow-sm border border-gray-200/90 space-y-4 rounded-xl">
          <div className="overflow-hidden bg-gray-100 aspect-[16/10] w-full border border-gray-100 shadow-inner rounded-xl">
            <img src={program.image} alt={program.title} className="w-full h-full object-cover" />
          </div>

          <h1 className="text-base sm:text-xl font-bold text-slate-900 leading-snug tracking-tight">
            {program.title}
          </h1>

          <div className="space-y-2 pt-1">
            <p className="text-lg sm:text-xl font-extrabold text-[#0d5c91]">
              Rp {currentCollected.toLocaleString('id-ID')}
            </p>
            <div className="flex justify-between items-center text-xs sm:text-sm text-slate-500 font-medium">
              <span>Terkumpul dari <strong className="text-slate-800">Rp {rawTarget.toLocaleString('id-ID')}</strong></span>
              <span>{program.daysLeft ? `${program.daysLeft} hari lagi` : 'Mendesak'}</span>
            </div>

            <div className="w-full bg-gray-100 h-2.5 overflow-hidden shadow-inner rounded-full">
              <div className="bg-[#e91e63] h-full transition-all duration-500" style={{ width: `${percentage}%` }} />
            </div>
          </div>

          {/* Tab Navigasi */}
          <div className="flex border-b border-gray-200 text-xs sm:text-sm font-bold text-slate-500 space-x-6 pt-2">
            <button
              onClick={() => setActiveTab('cerita')}
              className={`pb-2.5 transition focus:outline-none cursor-pointer ${activeTab === 'cerita' ? 'text-[#0d5c91] border-b-2 border-[#0d5c91]' : 'border-b-2 border-transparent'}`}
            >
              Cerita
            </button>
            <button
              onClick={() => setActiveTab('donatur')}
              className={`pb-2.5 transition focus:outline-none cursor-pointer ${activeTab === 'donatur' ? 'text-[#0d5c91] border-b-2 border-[#0d5c91]' : 'border-b-2 border-transparent'}`}
            >
              Donatur ({(program.donors || []).length})
            </button>
            <button
              onClick={() => setActiveTab('laporan')}
              className={`pb-2.5 transition focus:outline-none cursor-pointer ${activeTab === 'laporan' ? 'text-[#0d5c91] border-b-2 border-[#0d5c91]' : 'border-b-2 border-transparent'}`}
            >
              Laporan ({(program.reports || []).length})
            </button>
          </div>

          {/* Isi Konten Tab */}
          <div className="py-2 text-left">
            {activeTab === 'cerita' && (
              <div className="space-y-4">
                {program.category?.toUpperCase() === 'ZAKAT' && (
                  <EmbeddedZakatCalculator onApplyAmount={(val) => setAmount(val)} />
                )}

                <div className="text-slate-800 text-base sm:text-lg leading-relaxed space-y-4 font-normal">
                  {program.description ? (
                    typeof program.description === 'string' ? (
                      <p>{program.description}</p>
                    ) : (
                      <PortableText value={program.description} />
                    )
                  ) : (
                    <p className="text-slate-400 italic">Belum ada cerita detail.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'donatur' && (
              <div className="space-y-3 py-1">
                {(program.donors || []).length > 0 ? (
                  [...program.donors].reverse().map((donor: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200/80 p-3.5 flex items-center justify-between rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-sky-100 text-[#0d5c91] flex items-center justify-center font-bold text-base shadow-inner rounded-full">
                          {(donor.name || 'H').toUpperCase().slice(0, 1)}
                        </div>
                        <div>
                          <p className="text-sm sm:text-base font-bold text-slate-800">{donor.name || 'Hamba Allah'}</p>
                          <p className="text-xs text-slate-400 font-normal">{donor.date || 'Baru Saja'}</p>
                        </div>
                      </div>
                      <p className="text-sm sm:text-base font-bold text-[#0d5c91]">{`+Rp ${Number(donor.amount || 0).toLocaleString('id-ID')}`}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-sm sm:text-base text-slate-400">Belum ada donatur.</p>
                )}
              </div>
            )}

            {activeTab === 'laporan' && (
              <div className="space-y-4 py-1">
                {(program.reports || []).length > 0 ? (
                  [...program.reports].reverse().map((report: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200/80 p-4 space-y-2.5 rounded-xl">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
                        <h4 className="text-sm sm:text-base font-bold text-slate-800">{report.title || 'Laporan Penyaluran'}</h4>
                        <span className="text-xs text-slate-400 font-medium">{report.date}</span>
                      </div>
                      <div className="text-sm sm:text-base text-slate-800 leading-relaxed">
                        {typeof report.content === 'string' ? <p>{report.content}</p> : <PortableText value={report.content} />}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-sm sm:text-base text-slate-400">Belum ada pembaruan laporan.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar ala Kitabisa */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center pb-3">
        <div className="w-[calc(100%-1.5rem)] max-w-md bg-white border border-gray-200 p-3.5 shadow-xl pointer-events-auto rounded-2xl">
          <button 
            onClick={() => setIsMobileFormOpen(true)} 
            className="w-full bg-[#e91e63] hover:bg-pink-700 active:scale-[0.99] text-white text-sm sm:text-base font-extrabold py-4 shadow-md transition-all uppercase tracking-wide cursor-pointer rounded-xl"
          >
            Donasi sekarang
          </button>
        </div>
      </div>

      {/* Modal Popup Donasi Ala Kitabisa */}
      {isMobileFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-3">
          <div className="absolute inset-0" onClick={() => setIsMobileFormOpen(false)} />
          <div className="relative w-full max-w-md bg-white p-5 space-y-4 max-h-[90vh] overflow-y-auto z-10 shadow-2xl border border-gray-200 rounded-t-2xl sm:rounded-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide">Pilih Nominal Donasi</h3>
              <button 
                onClick={() => setIsMobileFormOpen(false)} 
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <DonationFormFields 
              profile={profile} setProfile={setProfile}
              amount={amount} setAmount={setAmount}
              handleDonate={handleDonate}
              handleInlineSavePhone={handleInlineSavePhone}
              submitting={submitting}
              isLoggedIn={isLoggedIn}
              inlinePhone={inlinePhone} setInlinePhone={setInlinePhone}
              savingPhone={savingPhone}
            />
          </div>
        </div>
      )}

      {/* Modal Share */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0" onClick={() => setIsShareModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white p-5 space-y-4 z-10 shadow-2xl border border-gray-200 text-left rounded-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wide">Bagikan Program Kebaikan</h3>
              <button 
                onClick={() => setIsShareModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-slate-600 block">Tautan Program</label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={shareUrl} 
                  className="flex-1 bg-gray-50 border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-700 truncate focus:outline-none rounded-lg"
                />
                <button
                  onClick={handleCopyLink}
                  className="bg-[#0d5c91] text-white px-4 py-2.5 text-xs sm:text-sm font-bold shrink-0 flex items-center gap-1.5 hover:bg-sky-900 transition shadow-sm cursor-pointer rounded-lg"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Ayo bantu program kebaikan ini: ${program?.title || ''}\n${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1.5 hover:bg-emerald-100 transition shadow-2xs rounded-xl"
              >
                <MessageCircle className="w-6 h-6 text-emerald-600" />
                <span className="text-xs sm:text-sm font-bold">WhatsApp</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3.5 bg-blue-50 border border-blue-200 text-blue-800 space-y-1.5 hover:bg-blue-100 transition shadow-2xs rounded-xl"
              >
                <svg className="w-6 h-6 fill-current text-blue-600" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-xs sm:text-sm font-bold">Facebook</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(program?.title || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3.5 bg-gray-100 border border-gray-200 text-slate-800 space-y-1.5 hover:bg-gray-200 transition shadow-2xs rounded-xl"
              >
                <svg className="w-5 h-5 fill-current text-slate-900 mt-0.5" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span className="text-xs sm:text-sm font-bold mt-0.5">Twitter/X</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
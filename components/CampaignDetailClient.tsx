// components/CampaignDetailClient.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortableText } from '@portabletext/react';
import {
  ArrowLeft,
  Share2,
  Copy,
  Check,
  MessageCircle,
} from 'lucide-react';

import { supabase } from '@/lib/supabase/client';
import ViewCounter from '@/components/ViewCounter';

// ============================================================================
// 1. HEADER KHUSUS DETAIL PROGRAM
// ============================================================================

function DetailHeader({
  title = 'Program Donasi',
  onOpenShare,
}: {
  title?: string;
  onOpenShare: () => void;
}) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-900 bg-emerald-950 text-white shadow-sm">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">

        {/* Kembali */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex cursor-pointer items-center justify-center rounded-lg border border-white/30 p-2 transition-colors hover:bg-white/10"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>

        {/* Judul */}
        <h1 className="max-w-[220px] truncate text-sm font-bold tracking-tight text-white sm:max-w-[280px] sm:text-base">
          {title}
        </h1>

        {/* Share */}
        <button
          type="button"
          onClick={onOpenShare}
          className="flex cursor-pointer items-center justify-center rounded-lg border border-white/30 p-2 transition-colors hover:bg-white/10"
          aria-label="Bagikan"
        >
          <Share2 className="h-5 w-5 text-white" />
        </button>

      </div>
    </header>
  );
}

// ============================================================================
// 2. KALKULATOR ZAKAT
// ============================================================================

function EmbeddedZakatCalculator({
  onApplyAmount,
}: {
  onApplyAmount: (val: string) => void;
}) {
  const [activeTab, setActiveTab] =
    useState<'penghasilan' | 'maal' | 'emas'>('penghasilan');

  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');

  const HARGA_EMAS = 1_400_000;
  const NISHAB_TAHUNAN = 85 * HARGA_EMAS;
  const NISHAB_BULANAN = Math.round(
    NISHAB_TAHUNAN / 12
  );

  const formatRupiah = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');

    return raw
      ? Number(raw).toLocaleString('id-ID')
      : '';
  };

  const getNum = (val: string) =>
    Number(val.replace(/\./g, '')) || 0;

  let totalZakat = 0;
  let isWajib = false;

  if (activeTab === 'penghasilan') {
    const total =
      getNum(input1) + getNum(input2);

    isWajib =
      total >= NISHAB_BULANAN;

    totalZakat = isWajib
      ? Math.round(total * 0.025)
      : 0;
  }

  if (activeTab === 'maal') {
    const total =
      getNum(input1) + getNum(input2);

    isWajib =
      total >= NISHAB_TAHUNAN;

    totalZakat = isWajib
      ? Math.round(total * 0.025)
      : 0;
  }

  if (activeTab === 'emas') {
    const berat =
      Number(input1) || 0;

    isWajib =
      berat >= 85;

    totalZakat = isWajib
      ? Math.round(
          berat *
            HARGA_EMAS *
            0.025
        )
      : 0;
  }

  const resetInputs = () => {
    setInput1('');
    setInput2('');
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

      {/* TAB */}

      <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-bold">

        <button
          type="button"
          onClick={() => {
            setActiveTab('penghasilan');
            resetInputs();
          }}
          className={`flex-1 cursor-pointer border-b-2 py-3 text-center transition ${
            activeTab === 'penghasilan'
              ? 'border-emerald-900 bg-white text-emerald-900'
              : 'border-transparent text-slate-500'
          }`}
        >
          PENGHASILAN
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('maal');
            resetInputs();
          }}
          className={`flex-1 cursor-pointer border-b-2 py-3 text-center transition ${
            activeTab === 'maal'
              ? 'border-emerald-900 bg-white text-emerald-900'
              : 'border-transparent text-slate-500'
          }`}
        >
          MAAL
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('emas');
            resetInputs();
          }}
          className={`flex-1 cursor-pointer border-b-2 py-3 text-center transition ${
            activeTab === 'emas'
              ? 'border-emerald-900 bg-white text-emerald-900'
              : 'border-transparent text-slate-500'
          }`}
        >
          EMAS
        </button>

      </div>

      <div className="space-y-4 p-4 text-left">

        {activeTab !== 'emas' ? (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                Pendapatan Utama / Tabungan Per Bulan (Rp)
              </label>

              <input
                type="text"
                placeholder="0"
                value={input1}
                onChange={(e) =>
                  setInput1(
                    formatRupiah(
                      e.target.value
                    )
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-emerald-900 sm:text-base"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                Tunjangan / Bonus / THR (Rp)
              </label>

              <input
                type="text"
                placeholder="0"
                value={input2}
                onChange={(e) =>
                  setInput2(
                    formatRupiah(
                      e.target.value
                    )
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-emerald-900 sm:text-base"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
              Total Berat Emas (Gram)
            </label>

            <input
              type="number"
              placeholder="Contoh: 90"
              value={input1}
              onChange={(e) =>
                setInput1(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-emerald-900 sm:text-base"
            />
          </div>
        )}

        {/* HASIL */}

        <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-center">

          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
            Estimasi Wajib Zakat Anda
          </span>

          <span className="block text-xl font-extrabold text-emerald-900 sm:text-2xl">
            Rp{' '}
            {totalZakat.toLocaleString(
              'id-ID'
            )}
          </span>

          <button
            type="button"
            disabled={
              totalZakat <= 0
            }
            onClick={() =>
              onApplyAmount(
                totalZakat.toLocaleString(
                  'id-ID'
                )
              )
            }
            className="w-full cursor-pointer rounded-lg bg-emerald-900 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-emerald-950 disabled:cursor-not-allowed disabled:bg-gray-300 sm:text-sm"
          >
            Masukkan ke Form Nominal 📥
          </button>

        </div>

        <p className="text-center text-[11px] text-slate-400 sm:text-xs">
          Nilai di atas adalah estimasi. Zakat wajib
          ditunaikan jika harta mencapai nishab dan haul.
        </p>

      </div>
    </div>
  );
}

// ============================================================================
// 3. FORM DONASI
// ============================================================================

const DonationFormFields = ({
  profile,
  setProfile,
  amount,
  setAmount,
  paymentMethod,
  setPaymentMethod,
  handleDonate,
  handleInlineSavePhone,
  submitting,
  isLoggedIn,
  inlinePhone,
  setInlinePhone,
  savingPhone,
}: any) => {
  const PRESET_AMOUNTS = [
    10000,
    15000,
    25000,
    50000,
    100000,
    250000,
  ];

  const cleanAmountNum =
    Number(
      String(amount || '').replace(
        /[^0-9]/g,
        ''
      )
    ) || 0;

  const hasPhone = Boolean(
    profile?.phone &&
      profile.phone.trim().length >= 9
  );

  return (
    <div className="space-y-4 text-left">

      {/* PILIH NOMINAL */}

      <div>
        <label className="mb-2 block text-xs font-extrabold text-slate-900 sm:text-sm">
          Pilih Nominal Donasi
        </label>

        <div className="grid grid-cols-3 gap-2">

          {PRESET_AMOUNTS.map(
            (val) => (
              <button
                key={val}
                type="button"
                onClick={() =>
                  setAmount(
                    val.toLocaleString(
                      'id-ID'
                    )
                  )
                }
                className={`cursor-pointer rounded-xl border px-2 py-3 text-xs font-bold transition ${
                  cleanAmountNum ===
                  val
                    ? 'border-emerald-900 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Rp{' '}
                {val >= 1_000_000
                  ? `${val / 1_000_000}jt`
                  : `${val / 1000}rb`}
              </button>
            )
          )}

        </div>
      </div>

      {/* NOMINAL LAIN */}

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Masukkan Donasi Lainnya
        </label>

        <div className="relative flex items-center">

          <span className="absolute left-3.5 text-sm font-bold text-slate-400">
            Rp
          </span>

          <input
            type="text"
            placeholder="Min. 1.000"
            value={amount}
            onChange={(e) => {
              const raw =
                e.target.value.replace(
                  /[^0-9]/g,
                  ''
                );

              setAmount(
                raw
                  ? Number(
                      raw
                    ).toLocaleString(
                      'id-ID'
                    )
                  : ''
              );
            }}
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3.5 text-sm font-bold text-slate-900 focus:outline-emerald-900 sm:text-base"
          />

        </div>
      </div>

      {/* PAYMENT */}

      <div>
        <label className="mb-2 block text-xs font-extrabold text-slate-900 sm:text-sm">
          Metode Pembayaran
        </label>

        <select
          value={paymentMethod}
          onChange={(e) =>
            setPaymentMethod(
              e.target.value
            )
          }
          className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-emerald-900"
        >
          <option value="qris">
            QRIS (Semua E-Wallet / Mobile Banking)
          </option>

          <option value="bni_va">
            Virtual Account BNI
          </option>

          <option value="bri_va">
            Virtual Account BRI
          </option>

          <option value="mandiri_va">
            Virtual Account Mandiri
          </option>

          <option value="permata_va">
            Virtual Account Permata
          </option>
        </select>

      </div>

      <hr className="my-2 border-slate-100" />

      {/* USER */}

      {isLoggedIn ? (
        hasPhone ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50 p-3.5">

            <div className="space-y-0.5 overflow-hidden">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                Login ✓ •{' '}
                {profile?.name}
              </span>

              <p className="truncate text-xs font-extrabold text-slate-900">
                WhatsApp:{' '}
                {profile?.phone}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
              Siap Donasi
            </span>

          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">

            <div>
              <span className="mb-0.5 block text-xs font-bold text-amber-900">
                Halo,{' '}
                {profile?.name ||
                  'Dermawan'}
                !
              </span>

              <p className="text-[11px] text-amber-700">
                Lengkapi nomor WhatsApp Anda sekali ini
                saja untuk pengiriman kuitansi dan laporan
                donasi.
              </p>
            </div>

            <div className="flex gap-2">

              <input
                type="tel"
                placeholder="Contoh: 081234567890"
                value={inlinePhone}
                onChange={(e) =>
                  setInlinePhone(
                    e.target.value
                  )
                }
                className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-emerald-900"
              />

              <button
                type="button"
                onClick={
                  handleInlineSavePhone
                }
                disabled={
                  savingPhone
                }
                className="shrink-0 cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
              >
                {savingPhone
                  ? 'Menyimpan...'
                  : 'Simpan'}
              </button>

            </div>

          </div>
        )
      ) : (
        <div className="space-y-3">

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Nama Donatur
            </label>

            <input
              type="text"
              placeholder="Hamba Allah (Boleh Kosong)"
              value={
                profile?.name ||
                ''
              }
              onChange={(e) =>
                setProfile(
                  (prev: any) => ({
                    ...(prev || {}),
                    name: e.target.value,
                  })
                )
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-slate-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Nomor WhatsApp *
            </label>

            <input
              type="tel"
              placeholder="Contoh: 081234567890"
              value={
                profile?.phone ||
                ''
              }
              onChange={(e) =>
                setProfile(
                  (prev: any) => ({
                    ...(prev || {}),
                    phone:
                      e.target.value,
                  })
                )
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-slate-800"
            />

          </div>

        </div>
      )}

      {/* DONATE */}

      <button
        type="button"
        onClick={
          handleDonate
        }
        disabled={
          submitting ||
          (isLoggedIn &&
            !hasPhone)
        }
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#e91e63] py-4 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-pink-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 sm:text-base"
      >
        {submitting
          ? 'Memproses Tagihan...'
          : 'Lanjut pembayaran'}
      </button>

    </div>
  );
};

// ============================================================================
// 4. PROPS
// ============================================================================

interface CampaignDetailClientProps {
  slug: string;
  referral: string | null;
}

// ============================================================================
// 5. MAIN COMPONENT
// ============================================================================

export default function CampaignDetailClient({
  slug,
  referral,
}: CampaignDetailClientProps) {
  // PROGRAM

  const [program, setProgram] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  // DONASI

  const [amount, setAmount] =
    useState('10.000');

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState('qris');

  // PROFILE

  const [profile, setProfile] =
    useState<any>(null);

  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(false);

  const [
    inlinePhone,
    setInlinePhone,
  ] = useState('');

  const [
    savingPhone,
    setSavingPhone,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  // MODAL

  const [
    isMobileFormOpen,
    setIsMobileFormOpen,
  ] = useState(false);

  const [
    isShareModalOpen,
    setIsShareModalOpen,
  ] = useState(false);

  // SHARE

  const [copied, setCopied] =
    useState(false);

  const [
    shareUrl,
    setShareUrl,
  ] = useState('');

  // TAB

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<
      'cerita' | 'donatur' | 'laporan'
    >('cerita');

  // ==========================================================================
  // CURRENT URL
  // ==========================================================================

  useEffect(() => {
    if (
      typeof window !==
      'undefined'
    ) {
      setShareUrl(
        window.location.href
      );
    }
  }, []);

  // ==========================================================================
  // LOAD PROFILE
  // ==========================================================================

  useEffect(() => {
    async function loadProfileFromDatabase() {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session) {
          setIsLoggedIn(false);
          setProfile(null);
          return;
        }

        const user =
          session.user;

        setIsLoggedIn(true);

        const meta =
          user.user_metadata ||
          {};

        const {
          data: prof,
          error,
        } = await supabase
          .from('profiles')
          .select('*')
          .eq(
            'id',
            user.id
          )
          .maybeSingle();

        if (error) {
          console.error(
            'LOAD PROFILE ERROR:',
            error
          );
        }

        if (prof) {
          setProfile(prof);
        } else {
          setProfile({
            id: user.id,

            name:
              meta.full_name ||
              meta.name ||
              user.email?.split(
                '@'
              )[0] ||
              'Dermawan',

            email:
              user.email,

            avatar:
              meta.avatar_url ||
              meta.picture ||
              '',

            phone: '',
          });
        }
      } catch (error) {
        console.error(
          'PROFILE ERROR:',
          error
        );

        setIsLoggedIn(false);
      }
    }

    loadProfileFromDatabase();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        () => {
          loadProfileFromDatabase();
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ==========================================================================
  // SIMPAN WHATSAPP
  // ==========================================================================

  const handleInlineSavePhone =
    async () => {
      const clean =
        inlinePhone.replace(
          /[^0-9]/g,
          ''
        );

      if (
        clean.length < 9
      ) {
        alert(
          'Masukkan nomor WhatsApp yang valid!'
        );

        return;
      }

      setSavingPhone(true);

      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (
          !session?.user
        ) {
          throw new Error(
            'Sesi habis, silakan login ulang.'
          );
        }

        const {
          error,
        } =
          await supabase
            .from('profiles')
            .update({
              phone: clean,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              'id',
              session.user.id
            );

        if (error) {
          throw error;
        }

        setProfile(
          (prev: any) => ({
            ...(prev || {}),
            phone: clean,
          })
        );

        setInlinePhone('');

        alert(
          'Nomor WhatsApp berhasil disimpan! Silakan lanjutkan donasi.'
        );
      } catch (
        err: any
      ) {
        alert(
          'Gagal menyimpan: ' +
            (err?.message ||
              'Terjadi kesalahan')
        );
      } finally {
        setSavingPhone(false);
      }
    };

  // ==========================================================================
  // DONATE
  // ==========================================================================

  const handleDonate =
    async () => {
      const cleanAmount =
        Number(
          String(
            amount || ''
          ).replace(
            /[^0-9]/g,
            ''
          )
        );

      if (
        !cleanAmount ||
        Number.isNaN(
          cleanAmount
        ) ||
        cleanAmount < 1000
      ) {
        alert(
          'Masukkan nominal minimal Rp 1.000!'
        );

        return;
      }

      const activePhone =
        profile?.phone ||
        inlinePhone;

      const cleanPhone =
        String(
          activePhone || ''
        ).replace(
          /[^0-9]/g,
          ''
        );

      if (
        !cleanPhone ||
        cleanPhone.length <
          9
      ) {
        alert(
          'Nomor WhatsApp wajib diisi!'
        );

        return;
      }

      setSubmitting(true);

      try {
        const res =
          await fetch(
            '/api/checkout',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                slug:
                  program?.slug ||
                  slug,

                donorName:
                  profile?.name?.trim() ||
                  'Hamba Allah',

                donorPhone:
                  cleanPhone,

                amount:
                  cleanAmount,

                paymentMethod,

                fundraiserPhone:
                  referral,
              }),
            }
          );

        const json =
          await res.json();

        if (
          json.success &&
          json.orderId
        ) {
          const projectSlug =
            process.env
              .NEXT_PUBLIC_PAKASIR_PROJECT_SLUG ||
            'balai-dakwah-banjarnegara';

          const siteUrl =
            window.location.origin;

          const returnUrl =
            `${siteUrl}/thank-you?order_id=${json.orderId}`;

          let pakasirPayUrl =
            `https://app.pakasir.com/pay/` +
            `${projectSlug}/` +
            `${cleanAmount}` +
            `?order_id=${encodeURIComponent(
              json.orderId
            )}` +
            `&redirect=${encodeURIComponent(
              returnUrl
            )}`;

          if (
            paymentMethod ===
            'qris'
          ) {
            pakasirPayUrl +=
              '&qris_only=1';
          }

          window.location.href =
            pakasirPayUrl;

          return;
        }

        alert(
          json.error ||
            'Gagal memproses transaksi.'
        );
      } catch (error) {
        console.error(
          'CHECKOUT ERROR:',
          error
        );

        alert(
          'Terjadi kesalahan koneksi.'
        );
      } finally {
        setSubmitting(false);
      }
    };

  // ==========================================================================
  // LOAD PROGRAM
  // ==========================================================================

  useEffect(() => {
    let cancelled =
      false;

    async function loadProgram() {
      try {
        setLoading(true);

        const res =
          await fetch(
            `/api/programs?t=${Date.now()}`,
            {
              cache:
                'no-store',
            }
          );

        if (!res.ok) {
          throw new Error(
            `HTTP ${res.status}`
          );
        }

        const json =
          await res.json();

        if (
          json.success &&
          Array.isArray(
            json.data
          )
        ) {
          const decodedSlug =
            decodeURIComponent(
              slug
            );

          const cleanParamSlug =
            decodedSlug
              .toLowerCase()
              .replace(
                /[^a-z0-9]/g,
                ''
              );

          const found =
            json.data.find(
              (p: any) => {
                const programSlug =
                  String(
                    p?.slug ||
                      ''
                  );

                const cleanDbSlug =
                  programSlug
                    .toLowerCase()
                    .replace(
                      /[^a-z0-9]/g,
                      ''
                    );

                return (
                  cleanDbSlug ===
                    cleanParamSlug ||
                  programSlug ===
                    decodedSlug ||
                  p?._id ===
                    decodedSlug
                );
              }
            );

          if (!cancelled) {
            setProgram(
              found || null
            );
          }
        } else {
          if (!cancelled) {
            setProgram(null);
          }
        }
      } catch (error) {
        console.error(
          'Fetch detail campaign error:',
          error
        );

        if (!cancelled) {
          setProgram(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProgram();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ==========================================================================
  // COPY LINK
  // ==========================================================================

  const handleCopyLink =
    async () => {
      try {
        const url =
          shareUrl ||
          window.location.href;

        await navigator.clipboard.writeText(
          url
        );

        setCopied(true);

        window.setTimeout(
          () => {
            setCopied(false);
          },
          2000
        );
      } catch (error) {
        console.error(
          'COPY LINK ERROR:',
          error
        );
      }
    };

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">

        <DetailHeader
          title="Program Donasi"
          onOpenShare={() =>
            setIsShareModalOpen(
              true
            )
          }
        />

        <div className="mx-auto w-full max-w-md px-3 py-6">

          <div className="animate-pulse space-y-4 border border-gray-200 bg-white p-4 shadow-sm">

            <div className="aspect-[16/10] bg-gray-200" />

            <div className="h-5 w-4/5 bg-gray-200" />

            <div className="h-4 w-28 bg-gray-200" />

            <div className="h-7 w-40 bg-gray-200" />

            <div className="h-2.5 w-full bg-gray-200" />

          </div>

        </div>
      </div>
    );
  }

  // ==========================================================================
  // TIDAK DITEMUKAN
  // ==========================================================================

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50">

        <DetailHeader
          title="Program Donasi"
          onOpenShare={() =>
            setIsShareModalOpen(
              true
            )
          }
        />

        <div className="px-4 py-20 text-center">

          <p className="text-sm font-medium text-red-500 sm:text-base">
            Program tidak ditemukan.
          </p>

        </div>
      </div>
    );
  }

  // ==========================================================================
  // DATA PROGRAM
  // ==========================================================================

  const rawTarget =
    Number(
      program.targetAmount ||
        50_000_000
    ) || 50_000_000;

  const currentCollected =
    Number(
      program.collectedAmount ||
        program.collectedRaw ||
        0
    ) || 0;

  const percentage =
    rawTarget > 0
      ? Math.min(
          Math.round(
            (currentCollected /
              rawTarget) *
              100
          ),
          100
        )
      : 0;

  const counterSlug =
    typeof program?.slug ===
      'string' &&
    program.slug.trim()
      ? program.slug.trim()
      : slug;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      <DetailHeader
        title="Program Donasi"
        onOpenShare={() =>
          setIsShareModalOpen(
            true
          )
        }
      />

      {/* ==================================================================== */}
      {/* CONTENT */}
      {/* ==================================================================== */}

      <div className="mx-auto w-full max-w-md space-y-4 px-3 pt-4">

        <div className="space-y-4 rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm sm:p-6">

          {/* ================================================================ */}
          {/* IMAGE */}
          {/* ================================================================ */}

          <div className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-100 shadow-inner">

            <img
              src={
                program.image ||
                '/images/placeholder.jpg'
              }
              alt={
                program.title ||
                'Program Donasi'
              }
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover"
            />

          </div>

          {/* ================================================================ */}
          {/* TITLE */}
          {/* ================================================================ */}

          <h1 className="text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
            {program.title}
          </h1>

          {/* ================================================================ */}
          {/* VIEW COUNTER */}
          {/* ================================================================ */}

          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">

            <span className="text-[11px] font-medium text-slate-400 sm:text-xs">
              Program Kebaikan
            </span>

            <ViewCounter
              type="campaign"
              slug={
                counterSlug
              }
              className="shrink-0 font-medium"
            />

          </div>

          {/* ================================================================ */}
          {/* PROGRESS */}
          {/* ================================================================ */}

          <div className="space-y-2 pt-1">

            <p className="text-lg font-extrabold text-emerald-900 sm:text-xl">
              Rp{' '}
              {currentCollected.toLocaleString(
                'id-ID'
              )}
            </p>

            <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-500 sm:text-sm">

              <span>
                Terkumpul dari{' '}
                <strong className="text-slate-800">
                  Rp{' '}
                  {rawTarget.toLocaleString(
                    'id-ID'
                  )}
                </strong>
              </span>

              <span className="shrink-0">
                {program.daysLeft
                  ? `${program.daysLeft} hari lagi`
                  : 'Mendesak'}
              </span>

            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">

              <div
                className="h-full bg-[#e91e63] transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                }}
              />

            </div>

            <div className="flex justify-between text-[10px] font-semibold text-slate-400">
              <span>
                {percentage}% tercapai
              </span>

              <span>
                {Number(
                  program.donorsCount ||
                    (
                      program.donors ||
                      []
                    ).length ||
                    0
                ).toLocaleString(
                  'id-ID'
                )}{' '}
                donatur
              </span>
            </div>

          </div>

          {/* ================================================================ */}
          {/* TAB */}
          {/* ================================================================ */}

          <div className="flex space-x-6 border-b border-gray-200 pt-2 text-xs font-bold text-slate-500 sm:text-sm">

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'cerita'
                )
              }
              className={`cursor-pointer border-b-2 pb-2.5 transition focus:outline-none ${
                activeTab ===
                'cerita'
                  ? 'border-emerald-900 text-emerald-900'
                  : 'border-transparent'
              }`}
            >
              Cerita
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'donatur'
                )
              }
              className={`cursor-pointer border-b-2 pb-2.5 transition focus:outline-none ${
                activeTab ===
                'donatur'
                  ? 'border-emerald-900 text-emerald-900'
                  : 'border-transparent'
              }`}
            >
              Donatur (
              {(
                program.donors ||
                []
              ).length}
              )
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'laporan'
                )
              }
              className={`cursor-pointer border-b-2 pb-2.5 transition focus:outline-none ${
                activeTab ===
                'laporan'
                  ? 'border-emerald-900 text-emerald-900'
                  : 'border-transparent'
              }`}
            >
              Laporan (
              {(
                program.reports ||
                []
              ).length}
              )
            </button>

          </div>

          {/* ================================================================ */}
          {/* TAB CONTENT */}
          {/* ================================================================ */}

          <div className="py-2 text-left">

            {/* CERITA */}

            {activeTab ===
              'cerita' && (
              <div className="space-y-4">

                {program.category
                  ?.toUpperCase?.() ===
                  'ZAKAT' && (
                  <EmbeddedZakatCalculator
                    onApplyAmount={(
                      val
                    ) => {
                      setAmount(
                        val
                      );

                      setIsMobileFormOpen(
                        true
                      );
                    }}
                  />
                )}

                <div className="space-y-4 text-base font-normal leading-relaxed text-slate-800 sm:text-lg">

                  {program.description ? (
                    typeof program.description ===
                    'string' ? (
                      <p>
                        {
                          program.description
                        }
                      </p>
                    ) : (
                      <PortableText
                        value={
                          program.description
                        }
                      />
                    )
                  ) : (
                    <p className="italic text-slate-400">
                      Belum ada cerita detail.
                    </p>
                  )}

                </div>

              </div>
            )}

            {/* DONATUR */}

            {activeTab ===
              'donatur' && (
              <div className="space-y-3 py-1">

                {(
                  program.donors ||
                  []
                ).length >
                0 ? (
                  [
                    ...program.donors,
                  ]
                    .reverse()
                    .map(
                      (
                        donor: any,
                        idx: number
                      ) => (
                        <div
                          key={
                            donor?._key ||
                            `${idx}-${donor?.name || 'donor'}`
                          }
                          className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-gray-50 p-3.5"
                        >
                          <div className="flex items-center space-x-3">

                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-base font-bold text-emerald-900 shadow-inner">
                              {(
                                donor.name ||
                                'H'
                              )
                                .toUpperCase()
                                .slice(
                                  0,
                                  1
                                )}
                            </div>

                            <div>
                              <p className="text-sm font-bold text-slate-800 sm:text-base">
                                {donor.name ||
                                  'Hamba Allah'}
                              </p>

                              <p className="text-xs font-normal text-slate-400">
                                {donor.date ||
                                  'Baru Saja'}
                              </p>
                            </div>

                          </div>

                          <p className="text-sm font-bold text-emerald-900 sm:text-base">
                            +Rp{' '}
                            {Number(
                              donor.amount ||
                                0
                            ).toLocaleString(
                              'id-ID'
                            )}
                          </p>

                        </div>
                      )
                    )
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400 sm:text-base">
                    Belum ada donatur.
                  </p>
                )}

              </div>
            )}

            {/* LAPORAN */}

            {activeTab ===
              'laporan' && (
              <div className="space-y-4 py-1">

                {(
                  program.reports ||
                  []
                ).length >
                0 ? (
                  [
                    ...program.reports,
                  ]
                    .reverse()
                    .map(
                      (
                        report: any,
                        idx: number
                      ) => (
                        <div
                          key={
                            report?._key ||
                            idx
                          }
                          className="space-y-2.5 rounded-xl border border-gray-200/80 bg-gray-50 p-4"
                        >

                          <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-2.5">

                            <h4 className="text-sm font-bold text-slate-800 sm:text-base">
                              {report.title ||
                                'Laporan Penyaluran'}
                            </h4>

                            <span className="shrink-0 text-xs font-medium text-slate-400">
                              {report.date ||
                                ''}
                            </span>

                          </div>

                          <div className="text-sm leading-relaxed text-slate-800 sm:text-base">

                            {typeof report.content ===
                            'string' ? (
                              <p>
                                {
                                  report.content
                                }
                              </p>
                            ) : report.content ? (
                              <PortableText
                                value={
                                  report.content
                                }
                              />
                            ) : null}

                          </div>

                        </div>
                      )
                    )
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400 sm:text-base">
                    Belum ada pembaruan laporan.
                  </p>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

      {/* ==================================================================== */}
      {/* FLOATING DONATE */}
      {/* ==================================================================== */}

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-3">

        <div className="pointer-events-auto w-[calc(100%-1.5rem)] max-w-md rounded-xl border border-gray-200 bg-white p-3.5 shadow-xl">

          <button
            type="button"
            onClick={() =>
              setIsMobileFormOpen(
                true
              )
            }
            className="w-full cursor-pointer rounded-xl bg-[#e91e63] py-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-md transition-all hover:bg-pink-700 active:scale-[0.99] sm:text-base"
          >
            Donasi sekarang
          </button>

        </div>

      </div>

      {/* ==================================================================== */}
      {/* MODAL DONASI */}
      {/* ==================================================================== */}

      {isMobileFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-3">

          <div
            className="absolute inset-0"
            onClick={() =>
              setIsMobileFormOpen(
                false
              )
            }
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:rounded-2xl">

            <div className="flex items-center justify-between border-b border-gray-100 pb-3">

              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 sm:text-base">
                Pilih Nominal Donasi
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsMobileFormOpen(
                    false
                  )
                }
                className="cursor-pointer p-1 text-lg font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>

            </div>

            <DonationFormFields
              profile={profile}
              setProfile={
                setProfile
              }
              amount={amount}
              setAmount={
                setAmount
              }
              paymentMethod={
                paymentMethod
              }
              setPaymentMethod={
                setPaymentMethod
              }
              handleDonate={
                handleDonate
              }
              handleInlineSavePhone={
                handleInlineSavePhone
              }
              submitting={
                submitting
              }
              isLoggedIn={
                isLoggedIn
              }
              inlinePhone={
                inlinePhone
              }
              setInlinePhone={
                setInlinePhone
              }
              savingPhone={
                savingPhone
              }
            />

          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL SHARE */}
      {/* ==================================================================== */}

      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs">

          <div
            className="absolute inset-0"
            onClick={() =>
              setIsShareModalOpen(
                false
              )
            }
          />

          <div className="relative z-10 w-full max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-gray-100 pb-3">

              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 sm:text-base">
                Bagikan Program Kebaikan
              </h3>

              <button
                type="button"
                onClick={() =>
                  setIsShareModalOpen(
                    false
                  )
                }
                className="cursor-pointer p-1 text-lg font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>

            </div>

            {/* COPY */}

            <div className="space-y-1.5">

              <label className="block text-xs font-semibold text-slate-600 sm:text-sm">
                Tautan Program Campaign
              </label>

              <div className="flex items-center gap-2">

                <input
                  type="text"
                  readOnly
                  value={
                    shareUrl
                  }
                  className="flex-1 truncate rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2.5 font-mono text-xs text-slate-700 focus:outline-none sm:text-sm"
                />

                <button
                  type="button"
                  onClick={
                    handleCopyLink
                  }
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-950 sm:text-sm"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}

                  <span>
                    {copied
                      ? 'Tersalin'
                      : 'Salin'}
                  </span>

                </button>

              </div>

            </div>

            {/* SHARE BUTTON */}

            <div className="grid grid-cols-3 gap-2.5 pt-1">

              {/* WHATSAPP */}

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Ayo bantu program kebaikan ini: ${
                    program?.title ||
                    ''
                  }\n${shareUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center space-y-1.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800 shadow-sm transition hover:bg-emerald-100"
              >
                <MessageCircle className="h-6 w-6 text-emerald-600" />

                <span className="text-xs font-bold sm:text-sm">
                  WhatsApp
                </span>
              </a>

              {/* FACEBOOK */}

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  shareUrl
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center space-y-1.5 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-blue-800 shadow-sm transition hover:bg-blue-100"
              >
                <svg
                  className="h-6 w-6 fill-current text-blue-600"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>

                <span className="text-xs font-bold sm:text-sm">
                  Facebook
                </span>
              </a>

              {/* X / TWITTER */}

              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                  shareUrl
                )}&text=${encodeURIComponent(
                  program?.title ||
                    ''
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center space-y-1.5 rounded-xl border border-gray-200 bg-gray-100 p-3.5 text-slate-800 shadow-sm transition hover:bg-gray-200"
              >
                <svg
                  className="mt-0.5 h-5 w-5 fill-current text-slate-900"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>

                <span className="mt-0.5 text-xs font-bold sm:text-sm">
                  Twitter/X
                </span>
              </a>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
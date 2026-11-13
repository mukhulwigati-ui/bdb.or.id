// components/CampaignDetailClient.tsx
"use client";

import React, {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { PortableText } from "@portabletext/react";
import { QRCodeSVG } from "qrcode.react";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Loader2,
  RefreshCw,
  Share2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import ViewCounter from "@/components/ViewCounter";

// ============================================================================
// TYPES
// ============================================================================

interface Donor {
  name?: string;
  date?: string;
  amount?: number | string;
}

interface ReportItem {
  title?: string;
  date?: string;
  content?: any;
}

interface Program {
  _id?: string;
  id?: string;
  title?: string;
  slug?: string;
  image?: string;
  category?: string;
  description?: any;
  collectedAmount?: number | string;
  targetAmount?: number | string;
  daysLeft?: number;
  donors?: Donor[];
  reports?: ReportItem[];
}

interface Profile {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  phone?: string;
}

interface CampaignDetailClientProps {
  slug: string;
  referral: string | null;
  program: Program;
  initialProfile?: Profile | null;
}

type PaymentStatus =
  | "pending"
  | "paid"
  | "success"
  | "expired"
  | "cancel"
  | "failed";

interface CasakuPayment {
  orderId: string;
  transactionId: string;
  amount: number;
  totalAmount: number;
  qrString: string;
  status: PaymentStatus;
  expiredAt?: string | null;
  expiredInMinutes?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRESET_AMOUNTS = [
  10_000,
  15_000,
  25_000,
  50_000,
  100_000,
  250_000,
];

const STATUS_POLL_INTERVAL = 3000;

// ============================================================================
// HELPERS
// ============================================================================

function cleanNumber(value: unknown): number {
  return (
    Number(
      String(value ?? "").replace(/[^0-9]/g, "")
    ) || 0
  );
}

function formatRupiahInput(value: string): string {
  const raw = value.replace(/[^0-9]/g, "");
  if (!raw) return "";
  return Number(raw).toLocaleString("id-ID");
}

function formatRupiah(value: number): string {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function normalizePhone(value: unknown): string {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getPaymentExpiryTimestamp(payment: CasakuPayment): number {
  if (payment.expiredAt) {
    const parsed = new Date(payment.expiredAt).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }
  const minutes = payment.expiredInMinutes || 15;
  return Date.now() + minutes * 60 * 1000;
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value || "").trim().toLowerCase();
  if (status === "paid" || status === "success" || status === "settlement") {
    return "paid";
  }
  if (status === "expired") return "expired";
  if (status === "cancel" || status === "canceled" || status === "cancelled") return "cancel";
  if (status === "failed" || status === "error") return "failed";
  return "pending";
}

// ============================================================================
// HEADER
// ============================================================================

interface DetailHeaderProps {
  title?: string;
  onOpenShare: () => void;
}

function DetailHeader({ title = "Program Donasi", onOpenShare }: DetailHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0d5c91] text-white shadow-sm">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex cursor-pointer items-center justify-center rounded-lg border border-white/30 p-2 transition-colors hover:bg-white/10"
          aria-label="Kembali ke halaman sebelumnya"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>

        <div className="max-w-[220px] truncate text-sm font-bold tracking-tight text-white sm:max-w-[280px] sm:text-base">
          {title}
        </div>

        <button
          type="button"
          onClick={onOpenShare}
          className="flex cursor-pointer items-center justify-center rounded-lg border border-white/30 p-2 transition-colors hover:bg-white/10"
          aria-label="Bagikan program"
        >
          <Share2 className="h-5 w-5 text-white" />
        </button>
      </div>
    </header>
  );
}

// ============================================================================
// KALKULATOR ZAKAT
// ============================================================================

interface EmbeddedZakatCalculatorProps {
  onApplyAmount: (value: string) => void;
}

function EmbeddedZakatCalculator({ onApplyAmount }: EmbeddedZakatCalculatorProps) {
  const [activeTab, setActiveTab] = useState<"penghasilan" | "maal" | "emas">("penghasilan");
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");

  const HARGA_EMAS = 1_400_000;
  const NISHAB_TAHUNAN = 85 * HARGA_EMAS;
  const NISHAB_BULANAN = Math.round(NISHAB_TAHUNAN / 12);

  let totalZakat = 0;
  let isWajib = false;

  if (activeTab === "penghasilan") {
    const total = cleanNumber(input1) + cleanNumber(input2);
    isWajib = total >= NISHAB_BULANAN;
    totalZakat = isWajib ? Math.round(total * 0.025) : 0;
  } else if (activeTab === "maal") {
    const total = cleanNumber(input1) + cleanNumber(input2);
    isWajib = total >= NISHAB_TAHUNAN;
    totalZakat = isWajib ? Math.round(total * 0.025) : 0;
  } else if (activeTab === "emas") {
    const berat = Number(input1) || 0;
    isWajib = berat >= 85;
    totalZakat = isWajib ? Math.round(berat * HARGA_EMAS * 0.025) : 0;
  }

  const resetInputs = () => {
    setInput1("");
    setInput2("");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-extrabold">
        <button
          type="button"
          onClick={() => {
            setActiveTab("penghasilan");
            resetInputs();
          }}
          className={`flex-1 cursor-pointer border-b-2 py-3 text-center transition ${
            activeTab === "penghasilan"
              ? "border-[#0d5c91] bg-white text-[#0d5c91]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          PENGHASILAN
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("maal");
            resetInputs();
          }}
          className={`flex-1 cursor-pointer border-b-2 py-3 text-center transition ${
            activeTab === "maal"
              ? "border-[#0d5c91] bg-white text-[#0d5c91]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          MAAL
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("emas");
            resetInputs();
          }}
          className={`flex-1 cursor-pointer border-b-2 py-3 text-center transition ${
            activeTab === "emas"
              ? "border-[#0d5c91] bg-white text-[#0d5c91]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          EMAS
        </button>
      </div>

      <div className="space-y-4 p-4 text-left">
        {activeTab !== "emas" ? (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 sm:text-sm">
                {activeTab === "penghasilan" ? "Pendapatan Utama Per Bulan (Rp)" : "Total Harta / Tabungan (Rp)"}
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0d5c91]"
                placeholder="0"
                value={input1}
                onChange={(e) => setInput1(formatRupiahInput(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 sm:text-sm">
                {activeTab === "penghasilan" ? "Tunjangan / Bonus / THR (Rp)" : "Harta Lain yang Dihitung (Rp)"}
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0d5c91]"
                placeholder="0"
                value={input2}
                onChange={(e) => setInput2(formatRupiahInput(e.target.value))}
              />
            </div>
          </>
        ) : (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 sm:text-sm">
              Total Berat Emas (Gram)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0d5c91]"
              placeholder="Contoh: 90"
              value={input1}
              onChange={(e) => setInput1(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-sky-100 bg-sky-50/60 p-4 text-center">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Estimasi Zakat Wajib
          </span>
          <span className="block text-2xl font-black text-[#0d5c91]">
            {formatRupiah(totalZakat)}
          </span>
          {input1 && (
            <p className={`text-xs font-semibold ${isWajib ? "text-emerald-700" : "text-slate-500"}`}>
              {isWajib ? "✓ Berdasarkan estimasi, telah mencapai nishab." : "⚠ Berdasarkan estimasi, belum mencapai nishab."}
            </p>
          )}
          <button
            type="button"
            disabled={totalZakat <= 0}
            onClick={() => onApplyAmount(totalZakat.toLocaleString("id-ID"))}
            className="w-full cursor-pointer rounded-xl bg-[#0d5c91] py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Gunakan Nominal Ini di Form
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DONATION FORM FIELDS (DALAM POP-UP MODAL)
// ============================================================================

interface DonationFormFieldsProps {
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  amount: string;
  setAmount: React.Dispatch<React.SetStateAction<string>>;
  handleDonate: () => Promise<void>;
  handleInlineSavePhone: () => Promise<void>;
  submitting: boolean;
  isLoggedIn: boolean;
  inlinePhone: string;
  setInlinePhone: React.Dispatch<React.SetStateAction<string>>;
  savingPhone: boolean;
  isZakatProgram: boolean;
}

function DonationFormFields({
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
  isZakatProgram,
}: DonationFormFieldsProps) {
  const cleanAmountNum = cleanNumber(amount);
  const currentPhone = normalizePhone(profile?.phone);
  const hasPhone = Boolean(currentPhone && currentPhone.length >= 9);

  return (
    <div className="space-y-4 text-left">
      <div>
        <label className="mb-2 block text-xs font-extrabold text-slate-900 sm:text-sm">
          Pilih Nominal {isZakatProgram ? "Zakat" : "Donasi"}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_AMOUNTS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAmount(value.toLocaleString("id-ID"))}
              className={`rounded-xl border px-2 py-3 text-xs font-bold transition ${
                cleanAmountNum === value
                  ? "border-[#0d5c91] bg-sky-50 text-[#0d5c91] shadow-sm ring-1 ring-[#0d5c91]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Rp {value >= 1_000_000 ? `${value / 1_000_000}jt` : `${value / 1_000}rb`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Masukkan Nominal {isZakatProgram ? "Zakat" : "Donasi"} Lainnya
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-sm font-bold text-slate-400">Rp</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Min. 1.000"
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3.5 text-sm font-bold text-slate-900 outline-none focus:border-[#0d5c91] sm:text-base"
            value={amount}
            onChange={(e) => setAmount(formatRupiahInput(e.target.value))}
          />
        </div>
      </div>

      <hr className="my-2 border-slate-100" />

      {isLoggedIn ? (
        hasPhone ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50 p-3.5">
            <div className="min-w-0 space-y-0.5">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                Login ✓ {profile?.name ? ` • ${profile.name}` : ""}
              </span>
              <p className="truncate text-xs font-extrabold text-slate-900">
                WhatsApp: {profile?.phone}
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
                Halo, {profile?.name || "Dermawan"}!
              </span>
              <p className="text-[11px] leading-relaxed text-amber-700">
                Lengkapi nomor WhatsApp untuk pengiriman kuitansi dan informasi donasi.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="tel"
                inputMode="tel"
                placeholder="Contoh: 081234567890"
                className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0d5c91]"
                value={inlinePhone}
                onChange={(e) => setInlinePhone(e.target.value)}
              />
              <button
                type="button"
                onClick={handleInlineSavePhone}
                disabled={savingPhone}
                className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
              >
                {savingPhone ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Nama Donatur</label>
            <input
              type="text"
              placeholder="Hamba Allah (boleh kosong)"
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0d5c91]"
              value={profile?.name || ""}
              onChange={(e) =>
                setProfile((prev) => ({ ...(prev || {}), name: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Nomor WhatsApp *</label>
            <input
              type="tel"
              inputMode="tel"
              placeholder="Contoh: 081234567890"
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0d5c91]"
              value={profile?.phone || ""}
              onChange={(e) =>
                setProfile((prev) => ({ ...(prev || {}), phone: e.target.value }))
              }
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-sky-100 bg-sky-50 px-3.5 py-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0d5c91]" />
          <p className="text-[11px] leading-relaxed text-slate-600">
            Pembayaran menggunakan QRIS. Setelah transaksi dibuat, scan QR yang tampil menggunakan aplikasi bank atau dompet digital Anda.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          void handleDonate();
        }}
        disabled={submitting || (isLoggedIn && !hasPhone)}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#e91e63] py-4 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-pink-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 sm:text-base"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Membuat QRIS...
          </>
        ) : (
          "LANJUT PEMBAYARAN"
        )}
      </button>
    </div>
  );
}

// ============================================================================
// QRIS PAYMENT MODAL
// ============================================================================

interface QrisPaymentModalProps {
  payment: CasakuPayment;
  countdown: number;
  checkingStatus: boolean;
  onClose: () => void;
  onCheckStatus: () => Promise<void>;
}

function QrisPaymentModal({
  payment,
  countdown,
  checkingStatus,
  onClose,
  onCheckStatus,
}: QrisPaymentModalProps) {
  const isPaid = payment.status === "paid" || payment.status === "success";
  const isExpired = payment.status === "expired" || countdown <= 0;
  const isFailed = payment.status === "failed" || payment.status === "cancel";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Pembayaran QRIS"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tutup pembayaran"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0d5c91]">
              Pembayaran QRIS
            </p>
            <h2 className="mt-0.5 text-base font-extrabold text-slate-900">
              Selesaikan Pembayaran
            </h2>
          </div>

          {!isPaid && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200"
              aria-label="Tutup pembayaran"
            >
              ×
            </button>
          )}
        </div>

        <div className="space-y-5 p-5">
          {isPaid ? (
            <div className="space-y-4 py-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-11 w-11 text-emerald-600" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Pembayaran Berhasil</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Terima kasih. Transaksi Anda telah terverifikasi.
                </p>
              </div>

              <div className="border-y border-slate-100 py-4">
                <p className="text-xs font-medium text-slate-500">Total Pembayaran</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-600">
                  {formatRupiah(payment.totalAmount)}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Mengalihkan ke halaman konfirmasi...
              </div>
            </div>
          ) : isExpired ? (
            <div className="space-y-4 py-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
                <Clock3 className="h-10 w-10 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">QRIS Kedaluwarsa</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Waktu pembayaran telah habis. Tutup halaman ini lalu buat transaksi baru.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-[#0d5c91] py-3.5 text-sm font-extrabold text-white"
              >
                Buat Pembayaran Baru
              </button>
            </div>
          ) : isFailed ? (
            <div className="space-y-4 py-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Transaksi Dibatalkan</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Silakan buat transaksi QRIS baru untuk melanjutkan.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-[#0d5c91] py-3.5 text-sm font-extrabold text-white"
              >
                Kembali
              </button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-xs font-medium text-slate-500">Total yang harus dibayar</p>
                <p className="mt-1 text-2xl font-black text-[#0d5c91]">
                  {formatRupiah(payment.totalAmount)}
                </p>
                {payment.totalAmount !== payment.amount && (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    Nominal termasuk kode unik untuk verifikasi pembayaran otomatis.
                  </p>
                )}
              </div>

              <div className="mx-auto flex w-fit items-center justify-center border border-slate-200 bg-white p-4 shadow-sm">
                <QRCodeSVG
                  value={payment.qrString}
                  size={250}
                  level="M"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor="#111827"
                />
              </div>

              <div className="text-center">
                <p className="text-xs font-bold text-slate-700">
                  Scan QRIS menggunakan aplikasi pembayaran Anda
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  DANA, GoPay, ShopeePay, mobile banking, atau aplikasi lain yang mendukung QRIS.
                </p>
              </div>

              <div className="flex items-center justify-between border-y border-slate-100 py-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-slate-500">Berlaku selama</span>
                </div>
                <span className="font-mono text-sm font-extrabold text-amber-600">
                  {formatCountdown(countdown)}
                </span>
              </div>

              <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#0d5c91]" />
                  <span className="text-xs font-bold text-[#0d5c91]">Menunggu pembayaran</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Status akan diperiksa otomatis. Jangan tutup halaman sebelum pembayaran selesai.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={checkingStatus}
                  onClick={() => void onCheckStatus()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${checkingStatus ? "animate-spin" : ""}`} />
                  Cek Status Pembayaran
                </button>
                <p className="text-center font-mono text-[10px] text-slate-400">
                  ID Transaksi: {payment.orderId}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: CampaignDetailClient
// ============================================================================

export default function CampaignDetailClient({
  slug,
  referral,
  program,
  initialProfile,
}: CampaignDetailClientProps) {
  const router = useRouter();

  const [amount, setAmount] = useState("50.000");
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(Boolean(initialProfile));
  const [submitting, setSubmitting] = useState(false);
  const [inlinePhone, setInlinePhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  // State untuk mengontrol Pop-up Formulir Donasi
  const [isDonateModalOpen, setIsDonateModalOpen] = useState<boolean>(false);

  // Deteksi apakah program ini berjenis zakat berdasarkan kategori atau judul
  const programTitleLower = (program.title || "").toLowerCase();
  const programCategoryLower = (program.category || "").toLowerCase();
  const isZakatProgram =
    programTitleLower.includes("zakat") ||
    programCategoryLower.includes("zakat") ||
    slug.toLowerCase().includes("zakat");

  // Tab State ("cerita" | "donatur" | "laporan")
  const [activeTab, setActiveTab] = useState<"cerita" | "donatur" | "laporan">("cerita");

  // State untuk Modal QRIS
  const [payment, setPayment] = useState<CasakuPayment | null>(null);
  const [countdown, setCountdown] = useState<number>(900); // 15 menit
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);

  // Hitung persentase terkumpul
  const collectedNum = cleanNumber(program.collectedAmount);
  const targetNum = cleanNumber(program.targetAmount) || 50_000_000;
  const percentage = Math.min(100, Math.round((collectedNum / targetNum) * 100));

  // Ambil sesi user supabase di client jika belum ada
  useEffect(() => {
    async function fetchSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsLoggedIn(true);
        const meta = session.user.user_metadata || {};
        setProfile({
          id: session.user.id,
          name: meta.full_name || meta.name || session.user.email?.split("@")[0] || "",
          email: session.user.email,
          phone: meta.phone || meta.whatsapp || "",
        });
      }
    }
    if (!initialProfile) {
      fetchSession();
    }
  }, [initialProfile]);

  // Handle Simpan Nomor HP Cepat
  const handleInlineSavePhone = async () => {
    const cleanPhone = normalizePhone(inlinePhone);
    if (cleanPhone.length < 9) {
      alert("Nomor WhatsApp tidak valid.");
      return;
    }
    setSavingPhone(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.auth.updateUser({
          data: { phone: cleanPhone, whatsapp: cleanPhone },
        });
      }
      setProfile((prev) => (prev ? { ...prev, phone: cleanPhone } : { phone: cleanPhone }));
      alert("Nomor WhatsApp berhasil disimpan!");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan nomor.");
    } finally {
      setSavingPhone(false);
    }
  };

  // Handle Buat Transaksi Donasi & Munculkan QRIS
  const handleDonate = async () => {
    const numericAmount = cleanNumber(amount);
    if (numericAmount < 1000) {
      alert("Minimum nominal adalah Rp 1.000");
      return;
    }

    const phoneToCheck = normalizePhone(profile?.phone || inlinePhone);
    const isValidPhone =
      phoneToCheck.length >= 9 &&
      phoneToCheck.length <= 15 &&
      (phoneToCheck.startsWith("0") ||
        phoneToCheck.startsWith("62") ||
        phoneToCheck.startsWith("8"));

    if (!isValidPhone) {
      alert("Nomor WhatsApp wajib diisi dengan benar.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: program._id || program.id,
          amount: numericAmount,
          donorName: profile?.name || "Hamba Allah",
          phone: phoneToCheck,
          donorEmail: profile?.email || "",
          fundraiserPhone: referral || "",
          programTitle: program.title,
          category: program.category,
          slug: program.slug || slug,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat transaksi.");
      }

      const newPayment: CasakuPayment = {
        orderId: json.orderId || json.transactionId,
        transactionId: json.transactionId || json.orderId,
        amount: json.amount || numericAmount,
        totalAmount: json.totalAmount || json.paymentAmount || numericAmount,
        qrString: json.qrString,
        status: normalizePaymentStatus(json.status),
        expiredAt: json.expiredAt || json.expiresAt,
        expiredInMinutes: json.expiredInMinutes || 15,
      };

      setIsDonateModalOpen(false); // Tutup pop-up form, buka pop-up QRIS
      setPayment(newPayment);
      const expiryTime = getPaymentExpiryTimestamp(newPayment);
      const secondsLeft = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setCountdown(secondsLeft);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setSubmitting(false);
    }
  };

  // Timer Countdown QRIS
  useEffect(() => {
    if (!payment || payment.status === "paid" || payment.status === "success") return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [payment]);

  // POLLING OTOMATIS & CEK STATUS STATUS KE SERVER
  const checkPaymentStatus = async (targetOrderId: string) => {
    try {
      const res = await fetch(`/api/donation/status?orderId=${targetOrderId}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (json.success && json.transaction) {
        const remoteStatus = normalizePaymentStatus(json.transaction.status);
        if (remoteStatus === "paid") {
          return "paid";
        }
      }
      return "pending";
    } catch (err) {
      console.error("Gagal cek status:", err);
      return "pending";
    }
  };

  // Efek Polling Otomatis Setiap 3 Detik
  useEffect(() => {
    if (!payment || payment.status === "paid" || payment.status === "success") return;

    const interval = setInterval(async () => {
      const currentId = payment.orderId;
      const statusResult = await checkPaymentStatus(currentId);

      if (statusResult === "paid") {
        setPayment((prev) => (prev ? { ...prev, status: "paid" } : null));
        clearInterval(interval);
        setTimeout(() => {
          window.location.href = `/thank-you?order_id=${currentId}`;
        }, 1500);
      }
    }, STATUS_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [payment]);

  // Tombol Cek Status Manual
  const handleManualCheckStatus = async () => {
    if (!payment) return;
    setCheckingStatus(true);
    try {
      const statusResult = await checkPaymentStatus(payment.orderId);
      if (statusResult === "paid") {
        setPayment((prev) => (prev ? { ...prev, status: "paid" } : null));
        setTimeout(() => {
          window.location.href = `/thank-you?order_id=${payment.orderId}`;
        }, 1500);
      } else {
        alert("Pembayaran belum terdeteksi lunas. Silakan selesaikan scan QRIS.");
      }
    } finally {
      setCheckingStatus(false);
    }
  };

  const donorList = Array.isArray(program.donors) ? program.donors : [];
  const reportList = Array.isArray(program.reports) ? program.reports : [];

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <DetailHeader
        title={program.title || "Detail Program"}
        onOpenShare={() => {
          if (navigator.share) {
            navigator.share({ title: program.title, url: window.location.href }).catch(() => {});
          } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Link program berhasil disalin!");
          }
        }}
      />

      <main className="mx-auto max-w-md p-4 space-y-4">
        {/* Gambar Utama Program */}
        <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
          {program.image && (
            <div className="relative aspect-[16/9] w-full bg-slate-100">
              <img src={program.image} alt={program.title} className="h-full w-full object-cover" />
            </div>
          )}
          <div className="p-4 space-y-3">
            <h1 className="text-xl font-extrabold text-slate-900 leading-snug">
              {program.title}
            </h1>
            <ViewCounter slug={slug} type="campaign" />
          </div>
        </div>

        {/* WIDGET PEROLEHAN & TARGET DONASI */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <div>
            <span className="text-2xl font-black text-[#0d5c91]">
              {formatRupiah(collectedNum)}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-500">
              Terkumpul dari <strong className="text-slate-800">{program.targetAmount ? formatRupiah(targetNum) : "Rp 50.000.000"}</strong>
            </span>
            <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0d5c91]">
              Mendesak
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[#e91e63] transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* HANYA MUNCUL JIKA INI PROGRAM ZAKAT */}
        {isZakatProgram && (
          <div className="space-y-2">
            <div className="px-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Kalkulator Zakat Interaktif
              </h3>
              <p className="text-[11px] text-slate-400">
                Hitung kewajiban zakat Anda dengan mudah dan akurat.
              </p>
            </div>
            <EmbeddedZakatCalculator
              onApplyAmount={(val) => {
                setAmount(val);
                setIsDonateModalOpen(true);
              }}
            />
          </div>
        )}

        {/* TAB NAVIGASI: Cerita | Donatur | Laporan */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100 text-sm">
            <button
              type="button"
              onClick={() => setActiveTab("cerita")}
              className={`flex-1 py-3 text-center font-bold transition ${
                activeTab === "cerita"
                  ? "border-b-2 border-[#0d5c91] text-[#0d5c91]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Cerita
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("donatur")}
              className={`flex-1 py-3 text-center font-bold transition ${
                activeTab === "donatur"
                  ? "border-b-2 border-[#0d5c91] text-[#0d5c91]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Donatur ({donorList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("laporan")}
              className={`flex-1 py-3 text-center font-bold transition ${
                activeTab === "laporan"
                  ? "border-b-2 border-[#0d5c91] text-[#0d5c91]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Laporan ({reportList.length})
            </button>
          </div>

          <div className="p-4">
            {activeTab === "cerita" && (
              <div className="space-y-4">
                <h2 className="text-base font-extrabold text-slate-900">
                  {program.title}
                </h2>
                <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
                  {program.description ? (
                    <PortableText value={program.description} />
                  ) : (
                    <p>Salurkan donasi terbaik Anda melalui program ini.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "donatur" && (
              <div className="space-y-3">
                {donorList.length > 0 ? (
                  donorList.map((donor, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{donor.name || "Hamba Allah"}</p>
                        <p className="text-[10px] text-slate-400">{donor.date || "Baru saja"}</p>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-600">
                        {typeof donor.amount === "number" ? formatRupiah(donor.amount) : donor.amount}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Belum ada donatur tercatat. Jadilah yang pertama berdonasi!
                  </div>
                )}
              </div>
            )}

            {activeTab === "laporan" && (
              <div className="space-y-3">
                {reportList.length > 0 ? (
                  reportList.map((rep, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-100 p-3 space-y-1">
                      <h4 className="text-xs font-bold text-slate-900">{rep.title}</h4>
                      <p className="text-[10px] text-slate-400">{rep.date}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Belum ada laporan penyaluran untuk program ini.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* STICKY BOTTOM BAR (TOMBOL DONASI FULL-WIDTH TANPA TOMBOL BAGIKAN) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => setIsDonateModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#e91e63] py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-pink-700 active:scale-[0.99]"
          >
            <HeartHandshake className="h-5 w-5 text-white" />
            {isZakatProgram ? "TUNAIKAN ZAKAT" : "DONASI SEKARANG"}
          </button>
        </div>
      </div>

      {/* POP-UP MODAL FORMULIR DONASI */}
      {isDonateModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Formulir Donasi"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Tutup formulir"
            onClick={() => setIsDonateModalOpen(false)}
          />

          <div className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0d5c91]">
                  {isZakatProgram ? "Formulir Zakat" : "Formulir Donasi"}
                </p>
                <h2 className="text-base font-extrabold text-slate-900">
                  {program.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDonateModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>

            <DonationFormFields
              profile={profile}
              setProfile={setProfile}
              amount={amount}
              setAmount={setAmount}
              handleDonate={handleDonate}
              handleInlineSavePhone={handleInlineSavePhone}
              submitting={submitting}
              isLoggedIn={isLoggedIn}
              inlinePhone={inlinePhone}
              setInlinePhone={setInlinePhone}
              savingPhone={savingPhone}
              isZakatProgram={isZakatProgram}
            />
          </div>
        </div>
      )}

      {/* MODAL QRIS PEMBAYARAN */}
      {payment && (
        <QrisPaymentModal
          payment={payment}
          countdown={countdown}
          checkingStatus={checkingStatus}
          onClose={() => setPayment(null)}
          onCheckStatus={handleManualCheckStatus}
        />
      )}
    </div>
  );
}
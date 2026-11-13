
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
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

type ServerPaymentResult = {
  status: PaymentStatus;
  paid: boolean;
  message?: string;
};

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
const DEFAULT_PAYMENT_MINUTES = 15;

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

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const minutes =
    payment.expiredInMinutes || DEFAULT_PAYMENT_MINUTES;

  return Date.now() + minutes * 60 * 1000;
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    [
      "paid",
      "success",
      "successful",
      "settlement",
      "settled",
      "completed",
      "complete",
      "lunas",
    ].includes(status)
  ) {
    return "paid";
  }

  if (
    [
      "expired",
      "expire",
      "timeout",
    ].includes(status)
  ) {
    return "expired";
  }

  if (
    [
      "cancel",
      "canceled",
      "cancelled",
    ].includes(status)
  ) {
    return "cancel";
  }

  if (
    [
      "failed",
      "failure",
      "error",
      "deny",
      "rejected",
    ].includes(status)
  ) {
    return "failed";
  }

  return "pending";
}

function isPaymentPaid(status: PaymentStatus): boolean {
  return status === "paid" || status === "success";
}

function isPaymentTerminal(status: PaymentStatus): boolean {
  return (
    isPaymentPaid(status) ||
    status === "expired" ||
    status === "failed" ||
    status === "cancel"
  );
}

function getApiErrorMessage(json: any): string {
  return (
    json?.message ||
    json?.error ||
    json?.data?.message ||
    "Gagal memeriksa status pembayaran."
  );
}

// ============================================================================
// HEADER
// ============================================================================

interface DetailHeaderProps {
  title?: string;
  onOpenShare: () => void;
}

function DetailHeader({
  title = "Program Donasi",
  onOpenShare,
}: DetailHeaderProps) {
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

function EmbeddedZakatCalculator({
  onApplyAmount,
}: EmbeddedZakatCalculatorProps) {
  const [activeTab, setActiveTab] = useState<
    "penghasilan" | "maal" | "emas"
  >("penghasilan");

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
  } else {
    const berat = Number(input1) || 0;

    isWajib = berat >= 85;
    totalZakat = isWajib
      ? Math.round(berat * HARGA_EMAS * 0.025)
      : 0;
  }

  const resetInputs = () => {
    setInput1("");
    setInput2("");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-extrabold">
        {(
          [
            ["penghasilan", "PENGHASILAN"],
            ["maal", "MAAL"],
            ["emas", "EMAS"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              resetInputs();
            }}
            className={`flex-1 cursor-pointer border-b-2 py-3 text-center transition ${
              activeTab === tab
                ? "border-[#0d5c91] bg-white text-[#0d5c91]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-4 text-left">
        {activeTab !== "emas" ? (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 sm:text-sm">
                {activeTab === "penghasilan"
                  ? "Pendapatan Utama Per Bulan (Rp)"
                  : "Total Harta / Tabungan (Rp)"}
              </label>

              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0d5c91]"
                placeholder="0"
                value={input1}
                onChange={(e) =>
                  setInput1(formatRupiahInput(e.target.value))
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 sm:text-sm">
                {activeTab === "penghasilan"
                  ? "Tunjangan / Bonus / THR (Rp)"
                  : "Harta Lain yang Dihitung (Rp)"}
              </label>

              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0d5c91]"
                placeholder="0"
                value={input2}
                onChange={(e) =>
                  setInput2(formatRupiahInput(e.target.value))
                }
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
            <p
              className={`text-xs font-semibold ${
                isWajib ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              {isWajib
                ? "✓ Berdasarkan estimasi, telah mencapai nishab."
                : "⚠ Berdasarkan estimasi, belum mencapai nishab."}
            </p>
          )}

          <button
            type="button"
            disabled={totalZakat <= 0}
            onClick={() =>
              onApplyAmount(totalZakat.toLocaleString("id-ID"))
            }
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
// DONATION FORM FIELDS
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
              onClick={() =>
                setAmount(value.toLocaleString("id-ID"))
              }
              className={`rounded-xl border px-2 py-3 text-xs font-bold transition ${
                cleanAmountNum === value
                  ? "border-[#0d5c91] bg-sky-50 text-[#0d5c91] shadow-sm ring-1 ring-[#0d5c91]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Rp{" "}
              {value >= 1_000_000
                ? `${value / 1_000_000}jt`
                : `${value / 1_000}rb`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Masukkan Nominal {isZakatProgram ? "Zakat" : "Donasi"} Lainnya
        </label>

        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-sm font-bold text-slate-400">
            Rp
          </span>

          <input
            type="text"
            inputMode="numeric"
            placeholder="Min. 1.000"
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3.5 text-sm font-bold text-slate-900 outline-none focus:border-[#0d5c91] sm:text-base"
            value={amount}
            onChange={(e) =>
              setAmount(formatRupiahInput(e.target.value))
            }
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
                Lengkapi nomor WhatsApp untuk pengiriman kuitansi dan
                informasi donasi.
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
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Nama Donatur
            </label>

            <input
              type="text"
              placeholder="Hamba Allah (boleh kosong)"
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0d5c91]"
              value={profile?.name || ""}
              onChange={(e) =>
                setProfile((prev) => ({
                  ...(prev || {}),
                  name: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Nomor WhatsApp *
            </label>

            <input
              type="tel"
              inputMode="tel"
              placeholder="Contoh: 081234567890"
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0d5c91]"
              value={profile?.phone || ""}
              onChange={(e) =>
                setProfile((prev) => ({
                  ...(prev || {}),
                  phone: e.target.value,
                }))
              }
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-sky-100 bg-sky-50 px-3.5 py-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0d5c91]" />

          <p className="text-[11px] leading-relaxed text-slate-600">
            Pembayaran menggunakan QRIS. Setelah transaksi dibuat,
            scan QR yang tampil menggunakan aplikasi bank atau dompet
            digital Anda.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleDonate()}
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
  const isPaid = isPaymentPaid(payment.status);
  const isExpired = payment.status === "expired";
  const isFailed =
    payment.status === "failed" || payment.status === "cancel";

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
              {isPaid
                ? "Pembayaran Berhasil"
                : "Selesaikan Pembayaran"}
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
                <h3 className="text-xl font-extrabold text-slate-900">
                  Pembayaran Berhasil
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Terima kasih. Transaksi Anda telah terverifikasi.
                </p>
              </div>

              <div className="border-y border-slate-100 py-4">
                <p className="text-xs font-medium text-slate-500">
                  Total Pembayaran
                </p>

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
                <h3 className="text-lg font-extrabold text-slate-900">
                  QRIS Kedaluwarsa
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Waktu pembayaran telah habis. Tutup halaman ini
                  lalu buat transaksi baru.
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
                <h3 className="text-lg font-extrabold text-slate-900">
                  Transaksi Dibatalkan
                </h3>

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
                <p className="text-xs font-medium text-slate-500">
                  Total yang harus dibayar
                </p>

                <p className="mt-1 text-2xl font-black text-[#0d5c91]">
                  {formatRupiah(payment.totalAmount)}
                </p>

                {payment.totalAmount !== payment.amount && (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    Nominal termasuk kode unik untuk verifikasi
                    pembayaran otomatis.
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
                  DANA, GoPay, ShopeePay, mobile banking, atau
                  aplikasi lain yang mendukung QRIS.
                </p>
              </div>

              <div className="flex items-center justify-between border-y border-slate-100 py-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-600" />

                  <span className="text-xs font-medium text-slate-500">
                    Berlaku selama
                  </span>
                </div>

                <span
                  className={`font-mono text-sm font-extrabold ${
                    countdown <= 60
                      ? "text-red-600"
                      : "text-amber-600"
                  }`}
                >
                  {countdown > 0
                    ? formatCountdown(countdown)
                    : "00:00"}
                </span>
              </div>

              <div className="space-y-2 rounded-xl border border-sky-100 bg-sky-50 p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#0d5c91]" />

                  <span className="text-xs font-bold text-[#0d5c91]">
                    Menunggu pembayaran
                  </span>
                </div>

                <p className="text-[11px] leading-relaxed text-slate-600">
                  Status diperiksa otomatis melalui server.
                  Jika Anda sudah membayar tetapi status belum
                  berubah, tekan tombol cek status.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={checkingStatus}
                  onClick={() => void onCheckStatus()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      checkingStatus ? "animate-spin" : ""
                    }`}
                  />

                  {checkingStatus
                    ? "Memeriksa..."
                    : "Cek Status Pembayaran"}
                </button>

                <p className="text-center font-mono text-[10px] text-slate-400">
                  ID Pesanan: {payment.orderId}
                </p>

                <p className="text-center font-mono text-[10px] text-slate-400">
                  ID Casaku: {payment.transactionId}
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
// MAIN COMPONENT
// ============================================================================

export default function CampaignDetailClient({
  slug,
  referral,
  program,
  initialProfile,
}: CampaignDetailClientProps) {
  const router = useRouter();

  const [amount, setAmount] = useState("50.000");
  const [profile, setProfile] = useState<Profile | null>(
    initialProfile || null
  );

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
    Boolean(initialProfile)
  );

  const [submitting, setSubmitting] = useState(false);
  const [inlinePhone, setInlinePhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);

  const programTitleLower = (program.title || "").toLowerCase();
  const programCategoryLower = (program.category || "").toLowerCase();

  const isZakatProgram =
    programTitleLower.includes("zakat") ||
    programCategoryLower.includes("zakat") ||
    slug.toLowerCase().includes("zakat");

  const [activeTab, setActiveTab] = useState<
    "cerita" | "donatur" | "laporan"
  >("cerita");

  const [payment, setPayment] = useState<CasakuPayment | null>(null);
  const [countdown, setCountdown] = useState<number>(900);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Mencegah polling bertumpuk dan mengatur redirect.
  const pollingRef = useRef(false);
  const redirectRef = useRef(false);
  const paymentRef = useRef<CasakuPayment | null>(null);

  const collectedNum = cleanNumber(program.collectedAmount);
  const targetNum =
    cleanNumber(program.targetAmount) || 50_000_000;

  const percentage = Math.min(
    100,
    Math.round((collectedNum / targetNum) * 100)
  );

  // ========================================================================
  // SESSION
  // ========================================================================

  useEffect(() => {
    let mounted = true;

    async function fetchSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted || !session?.user) return;

        const meta = session.user.user_metadata || {};

        setIsLoggedIn(true);

        setProfile({
          id: session.user.id,
          name:
            meta.full_name ||
            meta.name ||
            session.user.email?.split("@")[0] ||
            "",
          email: session.user.email,
          phone: meta.phone || meta.whatsapp || "",
        });
      } catch (error) {
        console.error("Gagal mengambil sesi:", error);
      }
    }

    if (!initialProfile) {
      void fetchSession();
    }

    return () => {
      mounted = false;
    };
  }, [initialProfile]);

  // Sinkronisasi ref agar callback polling selalu membaca transaksi terbaru.
  useEffect(() => {
    paymentRef.current = payment;
  }, [payment]);

  // ========================================================================
  // SIMPAN NOMOR TELEPON
  // ========================================================================

  const handleInlineSavePhone = async () => {
    const cleanPhone = normalizePhone(inlinePhone);

    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      alert("Nomor WhatsApp tidak valid.");
      return;
    }

    setSavingPhone(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("Sesi login tidak ditemukan.");
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          phone: cleanPhone,
          whatsapp: cleanPhone,
        },
      });

      if (error) throw error;

      setProfile((prev) => ({
        ...(prev || {}),
        phone: cleanPhone,
      }));

      setInlinePhone(cleanPhone);

      alert("Nomor WhatsApp berhasil disimpan!");
    } catch (error) {
      console.error("Gagal menyimpan nomor:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan nomor."
      );
    } finally {
      setSavingPhone(false);
    }
  };

  // ========================================================================
  // BUAT TRANSAKSI DONASI
  // ========================================================================

  const handleDonate = async () => {
    if (submitting) return;

    const numericAmount = cleanNumber(amount);

    if (numericAmount < 1000) {
      alert("Minimum nominal adalah Rp 1.000");
      return;
    }

    const phoneToCheck = normalizePhone(
      profile?.phone || inlinePhone
    );

    const isValidPhone =
      phoneToCheck.length >= 9 &&
      phoneToCheck.length <= 15 &&
      (
        phoneToCheck.startsWith("0") ||
        phoneToCheck.startsWith("62") ||
        phoneToCheck.startsWith("8")
      );

    if (!isValidPhone) {
      alert("Nomor WhatsApp wajib diisi dengan benar.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        throw new Error(getApiErrorMessage(json));
      }

      const orderId = String(json.orderId || "").trim();
      const transactionId = String(
        json.transactionId || ""
      ).trim();

      const qrString = String(
        json.qrString ||
        json.qr_string ||
        json.qrCode ||
        json.qr_code ||
        ""
      ).trim();

      if (!orderId) {
        throw new Error(
          "Server tidak mengembalikan ID pesanan."
        );
      }

      if (!qrString) {
        throw new Error(
          "QRIS tidak ditemukan dalam respons server."
        );
      }

      const newPayment: CasakuPayment = {
        orderId,
        transactionId: transactionId || orderId,
        amount: cleanNumber(json.amount) || numericAmount,
        totalAmount:
          cleanNumber(
            json.totalAmount ??
            json.paymentAmount ??
            json.payment_amount
          ) || numericAmount,
        qrString,
        status: normalizePaymentStatus(json.status),
        expiredAt:
          json.expiredAt ||
          json.expiresAt ||
          json.expired_at ||
          null,
        expiredInMinutes:
          cleanNumber(json.expiredInMinutes) ||
          DEFAULT_PAYMENT_MINUTES,
      };

      redirectRef.current = false;
      setIsDonateModalOpen(false);
      setPayment(newPayment);

      const expiryTime =
        getPaymentExpiryTimestamp(newPayment);

      setCountdown(
        Math.max(
          0,
          Math.floor((expiryTime - Date.now()) / 1000)
        )
      );

      // Jika API pembuatan transaksi sudah menyatakan paid,
      // jangan menunggu polling berikutnya.
      if (isPaymentPaid(newPayment.status)) {
        setTimeout(() => {
          window.location.href =
            `/thank-you?order_id=${encodeURIComponent(orderId)}`;
        }, 1500);
      }
    } catch (error) {
      console.error("Gagal membuat transaksi:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan sistem."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ========================================================================
  // COUNTDOWN
  // ========================================================================

  useEffect(() => {
    if (!payment || isPaymentTerminal(payment.status)) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [payment?.orderId, payment?.status]);

  // ========================================================================
  // CEK STATUS KE SERVER
  // ========================================================================

  const checkPaymentStatus = useCallback(
    async (
      targetOrderId: string
    ): Promise<ServerPaymentResult> => {
      try {
        const res = await fetch(
          `/api/donation/status?orderId=${encodeURIComponent(targetOrderId)}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const json = await res.json();

        if (!res.ok || !json.success) {
          console.error(
            "Respons pemeriksaan pembayaran:",
            json
          );

          return {
            status: "pending",
            paid: false,
            message: getApiErrorMessage(json),
          };
        }

        // Mendukung bentuk respons:
        // { transaction: { status: "success" } }
        // { transaction: { paymentStatus: "paid" } }
        // { transaction: { payment_status: "settlement" } }
        // { status: "paid" }
        const transaction = json.transaction || json.data || {};

        const rawStatus =
          transaction.status ??
          transaction.paymentStatus ??
          transaction.payment_status ??
          transaction.transactionStatus ??
          json.status;

        const normalizedStatus =
          normalizePaymentStatus(rawStatus);

        const paid =
          json.paid === true ||
          transaction.paid === true ||
          transaction.paymentVerified === true ||
          transaction.payment_verified === true ||
          isPaymentPaid(normalizedStatus);

        if (paid) {
          return {
            status: "paid",
            paid: true,
          };
        }

        return {
          status: normalizedStatus,
          paid: false,
        };
      } catch (error) {
        console.error(
          "Gagal memeriksa status pembayaran:",
          error
        );

        return {
          status: "pending",
          paid: false,
        };
      }
    },
    []
  );

  // ========================================================================
  // PROSES PEMBAYARAN BERHASIL
  // ========================================================================

  const handlePaymentSuccess = useCallback(
    (orderId: string) => {
      setPayment((previous) => {
        if (!previous || previous.orderId !== orderId) {
          return previous;
        }

        return {
          ...previous,
          status: "paid",
        };
      });

      if (redirectRef.current) return;

      redirectRef.current = true;

      window.setTimeout(() => {
        window.location.href =
          `/thank-you?order_id=${encodeURIComponent(orderId)}`;
      }, 1500);
    },
    []
  );

  // ========================================================================
  // POLLING OTOMATIS
  // ========================================================================

  useEffect(() => {
    if (!payment || isPaymentTerminal(payment.status)) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const poll = async () => {
      if (cancelled || pollingRef.current) return;

      const currentPayment = paymentRef.current;

      if (
        !currentPayment ||
        currentPayment.orderId !== payment.orderId ||
        isPaymentTerminal(currentPayment.status)
      ) {
        return;
      }

      pollingRef.current = true;

      try {
        const result = await checkPaymentStatus(
          currentPayment.orderId
        );

        if (cancelled) return;

        if (result.paid) {
          handlePaymentSuccess(currentPayment.orderId);
          return;
        }

        // Status gagal hanya diubah jika server secara eksplisit
        // mengembalikan status terminal.
        if (
          result.status === "expired" ||
          result.status === "failed" ||
          result.status === "cancel"
        ) {
          setPayment((previous) => {
            if (
              !previous ||
              previous.orderId !== currentPayment.orderId
            ) {
              return previous;
            }

            return {
              ...previous,
              status: result.status,
            };
          });

          return;
        }
      } finally {
        pollingRef.current = false;
      }

      if (!cancelled) {
        timeoutId = window.setTimeout(
          poll,
          STATUS_POLL_INTERVAL
        );
      }
    };

    timeoutId = window.setTimeout(poll, 500);

    return () => {
      cancelled = true;

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    payment?.orderId,
    payment?.status,
    checkPaymentStatus,
    handlePaymentSuccess,
  ]);

  // ========================================================================
  // CEK STATUS MANUAL
  // ========================================================================

  const handleManualCheckStatus = async () => {
    const currentPayment = paymentRef.current;

    if (!currentPayment || checkingStatus) return;

    setCheckingStatus(true);

    try {
      const result = await checkPaymentStatus(
        currentPayment.orderId
      );

      if (result.paid) {
        handlePaymentSuccess(currentPayment.orderId);
        return;
      }

      if (
        result.status === "expired" ||
        result.status === "failed" ||
        result.status === "cancel"
      ) {
        setPayment((previous) => {
          if (!previous) return previous;

          return {
            ...previous,
            status: result.status,
          };
        });

        return;
      }

      alert(
        "Pembayaran belum terdeteksi lunas oleh server. Jika Anda sudah membayar, tunggu beberapa saat lalu periksa kembali."
      );
    } finally {
      setCheckingStatus(false);
    }
  };

  // ========================================================================
  // DATA PROGRAM
  // ========================================================================

  const donorList = Array.isArray(program.donors)
    ? program.donors
    : [];

  const reportList = Array.isArray(program.reports)
    ? program.reports
    : [];

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <DetailHeader
        title={program.title || "Detail Program"}
        onOpenShare={() => {
          const shareData = {
            title: program.title || "Program Donasi",
            url: window.location.href,
          };

          if (navigator.share) {
            void navigator.share(shareData).catch(() => {});
          } else {
            void navigator.clipboard
              .writeText(window.location.href)
              .then(() => alert("Link program berhasil disalin!"))
              .catch(() => alert("Gagal menyalin link."));
          }
        }}
      />

      <main className="mx-auto max-w-md space-y-4 p-4">
        {/* GAMBAR UTAMA PROGRAM */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {program.image && (
            <div className="relative aspect-[16/9] w-full bg-slate-100">
              <img
                src={program.image}
                alt={program.title || "Program donasi"}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="space-y-3 p-4">
            <h1 className="text-xl font-extrabold leading-snug text-slate-900">
              {program.title}
            </h1>

            <ViewCounter slug={slug} type="campaign" />
          </div>
        </div>

        {/* PEROLEHAN DAN TARGET */}

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <span className="text-2xl font-black text-[#0d5c91]">
              {formatRupiah(collectedNum)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500">
              Terkumpul dari{" "}
              <strong className="text-slate-800">
                {program.targetAmount
                  ? formatRupiah(targetNum)
                  : "Rp 50.000.000"}
              </strong>
            </span>

            <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0d5c91]">
              Mendesak
            </span>
          </div>

          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[#e91e63] transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* KALKULATOR ZAKAT */}

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
              onApplyAmount={(value) => {
                setAmount(value);
                setIsDonateModalOpen(true);
              }}
            />
          </div>
        )}

        {/* TAB NAVIGASI */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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

                <div className="prose prose-sm max-w-none leading-relaxed text-slate-600">
                  {program.description ? (
                    <PortableText value={program.description} />
                  ) : (
                    <p>
                      Salurkan donasi terbaik Anda melalui program ini.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "donatur" && (
              <div className="space-y-3">
                {donorList.length > 0 ? (
                  donorList.map((donor, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {donor.name || "Hamba Allah"}
                        </p>

                        <p className="text-[10px] text-slate-400">
                          {donor.date || "Baru saja"}
                        </p>
                      </div>

                      <span className="text-xs font-extrabold text-emerald-600">
                        {typeof donor.amount === "number"
                          ? formatRupiah(donor.amount)
                          : donor.amount}
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
                  reportList.map((report, index) => (
                    <div
                      key={index}
                      className="space-y-1 rounded-xl border border-slate-100 p-3"
                    >
                      <h4 className="text-xs font-bold text-slate-900">
                        {report.title}
                      </h4>

                      <p className="text-[10px] text-slate-400">
                        {report.date}
                      </p>
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

      {/* STICKY BOTTOM BAR */}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => setIsDonateModalOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e91e63] py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-pink-700 active:scale-[0.99]"
          >
            <HeartHandshake className="h-5 w-5 text-white" />

            {isZakatProgram
              ? "TUNAIKAN ZAKAT"
              : "DONASI SEKARANG"}
          </button>
        </div>
      </div>

      {/* MODAL FORM DONASI */}

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
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0d5c91]">
                  {isZakatProgram
                    ? "Formulir Zakat"
                    : "Formulir Donasi"}
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

      {/* MODAL QRIS */}

      {payment && (
        <QrisPaymentModal
          payment={payment}
          countdown={countdown}
          checkingStatus={checkingStatus}
          onClose={() => {
            // Menutup modal tidak membatalkan transaksi di server.
            setPayment(null);
          }}
          onCheckStatus={handleManualCheckStatus}
        />
      )}
    </div>
  );
}

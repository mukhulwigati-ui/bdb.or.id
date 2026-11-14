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
          className="flex cursor-pointer items-center justify-center rounded-none border border-white/30 p-2 transition-colors hover:bg-white/10"
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
          className="flex cursor-pointer items-center justify-center rounded-none border border-white/30 p-2 transition-colors hover:bg-white/10"
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
    <div className="overflow-hidden rounded-none border border-slate-200 bg-white shadow-sm">
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
                className="w-full rounded-none border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0d5c91]"
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
                className="w-full rounded-none border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0d5c91]"
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
              className="w-full rounded-none border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0d5c91]"
              placeholder="Contoh: 90"
              value={input1}
              onChange={(e) => setInput1(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2 rounded-none border border-sky-100 bg-sky-50/60 p-4 text-center">
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
            className="w-full cursor-pointer rounded-none bg-[#0d5c91] py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Gunakan Nominal Ini di Form
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DONATION FORM MODAL (FORMULIR DONASI POP-UP)
// ============================================================================

interface DonationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
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

function DonationFormModal({
  isOpen,
  onClose,
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
}: DonationFormModalProps) {
  if (!isOpen) return null;

  const cleanAmountNum = cleanNumber(amount);
  const currentPhone = normalizePhone(profile?.phone);
  const hasPhone = Boolean(currentPhone && currentPhone.length >= 9);

  return (
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
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[94vh] w-full max-w-md overflow-y-auto rounded-none border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0d5c91]">
              BDB.or.id
            </p>
            <h2 className="mt-0.5 text-base font-extrabold text-slate-900">
              Formulir {isZakatProgram ? "Zakat" : "Donasi"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-none bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200"
            aria-label="Tutup formulir"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 p-5 text-left">
          {isZakatProgram && (
            <div className="mb-2">
              <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Kalkulator Zakat Digital
              </h3>
              <EmbeddedZakatCalculator
                onApplyAmount={(val) => setAmount(val)}
              />
            </div>
          )}

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
                  className={`rounded-none border px-2 py-3 text-xs font-bold transition ${
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
                className="w-full rounded-none border border-gray-300 bg-white py-2.5 pl-10 pr-3.5 text-sm font-bold text-slate-900 outline-none focus:border-[#0d5c91] sm:text-base"
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
              <div className="flex items-center justify-between rounded-none border border-emerald-200/80 bg-emerald-50 p-3.5">
                <div className="min-w-0 space-y-0.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                    Login ✓ {profile?.name ? ` • ${profile.name}` : ""}
                  </span>

                  <p className="truncate text-xs font-extrabold text-slate-900">
                    WhatsApp: {profile?.phone}
                  </p>
                </div>

                <span className="shrink-0 rounded-none bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                  Siap Donasi
                </span>
              </div>
            ) : (
              <div className="space-y-3 rounded-none border border-amber-200 bg-amber-50 p-4">
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
                    className="min-w-0 flex-1 rounded-none border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#0d5c91]"
                    value={inlinePhone}
                    onChange={(e) => setInlinePhone(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={handleInlineSavePhone}
                    disabled={savingPhone}
                    className="shrink-0 rounded-none bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
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
                  className="w-full rounded-none border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0d5c91]"
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
                  className="w-full rounded-none border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0d5c91]"
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

          <div className="rounded-none border border-sky-100 bg-sky-50 px-3.5 py-3">
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
            className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-none bg-[#e91e63] py-4 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-pink-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 sm:text-base"
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
      </div>
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

      <div className="relative z-10 max-h-[94vh] w-full max-w-md overflow-y-auto rounded-none border border-slate-200 bg-white shadow-2xl">
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
              className="flex h-9 w-9 items-center justify-center rounded-none bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200"
              aria-label="Tutup pembayaran"
            >
              ×
            </button>
          )}
        </div>

        <div className="space-y-5 p-5">
          {isPaid ? (
            <div className="space-y-4 py-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-none bg-emerald-50">
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
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-none bg-amber-50">
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
                className="w-full rounded-none bg-[#0d5c91] py-3.5 text-sm font-extrabold text-white"
              >
                Buat Pembayaran Baru
              </button>
            </div>
          ) : isFailed ? (
            <div className="space-y-4 py-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-none bg-red-50">
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
                className="w-full rounded-none bg-[#0d5c91] py-3.5 text-sm font-extrabold text-white"
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
                    Nomor unik termasuk untuk verifikasi pembayaran otomatis.
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

              <div className="space-y-2 rounded-none border border-sky-100 bg-sky-50 p-4">
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
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-none border border-slate-200 bg-white py-3 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
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

  useEffect(() => {
    paymentRef.current = payment;
  }, [payment]);

  // ========================================================================
  // SIMPAN NOMOR TELEPON
  // ========================================================================

  const handleInlineSavePhone = async () => {
    const cleanPhone = normalizePhone(inlinePhone);

    if (cleanPhone.length < 9) {
      alert(
        "Nomor WhatsApp tidak valid. Masukkan nomor yang benar (min. 9 digit)."
      );
      return;
    }

    setSavingPhone(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        alert("Sesi login berakhir. Silakan login kembali.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          phone: cleanPhone,
          whatsapp: cleanPhone,
        },
      });

      if (error) {
        throw error;
      }

      setProfile((prev) =>
        prev ? { ...prev, phone: cleanPhone } : null
      );

      setInlinePhone("");
      alert("Nomor WhatsApp berhasil disimpan!");
    } catch (error: any) {
      console.error("Gagal menyimpan nomor WhatsApp:", error);
      alert(
        error?.message ||
          "Gagal menyimpan nomor WhatsApp. Silakan coba lagi."
      );
    } finally {
      setSavingPhone(false);
    }
  };

  // ========================================================================
  // BUAT DONASI & QRIS
  // ========================================================================

  const handleDonate = async () => {
    const numericAmount = cleanNumber(amount);

    if (numericAmount < 1_000) {
      alert("Minimum donasi adalah Rp 1.000");
      return;
    }

    const phoneToCheck = isLoggedIn
      ? profile?.phone
      : profile?.phone;

    const cleanUserPhone = normalizePhone(phoneToCheck);

    if (!cleanUserPhone || cleanUserPhone.length < 9) {
      alert(
        "Nomor WhatsApp wajib diisi dengan benar untuk pengiriman kuitansi dan status donasi."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/donate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignSlug: slug,
          campaignId: program._id || program.id,
          campaignTitle: program.title,
          amount: numericAmount,
          donorName:
            profile?.name?.trim() || "Hamba Allah",
          donorPhone: cleanUserPhone,
          donorEmail: profile?.email || "",
          referral: referral || "",
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(
          json.message ||
            json.error ||
            "Gagal membuat transaksi pembayaran."
        );
      }

      const paymentData: CasakuPayment = {
        orderId: json.orderId || json.data?.orderId,
        transactionId:
          json.transactionId ||
          json.data?.transactionId ||
          json.data?.casakuTransactionId,
        amount: numericAmount,
        totalAmount:
          json.totalAmount ||
          json.data?.totalAmount ||
          numericAmount,
        qrString: json.qrString || json.data?.qrString,
        status: normalizePaymentStatus(
          json.status || json.data?.status
        ),
        expiredAt: json.expiredAt || json.data?.expiredAt,
        expiredInMinutes:
          json.expiredInMinutes ||
          json.data?.expiredInMinutes ||
          DEFAULT_PAYMENT_MINUTES,
      };

      if (!paymentData.qrString) {
        throw new Error(
          "QR string pembayaran tidak ditemukan dari server."
        );
      }

      const expiryMs = getPaymentExpiryTimestamp(paymentData);
      const remainingSeconds = Math.max(
        1,
        Math.floor((expiryMs - Date.now()) / 1000)
      );

      setPayment(paymentData);
      setCountdown(remainingSeconds);
      setIsFormModalOpen(false); // Tutup modal formulir, tampilkan QRIS
    } catch (error: any) {
      console.error("Gagal membuat donasi:", error);
      alert(
        error?.message ||
          "Terjadi kesalahan saat memproses donasi. Silakan coba lagi."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ========================================================================
  // CEK STATUS PEMBAYARAN
  // ========================================================================

  const checkPaymentStatusManual = useCallback(async () => {
    const currentPayment = paymentRef.current;
    if (!currentPayment || !currentPayment.orderId) return;

    if (
      redirectRef.current ||
      isPaymentPaid(currentPayment.status)
    ) {
      return;
    }

    setCheckingStatus(true);

    try {
      const response = await fetch(
        `/api/donate/status?orderId=${encodeURIComponent(
          currentPayment.orderId
        )}`
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(getApiErrorMessage(json));
      }

      const remoteStatus = normalizePaymentStatus(
        json.status || json.data?.status
      );

      const isPaid = isPaymentPaid(remoteStatus);

      setPayment((prev) =>
        prev ? { ...prev, status: remoteStatus } : null
      );

      if (isPaid && !redirectRef.current) {
        redirectRef.current = true;
        pollingRef.current = false;

        const successSlug = slug;
        const successOrder = currentPayment.orderId;

        setTimeout(() => {
          router.push(
            `/campaign/${successSlug}/success?orderId=${encodeURIComponent(
              successOrder
            )}`
          );
        }, 1200);
      }
    } catch (error) {
      console.error("Gagal memeriksa status pembayaran:", error);
    } finally {
      setCheckingStatus(false);
    }
  }, [slug, router]);

  // ========================================================================
  // POLLING & COUNTDOWN EFFECT
  // ========================================================================

  useEffect(() => {
    if (!payment) return;

    const currentStatus = payment.status;

    if (
      isPaymentTerminal(currentStatus) ||
      redirectRef.current
    ) {
      return;
    }

    pollingRef.current = true;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPayment((curr) =>
            curr ? { ...curr, status: "expired" } : null
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const pollInterval = setInterval(() => {
      if (
        !pollingRef.current ||
        redirectRef.current ||
        !paymentRef.current
      ) {
        return;
      }

      const st = paymentRef.current.status;
      if (isPaymentTerminal(st)) {
        clearInterval(pollInterval);
        return;
      }

      void checkPaymentStatusManual();
    }, STATUS_POLL_INTERVAL);

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
      pollingRef.current = false;
    };
  }, [payment?.orderId, checkPaymentStatusManual]);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-100 flex justify-center text-neutral-900 antialiased">
      <div className="w-full max-w-md bg-white min-h-screen border-x border-neutral-200 shadow-sm rounded-none relative flex flex-col pb-20">
        <DetailHeader
          title={program.title || "Program Donasi"}
          onOpenShare={() => {
            if (navigator.share) {
              navigator
                .share({
                  title: program.title,
                  url: window.location.href,
                })
                .catch(() => {});
            } else {
              navigator.clipboard.writeText(
                window.location.href
              );
              alert("Link program berhasil disalin!");
            }
          }}
        />

        {/* GAMBAR PROGRAM */}
        <div className="relative w-full aspect-[16/9] bg-neutral-900 overflow-hidden rounded-none">
          {program.image ? (
            <img
              src={program.image}
              alt={program.title || "Program Donasi"}
              className="w-full h-full object-cover rounded-none"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-sky-900 text-white font-bold">
              BDB.or.id
            </div>
          )}
        </div>

        {/* KONTEN UTAMA */}
        <div className="p-4 space-y-4 flex-1">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 leading-snug">
              {program.title}
            </h1>

            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <ViewCounter slug={slug} /> dibaca
              </span>

              {program.category && (
                <span className="rounded-none bg-sky-50 px-2 py-0.5 font-bold text-[#0d5c91]">
                  {program.category}
                </span>
              )}
            </div>
          </div>

          {/* TARGET DANA */}
          <div className="space-y-2.5 rounded-none border border-slate-200 p-4 bg-white shadow-xs">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-500 block font-medium">
                  Terkumpul dari {formatRupiah(targetNum)}
                </span>
                <span className="text-xl font-black text-[#0d5c91]">
                  {formatRupiah(collectedNum)}
                </span>
              </div>

              {percentage >= 100 && (
                <span className="rounded-none bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                  Tercapai
                </span>
              )}
            </div>

            <div className="h-2.5 w-full bg-slate-100 overflow-hidden rounded-none">
              <div
                className="h-full bg-[#e91e63] transition-all duration-500 rounded-none"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex justify-between text-xs font-semibold text-slate-500 pt-1">
              <span>{percentage}% Tercapai</span>
              <span>{program.daysLeft ?? 30} Hari Lagi</span>
            </div>
          </div>

          {/* TAB NAVIGASI */}
          <div className="border-b border-slate-200 flex text-xs font-bold">
            {(
              [
                ["cerita", "Cerita"],
                ["donatur", `Donatur (${program.donors?.length || 0})`],
                ["laporan", `Laporan (${program.reports?.length || 0})`],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 pb-3 text-center border-b-2 transition ${
                  activeTab === tab
                    ? "border-[#0d5c91] text-[#0d5c91]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ISI TAB DENGAN AUTO PARAGRAF (`prose` & `space-y-3`) */}
          <div className="py-2 text-slate-700 text-sm leading-relaxed">
            {activeTab === "cerita" && (
              <div className="prose prose-sm max-w-none space-y-3">
                {program.description ? (
                  Array.isArray(program.description) ? (
                    <PortableText value={program.description} />
                  ) : (
                    <div
                      className="space-y-3"
                      dangerouslySetInnerHTML={{
                        __html: String(program.description),
                      }}
                    />
                  )
                ) : (
                  <p className="text-slate-400 italic">
                    Belum ada cerita untuk program ini.
                  </p>
                )}
              </div>
            )}

            {activeTab === "donatur" && (
              <div className="space-y-3">
                {program.donors && program.donors.length > 0 ? (
                  program.donors.map((donor, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b border-slate-100 pb-3"
                    >
                      <div>
                        <p className="font-bold text-slate-800 text-xs">
                          {donor.name || "Hamba Allah"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {donor.date || "Baru saja"}
                        </p>
                      </div>
                      <span className="font-extrabold text-xs text-[#0d5c91]">
                        {formatRupiah(cleanNumber(donor.amount))}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-xs italic py-4 text-center">
                    Belum ada donatur tercatat. Jadilah yang pertama!
                  </p>
                )}
              </div>
            )}

            {activeTab === "laporan" && (
              <div className="space-y-3">
                {program.reports && program.reports.length > 0 ? (
                  program.reports.map((report, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-200 p-3 rounded-none bg-slate-50 space-y-2"
                    >
                      <h4 className="font-bold text-xs text-slate-800">
                        {report.title || "Laporan Penyaluran"}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {report.date || "Terbaru"}
                      </p>
                      {report.content && (
                        <div className="text-xs text-slate-600 mt-2 space-y-2">
                          {Array.isArray(report.content) ? (
                            <PortableText value={report.content} />
                          ) : (
                            String(report.content)
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-xs italic py-4 text-center">
                    Belum ada laporan penyaluran dana.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* TOMBOL DONASI STICKY DI BAWAH (FIXED/STICKY RAPI TANPA GESER) */}
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center bg-transparent pointer-events-none">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-xs border-t border-slate-200 p-4 shadow-lg pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(true)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-none bg-[#e91e63] py-4 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-pink-700 active:scale-[0.99]"
            >
              <HeartHandshake className="h-5 w-5" />
              DONASI SEKARANG
            </button>
          </div>
        </div>

        {/* MODAL FORMULIR DONASI */}
        <DonationFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
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

        {/* MODAL QRIS */}
        {payment && (
          <QrisPaymentModal
            payment={payment}
            countdown={countdown}
            checkingStatus={checkingStatus}
            onClose={() => {
              setPayment(null);
            }}
            onCheckStatus={checkPaymentStatusManual}
          />
        )}
      </div>
    </div>
  );
}
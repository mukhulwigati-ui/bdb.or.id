// components/CampaignDetailClient.tsx
"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { PortableText } from "@portabletext/react";
import { QRCodeSVG } from "qrcode.react";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  MessageCircle,
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
  program?: Program;
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

interface DonateApiResponse {
  success?: boolean;
  message?: string;
  provider?: string;
  orderId?: string;
  transactionId?: string;
  amount?: number;
  totalAmount?: number;
  qrString?: string;
  status?: PaymentStatus;
  expiredAt?: string | null;
  expiredInMinutes?: number;
}

interface StatusApiResponse {
  success?: boolean;
  message?: string;
  status?: PaymentStatus;
  transactionId?: string;
  paidAt?: string | null;
  expiredAt?: string | null;
  data?: {
    status?: PaymentStatus;
    transactionId?: string;
    paidAt?: string | null;
    expiredAt?: string | null;
  };
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
const SITE_URL = "https://www.bdb.or.id";

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

function normalizeSlug(value: string): string {
  try {
    return decodeURIComponent(value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  } catch {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
  }
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
  if (status === "paid" || status === "success" || status === "settlement" || status === "lunas") {
    return "paid";
  }
  if (status === "expired") return "expired";
  if (status === "cancel" || status === "canceled" || status === "cancelled") return "cancel";
  if (status === "failed" || status === "error") return "failed";
  return "pending";
}

function isPaymentPaid(status: PaymentStatus): boolean {
  return status === "paid" || status === "success";
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
          aria-label="Kembali"
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
          aria-label="Bagikan"
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
  } else {
    const berat = Number(input1) || 0;
    isWajib = berat >= 85;
    totalZakat = isWajib ? Math.round(berat * HARGA_EMAS * 0.025) : 0;
  }

  const resetInputs = () => {
    setInput1("");
    setInput2("");
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-bold">
        {(["penghasilan", "maal", "emas"] as const).map((tab) => (
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
                : "border-transparent text-slate-500"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-4 text-left">
        {activeTab !== "emas" ? (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                {activeTab === "penghasilan"
                  ? "Pendapatan Utama Per Bulan (Rp)"
                  : "Total Harta / Tabungan (Rp)"}
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0d5c91]"
                placeholder="0"
                value={input1}
                onChange={(e) => setInput1(formatRupiahInput(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 sm:text-sm">
                {activeTab === "penghasilan"
                  ? "Tunjangan / Bonus / THR (Rp)"
                  : "Harta Lain yang Dihitung (Rp)"}
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0d5c91]"
                placeholder="0"
                value={input2}
                onChange={(e) => setInput2(formatRupiahInput(e.target.value))}
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
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#0d5c91]"
              placeholder="Contoh: 90"
              value={input1}
              onChange={(e) => setInput1(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-sky-100 bg-sky-50/60 p-4 text-center">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estimasi Zakat
          </span>
          <span className="block text-xl font-extrabold text-[#0d5c91]">
            {formatRupiah(totalZakat)}
          </span>
          {input1 && (
            <p className={`text-xs font-semibold ${isWajib ? "text-emerald-700" : "text-slate-500"}`}>
              {isWajib ? "Telah mencapai nishab." : "Belum mencapai nishab."}
            </p>
          )}
          <button
            type="button"
            disabled={totalZakat <= 0}
            onClick={() => onApplyAmount(totalZakat.toLocaleString("id-ID"))}
            className="w-full cursor-pointer rounded-lg bg-[#0d5c91] py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-sky-900 disabled:bg-gray-300"
          >
            Masukkan ke Form Nominal
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
}: DonationFormFieldsProps) {
  const cleanAmountNum = cleanNumber(amount);
  const hasPhone = Boolean(profile?.phone && profile.phone.trim().length >= 9);

  return (
    <div className="space-y-4 text-left">
      <div>
        <label className="mb-2 block text-xs font-extrabold text-slate-900 sm:text-sm">
          Pilih Nominal Donasi
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
          Masukkan Donasi Lainnya
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-sm font-bold text-slate-400">Rp</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Min. 1.000"
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3.5 text-sm font-bold text-slate-900 outline-none focus:border-[#0d5c91]"
            value={amount}
            onChange={(e) => setAmount(formatRupiahInput(e.target.value))}
          />
        </div>
      </div>

      <hr className="my-2 border-slate-100" />

      {isLoggedIn ? (
        hasPhone ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
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
        onClick={() => void handleDonate()}
        disabled={submitting || (isLoggedIn && !hasPhone)}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#e91e63] py-4 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition hover:bg-pink-700 active:scale-[0.99] disabled:bg-gray-300"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Membuat QRIS...
          </>
        ) : (
          "Lanjut pembayaran"
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
  const isExpired = payment.status === "expired" || countdown <= 0;
  const isFailed = payment.status === "failed" || payment.status === "cancel";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-xs sm:items-center sm:p-3"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Tutup"
      />

      <div className="relative z-10 max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0d5c91]">
              Pembayaran QRIS
            </p>
            <h2 className="mt-0.5 text-base font-extrabold text-slate-900">
              Selesaikan Donasi
            </h2>
          </div>
          {!isPaid && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 hover:bg-slate-200"
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
              <h3 className="text-xl font-extrabold text-slate-900">Pembayaran Berhasil</h3>
              <p className="text-sm text-slate-500">Terima kasih. Donasi Anda telah terverifikasi.</p>
            </div>
          ) : isExpired ? (
            <div className="space-y-4 py-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
                <Clock3 className="h-10 w-10 text-amber-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">QRIS Kedaluwarsa</h3>
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
              <h3 className="text-lg font-extrabold text-slate-900">Transaksi Dibatalkan</h3>
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
              </div>

              <div className="mx-auto flex w-fit items-center justify-center border border-slate-200 bg-white p-4 shadow-sm">
                <QRCodeSVG value={payment.qrString} size={250} level="M" includeMargin />
              </div>

              <div className="flex items-center justify-between border-y border-slate-100 py-3">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-semibold text-slate-600">Berlaku selama</span>
                </div>
                <span className="font-mono text-sm font-extrabold text-amber-700">
                  {formatCountdown(countdown)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void onCheckStatus()}
                disabled={checkingStatus}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${checkingStatus ? "animate-spin" : ""}`} />
                {checkingStatus ? "Memeriksa..." : "Cek Status Pembayaran"}
              </button>
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
  program: initialProgram,
  initialProfile,
}: CampaignDetailClientProps) {
  const router = useRouter();

  const [program, setProgram] = useState<Program | null>(initialProgram || null);
  const [loading, setLoading] = useState(!initialProgram);
  const [amount, setAmount] = useState("50.000");
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(initialProfile));
  const [inlinePhone, setInlinePhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"cerita" | "donatur" | "laporan">("cerita");

  const [payment, setPayment] = useState<CasakuPayment | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [expiryTimestamp, setExpiryTimestamp] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Load Profile
  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (!session) {
          setIsLoggedIn(false);
          setProfile(null);
          return;
        }
        setIsLoggedIn(true);
        const user = session.user;
        const meta = user.user_metadata || {};
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (!mounted) return;
        if (prof) {
          setProfile(prof);
          return;
        }
        setProfile({
          id: user.id,
          name: meta.full_name || meta.name || user.email?.split("@")[0] || "Dermawan",
          email: user.email || "",
          avatar: meta.avatar_url || meta.picture || "",
          phone: "",
        });
      } catch (err) {
        if (mounted) setIsLoggedIn(false);
      }
    }
    void loadProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void loadProfile();
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load Program if not provided via props
  useEffect(() => {
    if (initialProgram) return;
    const controller = new AbortController();
    async function loadProgram() {
      setLoading(true);
      try {
        const response = await fetch("/api/programs", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (!json?.success || !Array.isArray(json?.data)) {
          setProgram(null);
          return;
        }
        const cleanParamSlug = normalizeSlug(slug);
        const found = json.data.find((item: Program) => {
          const dbSlug = String(item.slug || "");
          const cleanDbSlug = normalizeSlug(dbSlug);
          return cleanDbSlug === cleanParamSlug || dbSlug === slug || item._id === slug || item.id === slug;
        }) || null;
        setProgram(found);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setProgram(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadProgram();
    return () => controller.abort();
  }, [slug, initialProgram]);

  // Countdown timer
  useEffect(() => {
    if (!isPaymentOpen || !payment || !expiryTimestamp) return;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((expiryTimestamp - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0 && payment.status === "pending") {
        setPayment((prev) => (prev ? { ...prev, status: "expired" } : prev));
      }
    };
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [isPaymentOpen, payment?.transactionId, payment?.status, expiryTimestamp]);

  const checkPaymentStatus = async (silent = false) => {
    if (!payment?.transactionId) return;
    if (isPaymentPaid(payment.status) || payment.status === "expired" || payment.status === "cancel") return;
    if (!silent) setCheckingStatus(true);
    try {
      const response = await fetch("/api/payments/casaku/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: payment.transactionId }),
        cache: "no-store",
      });
      const json = (await response.json()) as StatusApiResponse;
      if (!response.ok) {
        if (!silent) throw new Error(json?.message || "Gagal memeriksa status pembayaran.");
        return;
      }
      const newStatus = normalizePaymentStatus(json.status || json.data?.status);
      setPayment((prev) => (prev ? { ...prev, status: newStatus } : prev));
      if (newStatus === "paid") {
        window.setTimeout(() => {
          router.push(`/donation/success?orderId=${encodeURIComponent(payment.orderId)}`);
        }, 1500);
      }
    } catch (error) {
      if (!silent) alert("Gagal memeriksa pembayaran.");
    } finally {
      if (!silent) setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (!isPaymentOpen || !payment || payment.status !== "pending") return;
    const interval = window.setInterval(() => {
      void checkPaymentStatus(true);
    }, STATUS_POLL_INTERVAL);
    return () => window.clearInterval(interval);
  }, [isPaymentOpen, payment?.transactionId, payment?.status]);

  const handleInlineSavePhone = async () => {
    const clean = normalizePhone(inlinePhone);
    if (clean.length < 9) {
      alert("Masukkan nomor WhatsApp yang valid.");
      return;
    }
    setSavingPhone(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Sesi habis.");
      await supabase.from("profiles").update({ phone: clean }).eq("id", session.user.id);
      setProfile((prev) => (prev ? { ...prev, phone: clean } : prev));
      setInlinePhone("");
      alert("Nomor WhatsApp berhasil disimpan.");
    } catch (err) {
      alert("Gagal menyimpan nomor.");
    } finally {
      setSavingPhone(false);
    }
  };

  const handleDonate = async () => {
    if (submitting) return;
    const cleanAmount = cleanNumber(amount);
    if (!cleanAmount || cleanAmount < 1000) {
      alert("Minimal donasi Rp 1.000.");
      return;
    }
    const activePhone = profile?.phone || inlinePhone;
    const cleanPhone = normalizePhone(activePhone);
    if (cleanPhone.length < 9) {
      alert("Nomor WhatsApp wajib diisi.");
      return;
    }
    const resolvedProgramId = program?._id || program?.id;
    if (!resolvedProgramId) {
      alert("ID program tidak ditemukan.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: resolvedProgramId,
          programTitle: program?.title || "Sedekah Umum",
          slug: program?.slug || slug,
          category: program?.category || "Kemanusiaan",
          amount: cleanAmount,
          donorName: profile?.name?.trim() || "Hamba Allah",
          phone: cleanPhone,
          email: profile?.email?.trim() || "",
          fundraiserPhone: referral,
        }),
      });
      const json = (await response.json()) as DonateApiResponse;
      if (!response.ok || !json.success || !json.orderId || !json.transactionId || !json.qrString) {
        throw new Error(json?.message || "Gagal membuat transaksi QRIS.");
      }

      const newPayment: CasakuPayment = {
        orderId: json.orderId,
        transactionId: json.transactionId,
        amount: Number(json.amount || cleanAmount),
        totalAmount: Number(json.totalAmount || json.amount || cleanAmount),
        qrString: json.qrString,
        status: normalizePaymentStatus(json.status),
        expiredAt: json.expiredAt || null,
        expiredInMinutes: json.expiredInMinutes || 15,
      };

      setPayment(newPayment);
      const expiry = getPaymentExpiryTimestamp(newPayment);
      setExpiryTimestamp(expiry);
      setCountdown(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
      setIsMobileFormOpen(false);
      setIsPaymentOpen(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  const closePayment = () => {
    if (isPaymentPaid(payment?.status || "pending")) return;
    setIsPaymentOpen(false);
    setPayment(null);
    setExpiryTimestamp(null);
    setCountdown(0);
  };

  const shareUrl = useMemo(() => {
    let decodedSlug = slug;
    try {
      decodedSlug = decodeURIComponent(slug);
    } catch {}
    const cleanSlug = encodeURIComponent(decodedSlug.trim());
    const baseUrl = `${SITE_URL}/campaign/${cleanSlug}`;
    return referral?.trim() ? `${baseUrl}?ref=${encodeURIComponent(referral.trim())}` : baseUrl;
  }, [slug, referral]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Gagal menyalin tautan.");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined") return;
    if (!navigator.share) {
      setIsShareModalOpen(true);
      return;
    }
    try {
      await navigator.share({
        title: program?.title || "Program Kebaikan",
        text: `Mari dukung program ${program?.title || ""}`,
        url: shareUrl,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setIsShareModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DetailHeader title="Program Donasi" onOpenShare={() => setIsShareModalOpen(true)} />
        <div className="py-20 text-center text-sm font-medium text-slate-500">Memuat detail program...</div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DetailHeader title="Program Donasi" onOpenShare={() => setIsShareModalOpen(true)} />
        <div className="px-4 py-20 text-center">
          <h1 className="text-lg font-bold text-slate-900">Program tidak ditemukan</h1>
        </div>
      </div>
    );
  }

  const rawTarget = Number(program.targetAmount) || 50_000_000;
  const currentCollected = Number(program.collectedAmount) || 0;
  const percentage = rawTarget > 0 ? Math.min(Math.round((currentCollected / rawTarget) * 100), 100) : 0;
  const donors = Array.isArray(program.donors) ? program.donors : [];
  const reports = Array.isArray(program.reports) ? program.reports : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <DetailHeader
        title={program.title || "Program Donasi"}
        onOpenShare={() => void handleNativeShare()}
      />

      <main className="mx-auto w-full max-w-md space-y-4 px-3 pt-4">
        <article className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-gray-100">
            {program.image ? (
              <img
                src={program.image}
                alt={program.title || "Program"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Gambar belum tersedia
              </div>
            )}
          </div>

          <h1 className="text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
            {program.title || "Program Kebaikan"}
          </h1>

          <div className="flex items-center text-xs text-slate-500">
            <ViewCounter type="campaign" slug={program.slug || slug} className="text-xs text-slate-500" />
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-lg font-extrabold text-[#0d5c91] sm:text-xl">
              {formatRupiah(currentCollected)}
            </p>
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Terkumpul dari <strong className="text-slate-800">{formatRupiah(rawTarget)}</strong></span>
              <span>{program.daysLeft ? `${program.daysLeft} hari lagi` : "Mendesak"}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
              <div className="h-full bg-[#e91e63] transition-all duration-500" style={{ width: `${percentage}%` }} />
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex space-x-6 border-b border-gray-200 pt-2 text-xs font-bold text-slate-500 sm:text-sm">
            {(["cerita", "donatur", "laporan"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`cursor-pointer border-b-2 pb-2.5 transition capitalize ${
                  activeTab === tab ? "border-[#0d5c91] text-[#0d5c91]" : "border-transparent"
                }`}
              >
                {tab} {tab === "donatur" ? `(${donors.length})` : tab === "laporan" ? `(${reports.length})` : ""}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="py-2 text-left">
            {activeTab === "cerita" && (
              <div className="space-y-4">
                {program.category?.trim().toUpperCase() === "ZAKAT" && (
                  <EmbeddedZakatCalculator onApplyAmount={setAmount} />
                )}
                <div className="space-y-4 text-base leading-relaxed text-slate-800">
                  {program.description ? (
                    typeof program.description === "string" ? (
                      <p>{program.description}</p>
                    ) : (
                      <PortableText value={program.description} />
                    )
                  ) : (
                    <p className="italic text-slate-400">Belum ada cerita detail.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "donatur" && (
              <div className="space-y-3 py-1">
                {donors.length > 0 ? (
                  [...donors].reverse().map((donor, index) => (
                    <div key={index} className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-gray-50 p-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-base font-bold text-[#0d5c91]">
                          {(donor.name || "H").toUpperCase().slice(0, 1)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{donor.name || "Hamba Allah"}</p>
                          <p className="text-xs text-slate-400">{donor.date || "Baru saja"}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-[#0d5c91]">+{formatRupiah(cleanNumber(donor.amount))}</p>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400">Belum ada donatur.</p>
                )}
              </div>
            )}

            {activeTab === "laporan" && (
              <div className="space-y-4 py-1">
                {reports.length > 0 ? (
                  [...reports].reverse().map((report, index) => (
                    <section key={index} className="space-y-2.5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
                        <h2 className="text-sm font-bold text-slate-800">{report.title || "Laporan Penyaluran"}</h2>
                        <span className="text-xs text-slate-400">{report.date || ""}</span>
                      </div>
                      <div className="text-sm text-slate-800">
                        {typeof report.content === "string" ? (
                          <p>{report.content}</p>
                        ) : report.content ? (
                          <PortableText value={report.content} />
                        ) : null}
                      </div>
                    </section>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400">Belum ada pembaruan laporan.</p>
                )}
              </div>
            )}
          </div>
        </article>
      </main>

      {/* STICKY BOTTOM CTA BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center bg-white/90 backdrop-blur-sm border-t border-gray-200 p-3">
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => setIsMobileFormOpen(true)}
            className="w-full cursor-pointer rounded-xl bg-[#e91e63] py-3.5 text-sm font-extrabold uppercase tracking-wide text-white shadow-md transition hover:bg-pink-700"
          >
            Donasi Sekarang
          </button>
        </div>
      </div>

      {/* DONATION FORM MODAL */}
      {isMobileFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-3" role="dialog">
          <button type="button" className="absolute inset-0 cursor-default" onClick={() => !submitting && setIsMobileFormOpen(false)} aria-label="Tutup" />
          <div className="relative z-10 max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">Pilih Nominal Donasi</h2>
              <button type="button" disabled={submitting} onClick={() => setIsMobileFormOpen(false)} className="text-lg font-bold text-slate-400">✕</button>
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
            />
          </div>
        </div>
      )}

      {/* QRIS PAYMENT MODAL */}
      {isPaymentOpen && payment && (
        <QrisPaymentModal
          payment={payment}
          countdown={countdown}
          checkingStatus={checkingStatus}
          onClose={closePayment}
          onCheckStatus={() => checkPaymentStatus(false)}
        />
      )}

      {/* SHARE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" role="dialog">
          <button type="button" className="absolute inset-0 cursor-default" onClick={() => setIsShareModalOpen(false)} aria-label="Tutup" />
          <div className="relative z-10 w-full max-w-md space-y-4 rounded-2xl bg-white p-5 text-left shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="
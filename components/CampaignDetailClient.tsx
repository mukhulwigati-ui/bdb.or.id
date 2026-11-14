// components/CampaignDetailClient.tsx

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<CasakuPayment | null>(null);
  const [countdown, setCountdown] = useState(900);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const programTitleLower = (program.title || "").toLowerCase();
  const programCategoryLower = (program.category || "").toLowerCase();
  const isZakatProgram =
    programTitleLower.includes("zakat") ||
    programCategoryLower.includes("zakat");

  const currentPhone = normalizePhone(profile?.phone);
  const hasPhone = Boolean(currentPhone && currentPhone.length >= 9);

  const handleInlineSavePhone = async () => {
    if (!inlinePhone) return;
    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone: inlinePhone })
        .eq("id", profile?.id);

      if (!error) {
        setProfile((prev) => (prev ? { ...prev, phone: inlinePhone } : prev));
      }
    } finally {
      setSavingPhone(false);
    }
  };

  const handleDonate = async () => {
    setSubmitting(true);
    try {
      // Simulasi proses pembuatan pembayaran QRIS
      const numericAmount = cleanNumber(amount);
      if (numericAmount < 1000) {
        alert("Minimum donasi adalah Rp 1.000");
        return;
      }
      // Logika integrasi pembayaran Anda di sini
      setIsModalOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <DetailHeader
        title={program.title}
        onOpenShare={() => {
          if (navigator.share) {
            navigator.share({ title: program.title, url: window.location.href });
          }
        }}
      />

      <main className="mx-auto max-w-md p-4 space-y-4">
        {program.image && (
          <div className="relative aspect-video w-full overflow-hidden bg-slate-200">
            <img
              src={program.image}
              alt={program.title || "Campaign"}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="bg-white p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <ViewCounter slug={slug} type="campaign" /> dibaca
            </span>

            {program.category && (
              <span className="rounded bg-sky-50 px-2 py-0.5 font-semibold text-[#0d5c91]">
                {program.category}
              </span>
            )}
          </div>

          <h1 className="text-xl font-extrabold text-slate-900">
            {program.title}
          </h1>

          <div className="flex justify-between text-xs font-bold text-slate-600">
            <span>Terkumpul: {formatRupiah(cleanNumber(program.collectedAmount))}</span>
            <span>Target: {formatRupiah(cleanNumber(program.targetAmount))}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full rounded-none bg-[#e91e63] py-3.5 text-sm font-extrabold text-white shadow transition hover:bg-pink-700"
          >
            {isZakatProgram ? "TUNAIKAN ZAKAT SEKARANG" : "DONASI SEKARANG"}
          </button>
        </div>
      </main>

      <DonationFormModal
        isOpen={isModalOpen && !paymentData}
        onClose={() => setIsModalOpen(false)}
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

      {paymentData && (
        <QrisPaymentModal
          payment={paymentData}
          countdown={countdown}
          checkingStatus={checkingStatus}
          onClose={() => setPaymentData(null)}
          onCheckStatus={async () => {
            setCheckingStatus(true);
            setTimeout(() => setCheckingStatus(false), 1000);
          }}
        />
      )}
    </div>
  );
}
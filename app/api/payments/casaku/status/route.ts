import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import {
  ensureDonationCredits,
  getDonationById,
} from "@/lib/payments/casaku-settlement";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CASAKU_CHECK_STATUS_ENDPOINT =
  "https://api.casaku.id/api/generate/check-status";

const REQUEST_TIMEOUT_MS = 15000;

type CasakuStatus = "pending" | "paid" | "cancel" | "expired";
type InternalStatus = "pending" | "success" | "failed";

interface SanityDonationTransaction {
  _id: string;
  orderId?: string;
  transactionId?: string;
  status?: string;
  amount?: number;
  paymentAmount?: number;
  paidAmount?: number;
  paidAt?: string;
  expiresAt?: string;
  paymentProvider?: string;
  paymentVerified?: boolean;
}

function requiredEnv(name: string, value?: string): string {
  const result = value?.trim();
  if (!result) {
    throw new Error(`${name} belum dikonfigurasi di Vercel.`);
  }
  return result;
}

function getSanityClient() {
  return createClient({
    projectId: requiredEnv(
      "NEXT_PUBLIC_SANITY_PROJECT_ID",
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    ),
    dataset: (
      process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
    ).trim(),
    apiVersion: "2026-08-31",
    useCdn: false,
    token: requiredEnv(
      "SANITY_API_WRITE_TOKEN / SANITY_API_TOKEN",
      process.env.SANITY_API_WRITE_TOKEN ||
        process.env.SANITY_API_TOKEN
    ),
  });
}

function cleanText(value: unknown, maxLength = 500): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function asObject(value: unknown): Record<string, any> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
}

function firstDefined(...values: unknown[]): unknown {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function normalizeCasakuStatus(value: unknown): CasakuStatus {
  const status = cleanText(value, 50)
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
      "berhasil",
      "lunas",
    ].includes(status)
  ) {
    return "paid";
  }

  if (
    [
      "cancel",
      "cancelled",
      "canceled",
      "void",
      "cancelled_by_user",
      "dibatalkan",
    ].includes(status)
  ) {
    return "cancel";
  }

  if (
    ["expired", "expire", "timeout", "kadaluarsa"].includes(status)
  ) {
    return "expired";
  }

  return "pending";
}

function mapInternalStatus(status: CasakuStatus): InternalStatus {
  if (status === "paid") return "success";
  if (status === "cancel" || status === "expired") {
    return "failed";
  }
  return "pending";
}

function parseAmount(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== "string") {
    return 0;
  }
  const normalized = value.trim().replace(/[^\d.,-]/g, "");
  if (!normalized) return 0;

  if (/^-?\d{1,3}(\.\d{3})+$/.test(normalized)) {
    const parsed = Number(normalized.replace(/\./g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(normalized.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function syncSupabaseStatus(
  orderId: string | undefined,
  status: InternalStatus
): Promise<void> {
  if (!orderId) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return;

  try {
    const supabase = createSupabaseClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await supabase
      .from("donations")
      .update({ status })
      .eq("invoice_id", orderId);
  } catch (error) {
    console.error("[BDB SUPABASE SYNC ERROR]", error);
  }
}

function getCasakuResponseData(json: Record<string, any>) {
  const rootData = asObject(json.data);
  const nestedData = asObject(rootData.data);

  const transaction = asObject(
    firstDefined(
      rootData.transaction,
      nestedData.transaction,
      json.transaction
    )
  );

  const payment = asObject(
    firstDefined(
      rootData.payment,
      nestedData.payment,
      transaction.payment,
      json.payment
    )
  );

  return {
    rootData,
    nestedData,
    transaction,
    payment,
    candidates: [json, rootData, nestedData, transaction, payment],
  };
}

function getValueFromCandidates(
  candidates: Record<string, any>[],
  keys: string[]
): unknown {
  for (const candidate of candidates) {
    for (const key of keys) {
      const value = candidate[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }
  return undefined;
}

// ============================================================================
// HANDLE GET (Digunakan oleh Polling Frontend / CampaignDetailClient)
// ============================================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get("orderId") || searchParams.get("transactionId");

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: "orderId atau transactionId wajib disertakan." },
        { status: 400 }
      );
    }

    const sanity = getSanityClient();

    // Cari transaksi berdasarkan orderId atau transactionId di Sanity
    const transaction = await sanity.fetch<SanityDonationTransaction | null>(
      `*[
        _type == "donationTransaction" &&
        (orderId == $identifier || transactionId == $identifier || _id == $identifier)
      ][0]{
        _id,
        orderId,
        transactionId,
        status,
        amount,
        paymentAmount,
        paidAmount,
        paidAt,
        expiresAt,
        paymentProvider,
        paymentVerified
      }`,
      { identifier }
    );

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Transaksi tidak ditemukan." },
        { status: 404 }
      );
    }

    // Jika di database status sudah sukses/paid, langsung kembalikan sukses
    const currentStatus = String(transaction.status || "").trim().toLowerCase();
    const isPaid = ["success", "paid", "settlement", "completed"].includes(currentStatus);

    return NextResponse.json({
      success: true,
      transaction: {
        orderId: transaction.orderId,
        transactionId: transaction.transactionId,
        status: isPaid ? "paid" : transaction.status || "pending",
      },
    });
  } catch (error) {
    console.error("[BDB STATUS GET ERROR]", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ============================================================================
// HANDLE POST (Kompatibel dengan sistem lama / Casaku Check Status)
// ============================================================================
export async function POST(request: Request) {
  let stage = "configuration";

  try {
    const sanity = getSanityClient();
    const licenseKey = requiredEnv("CASAKU_LICENSE_KEY", process.env.CASAKU_LICENSE_KEY);

    stage = "request validation";
    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Payload request tidak valid." },
        { status: 400 }
      );
    }

    const transactionId = cleanText(body?.transactionId || body?.orderId, 250);

    if (!transactionId) {
      return NextResponse.json(
        { success: false, message: "transactionId wajib diisi." },
        { status: 400 }
      );
    }

    stage = "Sanity transaction lookup";
    const transaction = await sanity.fetch<SanityDonationTransaction | null>(
      `*[
        _type == "donationTransaction" &&
        (transactionId == $transactionId || orderId == $transactionId)
      ][0]{
        _id,
        orderId,
        transactionId,
        status,
        amount,
        paymentAmount,
        paidAmount,
        paidAt,
        expiresAt,
        paymentProvider,
        paymentVerified
      }`,
      { transactionId }
    );

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Transaksi BDB.or.id tidak ditemukan." },
        { status: 404 }
      );
    }

    stage = "Casaku check-status";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(CASAKU_CHECK_STATUS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-license-key": licenseKey,
        },
        body: JSON.stringify({ transactionId: transaction.transactionId || transactionId }),
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await response.text();
    let json: Record<string, any>;

    try {
      json = asObject(rawText ? JSON.parse(rawText) : null);
    } catch {
      return NextResponse.json(
        { success: false, source: "casaku", message: "Respons Casaku bukan JSON yang valid." },
        { status: 502 }
      );
    }

    if (!response.ok || json.success === false) {
      return NextResponse.json(
        { success: false, source: "casaku", message: cleanText(json.message) || "Casaku gagal memeriksa transaksi." },
        { status: 502 }
      );
    }

    stage = "Casaku response validation";
    const parsed = getCasakuResponseData(json);
    const candidates = parsed.candidates;

    const rawStatus = getValueFromCandidates(candidates, [
      "status",
      "transactionStatus",
      "transaction_status",
      "paymentStatus",
      "payment_status",
    ]);

    const casakuStatus = normalizeCasakuStatus(rawStatus);

    stage = "payment amount verification";
    const returnedAmount = parseAmount(
      getValueFromCandidates(candidates, [
        "totalAmount",
        "total_amount",
        "amount",
        "paidAmount",
        "paid_amount",
        "transactionAmount",
        "transaction_amount",
      ])
    );

    const expectedAmount = parseAmount(transaction.paymentAmount ?? transaction.amount);

    if (casakuStatus === "paid" && expectedAmount > 0 && returnedAmount > 0 && returnedAmount !== expectedAmount) {
      return NextResponse.json(
        { success: false, message: "Nominal pembayaran tidak cocok." },
        { status: 409 }
      );
    }

    stage = "Sanity transaction update";
    let finalStatus = mapInternalStatus(casakuStatus);

    if (transaction.status === "success") {
      finalStatus = "success";
    }

    const patch: Record<string, unknown> = {};
    if (transaction.status !== finalStatus) {
      patch.status = finalStatus;
    }

    if (finalStatus === "success") {
      patch.paymentProvider = "casaku";
      patch.paymentMethod = "qris";
      patch.paymentVerified = true;
      patch.paidAt = transaction.paidAt || new Date().toISOString();
      patch.paidAmount = expectedAmount;
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date().toISOString();
      await sanity.patch(transaction._id).set(patch).commit();
    }

    stage = "Supabase status synchronization";
    await syncSupabaseStatus(transaction.orderId, finalStatus);

    let donationCredits: unknown = null;
    if (finalStatus === "success") {
      stage = "donation credit processing";
      const paidTransaction = await getDonationById(transaction._id);
      if (paidTransaction) {
        donationCredits = await ensureDonationCredits(paidTransaction);
      }
    }

    const finalCasakuStatus: CasakuStatus =
      finalStatus === "success" ? "paid" : finalStatus === "failed" ? "expired" : "pending";

    return NextResponse.json(
      {
        success: true,
        provider: "casaku",
        transactionId,
        orderId: transaction.orderId || null,
        status: finalCasakuStatus,
        internalStatus: finalStatus,
        amount: expectedAmount,
        paymentVerified: finalStatus === "success",
        donationCredits,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[BDB CASAKU STATUS ERROR]", error);
    return NextResponse.json(
      { success: false, source: stage, message: error instanceof Error ? error.message : "Terjadi kesalahan sistem." },
      { status: 500 }
    );
  }
}
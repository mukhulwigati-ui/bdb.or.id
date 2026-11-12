
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

interface StatusRequestBody {
  transactionId?: string;
}

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

/**
 * Mengubah nominal dari respons Casaku menjadi angka.
 * Mendukung angka dan string angka biasa.
 */
function parseAmount(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value.trim().replace(/[^\d.,-]/g, "");

  if (!normalized) return 0;

  // Format Indonesia: 1.000 atau 10.000
  if (/^-?\d{1,3}(\.\d{3})+$/.test(normalized)) {
    const parsed = Number(normalized.replace(/\./g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // Format angka biasa: 1000 atau 1000.00
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

  if (!url || !serviceKey) {
    console.warn(
      "[BDB SUPABASE] URL atau service role belum dikonfigurasi."
    );
    return;
  }

  try {
    const supabase = createSupabaseClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase
      .from("donations")
      .update({ status })
      .eq("invoice_id", orderId);

    if (error) {
      console.error("[BDB SUPABASE SYNC ERROR]", {
        orderId,
        status,
        message: error.message,
      });
    }
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
    candidates: [
      json,
      rootData,
      nestedData,
      transaction,
      payment,
    ],
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

export async function POST(request: Request) {
  let stage = "configuration";

  try {
    const sanity = getSanityClient();

    const licenseKey = requiredEnv(
      "CASAKU_LICENSE_KEY",
      process.env.CASAKU_LICENSE_KEY
    );

    // =========================================================
    // 1. VALIDASI REQUEST
    // =========================================================

    stage = "request validation";

    let body: StatusRequestBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Payload request tidak valid.",
        },
        { status: 400 }
      );
    }

    const transactionId = cleanText(body?.transactionId, 250);

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          message: "transactionId wajib diisi.",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 2. CARI TRANSAKSI DI SANITY
    // =========================================================

    stage = "Sanity transaction lookup";

    const transaction =
      await sanity.fetch<SanityDonationTransaction | null>(
        `*[
          _type == "donationTransaction" &&
          transactionId == $transactionId
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
        {
          success: false,
          message: "Transaksi BDB.or.id tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // =========================================================
    // 3. PERIKSA STATUS LANGSUNG KE CASAKU
    // =========================================================

    stage = "Casaku check-status";

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    let response: Response;

    try {
      response = await fetch(CASAKU_CHECK_STATUS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-license-key": licenseKey,
        },
        body: JSON.stringify({ transactionId }),
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
      console.error("[BDB CASAKU INVALID JSON]", {
        transactionId,
        rawText: rawText.slice(0, 3000),
      });

      return NextResponse.json(
        {
          success: false,
          source: "casaku",
          message: "Respons Casaku bukan JSON yang valid.",
        },
        { status: 502 }
      );
    }

    console.log("[BDB CASAKU STATUS DEBUG]", {
      httpStatus: response.status,
      requestedTransactionId: transactionId,
      response: json,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          source: "casaku",
          message:
            cleanText(json.message) ||
            `Casaku mengembalikan HTTP ${response.status}.`,
        },
        { status: 502 }
      );
    }

    if (
      json.success === false ||
      cleanText(json.status).toLowerCase() === "error"
    ) {
      return NextResponse.json(
        {
          success: false,
          source: "casaku",
          message:
            cleanText(json.message) ||
            "Casaku gagal memeriksa transaksi.",
        },
        { status: 502 }
      );
    }

    // =========================================================
    // 4. BACA BENTUK RESPONS CASAKU
    // =========================================================

    stage = "Casaku response validation";

    const parsed = getCasakuResponseData(json);
    const candidates = parsed.candidates;

    const providerTransactionId = cleanText(
      getValueFromCandidates(candidates, [
        "transactionId",
        "transaction_id",
        "trxId",
        "trx_id",
      ]),
      250
    );

    if (
      providerTransactionId &&
      providerTransactionId !== transactionId
    ) {
      console.error("[BDB CASAKU TRANSACTION ID MISMATCH]", {
        requested: transactionId,
        returned: providerTransactionId,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Identitas transaksi dari Casaku tidak cocok.",
        },
        { status: 409 }
      );
    }

    const rawStatus = getValueFromCandidates(candidates, [
      "status",
      "transactionStatus",
      "transaction_status",
      "paymentStatus",
      "payment_status",
    ]);

    const casakuStatus = normalizeCasakuStatus(rawStatus);

    // =========================================================
    // 5. VALIDASI NOMINAL
    // =========================================================

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

    const expectedAmount = parseAmount(
      transaction.paymentAmount ?? transaction.amount
    );

    if (expectedAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Nominal transaksi di Sanity tidak valid.",
        },
        { status: 409 }
      );
    }

    // Jika Casaku menyatakan lunas, nominal wajib tersedia dan cocok.
    if (casakuStatus === "paid") {
      if (returnedAmount <= 0) {
        console.error("[BDB CASAKU PAID WITHOUT AMOUNT]", {
          transactionId,
          expectedAmount,
          response: json,
        });

        return NextResponse.json(
          {
            success: false,
            message:
              "Casaku menyatakan pembayaran berhasil, tetapi nominal pembayaran tidak tersedia. Status belum diubah demi keamanan.",
          },
          { status: 409 }
        );
      }

      if (returnedAmount !== expectedAmount) {
        console.error("[BDB PAYMENT AMOUNT MISMATCH]", {
          transactionId,
          expectedAmount,
          returnedAmount,
        });

        return NextResponse.json(
          {
            success: false,
            message: "Nominal pembayaran tidak cocok.",
          },
          { status: 409 }
        );
      }
    } else if (
      transaction.status !== "success" &&
      returnedAmount > 0 &&
      returnedAmount !== expectedAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Nominal transaksi dari Casaku tidak cocok.",
        },
        { status: 409 }
      );
    }

    // =========================================================
    // 6. TENTUKAN STATUS AKHIR
    // =========================================================

    stage = "Sanity transaction update";

    let finalStatus = mapInternalStatus(casakuStatus);

    // Transaksi sukses tidak boleh turun status.
    if (transaction.status === "success") {
      finalStatus = "success";
    }

    const paidAtValue = cleanText(
      getValueFromCandidates(candidates, [
        "paidAt",
        "paid_at",
        "settledAt",
        "settled_at",
        "completedAt",
        "completed_at",
      ]),
      100
    );

    const expiredAtValue = cleanText(
      getValueFromCandidates(candidates, [
        "expiredAt",
        "expired_at",
        "expiresAt",
        "expires_at",
      ]),
      100
    );

    const patch: Record<string, unknown> = {};

    if (transaction.status !== finalStatus) {
      patch.status = finalStatus;
    }

    if (finalStatus === "success") {
      patch.paymentProvider = "casaku";
      patch.paymentMethod = "qris";
      patch.paymentVerified = true;
      patch.paidAt =
        transaction.paidAt ||
        paidAtValue ||
        new Date().toISOString();
      patch.paidAmount = expectedAmount;
    }

    if (
      expiredAtValue &&
      casakuStatus === "expired" &&
      transaction.status !== "success"
    ) {
      patch.expiresAt = expiredAtValue;
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date().toISOString();

      await sanity.patch(transaction._id).set(patch).commit();
    }

    // =========================================================
    // 7. SINKRONKAN SUPABASE
    // =========================================================

    stage = "Supabase status synchronization";

    await syncSupabaseStatus(transaction.orderId, finalStatus);

    // =========================================================
    // 8. PROSES KREDIT DONASI
    // =========================================================

    let donationCredits: unknown = null;

    if (finalStatus === "success") {
      stage = "donation credit processing";

      // Ambil ulang data terbaru dari Sanity.
      const paidTransaction = await getDonationById(transaction._id);

      if (!paidTransaction) {
        throw new Error(
          "Transaksi tidak ditemukan setelah status pembayaran berhasil."
        );
      }

      // Fungsi ini harus idempotent:
      // transaksi yang sudah dikredit tidak boleh dikredit ulang.
      donationCredits = await ensureDonationCredits(paidTransaction);

      console.log("[BDB DONATION CREDITS]", {
        transactionId,
        sanityId: transaction._id,
        credits: donationCredits,
      });
    }

    // =========================================================
    // 9. RESPONS UNTUK FRONTEND
    // =========================================================

    const finalCasakuStatus: CasakuStatus =
      finalStatus === "success"
        ? "paid"
        : finalStatus === "failed"
          ? casakuStatus === "cancel"
            ? "cancel"
            : "expired"
          : "pending";

    return NextResponse.json(
      {
        success: true,
        provider: "casaku",
        transactionId,
        orderId: transaction.orderId || null,
        status: finalCasakuStatus,
        internalStatus: finalStatus,
        paidAt:
          transaction.paidAt ||
          paidAtValue ||
          (finalStatus === "success"
            ? new Date().toISOString()
            : null),
        expiredAt: expiredAtValue || transaction.expiresAt || null,
        amount: expectedAmount,
        providerAmount: returnedAmount || null,
        providerStatus: cleanText(rawStatus, 50) || null,
        paymentVerified: finalStatus === "success",
        donationCredits,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[BDB CASAKU STATUS ERROR]", {
      stage,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    });

    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Koneksi ke Casaku timeout."
          : error.message
        : "Terjadi kesalahan sistem.";

    return NextResponse.json(
      {
        success: false,
        source: stage,
        message,
      },
      { status: 500 }
    );
  }
}

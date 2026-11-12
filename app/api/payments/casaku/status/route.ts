
// app/api/payments/casaku/status/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// NEXT CONFIG
// ============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ============================================================================
// CONSTANTS
// ============================================================================

const CASAKU_CHECK_STATUS_ENDPOINT =
  "https://api.casaku.id/api/generate/check-status";

type CasakuStatus =
  | "pending"
  | "paid"
  | "cancel"
  | "expired";

type InternalStatus =
  | "pending"
  | "success"
  | "failed";

// ============================================================================
// TYPES
// ============================================================================

interface StatusRequestBody {
  transactionId?: string;
}

interface CasakuStatusData {
  transactionId?: string;
  status?: string;
  amount?: number;
  totalAmount?: number;
  packageName?: string;
  appName?: string;
  paidAt?: string | null;
  expiredAt?: string | null;
  [key: string]: unknown;
}

interface CasakuStatusResponse {
  success?: boolean;
  message?: string;
  data?: CasakuStatusData;
  transactionId?: string;
  status?: string;
  amount?: number;
  totalAmount?: number;
  paidAt?: string | null;
  expiredAt?: string | null;
  [key: string]: unknown;
}

interface SanityDonationTransaction {
  _id: string;
  orderId?: string;
  transactionId?: string;
  status?: string;
  amount?: number;
  paymentAmount?: number;
  paidAt?: string;
  expiresAt?: string;
  paymentProvider?: string;
}

// ============================================================================
// ENVIRONMENT HELPERS
// ============================================================================

function getRequiredEnv(
  name: string,
  value?: string
): string {
  const result = value?.trim();

  if (!result) {
    throw new Error(
      `${name} belum dikonfigurasi di Vercel.`
    );
  }

  return result;
}

// ============================================================================
// SANITY CLIENT
// ============================================================================

function getSanityClient() {
  const projectId = getRequiredEnv(
    "NEXT_PUBLIC_SANITY_PROJECT_ID",
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  );

  const dataset = (
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    "production"
  ).trim();

  // Gunakan token dari project Sanity BDB yang sama.
  const token = getRequiredEnv(
    "SANITY_API_WRITE_TOKEN / SANITY_API_TOKEN",
    process.env.SANITY_API_WRITE_TOKEN ||
      process.env.SANITY_API_TOKEN
  );

  return createClient({
    projectId,
    dataset,
    apiVersion: "2026-08-31",
    useCdn: false,
    token,
  });
}

// ============================================================================
// CASAKU HELPERS
// ============================================================================

function getLicenseKey(): string {
  return getRequiredEnv(
    "CASAKU_LICENSE_KEY",
    process.env.CASAKU_LICENSE_KEY
  );
}

function cleanText(
  value: unknown,
  maxLength = 500
): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function normalizeCasakuStatus(
  value: unknown
): CasakuStatus {
  const status = cleanText(
    value,
    30
  ).toLowerCase();

  if (status === "paid") {
    return "paid";
  }

  if (status === "cancel") {
    return "cancel";
  }

  if (status === "expired") {
    return "expired";
  }

  return "pending";
}

function mapCasakuToInternalStatus(
  status: CasakuStatus
): InternalStatus {
  if (status === "paid") {
    return "success";
  }

  if (
    status === "cancel" ||
    status === "expired"
  ) {
    return "failed";
  }

  return "pending";
}

// ============================================================================
// SUPABASE SYNC
// ============================================================================

async function syncSupabaseStatus({
  orderId,
  status,
}: {
  orderId?: string;
  status: InternalStatus;
}) {
  if (!orderId) {
    return;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "[BDB SUPABASE] Service role belum dikonfigurasi. Sinkronisasi dilewati."
    );
    return;
  }

  try {
    const supabaseAdmin = createSupabaseClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { error } = await supabaseAdmin
      .from("donations")
      .update({
        status,
      })
      .eq("invoice_id", orderId);

    if (error) {
      console.error(
        "[BDB SUPABASE SYNC ERROR]",
        error.message
      );
    }
  } catch (error) {
    console.error(
      "[BDB SUPABASE SYNC ERROR]",
      error
    );
  }
}

// ============================================================================
// UPDATE SANITY TRANSACTION
// ============================================================================

async function updateSanityTransaction({
  sanityClient,
  transaction,
  casakuStatus,
  paidAt,
  expiredAt,
}: {
  sanityClient: ReturnType<typeof createClient>;
  transaction: SanityDonationTransaction;
  casakuStatus: CasakuStatus;
  paidAt?: string | null;
  expiredAt?: string | null;
}): Promise<InternalStatus> {
  const currentStatus = transaction.status;

  let internalStatus =
    mapCasakuToInternalStatus(casakuStatus);

  // Transaksi yang sudah sukses tidak boleh turun
  // kembali menjadi pending atau failed.
  if (currentStatus === "success") {
    internalStatus = "success";
  }

  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (internalStatus !== currentStatus) {
    patch.status = internalStatus;
  }

  if (internalStatus === "success") {
    patch.paymentProvider = "casaku";
    patch.paymentMethod = "qris";
    patch.paymentVerified = true;
    patch.paidAt =
      transaction.paidAt ||
      paidAt ||
      new Date().toISOString();

    patch.paidAmount =
      transaction.paymentAmount ??
      transaction.amount ??
      0;
  }

  if (
    casakuStatus === "expired" &&
    expiredAt &&
    internalStatus !== "success"
  ) {
    patch.expiresAt = expiredAt;
  }

  // Hindari mutation jika tidak ada perubahan.
  if (Object.keys(patch).length > 1) {
    await sanityClient
      .patch(transaction._id)
      .set(patch)
      .commit();
  }

  // Tetap sinkronkan Supabase meskipun status Sanity
  // tidak berubah.
  await syncSupabaseStatus({
    orderId: transaction.orderId,
    status: internalStatus,
  });

  return internalStatus;
}

// ============================================================================
// POST: CHECK PAYMENT STATUS
// ============================================================================

export async function POST(request: Request) {
  let stage = "configuration";

  try {
    // ------------------------------------------------------------------------
    // 1. SANITY CONFIGURATION
    // ------------------------------------------------------------------------

    const sanityClient = getSanityClient();

    const licenseKey = getLicenseKey();

    // ------------------------------------------------------------------------
    // 2. VALIDATE REQUEST
    // ------------------------------------------------------------------------

    stage = "request validation";

    let body: StatusRequestBody;

    try {
      body = (await request.json()) as StatusRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Payload request tidak valid.",
        },
        { status: 400 }
      );
    }

    const transactionId = cleanText(
      body?.transactionId,
      250
    );

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          message: "transactionId wajib diisi.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------------
    // 3. FIND TRANSACTION IN SANITY
    // ------------------------------------------------------------------------

    stage = "Sanity transaction lookup";

    const transaction =
      await sanityClient.fetch<SanityDonationTransaction | null>(
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
          paidAt,
          expiresAt,
          paymentProvider
        }`,
        {
          transactionId,
        }
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

    // ------------------------------------------------------------------------
    // 4. CHECK CASAKU STATUS
    // ------------------------------------------------------------------------

    stage = "Casaku check-status";

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      15000
    );

    let casakuResponse: Response;

    try {
      casakuResponse = await fetch(
        CASAKU_CHECK_STATUS_ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-license-key": licenseKey,
          },
          body: JSON.stringify({
            transactionId,
          }),
          cache: "no-store",
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await casakuResponse.text();

    let casakuJson: CasakuStatusResponse | null = null;

    try {
      casakuJson = rawText
        ? JSON.parse(rawText)
        : null;
    } catch {
      casakuJson = null;
    }

    if (!casakuResponse.ok || !casakuJson) {
      console.error(
        "[BDB CASAKU CHECK STATUS ERROR]",
        {
          httpStatus: casakuResponse.status,
          response: rawText,
        }
      );

      const casakuMessage =
        cleanText(casakuJson?.message) ||
        `Casaku mengembalikan HTTP ${casakuResponse.status}.`;

      return NextResponse.json(
        {
          success: false,
          source: "casaku",
          message: `Casaku check-status: ${casakuMessage}`,
        },
        {
          status: 502,
        }
      );
    }

    if (
      casakuJson.success === false ||
      casakuJson.status === "error"
    ) {
      console.error(
        "[BDB CASAKU API ERROR]",
        casakuJson
      );

      return NextResponse.json(
        {
          success: false,
          source: "casaku",
          message:
            cleanText(casakuJson.message) ||
            "Casaku menolak pemeriksaan status transaksi.",
        },
        { status: 502 }
      );
    }

    // ------------------------------------------------------------------------
    // 5. NORMALIZE CASAKU RESPONSE
    // ------------------------------------------------------------------------

    stage = "Casaku response validation";

    const data =
      casakuJson.data &&
      typeof casakuJson.data === "object"
        ? casakuJson.data
        : casakuJson;

    const responseTransactionId = cleanText(
      data.transactionId || transactionId,
      250
    );

    if (responseTransactionId !== transactionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Identitas transaksi tidak cocok.",
        },
        { status: 409 }
      );
    }

    const casakuStatus = normalizeCasakuStatus(
      data.status
    );

    // ------------------------------------------------------------------------
    // 6. VERIFY PAYMENT AMOUNT
    // ------------------------------------------------------------------------

    stage = "payment amount verification";

    const returnedAmount = Number(
      data.totalAmount ??
        data.amount ??
        0
    );

    const expectedAmount = Number(
      transaction.paymentAmount ??
        transaction.amount ??
        0
    );

    if (
      returnedAmount > 0 &&
      expectedAmount > 0 &&
      returnedAmount !== expectedAmount
    ) {
      console.error(
        "[BDB PAYMENT AMOUNT MISMATCH]",
        {
          transactionId,
          expectedAmount,
          returnedAmount,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message: "Nominal pembayaran tidak cocok.",
        },
        { status: 409 }
      );
    }

    // ------------------------------------------------------------------------
    // 7. UPDATE SANITY AND SUPABASE
    // ------------------------------------------------------------------------

    stage = "Sanity transaction update";

    const paidAt =
      cleanText(data.paidAt, 100) || null;

    const expiredAt =
      cleanText(data.expiredAt, 100) || null;

    const finalStatus = await updateSanityTransaction({
      sanityClient,
      transaction,
      casakuStatus,
      paidAt,
      expiredAt,
    });

    // ------------------------------------------------------------------------
    // 8. RESPONSE TO FRONTEND
    // ------------------------------------------------------------------------

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
          paidAt,
        expiredAt,
        amount:
          expectedAmount ||
          returnedAmount ||
          null,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error(
      "[BDB CASAKU STATUS ERROR]",
      {
        stage,
        error,
      }
    );

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
        message:
          stage === "Sanity transaction lookup" ||
          stage === "Sanity transaction update"
            ? `Sanity error: ${message}`
            : message,
      },
      { status: 500 }
    );
  }
}

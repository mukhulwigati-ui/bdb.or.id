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

const CASAKU_API_BASE_URL = "https://api.casaku.id";

const CASAKU_CHECK_STATUS_ENDPOINT =
  `${CASAKU_API_BASE_URL}/api/generate/check-status`;

// ============================================================================
// SANITY
// ============================================================================

const sanityClient = createClient({
  projectId:
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    "xqggeww8",

  dataset:
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    "production",

  apiVersion: "2024-01-01",

  useCdn: false,

  token: process.env.SANITY_API_TOKEN,
});

// ============================================================================
// TYPES
// ============================================================================

type CasakuStatus =
  | "pending"
  | "paid"
  | "cancel"
  | "expired";

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
  status?: number | string;

  success?: boolean;

  message?: string;

  data?: CasakuStatusData;

  transactionId?: string;

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
// HELPERS
// ============================================================================

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
): "pending" | "success" | "failed" {
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

function getLicenseKey(): string {
  const licenseKey =
    process.env.CASAKU_LICENSE_KEY?.trim();

  if (!licenseKey) {
    throw new Error(
      "CASAKU_LICENSE_KEY belum dikonfigurasi."
    );
  }

  return licenseKey;
}

function getSanityToken(): string {
  const token =
    process.env.SANITY_API_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "SANITY_API_TOKEN belum dikonfigurasi."
    );
  }

  return token;
}

// ============================================================================
// OPTIONAL SUPABASE SYNC
// ============================================================================

async function syncSupabaseStatus({
  orderId,
  status,
}: {
  orderId?: string;
  status: "pending" | "success" | "failed";
}) {
  if (!orderId) {
    return;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    return;
  }

  try {
    const supabaseAdmin =
      createSupabaseClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    const { error } =
      await supabaseAdmin
        .from("donations")
        .update({
          status,
        })
        .eq(
          "invoice_id",
          orderId
        );

    if (error) {
      console.warn(
        "⚠️ Sinkronisasi status Supabase gagal:",
        error.message
      );
    }
  } catch (error) {
    console.warn(
      "⚠️ Sinkronisasi Supabase dilewati:",
      error
    );
  }
}

// ============================================================================
// UPDATE SANITY
// ============================================================================

async function updateSanityTransaction({
  transaction,
  casakuStatus,
  paidAt,
  expiredAt,
}: {
  transaction: SanityDonationTransaction;

  casakuStatus: CasakuStatus;

  paidAt?: string | null;

  expiredAt?: string | null;
}) {
  const internalStatus =
    mapCasakuToInternalStatus(
      casakuStatus
    );

  // Hindari mutation Sanity setiap polling 3 detik
  // apabila status belum berubah.
  if (
    transaction.status ===
      internalStatus &&
    !(
      internalStatus === "success" &&
      paidAt &&
      !transaction.paidAt
    )
  ) {
    return;
  }

  const patch: Record<
    string,
    unknown
  > = {
    status:
      internalStatus,

    paymentProvider:
      "casaku",

    updatedAt:
      new Date().toISOString(),
  };

  if (
    internalStatus ===
    "success"
  ) {
    patch.paidAt =
      paidAt ||
      new Date().toISOString();

    patch.paymentVerified =
      true;
  }

  if (
    casakuStatus ===
      "expired" &&
    expiredAt
  ) {
    patch.expiresAt =
      expiredAt;
  }

  await sanityClient
    .patch(
      transaction._id
    )
    .set(patch)
    .commit();

  await syncSupabaseStatus({
    orderId:
      transaction.orderId,

    status:
      internalStatus,
  });
}

// ============================================================================
// POST
// ============================================================================

export async function POST(
  request: Request
) {
  try {
    getSanityToken();

    const licenseKey =
      getLicenseKey();

    // ------------------------------------------------------------------------
    // 1. VALIDASI REQUEST
    // ------------------------------------------------------------------------

    let body:
      | StatusRequestBody
      | null = null;

    try {
      body =
        (await request.json()) as StatusRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,

          message:
            "Payload tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    const transactionId =
      cleanText(
        body?.transactionId,
        250
      );

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,

          message:
            "transactionId wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------------------------------
    // 2. PASTIKAN TRANSAKSI MEMANG MILIK WEBSITE KITA
    // ------------------------------------------------------------------------

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

          message:
            "Transaksi tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    // ------------------------------------------------------------------------
    // 3. CEK LANGSUNG KE CASAKU
    // ------------------------------------------------------------------------

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => {
          controller.abort();
        },
        15_000
      );

    let response: Response;

    try {
      response =
        await fetch(
          CASAKU_CHECK_STATUS_ENDPOINT,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              "x-license-key":
                licenseKey,
            },

            body:
              JSON.stringify({
                transactionId,
              }),

            cache:
              "no-store",

            signal:
              controller.signal,
          }
        );
    } finally {
      clearTimeout(
        timeout
      );
    }

    const rawText =
      await response.text();

    let casakuJson:
      | CasakuStatusResponse
      | null = null;

    try {
      casakuJson =
        rawText
          ? JSON.parse(
              rawText
            )
          : null;
    } catch {
      casakuJson =
        null;
    }

    if (
      !response.ok ||
      !casakuJson
    ) {
      console.error(
        "❌ Casaku check-status gagal:",
        {
          httpStatus:
            response.status,

          response:
            rawText,
        }
      );

      return NextResponse.json(
        {
          success: false,

          message:
            casakuJson?.message ||
            "Gagal memeriksa status pembayaran.",
        },
        {
          status:
            response.status >=
              400 &&
            response.status <
              600
              ? response.status
              : 502,
        }
      );
    }

    // ------------------------------------------------------------------------
    // 4. NORMALISASI RESPONS CASAKU
    // ------------------------------------------------------------------------

    const data =
      casakuJson.data &&
      typeof casakuJson.data ===
        "object"
        ? casakuJson.data
        : casakuJson;

    const casakuStatus =
      normalizeCasakuStatus(
        data.status
      );

    const responseTransactionId =
      cleanText(
        data.transactionId ||
          transactionId,
        250
      );

    if (
      responseTransactionId !==
      transactionId
    ) {
      console.error(
        "❌ transactionId Casaku tidak cocok."
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Identitas transaksi tidak cocok.",
        },
        {
          status: 409,
        }
      );
    }

    // ------------------------------------------------------------------------
    // 5. JIKA CASAKU MENGEMBALIKAN NOMINAL, VERIFIKASI
    // ------------------------------------------------------------------------

    const returnedAmount =
      Number(
        data.totalAmount ??
          data.amount ??
          0
      );

    const expectedAmount =
      Number(
        transaction.paymentAmount ??
          transaction.amount ??
          0
      );

    if (
      returnedAmount >
        0 &&
      expectedAmount >
        0 &&
      returnedAmount !==
        expectedAmount
    ) {
      console.error(
        "❌ Nominal transaksi tidak cocok:",
        {
          transactionId,

          expectedAmount,

          returnedAmount,
        }
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Nominal pembayaran tidak cocok.",
        },
        {
          status: 409,
        }
      );
    }

    // ------------------------------------------------------------------------
    // 6. SINKRONKAN KE SANITY
    // ------------------------------------------------------------------------

    const paidAt =
      cleanText(
        data.paidAt,
        100
      ) || null;

    const expiredAt =
      cleanText(
        data.expiredAt,
        100
      ) || null;

    await updateSanityTransaction({
      transaction,

      casakuStatus,

      paidAt,

      expiredAt,
    });

    // ------------------------------------------------------------------------
    // 7. RESPONSE KE FRONTEND
    // ------------------------------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        transactionId,

        orderId:
          transaction.orderId ||
          null,

        status:
          casakuStatus,

        paidAt,

        expiredAt,

        amount:
          expectedAmount ||
          returnedAmount ||
          null,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "🔥 Casaku status error:",
      error
    );

    const message =
      error instanceof Error
        ? error.name ===
          "AbortError"
          ? "Koneksi ke Casaku timeout."
          : error.message
        : "Terjadi kesalahan sistem.";

    return NextResponse.json(
      {
        success: false,

        message,
      },
      {
        status: 500,
      }
    );
  }
}
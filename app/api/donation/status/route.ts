
import { NextResponse } from "next/server";

import {
  getDonationByOrderId,
  getDonationByTransactionId,
  getDonationById,
  reconcileDonation,
} from "@/lib/payments/casaku-settlement";

// ============================================================================
// NEXT CONFIG
// ============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ============================================================================
// TYPES
// ============================================================================

type DonationStatus =
  | "paid"
  | "pending"
  | "failed"
  | "error";

interface DonationRecord {
  _id: string;
  orderId?: string;
  transactionId?: string;
  status?: string;
  paymentVerified?: boolean;
  amount?: number;
  paymentAmount?: number;
  paidAmount?: number;
  paidAt?: string;
  expiresAt?: string;
  whatsappSentAt?: string;
  googleSheetLoggedAt?: string;
  [key: string]: unknown;
}

interface ReconcileResult {
  status?: string;
  casakuStatus?: string;
  credits?: {
    program?: {
      credited?: boolean;
      reason?: string;
    };
    fundraiser?: {
      credited?: boolean;
      reason?: string;
    };
    notifications?: {
      whatsapp?: {
        success?: boolean;
        skipped?: boolean;
        error?: string;
      };
      googleSheets?: {
        success?: boolean;
        skipped?: boolean;
        error?: string;
      };
    };
  } | null;
  transaction?: DonationRecord | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function cleanText(
  value: unknown,
  maxLength = 250
): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function normalizeStatus(value: unknown): string {
  return cleanText(value, 50).toLowerCase();
}

function isPaidStatus(value: unknown): boolean {
  return [
    "success",
    "successful",
    "paid",
    "settlement",
    "settled",
    "completed",
    "complete",
  ].includes(normalizeStatus(value));
}

function isFailedStatus(value: unknown): boolean {
  return [
    "failed",
    "failure",
    "expired",
    "expire",
    "cancel",
    "cancelled",
    "canceled",
  ].includes(normalizeStatus(value));
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function jsonError(
  message: string,
  status = 400
) {
  return jsonResponse(
    {
      success: false,
      status: "error" as DonationStatus,
      message,
    },
    status
  );
}

// ============================================================================
// FIND DONATION
// ============================================================================

/**
 * Identifier tidak boleh dipertukarkan:
 *
 * orderId       = ID internal aplikasi.
 * transactionId = ID transaksi dari Casaku.
 * id            = ID dokumen Sanity.
 */

async function findDonation(params: {
  orderId: string;
  transactionId: string;
  sanityId: string;
}) {
  const {
    orderId,
    transactionId,
    sanityId,
  } = params;

  const identifiersProvided = [
    orderId,
    transactionId,
    sanityId,
  ].filter(Boolean).length;

  if (identifiersProvided !== 1) {
    throw new Error(
      "Gunakan tepat satu identifier transaksi."
    );
  }

  if (orderId) {
    return getDonationByOrderId(orderId);
  }

  if (transactionId) {
    return getDonationByTransactionId(transactionId);
  }

  return getDonationById(sanityId);
}

// ============================================================================
// BUILD STATUS RESPONSE
// ============================================================================

function buildStatusResponse(
  result: ReconcileResult
) {
  const transaction = result.transaction;

  if (!transaction) {
    return jsonError(
      "Data transaksi tidak tersedia setelah rekonsiliasi.",
      500
    );
  }

  const localStatus = normalizeStatus(
    transaction.status
  );

  const reconcileStatus = normalizeStatus(
    result.status
  );

  const gatewayStatus = normalizeStatus(
    result.casakuStatus
  );

  /*
   * Pembayaran dianggap PAID hanya jika:
   * 1. Status lokal sudah sukses.
   * 2. paymentVerified benar.
   *
   * Jangan hanya mengandalkan status gateway,
   * karena nominal dan transactionId juga harus cocok.
   */

  if (
    isPaidStatus(localStatus) &&
    transaction.paymentVerified === true
  ) {
    return jsonResponse({
      success: true,
      status: "paid" as DonationStatus,

      transaction: {
        _id: transaction._id,
        orderId: transaction.orderId,
        transactionId: transaction.transactionId,

        donorName: transaction.donorName,
        donorPhone: transaction.donorPhone,

        amount: transaction.amount,
        paymentAmount: transaction.paymentAmount,
        paidAmount: transaction.paidAmount,

        status: "success",
        paymentVerified: true,

        paidAt: transaction.paidAt,
        expiresAt: transaction.expiresAt,

        programTitle: transaction.programTitle,
        campaignSlug: transaction.campaignSlug,

        whatsappSentAt:
          transaction.whatsappSentAt,

        googleSheetLoggedAt:
          transaction.googleSheetLoggedAt,
      },

      credits: result.credits ?? null,

      message:
        "Pembayaran berhasil dikonfirmasi.",
    });
  }

  /*
   * Status gagal hanya diberikan jika transaksi
   * memang gagal di database lokal.
   */

  if (isFailedStatus(localStatus)) {
    return jsonResponse({
      success: true,
      status: "failed" as DonationStatus,

      transaction: {
        _id: transaction._id,
        orderId: transaction.orderId,
        transactionId: transaction.transactionId,
        status: localStatus,
        paymentVerified:
          transaction.paymentVerified === true,
      },

      message:
        localStatus === "expired" ||
        localStatus === "expire"
          ? "Waktu pembayaran telah kedaluwarsa."
          : "Transaksi pembayaran dibatalkan atau gagal.",
    });
  }

  /*
   * Jika Casaku menyatakan paid tetapi database lokal
   * belum terverifikasi, jangan mengirim status paid.
   *
   * Polling berikutnya akan mencoba rekonsiliasi lagi.
   */

  if (isPaidStatus(gatewayStatus)) {
    return jsonResponse({
      success: true,
      status: "pending" as DonationStatus,

      transaction: {
        _id: transaction._id,
        orderId: transaction.orderId,
        transactionId: transaction.transactionId,
        status: localStatus || "pending",
        paymentVerified: false,
      },

      message:
        "Pembayaran terdeteksi oleh Casaku dan sedang diproses untuk verifikasi.",
    });
  }

  return jsonResponse({
    success: true,
    status: "pending" as DonationStatus,

    transaction: {
      _id: transaction._id,
      orderId: transaction.orderId,
      transactionId: transaction.transactionId,
      status: localStatus || "pending",
      paymentVerified:
        transaction.paymentVerified === true,
    },

    message:
      reconcileStatus === "pending"
        ? "Pembayaran belum dikonfirmasi oleh Casaku."
        : "Status pembayaran masih dalam proses pemeriksaan.",
  });
}

// ============================================================================
// GET: CHECK DONATION STATUS
// ============================================================================

export async function GET(request: Request) {
  try {
    // ========================================================================
    // 1. READ PARAMETERS
    // ========================================================================

    const { searchParams } = new URL(request.url);

    const orderId = cleanText(
      searchParams.get("orderId")
    );

    const transactionId = cleanText(
      searchParams.get("transactionId")
    );

    const sanityId = cleanText(
      searchParams.get("id")
    );

    // ========================================================================
    // 2. VALIDATE IDENTIFIER
    // ========================================================================

    const identifierCount = [
      orderId,
      transactionId,
      sanityId,
    ].filter(Boolean).length;

    if (identifierCount === 0) {
      return jsonError(
        "Parameter orderId, transactionId, atau id wajib diisi.",
        400
      );
    }

    if (identifierCount > 1) {
      return jsonError(
        "Gunakan satu identifier saja: orderId, transactionId, atau id.",
        400
      );
    }

    // ========================================================================
    // 3. FIND DONATION
    // ========================================================================

    const transaction = await findDonation({
      orderId,
      transactionId,
      sanityId,
    });

    if (!transaction) {
      return jsonError(
        "Transaksi tidak ditemukan di database.",
        404
      );
    }

    if (!transaction._id) {
      console.error(
        "[DONATION STATUS] Sanity document ID tidak ditemukan.",
        {
          orderId: transaction.orderId,
          transactionId: transaction.transactionId,
        }
      );

      return jsonError(
        "Data transaksi tidak memiliki ID dokumen Sanity.",
        500
      );
    }

    // ========================================================================
    // 4. VALIDATE CASAKU TRANSACTION ID
    // ========================================================================

    /*
     * transactionId wajib merupakan ID asli dari Casaku.
     * Jangan menggunakan orderId sebagai penggantinya.
     */

    const casakuTransactionId = cleanText(
      transaction.transactionId
    );

    if (!casakuTransactionId) {
      console.warn(
        "[DONATION STATUS] Casaku transactionId kosong.",
        {
          sanityId: transaction._id,
          orderId: transaction.orderId,
        }
      );

      return jsonResponse({
        success: true,
        status: "pending" as DonationStatus,

        transaction: {
          _id: transaction._id,
          orderId: transaction.orderId,
          status: normalizeStatus(transaction.status) || "pending",
          paymentVerified:
            transaction.paymentVerified === true,
        },

        message:
          "ID transaksi Casaku belum tersedia. Pembayaran belum dapat diverifikasi.",
      });
    }

    // ========================================================================
    // 5. RECONCILE PAYMENT
    // ========================================================================

    console.log(
      "[DONATION STATUS] RECONCILE START",
      {
        sanityId: transaction._id,
        orderId: transaction.orderId,
        transactionId: casakuTransactionId,

        localStatus: transaction.status,
        paymentVerified:
          transaction.paymentVerified,

        amount: transaction.amount,
        paymentAmount: transaction.paymentAmount,
      }
    );

    /*
     * Semua proses pembayaran ditangani oleh settlement helper:
     *
     * - Pemeriksaan status Casaku.
     * - Validasi transactionId.
     * - Validasi nominal.
     * - Update status Sanity.
     * - Sinkronisasi Supabase.
     * - Kredit program.
     * - Kredit fundraiser.
     * - Pengiriman WhatsApp.
     * - Pencatatan Google Sheets.
     *
     * Route ini tidak melakukan patch pembayaran sendiri.
     */

    const result = await reconcileDonation(
      transaction
    ) as ReconcileResult;

    // ========================================================================
    // 6. GET LATEST TRANSACTION
    // ========================================================================

    /*
     * Ambil ulang agar respons frontend menggunakan data
     * terbaru setelah proses settlement dan notifikasi.
     */

    const latestTransaction =
      result.transaction
        ? await getDonationById(result.transaction._id)
        : null;

    if (!latestTransaction) {
      console.error(
        "[DONATION STATUS] Transaksi terbaru tidak ditemukan.",
        {
          sanityId: transaction._id,
          orderId: transaction.orderId,
          transactionId: casakuTransactionId,
        }
      );

      throw new Error(
        "Transaksi tidak ditemukan setelah proses rekonsiliasi."
      );
    }

    const finalResult: ReconcileResult = {
      ...result,
      transaction: latestTransaction as DonationRecord,
    };

    // ========================================================================
    // 7. LOG RESULT
    // ========================================================================

    console.log(
      "[DONATION STATUS] RECONCILE RESULT",
      {
        sanityId: latestTransaction._id,
        orderId: latestTransaction.orderId,
        transactionId: latestTransaction.transactionId,

        localStatus: latestTransaction.status,
        paymentVerified:
          latestTransaction.paymentVerified,

        casakuStatus: result.casakuStatus,

        amount: latestTransaction.amount,
        paymentAmount: latestTransaction.paymentAmount,

        programCredited:
          result.credits?.program?.credited ?? false,

        fundraiserCredited:
          result.credits?.fundraiser?.credited ?? false,

        whatsappSent:
          result.credits?.notifications?.whatsapp?.success ?? false,

        googleSheetsLogged:
          result.credits?.notifications?.googleSheets?.success ?? false,
      }
    );

    // ========================================================================
    // 8. RETURN STATUS
    // ========================================================================

    return buildStatusResponse(finalResult);

  } catch (error: unknown) {
    console.error(
      "[DONATION STATUS API ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return jsonResponse(
      {
        success: false,

        status: "error" as DonationStatus,

        message:
          "Gagal memeriksa status pembayaran. Silakan coba kembali.",

        detail:
          process.env.NODE_ENV === "development"
            ? message
            : undefined,
      },
      500
    );
  }
}

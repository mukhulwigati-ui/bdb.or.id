
import { NextResponse } from "next/server";

import {
  getDonationById,
  getDonationByOrderId,
  getDonationByTransactionId,
  ensureDonationCredits,
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

interface StatusIdentifiers {
  orderId?: string;
  transactionId?: string;
  sanityId?: string;
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

function normalizeStatus(
  value: unknown
): string {
  return cleanText(value, 50).toLowerCase();
}

function isPaidStatus(
  value: unknown
): boolean {
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

function isFailedStatus(
  value: unknown
): boolean {
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

function jsonError(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      status: "error" as DonationStatus,
      message,
    },
    { status }
  );
}

// ============================================================================
// IDENTIFIER VALIDATION
// ============================================================================

function validateIdentifiers(
  identifiers: StatusIdentifiers
): string | null {
  const supplied = [
    identifiers.orderId,
    identifiers.transactionId,
    identifiers.sanityId,
  ].filter(Boolean);

  if (supplied.length === 0) {
    return "orderId, transactionId, atau id wajib disertakan.";
  }

  if (supplied.length > 1) {
    return "Gunakan hanya satu identifier: orderId, transactionId, atau id.";
  }

  return null;
}

// ============================================================================
// FIND DONATION
// ============================================================================

async function findDonation(
  identifiers: StatusIdentifiers
): Promise<any | null> {
  if (identifiers.orderId) {
    return getDonationByOrderId(
      identifiers.orderId
    );
  }

  if (identifiers.transactionId) {
    return getDonationByTransactionId(
      identifiers.transactionId
    );
  }

  if (identifiers.sanityId) {
    return getDonationById(
      identifiers.sanityId
    );
  }

  return null;
}

// ============================================================================
// BUILD RESPONSE
// ============================================================================

function buildResponse({
  transaction,
  reconciliation,
}: {
  transaction: any;
  reconciliation?: any;
}) {
  const localStatus = normalizeStatus(
    transaction?.status
  );

  const gatewayStatus = normalizeStatus(
    reconciliation?.casakuStatus
  );

  const settlementStatus = normalizeStatus(
    reconciliation?.status
  );

  const paymentVerified =
    transaction?.paymentVerified === true;

  /*
   * Status paid harus memiliki bukti verifikasi.
   * Status sukses yang belum terverifikasi tidak
   * boleh langsung dinyatakan lunas ke frontend.
   */

  if (
    isPaidStatus(localStatus) &&
    paymentVerified
  ) {
    return NextResponse.json({
      success: true,
      status: "paid" as DonationStatus,
      transaction: {
        orderId: transaction.orderId,
        transactionId: transaction.transactionId,
        status: "paid",
        paymentVerified: true,
        amount: transaction.amount,
        paymentAmount: transaction.paymentAmount,
        paidAmount: transaction.paidAmount,
        paidAt: transaction.paidAt,
      },
      message:
        "Pembayaran berhasil dikonfirmasi.",
    });
  }

  if (
    isFailedStatus(localStatus) ||
    isFailedStatus(settlementStatus) ||
    isFailedStatus(gatewayStatus)
  ) {
    return NextResponse.json({
      success: true,
      status: "failed" as DonationStatus,
      transaction: {
        orderId: transaction.orderId,
        transactionId: transaction.transactionId,
        status: localStatus || "failed",
        paymentVerified,
      },
      message:
        localStatus === "expired" ||
        gatewayStatus === "expired"
          ? "Waktu pembayaran telah kedaluwarsa."
          : "Transaksi pembayaran gagal atau dibatalkan.",
    });
  }

  return NextResponse.json({
    success: true,
    status: "pending" as DonationStatus,
    transaction: {
      orderId: transaction.orderId,
      transactionId: transaction.transactionId,
      status: "pending",
      paymentVerified,
    },
    message:
      "Pembayaran belum dikonfirmasi oleh Casaku.",
  });
}

// ============================================================================
// PROCESS STATUS
// ============================================================================

async function processDonationStatus(
  identifiers: StatusIdentifiers
) {
  // =====================================================
  // 1. VALIDASI IDENTIFIER
  // =====================================================

  const validationError =
    validateIdentifiers(identifiers);

  if (validationError) {
    return jsonError(
      validationError,
      400
    );
  }

  // =====================================================
  // 2. CARI TRANSAKSI SANITY
  // =====================================================

  let transaction = await findDonation(
    identifiers
  );

  if (!transaction) {
    return jsonError(
      "Transaksi BDB tidak ditemukan.",
      404
    );
  }

  if (!transaction._id) {
    console.error(
      "[CASAKU STATUS] Sanity document ID kosong.",
      {
        orderId: transaction.orderId,
        transactionId: transaction.transactionId,
      }
    );

    return jsonError(
      "ID dokumen transaksi Sanity tidak ditemukan.",
      500
    );
  }

  // =====================================================
  // 3. VALIDASI TRANSACTION ID CASAKU
  // =====================================================

  const casakuTransactionId = cleanText(
    transaction.transactionId,
    250
  );

  if (!casakuTransactionId) {
    console.warn(
      "[CASAKU STATUS] transactionId belum tersedia.",
      {
        sanityId: transaction._id,
        orderId: transaction.orderId,
      }
    );

    return NextResponse.json({
      success: true,
      status: "pending" as DonationStatus,
      transaction: {
        orderId: transaction.orderId,
        transactionId: null,
        status: "pending",
      },
      message:
        "ID transaksi Casaku belum tersedia.",
    });
  }

  /*
   * Jika pencarian dilakukan menggunakan transactionId,
   * pastikan identifier tersebut benar-benar sama
   * dengan transactionId yang tersimpan di Sanity.
   */

  if (
    identifiers.transactionId &&
    identifiers.transactionId !== casakuTransactionId
  ) {
    return jsonError(
      "transactionId tidak cocok dengan data transaksi.",
      409
    );
  }

  // =====================================================
  // 4. CEK STATUS LOKAL
  // =====================================================

  const localStatus = normalizeStatus(
    transaction.status
  );

  const alreadyVerified =
    isPaidStatus(localStatus) &&
    transaction.paymentVerified === true;

  /*
   * Jika sudah lunas dan terverifikasi,
   * pastikan kredit program/fundraiser sudah diproses.
   */

  if (alreadyVerified) {
    await ensureDonationCredits(transaction);

    const freshTransaction =
      await getDonationById(transaction._id);

    if (!freshTransaction) {
      throw new Error(
        "Transaksi tidak dapat dibaca kembali dari Sanity."
      );
    }

    return buildResponse({
      transaction: freshTransaction,
    });
  }

  // =====================================================
  // 5. REKONSILIASI KE CASAKU
  // =====================================================

  console.log(
    "[CASAKU STATUS] RECONCILIATION START",
    {
      sanityId: transaction._id,
      orderId: transaction.orderId,
      transactionId: casakuTransactionId,
      localStatus: transaction.status,
      paymentVerified: transaction.paymentVerified,
      amount: transaction.amount,
      paymentAmount: transaction.paymentAmount,
    }
  );

  /*
   * Semua verifikasi pembayaran dilakukan oleh helper
   * casaku-settlement.ts.
   *
   * Jangan melakukan:
   * - checkCasakuTransaction() secara terpisah.
   * - patch status Sanity langsung.
   * - update Supabase langsung.
   * - kredit program/fundraiser secara manual.
   *
   * Helper wajib memvalidasi transactionId dan nominal.
   */

  const reconciliation =
    await reconcileDonation(transaction);

  // =====================================================
  // 6. BACA ULANG DATA SANITY
  // =====================================================

  const freshTransaction =
    await getDonationById(transaction._id);

  if (!freshTransaction) {
    throw new Error(
      "Transaksi tidak ditemukan setelah rekonsiliasi Casaku."
    );
  }

  // =====================================================
  // 7. LOG HASIL VERIFIKASI
  // =====================================================

  console.log(
    "[CASAKU STATUS] RECONCILIATION RESULT",
    {
      sanityId: freshTransaction._id,
      orderId: freshTransaction.orderId,
      transactionId: freshTransaction.transactionId,
      localStatus: freshTransaction.status,
      paymentVerified:
        freshTransaction.paymentVerified,
      casakuStatus:
        reconciliation?.casakuStatus,
      reconciliationStatus:
        reconciliation?.status,
      amount: freshTransaction.amount,
      paymentAmount:
        freshTransaction.paymentAmount,
      paidAmount: freshTransaction.paidAmount,
    }
  );

  // =====================================================
  // 8. PASTIKAN KREDIT JIKA PEMBAYARAN LUNAS
  // =====================================================

  if (
    isPaidStatus(freshTransaction.status) &&
    freshTransaction.paymentVerified === true
  ) {
    await ensureDonationCredits(
      freshTransaction
    );

    const finalTransaction =
      await getDonationById(
        freshTransaction._id
      );

    if (!finalTransaction) {
      throw new Error(
        "Transaksi tidak ditemukan setelah pemrosesan kredit."
      );
    }

    return buildResponse({
      transaction: finalTransaction,
      reconciliation,
    });
  }

  // =====================================================
  // 9. RESPONS STATUS AKHIR
  // =====================================================

  return buildResponse({
    transaction: freshTransaction,
    reconciliation,
  });
}

// ============================================================================
// GET: FRONTEND POLLING
// ============================================================================

export async function GET(
  request: Request
) {
  try {
    const { searchParams } = new URL(
      request.url
    );

    const identifiers: StatusIdentifiers = {
      orderId: cleanText(
        searchParams.get("orderId")
      ),

      transactionId: cleanText(
        searchParams.get("transactionId")
      ),

      sanityId: cleanText(
        searchParams.get("id")
      ),
    };

    return await processDonationStatus(
      identifiers
    );
  } catch (error: unknown) {
    console.error(
      "[CASAKU STATUS GET ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Server error.";

    return NextResponse.json(
      {
        success: false,
        status: "error" as DonationStatus,
        message:
          "Gagal memeriksa status pembayaran.",
        detail:
          process.env.NODE_ENV === "development"
            ? message
            : undefined,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: SERVER-TO-SERVER / MANUAL TRIGGER
// ============================================================================

export async function POST(
  request: Request
) {
  try {
    let body: Record<string, unknown>;

    try {
      const parsed = await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return jsonError(
          "Payload request tidak valid.",
          400
        );
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return jsonError(
        "Payload request tidak valid.",
        400
      );
    }

    const identifiers: StatusIdentifiers = {
      orderId: cleanText(
        body.orderId
      ),

      transactionId: cleanText(
        body.transactionId
      ),

      sanityId: cleanText(
        body.id
      ),
    };

    return await processDonationStatus(
      identifiers
    );
  } catch (error: unknown) {
    console.error(
      "[CASAKU STATUS POST ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Server error.";

    return NextResponse.json(
      {
        success: false,
        status: "error" as DonationStatus,
        message:
          "Gagal memproses pemeriksaan status pembayaran.",
        detail:
          process.env.NODE_ENV === "development"
            ? message
            : undefined,
      },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";

import {
  getDonationByOrderId,
  getDonationByTransactionId,
  getDonationById,
  reconcileDonation,
} from "@/lib/payments/casaku-settlement";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DonationStatus =
  | "paid"
  | "pending"
  | "failed"
  | "error";

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

/**
 * Mencari transaksi berdasarkan identifier yang diberikan.
 *
 * orderId       = ID internal aplikasi.
 * transactionId = ID transaksi dari Casaku.
 * id            = _id dokumen Sanity.
 *
 * Ketiga identifier tidak boleh dipertukarkan.
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

  if (identifiersProvided > 1) {
    throw new Error(
      "Gunakan hanya satu identifier transaksi: orderId, transactionId, atau id."
    );
  }

  if (orderId) {
    return getDonationByOrderId(orderId);
  }

  if (transactionId) {
    return getDonationByTransactionId(transactionId);
  }

  if (sanityId) {
    return getDonationById(sanityId);
  }

  return null;
}

/**
 * Mengubah hasil rekonsiliasi menjadi respons API
 * yang konsisten untuk frontend.
 */
function buildStatusResponse(
  result: {
    status?: string;
    casakuStatus?: string;
    credits?: unknown;
    transaction?: any;
  }
) {
  const transaction = result.transaction;

  const localStatus = normalizeStatus(
    transaction?.status
  );

  const settlementStatus = normalizeStatus(
    result.status
  );

  const gatewayStatus = normalizeStatus(
    result.casakuStatus
  );

  // Status sukses lokal harus tetap dianggap paid.
  if (
    isPaidStatus(localStatus) ||
    isPaidStatus(settlementStatus) ||
    isPaidStatus(gatewayStatus)
  ) {
    return NextResponse.json({
      success: true,
      status: "paid" as DonationStatus,
      transaction: {
        ...transaction,
        status: "success",
      },
      credits: result.credits ?? null,
      message: "Pembayaran berhasil dikonfirmasi.",
    });
  }

  // Transaksi gagal atau kedaluwarsa.
  if (
    [
      "failed",
      "expired",
      "cancel",
      "cancelled",
      "canceled",
    ].includes(localStatus) ||
    [
      "failed",
      "expired",
      "cancel",
      "cancelled",
      "canceled",
    ].includes(settlementStatus) ||
    [
      "expired",
      "cancel",
      "cancelled",
      "canceled",
    ].includes(gatewayStatus)
  ) {
    return NextResponse.json({
      success: true,
      status: "failed" as DonationStatus,
      transaction,
      message:
        gatewayStatus === "expired" ||
        localStatus === "expired"
          ? "Waktu pembayaran telah kedaluwarsa."
          : "Transaksi pembayaran dibatalkan atau gagal.",
    });
  }

  // Selain status paid/failed, tetap pending.
  return NextResponse.json({
    success: true,
    status: "pending" as DonationStatus,
    transaction,
    message:
      "Pembayaran belum dikonfirmasi oleh Casaku.",
  });
}

export async function GET(request: Request) {
  try {
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

    // =====================================================
    // 1. VALIDASI IDENTIFIER
    // =====================================================

    if (
      !orderId &&
      !transactionId &&
      !sanityId
    ) {
      return jsonError(
        "Parameter orderId, transactionId, atau id wajib diisi.",
        400
      );
    }

    if (
      [orderId, transactionId, sanityId].filter(Boolean)
        .length > 1
    ) {
      return jsonError(
        "Gunakan satu identifier saja: orderId, transactionId, atau id.",
        400
      );
    }

    // =====================================================
    // 2. CARI TRANSAKSI DI SANITY
    // =====================================================

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
        "[DONATION STATUS] Sanity document ID tidak ditemukan",
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

    // =====================================================
    // 3. VALIDASI ID TRANSAKSI CASAKU
    // =====================================================

    /*
     * transactionId harus berasal dari respons generate
     * QRIS Casaku dan disimpan di dokumen Sanity.
     *
     * Jangan menggunakan orderId sebagai pengganti.
     */

    const casakuTransactionId = cleanText(
      transaction.transactionId
    );

    if (!casakuTransactionId) {
      console.error(
        "[DONATION STATUS] Casaku transactionId kosong",
        {
          sanityId: transaction._id,
          orderId: transaction.orderId,
        }
      );

      return NextResponse.json({
        success: true,
        status: "pending" as DonationStatus,
        transaction,
        message:
          "ID transaksi Casaku belum tersedia. Pembayaran belum dapat diverifikasi.",
      });
    }

    // =====================================================
    // 4. REKONSILIASI PEMBAYARAN
    // =====================================================

    /*
     * Seluruh proses verifikasi diserahkan kepada helper:
     *
     * - Membaca ulang transaksi Sanity.
     * - Mengecek status melalui Casaku SDK.
     * - Memastikan transactionId cocok.
     * - Memastikan nominal pembayaran cocok.
     * - Memperbarui status transaksi.
     * - Menjaga transaksi sukses agar tidak turun menjadi gagal.
     * - Memproses kredit program/fundraiser secara idempotent.
     * - Menyinkronkan data pembayaran sesuai helper.
     *
     * Jangan melakukan patch status pembayaran sendiri di route ini.
     */

    console.log("[DONATION STATUS] RECONCILE START", {
      sanityId: transaction._id,
      orderId: transaction.orderId,
      transactionId: casakuTransactionId,
      localStatus: transaction.status,
      originalAmount: transaction.amount,
      paymentAmount: transaction.paymentAmount,
    });

    const result = await reconcileDonation(transaction);

    // =====================================================
    // 5. VALIDASI HASIL REKONSILIASI
    // =====================================================

    if (!result || !result.transaction) {
      console.error(
        "[DONATION STATUS] Hasil rekonsiliasi tidak lengkap",
        {
          sanityId: transaction._id,
          orderId: transaction.orderId,
          transactionId: casakuTransactionId,
          result,
        }
      );

      throw new Error(
        "Rekonsiliasi selesai tetapi data transaksi tidak tersedia."
      );
    }

    const finalTransaction = result.transaction;

    console.log("[DONATION STATUS] RECONCILE RESULT", {
      sanityId: finalTransaction._id,
      orderId: finalTransaction.orderId,
      transactionId: finalTransaction.transactionId,
      localStatus: finalTransaction.status,
      reconcileStatus: result.status,
      casakuStatus: result.casakuStatus,
      amount: finalTransaction.amount,
      paymentAmount: finalTransaction.paymentAmount,
      credits: result.credits,
    });

    // =====================================================
    // 6. RESPONS KE FRONTEND
    // =====================================================

    return buildStatusResponse(result);

  } catch (error: unknown) {
    console.error(
      "[DONATION STATUS API ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat memeriksa status pembayaran.";

    return NextResponse.json(
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
      { status: 500 }
    );
  }
}

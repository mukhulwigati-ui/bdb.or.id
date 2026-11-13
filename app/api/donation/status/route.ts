
// app/api/donation/status/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";

import {
  checkCasakuTransaction,
  ensureDonationCredits,
  getDonationByOrderId,
  getDonationByTransactionId,
  getDonationById,
} from "@/lib/payments/casaku-settlement";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CasakuStatus =
  | "pending"
  | "paid"
  | "expired"
  | "cancel";

function getSanityClient() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = (
    process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
  ).trim();

  const token =
    process.env.SANITY_API_WRITE_TOKEN ||
    process.env.SANITY_API_TOKEN;

  if (!projectId) {
    throw new Error(
      "NEXT_PUBLIC_SANITY_PROJECT_ID belum dikonfigurasi."
    );
  }

  if (!token) {
    throw new Error(
      "Token Sanity belum dikonfigurasi. Isi SANITY_API_WRITE_TOKEN atau SANITY_API_TOKEN."
    );
  }

  return createClient({
    projectId,
    dataset,
    apiVersion: "2026-08-31",
    useCdn: false,
    token,
  });
}

function cleanText(
  value: unknown,
  maxLength = 500
): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function normalizeStatus(value: unknown): string {
  return cleanText(value, 50).toLowerCase();
}

function isPaidStatus(status: unknown): boolean {
  return [
    "success",
    "successful",
    "paid",
    "settlement",
    "settled",
    "completed",
    "complete",
  ].includes(normalizeStatus(status));
}

function normalizeCasakuStatus(
  value: unknown
): CasakuStatus {
  const status = normalizeStatus(value);

  if (
    [
      "success",
      "successful",
      "paid",
      "settlement",
      "settled",
      "completed",
      "complete",
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
      "cancelled",
      "canceled",
    ].includes(status)
  ) {
    return "cancel";
  }

  return "pending";
}

function getExpectedAmount(
  transaction: any
): number {
  return Number(
    transaction?.paymentAmount ??
      transaction?.amount ??
      0
  );
}

function jsonError(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

/**
 * Membaca ulang transaksi menggunakan ID dokumen Sanity.
 * Parameter yang diberikan ke fungsi ini harus _id Sanity,
 * bukan orderId atau transactionId Casaku.
 */
async function getFreshTransaction(
  sanityDocumentId: string
) {
  return getDonationById(sanityDocumentId);
}

/**
 * Respons transaksi yang sudah dibayar.
 * Kredit program/fundraiser dipastikan melalui helper
 * yang menangani idempotensi.
 */
async function respondPaid(transaction: any) {
  let freshTransaction = transaction;

  if (transaction?._id) {
    freshTransaction =
      (await getFreshTransaction(transaction._id)) ||
      transaction;

    await ensureDonationCredits(freshTransaction);

    freshTransaction =
      (await getFreshTransaction(transaction._id)) ||
      freshTransaction;
  }

  return NextResponse.json({
    success: true,
    status: "paid",
    transaction: {
      ...freshTransaction,
      status: "success",
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const orderId = cleanText(
      searchParams.get("orderId"),
      250
    );

    const transactionId = cleanText(
      searchParams.get("transactionId"),
      250
    );

    // =====================================================
    // 1. VALIDASI IDENTIFIER
    // =====================================================

    if (!orderId && !transactionId) {
      return jsonError(
        "ID transaksi (orderId atau transactionId) wajib diisi.",
        400
      );
    }

    // =====================================================
    // 2. CARI TRANSAKSI DI SANITY
    // =====================================================

    let transaction: any = null;

    /*
     * orderId hanya digunakan untuk mencari orderId.
     * transactionId hanya digunakan untuk mencari transactionId.
     *
     * Tidak ada fallback silang karena kedua ID tersebut
     * memiliki fungsi yang berbeda.
     */

    if (orderId) {
      transaction = await getDonationByOrderId(orderId);
    } else if (transactionId) {
      transaction =
        await getDonationByTransactionId(transactionId);
    }

    if (!transaction) {
      return jsonError(
        "Transaksi tidak ditemukan di database.",
        404
      );
    }

    if (!transaction._id) {
      return jsonError(
        "Data transaksi tidak memiliki ID dokumen Sanity.",
        500
      );
    }

    // =====================================================
    // 3. AMBIL DATA TRANSAKSI TERBARU
    // =====================================================

    let currentTransaction =
      (await getFreshTransaction(transaction._id)) ||
      transaction;

    let currentStatus = normalizeStatus(
      currentTransaction.status
    );

    // Jika sudah lunas, pastikan kredit sudah diproses.
    if (isPaidStatus(currentStatus)) {
      return respondPaid(currentTransaction);
    }

    // =====================================================
    // 4. AMBIL ID TRANSAKSI CASAKU
    // =====================================================

    /*
     * WAJIB menggunakan transactionId dari Casaku.
     *
     * Jangan menggunakan orderId sebagai fallback.
     * orderId merupakan ID internal aplikasi, bukan ID gateway.
     */

    const casakuTransactionId = cleanText(
      currentTransaction.transactionId,
      250
    );

    if (!casakuTransactionId) {
      console.error(
        "[DONATION STATUS] transactionId Casaku tidak ditemukan",
        {
          sanityId: currentTransaction._id,
          orderId: currentTransaction.orderId,
        }
      );

      return NextResponse.json({
        success: true,
        status: "pending",
        transaction: currentTransaction,
        message:
          "ID transaksi Casaku belum tersedia. Transaksi menunggu verifikasi.",
      });
    }

    // =====================================================
    // 5. CEK STATUS LANGSUNG KE CASAKU
    // =====================================================

    const casakuResult =
      await checkCasakuTransaction(
        casakuTransactionId
      );

    const casakuStatus = normalizeCasakuStatus(
      casakuResult.status
    );

    console.log("[DONATION STATUS CHECK]", {
      sanityId: currentTransaction._id,
      orderId: currentTransaction.orderId,
      transactionId: casakuTransactionId,
      localStatus: currentTransaction.status,
      casakuStatus,
      casakuAmount: casakuResult.amount,
      localAmount: getExpectedAmount(currentTransaction),
    });

    // =====================================================
    // 6. PEMBAYARAN BERHASIL
    // =====================================================

    if (casakuStatus === "paid") {
      /*
       * Baca ulang sebelum mengubah status.
       * Bisa saja webhook sudah lebih dahulu memproses
       * transaksi menjadi sukses.
       */

      currentTransaction =
        (await getFreshTransaction(currentTransaction._id)) ||
        currentTransaction;

      currentStatus = normalizeStatus(
        currentTransaction.status
      );

      if (isPaidStatus(currentStatus)) {
        return respondPaid(currentTransaction);
      }

      // -----------------------------------------------
      // Verifikasi nominal pembayaran
      // -----------------------------------------------

      const expectedAmount = getExpectedAmount(
        currentTransaction
      );

      const casakuAmount = Number(
        casakuResult.amount || 0
      );

      if (
        expectedAmount > 0 &&
        casakuAmount > 0 &&
        casakuAmount !== expectedAmount
      ) {
        console.error(
          "[DONATION AMOUNT MISMATCH]",
          {
            sanityId: currentTransaction._id,
            orderId: currentTransaction.orderId,
            transactionId: casakuTransactionId,
            expectedAmount,
            casakuAmount,
          }
        );

        return NextResponse.json({
          success: true,
          status: "pending",
          transaction: currentTransaction,
          message:
            "Casaku melaporkan pembayaran berhasil, tetapi nominal yang diterima tidak sesuai dengan tagihan. Transaksi menunggu verifikasi.",
          verificationRequired: true,
        });
      }

      // -----------------------------------------------
      // Update status Sanity
      // -----------------------------------------------

      const sanity = getSanityClient();
      const now = new Date().toISOString();

      const paidAt =
        casakuResult.paidAt ||
        currentTransaction.paidAt ||
        now;

      const finalAmount =
        casakuAmount > 0
          ? casakuAmount
          : expectedAmount;

      await sanity
        .patch(currentTransaction._id)
        .set({
          status: "success",
          paymentProvider: "casaku",
          paymentMethod: "qris",
          paymentVerified: true,
          paidAt,
          paidAmount: finalAmount,
          updatedAt: now,
        })
        .commit();

      // -----------------------------------------------
      // Baca ulang transaksi setelah update
      // -----------------------------------------------

      let freshTransaction =
        await getFreshTransaction(currentTransaction._id);

      if (!freshTransaction) {
        throw new Error(
          "Pembayaran berhasil, tetapi transaksi gagal dibaca kembali dari Sanity."
        );
      }

      // -----------------------------------------------
      // Pastikan kredit program/fundraiser diproses
      // -----------------------------------------------

      await ensureDonationCredits(freshTransaction);

      freshTransaction =
        (await getFreshTransaction(currentTransaction._id)) ||
        freshTransaction;

      return NextResponse.json({
        success: true,
        status: "paid",
        transaction: {
          ...freshTransaction,
          status: "success",
        },
      });
    }

    // =====================================================
    // 7. PEMBAYARAN EXPIRED ATAU CANCEL
    // =====================================================

    if (
      casakuStatus === "expired" ||
      casakuStatus === "cancel"
    ) {
      /*
       * Periksa kembali status lokal.
       * Jangan sampai hasil pengecekan yang terlambat
       * mengubah transaksi sukses menjadi gagal.
       */

      currentTransaction =
        (await getFreshTransaction(currentTransaction._id)) ||
        currentTransaction;

      currentStatus = normalizeStatus(
        currentTransaction.status
      );

      if (isPaidStatus(currentStatus)) {
        return respondPaid(currentTransaction);
      }

      const sanity = getSanityClient();
      const now = new Date().toISOString();

      const patchData: Record<string, unknown> = {
        status: "failed",
        paymentProvider: "casaku",
        paymentMethod: "qris",
        updatedAt: now,
      };

      if (casakuResult.expiredAt) {
        patchData.expiresAt = casakuResult.expiredAt;
      }

      await sanity
        .patch(currentTransaction._id)
        .set(patchData)
        .commit();

      const failedTransaction =
        (await getFreshTransaction(currentTransaction._id)) ||
        currentTransaction;

      return NextResponse.json({
        success: true,
        status: "failed",
        transaction: failedTransaction,
        message:
          casakuStatus === "expired"
            ? "Waktu pembayaran telah kedaluwarsa."
            : "Transaksi dibatalkan oleh penyedia pembayaran.",
      });
    }

    // =====================================================
    // 8. STATUS MASIH MENUNGGU
    // =====================================================

    currentTransaction =
      (await getFreshTransaction(currentTransaction._id)) ||
      currentTransaction;

    currentStatus = normalizeStatus(
      currentTransaction.status
    );

    if (isPaidStatus(currentStatus)) {
      return respondPaid(currentTransaction);
    }

    return NextResponse.json({
      success: true,
      status: "pending",
      transaction: currentTransaction,
      message:
        "Pembayaran belum dikonfirmasi oleh Casaku.",
    });
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
        status: "error",
        message,
      },
      { status: 500 }
    );
  }
}


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

type CasakuStatus = "pending" | "paid" | "expired" | "cancel";

function getSanityClient() {
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ks29gg6v";

  const dataset = (
    process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
  ).trim();

  const token =
    process.env.SANITY_API_WRITE_TOKEN ||
    process.env.SANITY_API_TOKEN;

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

function cleanText(value: unknown, maxLength = 500): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeStatus(value: unknown): string {
  return cleanText(value, 50).toLowerCase();
}

function isPaidStatus(status: unknown): boolean {
  return [
    "success",
    "paid",
    "settlement",
    "settled",
    "completed",
  ].includes(normalizeStatus(status));
}

function getExpectedAmount(transaction: any): number {
  return Number(
    transaction?.paymentAmount ??
    transaction?.amount ??
    0
  );
}

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

/**
 * Mengambil transaksi terbaru dari Sanity.
 * Jangan menggunakan data transaksi lama untuk mengambil keputusan
 * karena status bisa berubah ketika proses pengecekan sedang berjalan.
 */
async function getFreshTransaction(transactionId: string) {
  return getDonationById(transactionId);
}

/**
 * Mengirim respons transaksi yang sudah lunas.
 * Kredit program/fundraiser tetap dipastikan melalui helper.
 */
async function respondPaid(transaction: any) {
  let freshTransaction = transaction;

  if (transaction?._id) {
    freshTransaction =
      (await getFreshTransaction(transaction._id)) || transaction;

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

    const orderId = cleanText(searchParams.get("orderId"), 250);
    const transactionId = cleanText(
      searchParams.get("transactionId"),
      250
    );

    // orderId menjadi prioritas jika kedua parameter dikirim.
    const identifier = orderId || transactionId;

    if (!identifier) {
      return jsonError(
        "ID transaksi (orderId atau transactionId) wajib diisi.",
        400
      );
    }

    // =========================================================
    // 1. CARI TRANSAKSI DI SANITY
    // =========================================================

    let transaction: any = null;

    if (orderId) {
      transaction = await getDonationByOrderId(orderId);
    }

    if (!transaction && transactionId) {
      transaction = await getDonationByTransactionId(transactionId);
    }

    if (!transaction) {
      transaction = await getDonationByOrderId(identifier);
    }

    if (!transaction) {
      transaction = await getDonationByTransactionId(identifier);
    }

    if (!transaction) {
      transaction = await getDonationById(identifier);
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

    // =========================================================
    // 2. PERIKSA STATUS TERBARU DI DATABASE
    // =========================================================

    let currentTransaction =
      (await getFreshTransaction(transaction._id)) || transaction;

    let currentStatus = normalizeStatus(
      currentTransaction.status
    );

    // Jika sudah lunas, jangan periksa ulang ke Casaku.
    // Pastikan kredit program/fundraiser sudah diproses.
    if (isPaidStatus(currentStatus)) {
      return respondPaid(currentTransaction);
    }

    // =========================================================
    // 3. AMBIL ID TRANSAKSI CASAKU
    // =========================================================

    /*
     * PENTING:
     * transactionId adalah ID dari gateway Casaku.
     * orderId adalah ID internal aplikasi.
     *
     * Jangan menimpa atau menyamakan keduanya.
     *
     * Fallback ke orderId hanya untuk kompatibilitas
     * dengan transaksi lama yang belum menyimpan transactionId.
     */
    const casakuTrxId = cleanText(
      currentTransaction.transactionId ||
      currentTransaction.orderId,
      250
    );

    if (!casakuTrxId) {
      return NextResponse.json({
        success: true,
        status: "pending",
        transaction: currentTransaction,
        message:
          "ID transaksi dari gateway Casaku belum tersedia.",
      });
    }

    // =========================================================
    // 4. CEK STATUS LANGSUNG KE CASAKU
    // =========================================================

    const casakuResult = await checkCasakuTransaction(
      casakuTrxId
    );

    console.log("[DONATION STATUS CHECK]", {
      orderId: currentTransaction.orderId,
      casakuTransactionId: casakuTrxId,
      casakuStatus: casakuResult.status,
      casakuAmount: casakuResult.amount,
      localAmount: getExpectedAmount(currentTransaction),
    });

    const casakuStatus = normalizeStatus(
      casakuResult.status
    ) as CasakuStatus;

    // =========================================================
    // 5. JIKA PEMBAYARAN SUDAH BERHASIL
    // =========================================================

    if (casakuStatus === "paid") {
      /*
       * Ambil ulang data sebelum mengubah status.
       * Ini mencegah data lama menimpa transaksi yang
       * sudah diproses oleh webhook atau request lain.
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

      const expectedAmount = getExpectedAmount(
        currentTransaction
      );

      const casakuAmount = Number(
        casakuResult.amount || 0
      );

      /*
       * Verifikasi nominal:
       * Jika Casaku memberikan nominal pembayaran,
       * nominal tersebut harus sama dengan nominal tagihan.
       *
       * Jangan memberikan kredit jika nominal tidak cocok.
       */
      if (
        expectedAmount > 0 &&
        casakuAmount > 0 &&
        casakuAmount !== expectedAmount
      ) {
        console.error("[DONATION AMOUNT MISMATCH]", {
          orderId: currentTransaction.orderId,
          transactionId: casakuTrxId,
          expectedAmount,
          casakuAmount,
        });

        return NextResponse.json({
          success: true,
          status: "pending",
          transaction: currentTransaction,
          message:
            "Casaku melaporkan pembayaran, tetapi nominal yang diterima tidak sesuai dengan tagihan. Transaksi menunggu verifikasi.",
          verificationRequired: true,
        });
      }

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

      // Update transaksi menjadi sukses.
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

      // Ambil data terbaru setelah perubahan status.
      let freshTransaction =
        await getFreshTransaction(currentTransaction._id);

      if (!freshTransaction) {
        throw new Error(
          "Pembayaran berhasil, tetapi data transaksi gagal dibaca kembali dari Sanity."
        );
      }

      /*
       * Proses kredit program dan fundraiser.
       * Helper ini harus menangani duplikasi kredit secara aman.
       */
      await ensureDonationCredits(freshTransaction);

      // Ambil kembali agar respons berisi data paling baru.
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

    // =========================================================
    // 6. JIKA PEMBAYARAN KEDALUWARSA ATAU DIBATALKAN
    // =========================================================

    if (
      casakuStatus === "expired" ||
      casakuStatus === "cancel"
    ) {
      /*
       * Periksa ulang sebelum menandai gagal.
       * Pembayaran yang sudah sukses tidak boleh berubah
       * menjadi failed akibat hasil pengecekan yang terlambat.
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

    // =========================================================
    // 7. STATUS MASIH MENUNGGU
    // =========================================================

    /*
     * Jangan mengembalikan status lokal selain pending
     * sebagai status gateway. Status lokal bisa saja
     * masih memakai istilah lama.
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

    return NextResponse.json({
      success: true,
      status: "pending",
      transaction: currentTransaction,
      message: "Pembayaran belum dikonfirmasi oleh Casaku.",
    });
  } catch (error: unknown) {
    console.error("[DONATION STATUS API ERROR]", error);

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

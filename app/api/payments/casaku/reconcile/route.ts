
import { NextResponse } from "next/server";

import {
  paymentSanityClient,
  reconcileDonation,
  type DonationTransaction,
} from "@/lib/payments/casaku-settlement";

// ============================================================================
// NEXT CONFIG
// ============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_TRANSACTIONS_PER_RUN = 40;

// ============================================================================
// AUTH CRON
// ============================================================================

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();

  /*
   * Production wajib memiliki CRON_SECRET.
   * Development boleh berjalan tanpa secret.
   */

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");

  if (authorization === `Bearer ${secret}`) {
    return true;
  }

  const customSecret = request.headers.get("x-cron-secret");

  return customSecret === secret;
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

function isSuccessResult(value: unknown): boolean {
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

function isFailedResult(value: unknown): boolean {
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

// ============================================================================
// GET: VERCEL CRON
// ============================================================================

export async function GET(request: Request) {
  const startedAt = Date.now();

  try {
    // ========================================================================
    // 1. SECURITY
    // ========================================================================

    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================================
    // 2. VALIDASI KONFIGURASI
    // ========================================================================

    if (
      !process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
      !(
        process.env.SANITY_API_WRITE_TOKEN ||
        process.env.SANITY_API_TOKEN
      )
    ) {
      throw new Error(
        "Konfigurasi Sanity belum lengkap."
      );
    }

    if (
      !process.env.CASAKU_LICENSE_KEY?.trim()
    ) {
      throw new Error(
        "CASAKU_LICENSE_KEY belum dikonfigurasi."
      );
    }

    // ========================================================================
    // 3. AMBIL TRANSAKSI YANG PERLU DIREKONSILIASI
    // ========================================================================

    /*
     * Transaksi yang diproses:
     *
     * A. Pending dari Casaku.
     *
     * B. Success tetapi belum terverifikasi.
     *
     * C. Success tetapi kredit program belum diproses.
     *
     * D. Success dengan fundraiser tetapi kredit fundraiser belum diproses.
     *
     * Catatan:
     * - Tidak mengambil transaksi provider lain.
     * - Tidak menggunakan orderId sebagai transactionId Casaku.
     * - Transaksi harus memiliki transactionId.
     * - Transaksi lama diprioritaskan agar tidak tertinggal.
     */

    const transactions =
      await paymentSanityClient.fetch<
        DonationTransaction[]
      >(
        `*[
          _type == "donationTransaction"

          && defined(transactionId)
          && transactionId != ""

          && (
            paymentProvider == "casaku"

            ||

            transactionId match "BDB-*"

            ||

            transactionId match "CSK-*"
          )

          && (
            status == "pending"

            ||

            (
              status == "success"

              && (
                paymentVerified != true

                ||

                !defined(programCreditedAt)

                ||

                (
                  defined(fundraiserPhone)

                  && fundraiserPhone != ""

                  && !defined(fundraiserCreditedAt)
                )
              )
            )
          )
        ]
        | order(_createdAt asc)
        [0...$limit]{
          _id,
          _rev,

          orderId,
          transactionId,

          donorName,
          donorPhone,
          donorEmail,

          amount,
          paymentAmount,
          paidAmount,

          status,

          paymentProvider,
          paymentMethod,
          paymentVerified,

          paidAt,
          expiresAt,

          fundraiserPhone,

          campaignSlug,

          programCreditedAt,
          fundraiserCreditedAt,

          "programId": programName->_id,
          "programTitle": programName->title
        }`,
        {
          limit: MAX_TRANSACTIONS_PER_RUN,
        }
      );

    // ========================================================================
    // 4. COUNTERS
    // ========================================================================

    let checked = 0;
    let paid = 0;
    let pending = 0;
    let failed = 0;
    let recoveredPrograms = 0;
    let recoveredFundraisers = 0;

    const errors: Array<{
      sanityId?: string;
      orderId?: string;
      transactionId?: string;
      message: string;
    }> = [];

    // ========================================================================
    // 5. PROCESS SEQUENTIAL
    // ========================================================================

    /*
     * Sengaja tidak menggunakan Promise.all().
     *
     * Setiap transaksi diproses satu per satu untuk mengurangi
     * tekanan ke Casaku dan menghindari proses kredit bersamaan.
     */

    for (const transaction of transactions) {
      checked += 1;

      const sanityId = cleanText(
        transaction._id
      );

      const orderId = cleanText(
        transaction.orderId
      );

      const transactionId = cleanText(
        transaction.transactionId
      );

      try {
        // --------------------------------------------------------------------
        // Validasi data transaksi
        // --------------------------------------------------------------------

        if (!sanityId) {
          throw new Error(
            "Sanity document ID tidak ditemukan."
          );
        }

        if (!transactionId) {
          throw new Error(
            "Casaku transactionId tidak ditemukan."
          );
        }

        // --------------------------------------------------------------------
        // Rekonsiliasi
        // --------------------------------------------------------------------

        console.log(
          "[CASAKU RECONCILE] START",
          {
            sanityId,
            orderId,
            transactionId,
            status: transaction.status,
            paymentVerified:
              transaction.paymentVerified,
            amount: transaction.amount,
            paymentAmount:
              transaction.paymentAmount,
          }
        );

        const result = await reconcileDonation(
          transaction
        );

        // --------------------------------------------------------------------
        // Klasifikasi hasil
        // --------------------------------------------------------------------

        if (isSuccessResult(result.status)) {
          paid += 1;
        } else if (isFailedResult(result.status)) {
          failed += 1;
        } else {
          pending += 1;
        }

        // --------------------------------------------------------------------
        // Hitung kredit program yang berhasil dipulihkan
        // --------------------------------------------------------------------

        if (result.credits?.program?.credited) {
          recoveredPrograms += 1;
        }

        // --------------------------------------------------------------------
        // Hitung kredit fundraiser yang berhasil dipulihkan
        // --------------------------------------------------------------------

        if (result.credits?.fundraiser?.credited) {
          recoveredFundraisers += 1;
        }

        // --------------------------------------------------------------------
        // Log hasil
        // --------------------------------------------------------------------

        console.log(
          "[CASAKU RECONCILE] RESULT",
          {
            sanityId,
            orderId,
            transactionId,
            status: result.status,
            casakuStatus: result.casakuStatus,
            programCredited:
              result.credits?.program?.credited ?? false,
            fundraiserCredited:
              result.credits?.fundraiser?.credited ?? false,
          }
        );

      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown error";

        console.error(
          "[CASAKU RECONCILE] TRANSACTION ERROR",
          {
            sanityId,
            orderId,
            transactionId,
            message,
            error,
          }
        );

        errors.push({
          sanityId,
          orderId,
          transactionId,
          message,
        });
      }
    }

    // ========================================================================
    // 6. FINAL RESULT
    // ========================================================================

    const durationMs = Date.now() - startedAt;

    console.log(
      "[CASAKU RECONCILE] COMPLETED",
      {
        checked,
        paid,
        pending,
        failed,
        recoveredPrograms,
        recoveredFundraisers,
        errors: errors.length,
        durationMs,
      }
    );

    return NextResponse.json(
      {
        success: true,

        checked,

        paid,

        pending,

        failed,

        recoveredPrograms,

        recoveredFundraisers,

        errorCount: errors.length,

        errors: errors.slice(0, 10),

        durationMs,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );

  } catch (error: unknown) {
    console.error(
      "[CASAKU RECONCILE] FATAL ERROR",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan sistem.";

    return NextResponse.json(
      {
        success: false,
        message:
          "Proses rekonsiliasi pembayaran gagal.",
        detail:
          process.env.NODE_ENV === "development"
            ? message
            : undefined,
        durationMs: Date.now() - startedAt,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}

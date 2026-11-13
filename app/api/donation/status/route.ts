// app/api/donation/status/route.ts

import { NextResponse } from "next/server";

import {
  getDonationByOrderId,
  reconcileDonation,
} from "@/lib/payments/casaku-settlement";

// ============================================================================
// NEXT CONFIG
// ============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ============================================================================
// HELPERS
// ============================================================================

function cleanText(
  value: unknown,
  maxLength = 300
): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function isCasakuTransaction({
  paymentProvider,
  transactionId,
}: {
  paymentProvider?: string;
  transactionId?: string;
}): boolean {
  const provider = cleanText(
    paymentProvider,
    50
  ).toLowerCase();

  const trxId = cleanText(
    transactionId,
    250
  );

  return (
    provider === "casaku" ||
    trxId.startsWith("ISLAMI-") ||
    trxId.startsWith("CSK-")
  );
}

// ============================================================================
// GET
// ============================================================================

export async function GET(
  request: Request
) {
  try {
    // =========================================================================
    // 1. AMBIL ORDER ID
    // =========================================================================

    const url = new URL(
      request.url
    );

    const orderId = cleanText(
      url.searchParams.get(
        "orderId"
      ),
      250
    );

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,

          message:
            "orderId wajib diisi.",

          transaction: null,
        },
        {
          status: 400,

          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    // =========================================================================
    // 2. CARI TRANSAKSI DI SANITY
    // =========================================================================

    const transaction =
      await getDonationByOrderId(
        orderId
      );

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Transaksi tidak ditemukan.",

          transaction: null,
        },
        {
          status: 404,

          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    // =========================================================================
    // 3. TRANSAKSI NON-CASAKU / LEGACY
    //
    // Jika masih ada transaksi lama dari gateway sebelumnya,
    // jangan paksa diproses melalui Casaku.
    // =========================================================================

    const casakuTransaction =
      isCasakuTransaction({
        paymentProvider:
          transaction.paymentProvider,

        transactionId:
          transaction.transactionId,
      });

    if (!casakuTransaction) {
      return NextResponse.json(
        {
          success: true,

          transaction,

          reconciliation: {
            provider:
              transaction.paymentProvider ||
              "legacy",

            processed: false,

            message:
              "Transaksi bukan Casaku.",
          },
        },
        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    // =========================================================================
    // 4. REKONSILIASI
    //
    // reconcileDonation() akan menangani:
    //
    // PENDING
    //   ↓
    // cek status Casaku
    //
    // PAID
    //   ↓
    // donationTransaction → success
    //   ↓
    // program.collectedAmount
    //   ↓
    // program.donors[]
    //   ↓
    // fundraiser
    //   ↓
    // Supabase mirror
    //
    //
    // Jika transaction sudah SUCCESS tetapi programCreditedAt belum ada,
    // helper tetap akan memperbaiki kredit program/fundraiser.
    // =========================================================================

    try {
      const result =
        await reconcileDonation(
          transaction
        );

      const latestTransaction =
        result.transaction ||
        transaction;

      return NextResponse.json(
        {
          success: true,

          transaction:
            latestTransaction,

          reconciliation: {
            processed: true,

            provider:
              "casaku",

            status:
              result.status,

            casakuStatus:
              result.casakuStatus,

            program:
              result.credits
                ?.program ||
              null,

            fundraiser:
              result.credits
                ?.fundraiser ||
              null,
          },
        },
        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, max-age=0",

            Pragma:
              "no-cache",

            Expires:
              "0",
          },
        }
      );
    } catch (reconcileError) {
      // =======================================================================
      // 5. CASAKU TIMEOUT / GANGGUAN SEMENTARA
      //
      // Jangan membuat halaman success/error rusak.
      //
      // Kita tetap kirim status terakhir dari Sanity.
      // =======================================================================

      console.warn(
        "[DONATION STATUS] Rekonsiliasi Casaku gagal:",
        {
          orderId,

          transactionId:
            transaction.transactionId,

          error:
            reconcileError,
        }
      );

      return NextResponse.json(
        {
          success: true,

          transaction,

          reconciliation: {
            processed: false,

            provider:
              "casaku",

            warning:
              reconcileError instanceof
              Error
                ? reconcileError.message
                : "Rekonsiliasi pembayaran belum berhasil.",
          },
        },
        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, max-age=0",

            Pragma:
              "no-cache",

            Expires:
              "0",
          },
        }
      );
    }
  } catch (error) {
    // =========================================================================
    // 6. FATAL ERROR
    // =========================================================================

    console.error(
      "[DONATION STATUS] Fatal error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan sistem.";

    // -------------------------------------------------------------------------
    // Route API SELALU mengembalikan JSON.
    //
    // Ini mencegah error frontend:
    //
    // Unexpected token '<'
    // "<!DOCTYPE html>" is not valid JSON
    // -------------------------------------------------------------------------

    return NextResponse.json(
      {
        success: false,

        message,

        transaction: null,
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, max-age=0",

          Pragma:
            "no-cache",

          Expires:
            "0",
        },
      }
    );
  }
}
// app/api/donation/status/route.ts

import { NextResponse } from "next/server";
import {
  getDonationByOrderId,
  getDonationByTransactionId,
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
  orderId,
}: {
  paymentProvider?: string;
  transactionId?: string;
  orderId?: string;
}): boolean {
  const provider = cleanText(paymentProvider, 50).toLowerCase();
  const trxId = cleanText(transactionId, 250);
  const ordId = cleanText(orderId, 250);

  return (
    provider === "casaku" ||
    trxId.startsWith("BDB-") ||
    trxId.startsWith("CSK-") ||
    ordId.startsWith("TRX-") ||
    ordId.startsWith("BDB-")
  );
}

// ============================================================================
// GET
// ============================================================================

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const identifier = cleanText(
      url.searchParams.get("orderId") || url.searchParams.get("transactionId"),
      250
    );

    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          message: "orderId atau transactionId wajib diisi.",
          transaction: null,
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    // Cari transaksi berdasarkan orderId terlebih dahulu, jika tidak ketemu cari by transactionId
    let transaction = await getDonationByOrderId(identifier);
    if (!transaction) {
      transaction = await getDonationByTransactionId(identifier);
    }

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaksi tidak ditemukan.",
          transaction: null,
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    const casakuTransaction = isCasakuTransaction({
      paymentProvider: transaction.paymentProvider,
      transactionId: transaction.transactionId,
      orderId: transaction.orderId,
    });

    if (!casakuTransaction) {
      return NextResponse.json(
        {
          success: true,
          transaction,
          reconciliation: {
            provider: transaction.paymentProvider || "legacy",
            processed: false,
            message: "Transaksi bukan Casaku.",
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    try {
      const result = await reconcileDonation(transaction);
      const latestTransaction = result.transaction || transaction;

      // Normalisasi status teks untuk dibaca frontend (paid / success / pending)
      const rawStatus = String(latestTransaction.status || result.status || "pending").toLowerCase();
      const isSuccess = ["success", "paid", "settlement", "completed"].includes(rawStatus);

      return NextResponse.json(
        {
          success: true,
          // Format langsung yang sering dibaca frontend:
          status: isSuccess ? "paid" : rawStatus,
          transaction: {
            ...latestTransaction,
            status: isSuccess ? "paid" : rawStatus,
          },
          reconciliation: {
            processed: true,
            provider: "casaku",
            status: result.status,
            casakuStatus: result.casakuStatus,
            program: result.credits?.program || null,
            fundraiser: result.credits?.fundraiser || null,
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    } catch (reconcileError) {
      console.warn(
        "[DONATION STATUS] Rekonsiliasi Casaku gagal:",
        {
          identifier,
          transactionId: transaction.transactionId,
          error: reconcileError,
        }
      );

      const rawStatus = String(transaction.status || "pending").toLowerCase();
      const isSuccess = ["success", "paid", "settlement", "completed"].includes(rawStatus);

      return NextResponse.json(
        {
          success: true,
          status: isSuccess ? "paid" : rawStatus,
          transaction: {
            ...transaction,
            status: isSuccess ? "paid" : rawStatus,
          },
          reconciliation: {
            processed: false,
            provider: "casaku",
            warning:
              reconcileError instanceof Error
                ? reconcileError.message
                : "Rekonsiliasi pembayaran belum berhasil.",
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }
  } catch (error) {
    console.error("[DONATION STATUS] Fatal error:", error);

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan sistem.";

    return NextResponse.json(
      {
        success: false,
        message,
        transaction: null,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
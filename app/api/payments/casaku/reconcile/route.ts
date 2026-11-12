// app/api/payments/casaku/reconcile/route.ts

import { NextResponse } from "next/server";

import {
  paymentSanityClient,
  reconcileDonation,
  type DonationTransaction,
} from "@/lib/payments/casaku-settlement";

// ============================================================================
// NEXT CONFIG
// ============================================================================

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_TRANSACTIONS_PER_RUN =
  40;

// ============================================================================
// AUTH CRON
// ============================================================================

function isAuthorized(
  request: Request
): boolean {
  const secret =
    process.env.CRON_SECRET?.trim();

  // --------------------------------------------------------------------------
  // Di production WAJIB ada CRON_SECRET.
  // --------------------------------------------------------------------------

  if (!secret) {
    return (
      process.env.NODE_ENV !==
      "production"
    );
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    authorization ===
    `Bearer ${secret}`
  ) {
    return true;
  }

  const customSecret =
    request.headers.get(
      "x-cron-secret"
    );

  return (
    customSecret ===
    secret
  );
}

// ============================================================================
// GET
//
// Vercel Cron menggunakan GET.
// ============================================================================

export async function GET(
  request: Request
) {
  const startedAt =
    Date.now();

  try {
    // =========================================================================
    // 1. SECURITY
    // =========================================================================

    if (
      !isAuthorized(
        request
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================================================
    // 2. AMBIL TRANSAKSI YANG PERLU DIPERIKSA
    //
    // Yang diproses:
    //
    // A. pending Casaku
    //
    // B. sudah success tetapi program belum dikredit
    //
    // C. success + ada fundraiser tetapi fundraiser belum dikredit
    //
    // Batasi transaksi Casaku saja.
    // =========================================================================

    const transactions =
      await paymentSanityClient.fetch<
        DonationTransaction[]
      >(
        `*[
          _type == "donationTransaction"

          && (
            paymentProvider == "casaku"

            ||

            transactionId match "ISLAMI-*"

            ||

            transactionId match "CSK-*"
          )

          && (
            status == "pending"

            ||

            (
              status == "success"

              && (
                !defined(
                  programCreditedAt
                )

                ||

                (
                  defined(
                    fundraiserPhone
                  )

                  &&

                  fundraiserPhone != ""

                  &&

                  !defined(
                    fundraiserCreditedAt
                  )
                )
              )
            )
          )
        ]
        | order(
            _updatedAt desc
          )
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

          "programId":
            programName->_id,

          "programTitle":
            programName->title
        }`,
        {
          limit:
            MAX_TRANSACTIONS_PER_RUN,
        }
      );

    // =========================================================================
    // 3. PROCESS SEQUENTIAL
    //
    // Jangan Promise.all() puluhan request sekaligus.
    // Kita jaga tekanan ke API Casaku tetap ringan.
    // =========================================================================

    let checked =
      0;

    let paid =
      0;

    let pending =
      0;

    let failed =
      0;

    let recoveredPrograms =
      0;

    let recoveredFundraisers =
      0;

    const errors: Array<{
      orderId?: string;

      transactionId?: string;

      message: string;
    }> = [];

    for (
      const transaction of
        transactions
    ) {
      try {
        checked +=
          1;

        const result =
          await reconcileDonation(
            transaction
          );

        if (
          result.status ===
          "success"
        ) {
          paid +=
            1;
        } else if (
          result.status ===
          "failed"
        ) {
          failed +=
            1;
        } else {
          pending +=
            1;
        }

        if (
          result.credits
            ?.program
            ?.credited
        ) {
          recoveredPrograms +=
            1;
        }

        if (
          result.credits
            ?.fundraiser
            ?.credited
        ) {
          recoveredFundraisers +=
            1;
        }
      } catch (error) {
        console.error(
          "[CASAKU RECONCILE] Gagal:",
          {
            orderId:
              transaction.orderId,

            transactionId:
              transaction.transactionId,

            error,
          }
        );

        errors.push({
          orderId:
            transaction.orderId,

          transactionId:
            transaction.transactionId,

          message:
            error instanceof
            Error
              ? error.message
              : "Unknown error",
        });
      }
    }

    // =========================================================================
    // 4. RESULT
    // =========================================================================

    return NextResponse.json(
      {
        success: true,

        checked,

        paid,

        pending,

        failed,

        recoveredPrograms,

        recoveredFundraisers,

        errors:
          errors.slice(
            0,
            10
          ),

        durationMs:
          Date.now() -
          startedAt,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "[CASAKU RECONCILE] Fatal:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan sistem.",

        durationMs:
          Date.now() -
          startedAt,
      },
      {
        status: 500,
      }
    );
  }
}
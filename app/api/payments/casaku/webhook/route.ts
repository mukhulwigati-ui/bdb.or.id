
import { NextResponse } from "next/server";
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  getDonationByTransactionId,
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

interface CasakuWebhookPayload {
  transactionId?: string;
  id?: string;
  trx_id?: string;

  // orderId bukan pengganti transactionId.
  orderId?: string;

  amount?: number | string;
  totalAmount?: number | string;

  packageName?: string;
  appName?: string;

  status?: string;
  paidAt?: string;
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

function normalizeStatus(value: unknown): string {
  return cleanText(value, 50).toLowerCase();
}

function isPaidStatus(value: unknown): boolean {
  return [
    "paid",
    "success",
    "successful",
    "settlement",
    "settled",
    "completed",
    "complete",
  ].includes(normalizeStatus(value));
}

function isValidHexSignature(
  value: string
): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

// ============================================================================
// VERIFY CASAKU SIGNATURE
// ============================================================================

function verifySignature({
  rawBody,
  receivedSignature,
  secret,
}: {
  rawBody: string;
  receivedSignature: string;
  secret: string;
}): boolean {
  const signature = cleanText(
    receivedSignature,
    200
  ).replace(/^sha256=/i, "");

  if (!isValidHexSignature(signature)) {
    return false;
  }

  const expectedSignature = createHmac(
    "sha256",
    secret
  )
    .update(rawBody, "utf8")
    .digest("hex");

  const receivedBuffer = Buffer.from(
    signature,
    "hex"
  );

  const expectedBuffer = Buffer.from(
    expectedSignature,
    "hex"
  );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

// ============================================================================
// RESPONSE
// ============================================================================

function webhookError(
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

// ============================================================================
// POST WEBHOOK
// ============================================================================

export async function POST(request: Request) {
  try {
    // =====================================================
    // 1. VALIDASI KONFIGURASI
    // =====================================================

    const webhookSecret = cleanText(
      process.env.CASAKU_WEBHOOK_SECRET,
      500
    );

    if (!webhookSecret) {
      console.error(
        "[CASAKU WEBHOOK] CASAKU_WEBHOOK_SECRET belum dikonfigurasi."
      );

      return webhookError(
        "Server webhook belum dikonfigurasi.",
        500
      );
    }

    // =====================================================
    // 2. AMBIL SIGNATURE
    // =====================================================

    const receivedSignature = cleanText(
      request.headers.get("x-casaku-signature"),
      200
    );

    if (!receivedSignature) {
      console.warn(
        "[CASAKU WEBHOOK] Signature tidak ditemukan."
      );

      return webhookError(
        "Missing signature.",
        401
      );
    }

    // =====================================================
    // 3. BACA RAW BODY
    // =====================================================

    /*
     * Jangan menggunakan request.json() sebelum verifikasi.
     * Signature harus diperiksa menggunakan raw body asli.
     */

    const rawBody = await request.text();

    if (!rawBody) {
      return webhookError(
        "Empty webhook payload.",
        400
      );
    }

    // =====================================================
    // 4. VERIFIKASI SIGNATURE
    // =====================================================

    const signatureValid = verifySignature({
      rawBody,
      receivedSignature,
      secret: webhookSecret,
    });

    if (!signatureValid) {
      console.warn(
        "[CASAKU WEBHOOK] Signature tidak valid."
      );

      return webhookError(
        "Invalid signature.",
        401
      );
    }

    // =====================================================
    // 5. PARSE PAYLOAD
    // =====================================================

    let payload: CasakuWebhookPayload;

    try {
      payload = JSON.parse(
        rawBody
      ) as CasakuWebhookPayload;
    } catch {
      return webhookError(
        "Invalid JSON payload.",
        400
      );
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      return webhookError(
        "Invalid webhook payload.",
        400
      );
    }

    // =====================================================
    // 6. AMBIL TRANSACTION ID CASAKU
    // =====================================================

    /*
     * transactionId adalah ID transaksi gateway.
     *
     * id dan trx_id hanya dipertahankan sebagai alias
     * jika format payload webhook menggunakan nama tersebut.
     *
     * orderId TIDAK BOLEH digunakan sebagai fallback.
     */

    const transactionId = cleanText(
      payload.transactionId ||
        payload.trx_id ||
        payload.id,
      250
    );

    const webhookStatus = normalizeStatus(
      payload.status
    );

    const webhookAmount = Number(
      payload.amount ??
        payload.totalAmount ??
        0
    );

    const packageName = cleanText(
      payload.packageName,
      150
    );

    const appName = cleanText(
      payload.appName,
      150
    );

    const webhookPaidAt = cleanText(
      payload.paidAt,
      100
    );

    if (!transactionId) {
      console.error(
        "[CASAKU WEBHOOK] transactionId tidak ditemukan.",
        {
          hasOrderId: Boolean(payload.orderId),
          status: webhookStatus,
        }
      );

      return webhookError(
        "transactionId Casaku tidak ditemukan.",
        400
      );
    }

    // =====================================================
    // 7. FILTER STATUS WEBHOOK
    // =====================================================

    if (!isPaidStatus(webhookStatus)) {
      console.log(
        "[CASAKU WEBHOOK] Event diabaikan karena bukan pembayaran sukses.",
        {
          transactionId,
          status: webhookStatus,
        }
      );

      return NextResponse.json({
        success: true,
        ignored: true,
        transactionId,
        status: webhookStatus || "unknown",
        message:
          "Webhook diterima. Status bukan pembayaran berhasil.",
      });
    }

    // =====================================================
    // 8. CARI TRANSAKSI SANITY
    // =====================================================

    /*
     * Pencarian WAJIB menggunakan transactionId Casaku.
     * Tidak mencari menggunakan orderId.
     */

    let transaction =
      await getDonationByTransactionId(
        transactionId
      );

    if (!transaction) {
      console.error(
        "[CASAKU WEBHOOK] Transaksi tidak ditemukan.",
        {
          transactionId,
        }
      );

      /*
       * Gunakan 503 agar Casaku dapat mencoba mengirim
       * webhook kembali jika transaksi belum tersimpan.
       */

      return webhookError(
        "Transaksi belum ditemukan. Webhook perlu dicoba kembali.",
        503
      );
    }

    if (!transaction._id) {
      console.error(
        "[CASAKU WEBHOOK] Sanity document ID kosong.",
        {
          transactionId,
          orderId: transaction.orderId,
        }
      );

      return webhookError(
        "ID dokumen transaksi tidak valid.",
        500
      );
    }

    // =====================================================
    // 9. VALIDASI IDENTITAS TRANSAKSI
    // =====================================================

    const storedTransactionId = cleanText(
      transaction.transactionId,
      250
    );

    if (
      !storedTransactionId ||
      storedTransactionId !== transactionId
    ) {
      console.error(
        "[CASAKU WEBHOOK] Transaction ID mismatch.",
        {
          sanityId: transaction._id,
          orderId: transaction.orderId,
          storedTransactionId,
          webhookTransactionId: transactionId,
        }
      );

      return webhookError(
        "Transaction ID tidak cocok dengan data transaksi.",
        409
      );
    }

    // =====================================================
    // 10. LOG INFORMASI WEBHOOK
    // =====================================================

    console.log(
      "[CASAKU WEBHOOK] PAYMENT NOTIFICATION",
      {
        sanityId: transaction._id,
        orderId: transaction.orderId,
        transactionId,
        webhookStatus,
        webhookAmount:
          Number.isFinite(webhookAmount)
            ? webhookAmount
            : null,
        localAmount: transaction.amount,
        localPaymentAmount:
          transaction.paymentAmount,
        localStatus: transaction.status,
        packageName,
        appName,
        webhookPaidAt,
      }
    );

    // =====================================================
    // 11. REKONSILIASI PEMBAYARAN
    // =====================================================

    /*
     * PENTING:
     *
     * Webhook yang valid belum cukup untuk langsung
     * mengubah status Sanity menjadi success.
     *
     * reconcileDonation() bertanggung jawab untuk:
     *
     * 1. Memeriksa status langsung ke Casaku.
     * 2. Memastikan transactionId cocok.
     * 3. Memastikan nominal Casaku cocok dengan paymentAmount.
     * 4. Memperbarui status dan paymentVerified di Sanity.
     * 5. Memastikan pembayaran tidak turun dari success.
     * 6. Memproses kredit program secara idempotent.
     * 7. Memproses kredit fundraiser secara idempotent.
     * 8. Menyinkronkan status Supabase sesuai helper.
     *
     * Jangan melakukan patch pembayaran atau kredit
     * secara terpisah di file webhook ini.
     */

    console.log(
      "[CASAKU WEBHOOK] RECONCILIATION START",
      {
        sanityId: transaction._id,
        orderId: transaction.orderId,
        transactionId,
      }
    );

    const reconciliation =
      await reconcileDonation(transaction);

    // =====================================================
    // 12. AMBIL DATA TRANSAKSI TERBARU
    // =====================================================

    /*
     * Jangan hanya mengandalkan objek transaksi lama.
     * Baca ulang data Sanity setelah settlement.
     */

    const freshTransaction =
      await getDonationByTransactionId(
        transactionId
      );

    if (!freshTransaction) {
      throw new Error(
        "Transaksi tidak ditemukan setelah proses rekonsiliasi."
      );
    }

    // =====================================================
    // 13. PASTIKAN PEMBAYARAN BENAR-BENAR TERVERIFIKASI
    // =====================================================

    const finalStatus = normalizeStatus(
      freshTransaction.status
    );

    const paymentVerified =
      freshTransaction.paymentVerified === true;

    const finalTransactionId = cleanText(
      freshTransaction.transactionId,
      250
    );

    if (finalTransactionId !== transactionId) {
      console.error(
        "[CASAKU WEBHOOK] Transaction ID berubah setelah rekonsiliasi.",
        {
          transactionId,
          finalTransactionId,
          sanityId: freshTransaction._id,
        }
      );

      return webhookError(
        "Identitas transaksi berubah setelah verifikasi.",
        409
      );
    }

    /*
     * Pembayaran baru boleh diakui sukses jika:
     * - status lokal success/paid;
     * - paymentVerified bernilai true.
     */

    if (
      !isPaidStatus(finalStatus) ||
      !paymentVerified
    ) {
      console.error(
        "[CASAKU WEBHOOK] Pembayaran belum terverifikasi sepenuhnya.",
        {
          sanityId: freshTransaction._id,
          orderId: freshTransaction.orderId,
          transactionId,
          finalStatus,
          paymentVerified,
          reconciliationStatus:
            reconciliation?.status,
          casakuStatus:
            reconciliation?.casakuStatus,
          webhookAmount,
          paymentAmount:
            freshTransaction.paymentAmount,
        }
      );

      /*
       * Jangan mengembalikan sukses palsu.
       * Berikan kesempatan pengiriman ulang webhook.
       */

      return NextResponse.json(
        {
          success: false,
          verified: false,
          transactionId,
          orderId:
            freshTransaction.orderId || null,
          status: finalStatus || "pending",
          message:
            "Webhook diterima, tetapi pembayaran belum berhasil diverifikasi. Silakan coba kembali.",
        },
        {
          status: 503,
        }
      );
    }

    // =====================================================
    // 14. SUKSES
    // =====================================================

    console.log(
      "[CASAKU WEBHOOK] PAYMENT VERIFIED",
      {
        sanityId: freshTransaction._id,
        orderId: freshTransaction.orderId,
        transactionId,
        amount: freshTransaction.amount,
        paymentAmount:
          freshTransaction.paymentAmount,
        paidAmount: freshTransaction.paidAmount,
        paidAt: freshTransaction.paidAt,
        programCreditedAt:
          freshTransaction.programCreditedAt,
        fundraiserCreditedAt:
          freshTransaction.fundraiserCreditedAt,
      }
    );

    return NextResponse.json({
      success: true,
      verified: true,
      status: "paid",
      message:
        "Pembayaran berhasil diverifikasi dan rekonsiliasi selesai.",
      transactionId,
      orderId:
        freshTransaction.orderId || null,
      amount: freshTransaction.amount,
      paymentAmount:
        freshTransaction.paymentAmount,
      paidAmount:
        freshTransaction.paidAmount,
      paidAt: freshTransaction.paidAt || null,
      reconciliation: {
        status:
          reconciliation?.status ?? null,
        casakuStatus:
          reconciliation?.casakuStatus ?? null,
      },
    });

  } catch (error: unknown) {
    console.error(
      "[CASAKU WEBHOOK ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Internal server error.";

    return NextResponse.json(
      {
        success: false,
        message:
          "Webhook gagal diproses.",
        detail:
          process.env.NODE_ENV === "development"
            ? message
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}

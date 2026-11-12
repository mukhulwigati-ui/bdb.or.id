// app/api/payments/casaku/webhook/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";

import { createClient } from "@sanity/client";

import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";

// ============================================================================
// NEXT CONFIG
// ============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ============================================================================
// SANITY
// ============================================================================

const sanityClient = createClient({
  projectId:
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    "xqggeww8",

  dataset:
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    "production",

  apiVersion: "2026-08-31",

  useCdn: false,

  token:
    process.env.SANITY_API_TOKEN,
});

// ============================================================================
// TYPES
// ============================================================================

interface CasakuWebhookPayload {
  transactionId?: string;
  amount?: number;
  packageName?: string;
  appName?: string;
  status?: string;
  paidAt?: string;
}

interface SanityDonationTransaction {
  _id: string;

  _rev?: string;

  orderId?: string;
  transactionId?: string;

  donorName?: string;
  donorPhone?: string;
  donorEmail?: string;

  amount?: number;
  paymentAmount?: number;

  status?: string;

  paidAt?: string;

  paymentProvider?: string;
  paymentMethod?: string;

  fundraiserPhone?: string;

  programId?: string;
  programTitle?: string;

  programCreditedAt?: string;
  fundraiserCreditedAt?: string;
}

interface FundraiserDocument {
  _id: string;

  _rev?: string;

  name?: string;
  phone?: string;

  status?: string;

  feePercentage?: number;

  totalDanaDihimpun?: number;

  totalTransaksiSukses?: number;

  totalFee?: number;

  sisaSaldoFee?: number;

  feePaid?: number;
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

function normalizePhone(
  value: unknown
): string {
  let phone = cleanText(
    value,
    30
  ).replace(/\D/g, "");

  if (!phone) {
    return "";
  }

  if (phone.startsWith("62")) {
    phone =
      "0" + phone.slice(2);
  }

  return phone;
}

function isValidHexSignature(
  value: string
): boolean {
  return /^[a-f0-9]{64}$/i.test(
    value
  );
}

function verifySignature({
  rawBody,
  receivedSignature,
  secret,
}: {
  rawBody: string;
  receivedSignature: string;
  secret: string;
}): boolean {
  if (
    !isValidHexSignature(
      receivedSignature
    )
  ) {
    return false;
  }

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(
        rawBody,
        "utf8"
      )
      .digest("hex");

  const receivedBuffer =
    Buffer.from(
      receivedSignature,
      "hex"
    );

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "hex"
    );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

function formatDonationDate(
  isoDate: string
): string {
  try {
    return new Intl.DateTimeFormat(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone:
          "Asia/Jakarta",
      }
    ).format(
      new Date(isoDate)
    );
  } catch {
    return isoDate;
  }
}

// ============================================================================
// SUPABASE MIRROR
// ============================================================================

async function syncSupabaseSuccess(
  orderId?: string
) {
  if (!orderId) {
    return;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Supabase hanya mirror.
  // Jangan fallback ke anon key.
  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    return;
  }

  try {
    const supabaseAdmin =
      createSupabaseClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken:
              false,

            persistSession:
              false,
          },
        }
      );

    const {
      error,
    } =
      await supabaseAdmin
        .from("donations")
        .update({
          status: "success",
        })
        .eq(
          "invoice_id",
          orderId
        );

    if (error) {
      console.warn(
        "⚠️ Gagal sinkron status Supabase:",
        error.message
      );
    }
  } catch (error) {
    console.warn(
      "⚠️ Sinkronisasi Supabase dilewati:",
      error
    );
  }
}

// ============================================================================
// CREDIT PROGRAM
// ============================================================================

async function creditProgram({
  transaction,
  donationAmount,
  paidAt,
}: {
  transaction: SanityDonationTransaction;
  donationAmount: number;
  paidAt: string;
}) {
  if (
    transaction.programCreditedAt
  ) {
    return {
      credited: false,
      reason:
        "already_credited",
    };
  }

  if (
    !transaction.programId
  ) {
    console.warn(
      "⚠️ Transaksi tidak memiliki reference program:",
      transaction.orderId
    );

    return {
      credited: false,
      reason:
        "no_program",
    };
  }

  const donorName =
    cleanText(
      transaction.donorName,
      150
    ) ||
    "Hamba Allah";

  const donor = {
    _key:
      crypto.randomUUID(),

    _type:
      "verifiedDonor",

    name:
      donorName,

    amount:
      donationAmount,

    date:
      formatDonationDate(
        paidAt
      ),

    transactionId:
      transaction.transactionId,

    orderId:
      transaction.orderId,
  };

  // =========================================================================
  // SANITY TRANSACTION
  //
  // Mutasi program + marker transaction dilakukan dalam satu transaction.
  //
  // ifRevisionID mencegah dua request webhook paralel
  // mengkredit transaksi yang sama dua kali.
  // =========================================================================

  let builder =
    sanityClient.transaction();

  const programPatch =
    sanityClient
      .patch(
        transaction.programId
      )
      .setIfMissing({
        collectedAmount: 0,
        collectedRaw: 0,
        donors: [],
      })
      .inc({
        collectedAmount:
          donationAmount,

        collectedRaw:
          donationAmount,
      })
      .append(
        "donors",
        [donor]
      );

  const transactionPatch =
    sanityClient
      .patch(
        transaction._id
      )
      .set({
        programCreditedAt:
          new Date().toISOString(),
      });

  if (
    transaction._rev
  ) {
    transactionPatch.ifRevisionId(
      transaction._rev
    );
  }

  builder =
    builder
      .patch(
        programPatch
      )
      .patch(
        transactionPatch
      );

  try {
    await builder.commit();

    console.log(
      "✅ Program berhasil dikredit:",
      {
        programId:
          transaction.programId,

        orderId:
          transaction.orderId,

        donationAmount,
      }
    );

    return {
      credited: true,
      reason: "credited",
    };
  } catch (error) {
    // Bisa terjadi jika request lain lebih dahulu
    // mengubah revision transaction.
    //
    // Cek ulang marker sebelum menganggap error fatal.

    const fresh =
      await sanityClient.fetch<{
        programCreditedAt?: string;
      } | null>(
        `*[
          _type == "donationTransaction" &&
          _id == $id
        ][0]{
          programCreditedAt
        }`,
        {
          id:
            transaction._id,
        }
      );

    if (
      fresh?.programCreditedAt
    ) {
      return {
        credited: false,
        reason:
          "already_credited",
      };
    }

    throw error;
  }
}

// ============================================================================
// CREDIT FUNDRAISER
// ============================================================================

async function creditFundraiser({
  transaction,
  donationAmount,
}: {
  transaction: SanityDonationTransaction;
  donationAmount: number;
}) {
  if (
    transaction.fundraiserCreditedAt
  ) {
    return {
      credited: false,
      reason:
        "already_credited",
    };
  }

  const fundraiserPhone =
    normalizePhone(
      transaction.fundraiserPhone
    );

  if (!fundraiserPhone) {
    return {
      credited: false,
      reason:
        "no_fundraiser",
    };
  }

  // =========================================================================
  // Cari fundraiser dengan beberapa format nomor:
  //
  // 0895...
  // 62895...
  // +62895...
  // =========================================================================

  const phone0 =
    fundraiserPhone;

  const phone62 =
    fundraiserPhone.startsWith(
      "0"
    )
      ? `62${fundraiserPhone.slice(
          1
        )}`
      : fundraiserPhone;

  const phonePlus62 =
    `+${phone62}`;

  const fundraiser =
    await sanityClient.fetch<FundraiserDocument | null>(
      `*[
        _type == "fundraiser" &&
        (
          phone == $phone0 ||
          phone == $phone62 ||
          phone == $phonePlus62
        )
      ][0]{
        _id,
        _rev,
        name,
        phone,
        status,
        feePercentage,
        totalDanaDihimpun,
        totalTransaksiSukses,
        totalFee,
        sisaSaldoFee,
        feePaid
      }`,
      {
        phone0,
        phone62,
        phonePlus62,
      }
    );

  if (!fundraiser) {
    console.warn(
      "⚠️ Fundraiser tidak ditemukan:",
      fundraiserPhone
    );

    return {
      credited: false,
      reason:
        "fundraiser_not_found",
    };
  }

  if (
    fundraiser.status &&
    fundraiser.status !==
      "active"
  ) {
    console.warn(
      "⚠️ Fundraiser tidak aktif:",
      {
        fundraiserId:
          fundraiser._id,

        status:
          fundraiser.status,
      }
    );

    return {
      credited: false,
      reason:
        "fundraiser_inactive",
    };
  }

  const feePercentage =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          fundraiser.feePercentage ||
            0
        )
      )
    );

  const feeAmount =
    Math.round(
      donationAmount *
        (feePercentage /
          100)
    );

  // =========================================================================
  // Kredit fundraiser + marker transaksi dalam atomic Sanity transaction.
  // =========================================================================

  let builder =
    sanityClient.transaction();

  const fundraiserPatch =
    sanityClient
      .patch(
        fundraiser._id
      )
      .setIfMissing({
        totalDanaDihimpun:
          0,

        totalTransaksiSukses:
          0,

        totalFee:
          0,

        sisaSaldoFee:
          0,

        feePaid:
          0,
      })
      .inc({
        totalDanaDihimpun:
          donationAmount,

        totalTransaksiSukses:
          1,

        totalFee:
          feeAmount,

        sisaSaldoFee:
          feeAmount,
      })
      .set({
        updatedAt:
          new Date().toISOString(),
      });

  const transactionPatch =
    sanityClient
      .patch(
        transaction._id
      )
      .set({
        fundraiserCreditedAt:
          new Date().toISOString(),
      });

  // Ambil revision terbaru karena creditProgram
  // mungkin sudah mengubah donationTransaction.
  const freshTransaction =
    await sanityClient.fetch<{
      _rev?: string;
      fundraiserCreditedAt?: string;
    } | null>(
      `*[
        _type == "donationTransaction" &&
        _id == $id
      ][0]{
        _rev,
        fundraiserCreditedAt
      }`,
      {
        id:
          transaction._id,
      }
    );

  if (
    freshTransaction
      ?.fundraiserCreditedAt
  ) {
    return {
      credited: false,
      reason:
        "already_credited",
    };
  }

  if (
    freshTransaction?._rev
  ) {
    transactionPatch.ifRevisionId(
      freshTransaction._rev
    );
  }

  builder =
    builder
      .patch(
        fundraiserPatch
      )
      .patch(
        transactionPatch
      );

  try {
    await builder.commit();

    console.log(
      "✅ Fundraiser berhasil dikredit:",
      {
        fundraiserId:
          fundraiser._id,

        orderId:
          transaction.orderId,

        donationAmount,

        feePercentage,

        feeAmount,
      }
    );

    return {
      credited: true,
      reason: "credited",
      feeAmount,
    };
  } catch (error) {
    const fresh =
      await sanityClient.fetch<{
        fundraiserCreditedAt?: string;
      } | null>(
        `*[
          _type == "donationTransaction" &&
          _id == $id
        ][0]{
          fundraiserCreditedAt
        }`,
        {
          id:
            transaction._id,
        }
      );

    if (
      fresh?.fundraiserCreditedAt
    ) {
      return {
        credited: false,
        reason:
          "already_credited",
      };
    }

    throw error;
  }
}

// ============================================================================
// POST
// ============================================================================

export async function POST(
  request: Request
) {
  try {
    // =========================================================================
    // 1. ENV
    // =========================================================================

    const webhookSecret =
      process.env.CASAKU_WEBHOOK_SECRET?.trim();

    const sanityToken =
      process.env.SANITY_API_TOKEN?.trim();

    if (!webhookSecret) {
      console.error(
        "❌ CASAKU_WEBHOOK_SECRET belum dikonfigurasi."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Server configuration error.",
        },
        {
          status: 500,
        }
      );
    }

    if (!sanityToken) {
      console.error(
        "❌ SANITY_API_TOKEN belum dikonfigurasi."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Server configuration error.",
        },
        {
          status: 500,
        }
      );
    }

    // =========================================================================
    // 2. SIGNATURE
    // =========================================================================

    const receivedSignature =
      request.headers
        .get(
          "x-casaku-signature"
        )
        ?.trim() ||
      "";

    if (
      !receivedSignature
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing signature.",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================================================
    // 3. RAW BODY
    // =========================================================================

    const rawBody =
      await request.text();

    if (!rawBody) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Empty webhook payload.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================================
    // 4. VERIFY HMAC
    // =========================================================================

    if (
      !verifySignature({
        rawBody,
        receivedSignature,
        secret:
          webhookSecret,
      })
    ) {
      console.warn(
        "⚠️ Signature webhook Casaku tidak valid."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid signature.",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================================================
    // 5. PARSE JSON
    // =========================================================================

    let payload:
      CasakuWebhookPayload;

    try {
      payload =
        JSON.parse(
          rawBody
        ) as CasakuWebhookPayload;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid JSON payload.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================================
    // 6. VALIDASI PAYLOAD
    // =========================================================================

    const transactionId =
      cleanText(
        payload.transactionId,
        250
      );

    const webhookStatus =
      cleanText(
        payload.status,
        30
      ).toLowerCase();

    const webhookAmount =
      Number(
        payload.amount ??
          0
      );

    const packageName =
      cleanText(
        payload.packageName,
        150
      );

    const appName =
      cleanText(
        payload.appName,
        150
      );

    const paidAt =
      cleanText(
        payload.paidAt,
        100
      );

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "transactionId tidak ditemukan.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      webhookStatus !==
      "paid"
    ) {
      return NextResponse.json(
        {
          success: true,

          ignored: true,

          message:
            "Webhook bukan status paid.",
        },
        {
          status: 200,
        }
      );
    }

    if (
      !Number.isFinite(
        webhookAmount
      ) ||
      webhookAmount <=
        0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Nominal webhook tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    // =========================================================================
    // 7. AMBIL TRANSAKSI
    // =========================================================================

    let transaction =
      await sanityClient.fetch<SanityDonationTransaction | null>(
        `*[
          _type == "donationTransaction" &&
          transactionId == $transactionId
        ][0]{
          _id,
          _rev,
          orderId,
          transactionId,
          donorName,
          donorPhone,
          donorEmail,
          amount,
          paymentAmount,
          status,
          paidAt,
          paymentProvider,
          paymentMethod,
          fundraiserPhone,
          programCreditedAt,
          fundraiserCreditedAt,
          "programId": programName->_id,
          "programTitle": programName->title
        }`,
        {
          transactionId,
        }
      );

    if (!transaction) {
      console.error(
        "❌ Transaksi Casaku tidak ditemukan:",
        transactionId
      );

      // Non-2xx agar Casaku dapat retry.
      return NextResponse.json(
        {
          success: false,

          message:
            "Transaction not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =========================================================================
    // 8. VERIFIKASI NOMINAL PEMBAYARAN
    // =========================================================================

    const paymentAmount =
      Number(
        transaction.paymentAmount ??
          transaction.amount ??
          0
      );

    if (
      paymentAmount <=
        0 ||
      paymentAmount !==
        webhookAmount
    ) {
      console.error(
        "❌ Nominal Casaku tidak cocok:",
        {
          transactionId,

          expected:
            paymentAmount,

          received:
            webhookAmount,
        }
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Payment amount mismatch.",
        },
        {
          status: 409,
        }
      );
    }

    // =========================================================================
    // 9. NOMINAL DONASI ASLI
    //
    // PENTING:
    // program/fundraiser menggunakan amount,
    // BUKAN paymentAmount.
    //
    // Jadi kode unik QRIS tidak ikut dihitung sebagai donasi.
    // =========================================================================

    const donationAmount =
      Number(
        transaction.amount ??
          0
      );

    if (
      !Number.isFinite(
        donationAmount
      ) ||
      donationAmount <=
        0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Donation amount invalid.",
        },
        {
          status: 409,
        }
      );
    }

    const verifiedPaidAt =
      paidAt ||
      transaction.paidAt ||
      new Date().toISOString();

    // =========================================================================
    // 10. PASTIKAN DONATION TRANSACTION SUCCESS
    //
    // JANGAN RETURN hanya karena sudah success.
    //
    // Bisa saja /api/donation/status lebih dulu menandainya success,
    // sementara program belum dikredit.
    // =========================================================================

    if (
      transaction.status !==
      "success"
    ) {
      const paymentPatch: Record<
        string,
        unknown
      > = {
        status:
          "success",

        paymentProvider:
          "casaku",

        paymentMethod:
          "qris",

        paymentVerified:
          true,

        paidAt:
          verifiedPaidAt,

        paidAmount:
          webhookAmount,

        updatedAt:
          new Date().toISOString(),
      };

      if (packageName) {
        paymentPatch.paymentPackageName =
          packageName;
      }

      if (appName) {
        paymentPatch.paymentAppName =
          appName;
      }

      await sanityClient
        .patch(
          transaction._id
        )
        .set(
          paymentPatch
        )
        .commit();

      // Ambil revision terbaru.
      transaction =
        await sanityClient.fetch<SanityDonationTransaction | null>(
          `*[
            _type == "donationTransaction" &&
            _id == $id
          ][0]{
            _id,
            _rev,
            orderId,
            transactionId,
            donorName,
            donorPhone,
            donorEmail,
            amount,
            paymentAmount,
            status,
            paidAt,
            paymentProvider,
            paymentMethod,
            fundraiserPhone,
            programCreditedAt,
            fundraiserCreditedAt,
            "programId": programName->_id,
            "programTitle": programName->title
          }`,
          {
            id:
              transaction._id,
          }
        );

      if (!transaction) {
        throw new Error(
          "Transaksi hilang setelah update."
        );
      }
    }

    // =========================================================================
    // 11. CREDIT PROGRAM
    // =========================================================================

    const programResult =
      await creditProgram({
        transaction,

        donationAmount,

        paidAt:
          verifiedPaidAt,
      });

    // Ambil ulang karena revision dan marker berubah.
    transaction =
      await sanityClient.fetch<SanityDonationTransaction | null>(
        `*[
          _type == "donationTransaction" &&
          _id == $id
        ][0]{
          _id,
          _rev,
          orderId,
          transactionId,
          donorName,
          donorPhone,
          donorEmail,
          amount,
          paymentAmount,
          status,
          paidAt,
          paymentProvider,
          paymentMethod,
          fundraiserPhone,
          programCreditedAt,
          fundraiserCreditedAt,
          "programId": programName->_id,
          "programTitle": programName->title
        }`,
        {
          id:
            transaction._id,
        }
      );

    if (!transaction) {
      throw new Error(
        "Transaksi tidak ditemukan setelah credit program."
      );
    }

    // =========================================================================
    // 12. CREDIT FUNDRAISER
    // =========================================================================

    const fundraiserResult =
      await creditFundraiser({
        transaction,

        donationAmount,
      });

    // =========================================================================
    // 13. SUPABASE MIRROR
    // =========================================================================

    await syncSupabaseSuccess(
      transaction.orderId
    );

    // =========================================================================
    // 14. RESPONSE
    // =========================================================================

    console.log(
      "✅ Webhook Casaku selesai:",
      {
        transactionId,

        orderId:
          transaction.orderId,

        donationAmount,

        paymentAmount,

        program:
          programResult,

        fundraiser:
          fundraiserResult,
      }
    );

    return NextResponse.json(
      {
        success: true,

        message:
          "Webhook processed.",

        transactionId,

        orderId:
          transaction.orderId ||
          null,

        donationAmount,

        paymentAmount,

        program:
          programResult,

        fundraiser:
          fundraiserResult,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "🔥 Error webhook Casaku:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      {
        // Casaku akan retry bila proses penting gagal.
        status: 500,
      }
    );
  }
}
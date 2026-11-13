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
    "ks29gg6v",

  dataset:
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    "production",

  apiVersion: "2026-08-31",

  useCdn: false,

  token:
    process.env.SANITY_API_TOKEN ||
    process.env.SANITY_API_WRITE_TOKEN,
});

// ============================================================================
// TYPES
// ============================================================================

interface CasakuWebhookPayload {
  transactionId?: string;
  id?: string;
  trx_id?: string;
  orderId?: string;
  amount?: number;
  totalAmount?: number;
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

  try {
    let tx = sanityClient.transaction();

    // Patch Program
    tx = tx.patch(transaction.programId, (patch) =>
      patch
        .setIfMissing({
          collectedAmount: 0,
          collectedRaw: 0,
          donors: [],
        })
        .inc({
          collectedAmount: donationAmount,
          collectedRaw: donationAmount,
        })
        .append("donors", [donor])
    );

    // Patch Transaction
    tx = tx.patch(transaction._id, (patch) => {
      let next = patch.set({
        programCreditedAt: new Date().toISOString(),
      });
      if (transaction._rev) {
        next = next.ifRevisionId(transaction._rev);
      }
      return next;
    });

    await tx.commit();

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

  try {
    let tx = sanityClient.transaction();

    tx = tx.patch(fundraiser._id, (patch) =>
      patch
        .setIfMissing({
          totalDanaDihimpun: 0,
          totalTransaksiSukses: 0,
          totalFee: 0,
          sisaSaldoFee: 0,
          feePaid: 0,
        })
        .inc({
          totalDanaDihimpun: donationAmount,
          totalTransaksiSukses: 1,
          totalFee: feeAmount,
          sisaSaldoFee: feeAmount,
        })
        .set({
          updatedAt: new Date().toISOString(),
        })
    );

    tx = tx.patch(transaction._id, (patch) => {
      let next = patch.set({
        fundraiserCreditedAt: new Date().toISOString(),
      });
      if (freshTransaction?._rev) {
        next = next.ifRevisionId(freshTransaction._rev);
      }
      return next;
    });

    await tx.commit();

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
    const webhookSecret =
      process.env.CASAKU_WEBHOOK_SECRET?.trim();

    const sanityToken =
      process.env.SANITY_API_TOKEN?.trim() ||
      process.env.SANITY_API_WRITE_TOKEN?.trim();

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

    const receivedSignature =
      request.headers
        .get(
          "x-casaku-signature"
        )
        ?.trim() || "";

    if (!receivedSignature) {
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

    const transactionId =
      cleanText(
        payload.transactionId ||
          payload.id ||
          payload.trx_id ||
          payload.orderId,
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
          payload.totalAmount ??
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
      webhookStatus !== "paid" &&
      webhookStatus !== "success" &&
      webhookStatus !== "settlement" &&
      webhookStatus !== "completed"
    ) {
      return NextResponse.json(
        {
          success: true,
          ignored: true,
          message:
            "Webhook bukan status paid/success.",
        },
        {
          status: 200,
        }
      );
    }

    let transaction =
      await sanityClient.fetch<SanityDonationTransaction | null>(
        `*[
          _type == "donationTransaction" &&
          (
            transactionId == $transactionId ||
            orderId == $transactionId
          )
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

    const paymentAmount =
      Number(
        transaction.paymentAmount ??
          transaction.amount ??
          0
      );

    const donationAmount =
      Number(
        transaction.amount ??
          webhookAmount ??
          0
      );

    const verifiedPaidAt =
      paidAt ||
      transaction.paidAt ||
      new Date().toISOString();

    if (
      transaction.status !==
      "success"
    ) {
      const paymentPatch: Record<
        string,
        unknown
      > = {
        status: "success",
        paymentProvider: "casaku",
        paymentMethod: "qris",
        paymentVerified: true,
        paidAt: verifiedPaidAt,
        paidAmount:
          webhookAmount || paymentAmount,
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

    const programResult =
      await creditProgram({
        transaction,
        donationAmount,
        paidAt:
          verifiedPaidAt,
      });

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

    const fundraiserResult =
      await creditFundraiser({
        transaction,
        donationAmount,
      });

    await syncSupabaseSuccess(
      transaction.orderId
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Webhook processed successfully.",
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
        status: 500,
      }
    );
  }
}
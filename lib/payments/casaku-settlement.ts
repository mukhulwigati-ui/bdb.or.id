// lib/payments/casaku-settlement.ts

import crypto from "crypto";

import { createClient } from "@sanity/client";

import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";

// ============================================================================
// CONSTANTS
// ============================================================================

const CASAKU_STATUS_URL =
  "https://api.casaku.id/api/generate/check-status";

// ============================================================================
// SANITY
// ============================================================================

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;

const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  "production";

const sanityToken =
  process.env.SANITY_API_TOKEN;

if (!projectId) {
  throw new Error(
    "NEXT_PUBLIC_SANITY_PROJECT_ID belum dikonfigurasi."
  );
}

if (!sanityToken) {
  throw new Error(
    "SANITY_API_TOKEN belum dikonfigurasi."
  );
}

export const paymentSanityClient =
  createClient({
    projectId,
    dataset,

    apiVersion:
      "2026-08-31",

    useCdn:
      false,

    token:
      sanityToken,
  });

// ============================================================================
// TYPES
// ============================================================================

export type CasakuStatus =
  | "pending"
  | "paid"
  | "expired"
  | "cancel";

export interface DonationTransaction {
  _id: string;

  _rev?: string;

  orderId?: string;

  transactionId?: string;

  donorName?: string;

  donorPhone?: string;

  donorEmail?: string;

  amount?: number;

  paymentAmount?: number;

  paidAmount?: number;

  status?: string;

  paymentProvider?: string;

  paymentMethod?: string;

  paymentVerified?: boolean;

  paidAt?: string | null;

  expiresAt?: string | null;

  fundraiserPhone?: string;

  programId?: string;

  programTitle?: string;

  campaignSlug?: string;

  programCreditedAt?: string;

  fundraiserCreditedAt?: string;
}

interface FundraiserDocument {
  _id: string;

  _rev?: string;

  phone?: string;

  status?: string;

  feePercentage?: number;

  supportedProgramIds?: string[];

  totalDanaDihimpun?: number;

  totalTransaksiSukses?: number;

  totalFee?: number;

  sisaSaldoFee?: number;

  feePaid?: number;
}

export interface CasakuCheckResult {
  status: CasakuStatus;

  transactionId: string;

  amount: number;

  paidAt: string | null;

  expiredAt: string | null;

  packageName: string;

  appName: string;
}

export interface CreditResult {
  credited: boolean;

  reason: string;

  feeAmount?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function cleanText(
  value: unknown,
  maxLength = 500
): string {
  return String(
    value ?? ""
  )
    .trim()
    .slice(
      0,
      maxLength
    );
}

function safeNumber(
  value: unknown
): number {
  const number =
    Number(
      value ?? 0
    );

  if (
    !Number.isFinite(
      number
    ) ||
    number < 0
  ) {
    return 0;
  }

  return number;
}

function normalizePhone(
  value: unknown
): string {
  let phone =
    cleanText(
      value,
      30
    ).replace(
      /\D/g,
      ""
    );

  if (
    phone.startsWith(
      "62"
    )
  ) {
    phone =
      `0${phone.slice(
        2
      )}`;
  }

  return phone;
}

function normalizeCasakuStatus(
  value: unknown
): CasakuStatus {
  const status =
    cleanText(
      value,
      50
    ).toLowerCase();

  if (
    status === "paid" ||
    status === "success"
  ) {
    return "paid";
  }

  if (
    status === "expired"
  ) {
    return "expired";
  }

  if (
    status === "cancel" ||
    status === "cancelled" ||
    status === "canceled"
  ) {
    return "cancel";
  }

  return "pending";
}

function formatDonationDate(
  value: string
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
      new Date(
        value
      )
    );
  } catch {
    return value;
  }
}

// ============================================================================
// QUERY DONATION
// ============================================================================

const DONATION_PROJECTION = `
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
`;

// ============================================================================
// GET TRANSACTION
// ============================================================================

export async function getDonationByOrderId(
  orderId: string
): Promise<DonationTransaction | null> {
  return paymentSanityClient.fetch<
    DonationTransaction | null
  >(
    `*[
      _type == "donationTransaction" &&
      orderId == $orderId
    ][0]{
      ${DONATION_PROJECTION}
    }`,
    {
      orderId,
    }
  );
}

export async function getDonationByTransactionId(
  transactionId: string
): Promise<DonationTransaction | null> {
  return paymentSanityClient.fetch<
    DonationTransaction | null
  >(
    `*[
      _type == "donationTransaction" &&
      transactionId == $transactionId
    ][0]{
      ${DONATION_PROJECTION}
    }`,
    {
      transactionId,
    }
  );
}

export async function getDonationById(
  id: string
): Promise<DonationTransaction | null> {
  return paymentSanityClient.fetch<
    DonationTransaction | null
  >(
    `*[
      _type == "donationTransaction" &&
      _id == $id
    ][0]{
      ${DONATION_PROJECTION}
    }`,
    {
      id,
    }
  );
}

// ============================================================================
// CHECK CASAKU
// ============================================================================

export async function checkCasakuTransaction(
  transactionId: string
): Promise<CasakuCheckResult> {
  const licenseKey =
    process.env.CASAKU_LICENSE_KEY?.trim();

  if (!licenseKey) {
    throw new Error(
      "CASAKU_LICENSE_KEY belum dikonfigurasi."
    );
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      15_000
    );

  try {
    const response =
      await fetch(
        CASAKU_STATUS_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",

            "x-license-key":
              licenseKey,
          },

          body:
            JSON.stringify({
              transactionId,
            }),

          cache:
            "no-store",

          signal:
            controller.signal,
        }
      );

    const raw =
      await response.text();

    let json: any =
      null;

    try {
      json =
        raw
          ? JSON.parse(
              raw
            )
          : null;
    } catch {
      throw new Error(
        "Respons Casaku bukan JSON yang valid."
      );
    }

    if (
      !response.ok
    ) {
      throw new Error(
        cleanText(
          json?.message
        ) ||
          `Casaku HTTP ${response.status}`
      );
    }

    const data =
      json?.data &&
      typeof json.data ===
        "object"
        ? json.data
        : json;

    const returnedTransactionId =
      cleanText(
        data?.transactionId
      );

    if (
      returnedTransactionId &&
      returnedTransactionId !==
        transactionId
    ) {
      throw new Error(
        "Transaction ID Casaku tidak cocok."
      );
    }

    const returnedAmount =
      safeNumber(
        data?.totalAmount ??
          data?.amount
      );

    return {
      status:
        normalizeCasakuStatus(
          data?.status
        ),

      transactionId,

      amount:
        returnedAmount,

      paidAt:
        cleanText(
          data?.paidAt,
          100
        ) ||
        null,

      expiredAt:
        cleanText(
          data?.expiredAt,
          100
        ) ||
        null,

      packageName:
        cleanText(
          data?.packageName,
          150
        ),

      appName:
        cleanText(
          data?.appName,
          150
        ),
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

// ============================================================================
// SUPABASE MIRROR
// ============================================================================

async function syncSupabaseStatus(
  orderId: string | undefined,
  status:
    | "pending"
    | "success"
    | "failed"
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
    const supabase =
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
      await supabase
        .from(
          "donations"
        )
        .update({
          status,
        })
        .eq(
          "invoice_id",
          orderId
        );

    if (error) {
      console.warn(
        "[CASAKU] Supabase sync gagal:",
        error.message
      );
    }
  } catch (error) {
    console.warn(
      "[CASAKU] Supabase sync error:",
      error
    );
  }
}

// ============================================================================
// MARK PAYMENT SUCCESS
// ============================================================================

async function markTransactionSuccess(
  transaction:
    DonationTransaction,

  result:
    CasakuCheckResult
) {
  const expectedAmount =
    safeNumber(
      transaction.paymentAmount ??
        transaction.amount
    );

  if (
    result.amount >
      0 &&
    expectedAmount >
      0 &&
    result.amount !==
      expectedAmount
  ) {
    throw new Error(
      `Nominal pembayaran tidak cocok. Expected ${expectedAmount}, received ${result.amount}.`
    );
  }

  const paidAt =
    result.paidAt ||
    transaction.paidAt ||
    new Date().toISOString();

  const patch: Record<
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

    paidAt,

    paidAmount:
      expectedAmount,

    updatedAt:
      new Date().toISOString(),
  };

  if (
    result.packageName
  ) {
    patch.paymentPackageName =
      result.packageName;
  }

  if (
    result.appName
  ) {
    patch.paymentAppName =
      result.appName;
  }

  await paymentSanityClient
    .patch(
      transaction._id
    )
    .set(
      patch
    )
    .commit();

  await syncSupabaseStatus(
    transaction.orderId,
    "success"
  );
}

// ============================================================================
// MARK FAILED
// ============================================================================

async function markTransactionFailed(
  transaction:
    DonationTransaction,

  result:
    CasakuCheckResult
) {
  if (
    transaction.status ===
    "success"
  ) {
    return;
  }

  const patch: Record<
    string,
    unknown
  > = {
    status:
      "failed",

    paymentProvider:
      "casaku",

    paymentMethod:
      "qris",

    updatedAt:
      new Date().toISOString(),
  };

  if (
    result.expiredAt
  ) {
    patch.expiresAt =
      result.expiredAt;
  }

  await paymentSanityClient
    .patch(
      transaction._id
    )
    .set(
      patch
    )
    .commit();

  await syncSupabaseStatus(
    transaction.orderId,
    "failed"
  );
}

// ============================================================================
// CREDIT PROGRAM
// ============================================================================

async function creditProgram(
  transaction:
    DonationTransaction
): Promise<CreditResult> {
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
    return {
      credited: false,

      reason:
        "no_program_reference",
    };
  }

  const amount =
    safeNumber(
      transaction.amount
    );

  if (amount <= 0) {
    return {
      credited: false,

      reason:
        "invalid_amount",
    };
  }

  // --------------------------------------------------------------------------
  // Cek donor lebih dahulu.
  //
  // Ini juga membantu transaksi lama yang marker-nya belum ada,
  // tetapi donor sudah terlanjur dimasukkan.
  // --------------------------------------------------------------------------

  const existingDonor =
    await paymentSanityClient.fetch<
      boolean
    >(
      `count(
        *[
          _type == "program" &&
          _id == $programId &&
          count(
            donors[
              transactionId == $transactionId ||
              orderId == $orderId
            ]
          ) > 0
        ]
      ) > 0`,
      {
        programId:
          transaction.programId,

        transactionId:
          transaction.transactionId ||
          "",

        orderId:
          transaction.orderId ||
          "",
      }
    );

  // --------------------------------------------------------------------------
  // Kalau donor sudah ada, jangan append lagi.
  //
  // Tetapi tetap set marker agar transaksi dianggap selesai direkonsiliasi.
  // --------------------------------------------------------------------------

  if (existingDonor) {
    await paymentSanityClient
      .patch(
        transaction._id
      )
      .set({
        programCreditedAt:
          new Date().toISOString(),
      })
      .commit();

    return {
      credited: false,

      reason:
        "donor_already_exists",
    };
  }

  const donor = {
    _key:
      crypto.randomUUID(),

    _type:
      "verifiedDonor",

    name:
      cleanText(
        transaction.donorName,
        150
      ) ||
      "Hamba Allah",

    amount,

    date:
      formatDonationDate(
        transaction.paidAt ||
          new Date().toISOString()
      ),

    orderId:
      transaction.orderId,

    transactionId:
      transaction.transactionId,
  };

  // --------------------------------------------------------------------------
  // Ambil revision terbaru.
  // --------------------------------------------------------------------------

  const fresh =
    await getDonationById(
      transaction._id
    );

  if (!fresh) {
    throw new Error(
      "Transaksi tidak ditemukan saat credit program."
    );
  }

  if (
    fresh.programCreditedAt
  ) {
    return {
      credited: false,

      reason:
        "already_credited",
    };
  }

  // --------------------------------------------------------------------------
  // Program + marker transaction dibuat atomic.
  //
  // ifRevisionId mencegah dua request paralel mengkredit transaksi yang sama.
  // --------------------------------------------------------------------------

  try {
    await paymentSanityClient
      .transaction()

      .patch(
        transaction.programId,
        (patch) =>
          patch
            .setIfMissing({
              collectedAmount:
                0,

              collectedRaw:
                0,

              donors:
                [],
            })
            .inc({
              collectedAmount:
                amount,

              collectedRaw:
                amount,
            })
            .append(
              "donors",
              [
                donor,
              ]
            )
      )

      .patch(
        transaction._id,
        (patch) => {
          let next =
            patch.set({
              programCreditedAt:
                new Date().toISOString(),
            });

          if (
            fresh._rev
          ) {
            next =
              next.ifRevisionId(
                fresh._rev
              );
          }

          return next;
        }
      )

      .commit();

    return {
      credited: true,

      reason:
        "credited",
    };
  } catch (error) {
    const after =
      await getDonationById(
        transaction._id
      );

    if (
      after?.programCreditedAt
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

async function creditFundraiser(
  transaction:
    DonationTransaction
): Promise<CreditResult> {
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
    await paymentSanityClient.fetch<
      FundraiserDocument | null
    >(
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

        phone,
        status,

        feePercentage,

        "supportedProgramIds":
          supportedPrograms[]._ref,

        totalDanaDihimpun,
        totalTransaksiSukses,

        totalFee,
        sisaSaldoFee,
        feePaid
      }`,
      {
        phone0:
          fundraiserPhone,

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

  // --------------------------------------------------------------------------
  // Kalau fundraiser hanya boleh mendukung program tertentu,
  // pastikan program transaksi termasuk di dalamnya.
  // --------------------------------------------------------------------------

  if (
    Array.isArray(
      fundraiser.supportedProgramIds
    ) &&
    fundraiser.supportedProgramIds.length >
      0 &&
    transaction.programId &&
    !fundraiser.supportedProgramIds.includes(
      transaction.programId
    )
  ) {
    return {
      credited: false,

      reason:
        "program_not_supported",
    };
  }

  const donationAmount =
    safeNumber(
      transaction.amount
    );

  const feePercentage =
    Math.max(
      0,
      Math.min(
        100,
        safeNumber(
          fundraiser.feePercentage
        )
      )
    );

  const feeAmount =
    Math.round(
      donationAmount *
        (
          feePercentage /
          100
        )
    );

  const freshTransaction =
    await getDonationById(
      transaction._id
    );

  if (
    !freshTransaction
  ) {
    throw new Error(
      "Transaksi tidak ditemukan saat credit fundraiser."
    );
  }

  if (
    freshTransaction.fundraiserCreditedAt
  ) {
    return {
      credited: false,

      reason:
        "already_credited",
    };
  }

  try {
    await paymentSanityClient
      .transaction()

      .patch(
        fundraiser._id,
        (patch) =>
          patch
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
            })
      )

      .patch(
        transaction._id,
        (patch) => {
          let next =
            patch.set({
              fundraiserCreditedAt:
                new Date().toISOString(),
            });

          if (
            freshTransaction._rev
          ) {
            next =
              next.ifRevisionId(
                freshTransaction._rev
              );
          }

          return next;
        }
      )

      .commit();

    return {
      credited: true,

      reason:
        "credited",

      feeAmount,
    };
  } catch (error) {
    const after =
      await getDonationById(
        transaction._id
      );

    if (
      after?.fundraiserCreditedAt
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
// ENSURE CREDITS
// ============================================================================

export async function ensureDonationCredits(
  transaction:
    DonationTransaction
) {
  if (
    transaction.status !==
    "success"
  ) {
    return {
      program: {
        credited: false,

        reason:
          "payment_not_success",
      } as CreditResult,

      fundraiser: {
        credited: false,

        reason:
          "payment_not_success",
      } as CreditResult,
    };
  }

  const program =
    await creditProgram(
      transaction
    );

  const refreshed =
    await getDonationById(
      transaction._id
    );

  const fundraiser =
    refreshed
      ? await creditFundraiser(
          refreshed
        )
      : {
          credited:
            false,

          reason:
            "transaction_not_found",
        };

  return {
    program,
    fundraiser,
  };
}

// ============================================================================
// RECONCILE ONE TRANSACTION
// ============================================================================

export async function reconcileDonation(
  transaction:
    DonationTransaction
) {
  // --------------------------------------------------------------------------
  // Kalau sudah success tetapi campaign/fundraiser belum ter-update,
  // jangan tanya Casaku lagi.
  // Langsung perbaiki credit-nya.
  // --------------------------------------------------------------------------

  if (
    transaction.status ===
    "success"
  ) {
    const credits =
      await ensureDonationCredits(
        transaction
      );

    return {
      status:
        "success",

      casakuStatus:
        "paid" as CasakuStatus,

      credits,

      transaction:
        await getDonationById(
          transaction._id
        ),
    };
  }

  const transactionId =
    cleanText(
      transaction.transactionId,
      250
    );

  if (!transactionId) {
    throw new Error(
      "transactionId Casaku tidak ditemukan."
    );
  }

  const casaku =
    await checkCasakuTransaction(
      transactionId
    );

  // --------------------------------------------------------------------------
  // PAID
  // --------------------------------------------------------------------------

  if (
    casaku.status ===
    "paid"
  ) {
    await markTransactionSuccess(
      transaction,
      casaku
    );

    const paidTransaction =
      await getDonationById(
        transaction._id
      );

    if (!paidTransaction) {
      throw new Error(
        "Transaksi tidak ditemukan setelah settlement."
      );
    }

    const credits =
      await ensureDonationCredits(
        paidTransaction
      );

    return {
      status:
        "success",

      casakuStatus:
        casaku.status,

      credits,

      transaction:
        await getDonationById(
          transaction._id
        ),
    };
  }

  // --------------------------------------------------------------------------
  // EXPIRED / CANCEL
  // --------------------------------------------------------------------------

  if (
    casaku.status ===
      "expired" ||
    casaku.status ===
      "cancel"
  ) {
    await markTransactionFailed(
      transaction,
      casaku
    );

    return {
      status:
        "failed",

      casakuStatus:
        casaku.status,

      credits:
        null,

      transaction:
        await getDonationById(
          transaction._id
        ),
    };
  }

  // --------------------------------------------------------------------------
  // PENDING
  // --------------------------------------------------------------------------

  return {
    status:
      "pending",

    casakuStatus:
      "pending" as CasakuStatus,

    credits:
      null,

    transaction,
  };
}
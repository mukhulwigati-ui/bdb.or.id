
import { randomUUID } from "node:crypto";
import { createClient } from "@sanity/client";
import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";
import { Casaku } from "casaku";

// ============================================================================
// CONFIG
// ============================================================================

const SANITY_TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_TOKEN;

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();

const dataset = (
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  "production"
).trim();

if (!projectId) {
  throw new Error(
    "NEXT_PUBLIC_SANITY_PROJECT_ID belum dikonfigurasi."
  );
}

if (!SANITY_TOKEN) {
  throw new Error(
    "SANITY_API_WRITE_TOKEN atau SANITY_API_TOKEN belum dikonfigurasi."
  );
}

export const paymentSanityClient = createClient({
  projectId,
  dataset,
  apiVersion: "2026-08-31",
  useCdn: false,
  token: SANITY_TOKEN,
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
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function safeNumber(value: unknown): number {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return number;
}

function normalizePhone(value: unknown): string {
  let phone = cleanText(value, 30).replace(/\D/g, "");

  if (phone.startsWith("62")) {
    phone = `0${phone.slice(2)}`;
  }

  return phone;
}

function firstValue(...values: unknown[]): unknown {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return undefined;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = cleanText(value, 10000);

    if (text) return text;
  }

  return "";
}

function normalizeCasakuStatus(
  value: unknown
): CasakuStatus {
  const status = cleanText(value, 50).toLowerCase();

  if (
    [
      "paid",
      "success",
      "successful",
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

function normalizeLocalStatus(value: unknown): string {
  return cleanText(value, 50).toLowerCase();
}

function formatDonationDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function getGatewayTransactionId(
  transaction: DonationTransaction
): string {
  // Jangan pernah menggunakan orderId sebagai ID Casaku.
  return cleanText(transaction.transactionId, 250);
}

function getLocalOrderIds(
  transaction: DonationTransaction
): string[] {
  // Supabase invoice_id menggunakan ID internal website.
  const orderId = cleanText(transaction.orderId, 250);

  return orderId ? [orderId] : [];
}

function isSuccessfulStatus(value: unknown): boolean {
  return [
    "success",
    "paid",
    "settlement",
    "settled",
    "successful",
    "completed",
    "complete",
  ].includes(normalizeLocalStatus(value));
}

// ============================================================================
// QUERY PROJECTION
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

  "programId": programName->_id,
  "programTitle": programName->title
`;

// ============================================================================
// GET DONATION BY ORDER ID
// ============================================================================

export async function getDonationByOrderId(
  orderId: string
): Promise<DonationTransaction | null> {
  const normalizedOrderId = cleanText(orderId, 250);

  if (!normalizedOrderId) {
    return null;
  }

  return paymentSanityClient.fetch(
    `*[
      _type == "donationTransaction" &&
      orderId == $orderId
    ][0]{
      ${DONATION_PROJECTION}
    }`,
    {
      orderId: normalizedOrderId,
    }
  );
}

// ============================================================================
// GET DONATION BY CASAKU TRANSACTION ID
// ============================================================================

export async function getDonationByTransactionId(
  transactionId: string
): Promise<DonationTransaction | null> {
  const normalizedTransactionId = cleanText(
    transactionId,
    250
  );

  if (!normalizedTransactionId) {
    return null;
  }

  return paymentSanityClient.fetch(
    `*[
      _type == "donationTransaction" &&
      transactionId == $transactionId
    ][0]{
      ${DONATION_PROJECTION}
    }`,
    {
      transactionId: normalizedTransactionId,
    }
  );
}

// ============================================================================
// GET DONATION BY SANITY ID
// ============================================================================

export async function getDonationById(
  id: string
): Promise<DonationTransaction | null> {
  const normalizedId = cleanText(id, 250);

  if (!normalizedId) {
    return null;
  }

  return paymentSanityClient.fetch(
    `*[
      _type == "donationTransaction" &&
      _id == $id
    ][0]{
      ${DONATION_PROJECTION}
    }`,
    {
      id: normalizedId,
    }
  );
}

// ============================================================================
// CHECK CASAKU TRANSACTION - OFFICIAL SDK
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

  const normalizedId = cleanText(transactionId, 250);

  if (!normalizedId) {
    throw new Error(
      "ID transaksi Casaku tidak boleh kosong."
    );
  }

  try {
    const casaku = new Casaku({
      licenseKey,
    });

    // SDK resmi Casaku.
    const response = await casaku.checkStatus(
      normalizedId
    );

    // response.status adalah HTTP/API status.
    if (response.status !== 200) {
      throw new Error(
        `Casaku mengembalikan HTTP status ${response.status}.`
      );
    }

    // Status pembayaran berada di response.data.status.
    const data = response.data;

    if (!data || typeof data !== "object") {
      throw new Error(
        "Data transaksi tidak ditemukan pada respons Casaku."
      );
    }

    const returnedTransactionId = cleanText(
      data.transactionId,
      250
    );

    if (!returnedTransactionId) {
      throw new Error(
        "Casaku tidak mengembalikan transactionId."
      );
    }

    if (returnedTransactionId !== normalizedId) {
      throw new Error(
        `ID transaksi tidak cocok. Diminta: ${normalizedId}, diterima: ${returnedTransactionId}.`
      );
    }

    const rawStatus = data.status;
    const status = normalizeCasakuStatus(rawStatus);

    // CheckStatus SDK mengembalikan nominal pada data.amount.
    const amount = Number(data.amount);

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      throw new Error(
        "Nominal pembayaran dari Casaku tidak valid."
      );
    }

    if (status === "paid" && amount <= 0) {
      throw new Error(
        "Casaku menyatakan paid tetapi nominal pembayaran tidak valid."
      );
    }

    // Field tambahan dibaca secara defensif karena tidak selalu
    // tersedia pada respons checkStatus.
    const optionalData = data as typeof data & {
      paidAt?: string;
      paid_at?: string;
      packageName?: string;
      appName?: string;
    };

    const result: CasakuCheckResult = {
      status,
      transactionId: returnedTransactionId,
      amount,
      paidAt:
        firstText(
          optionalData.paidAt,
          optionalData.paid_at
        ) || null,
      expiredAt:
        firstText(data.expiredAt) || null,
      packageName: firstText(
        optionalData.packageName
      ),
      appName: firstText(
        optionalData.appName
      ),
    };

    console.log("[CASAKU SDK CHECK]", {
      requestedTransactionId: normalizedId,
      returnedTransactionId,
      httpStatus: response.status,
      gatewayStatus: rawStatus,
      normalizedStatus: result.status,
      amount: result.amount,
      expiredAt: result.expiredAt,
    });

    return result;

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error("[CASAKU SDK ERROR]", {
      transactionId: normalizedId,
      message,
    });

    throw new Error(
      `Gagal memeriksa transaksi Casaku: ${message}`
    );
  }
}

// ============================================================================
// SUPABASE MIRROR
// ============================================================================

async function syncSupabaseStatus(
  transaction: DonationTransaction,
  status: "pending" | "success" | "failed"
): Promise<void> {
  const orderIds = getLocalOrderIds(transaction);

  if (!orderIds.length) {
    console.warn(
      "[CASAKU] orderId tidak ditemukan. Sinkronisasi Supabase dilewati.",
      transaction._id
    );

    return;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "[CASAKU] Supabase service role belum dikonfigurasi."
    );

    return;
  }

  try {
    const supabase = createSupabaseClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { error } = await supabase
      .from("donations")
      .update({ status })
      .in("invoice_id", orderIds);

    if (error) {
      console.error(
        "[CASAKU] Supabase sync gagal:",
        error.message
      );
    } else {
      console.log(
        "[CASAKU] Supabase status diperbarui:",
        { orderIds, status }
      );
    }

  } catch (error) {
    console.error(
      "[CASAKU] Supabase sync error:",
      error
    );
  }
}

// ============================================================================
// MARK PAYMENT SUCCESS
// ============================================================================

async function markTransactionSuccess(
  transaction: DonationTransaction,
  result: CasakuCheckResult
): Promise<void> {
  const fresh = await getDonationById(transaction._id);

  if (!fresh) {
    throw new Error(
      "Transaksi tidak ditemukan di Sanity."
    );
  }

  const storedTransactionId =
    getGatewayTransactionId(fresh);

  if (
    !storedTransactionId ||
    storedTransactionId !== result.transactionId
  ) {
    throw new Error(
      "ID transaksi Casaku tidak cocok dengan data Sanity."
    );
  }

  if (result.status !== "paid") {
    throw new Error(
      "Transaksi belum berstatus paid di Casaku."
    );
  }

  // paymentAmount seharusnya berisi totalAmount Casaku,
  // termasuk kode unik apabila digunakan.
  const expectedAmount = safeNumber(
    fresh.paymentAmount ?? fresh.amount
  );

  const actualAmount = safeNumber(result.amount);

  if (expectedAmount <= 0) {
    throw new Error(
      "Nominal pembayaran yang diharapkan tidak valid."
    );
  }

  if (actualAmount <= 0) {
    throw new Error(
      "Casaku tidak memberikan nominal pembayaran yang valid."
    );
  }

  if (actualAmount !== expectedAmount) {
    throw new Error(
      `Nominal pembayaran tidak cocok. Database: Rp${expectedAmount.toLocaleString("id-ID")}, Casaku: Rp${actualAmount.toLocaleString("id-ID")}.`
    );
  }

  const paidAt =
    result.paidAt ||
    fresh.paidAt ||
    new Date().toISOString();

  if (!isSuccessfulStatus(fresh.status)) {
    const patch: Record<string, unknown> = {
      status: "success",
      paymentProvider: "casaku",
      paymentMethod: "qris",
      paymentVerified: true,
      paidAt,
      paidAmount: actualAmount,
      updatedAt: new Date().toISOString(),
    };

    if (result.packageName) {
      patch.paymentPackageName = result.packageName;
    }

    if (result.appName) {
      patch.paymentAppName = result.appName;
    }

    let sanityPatch = paymentSanityClient
      .patch(fresh._id)
      .set(patch);

    if (fresh._rev) {
      sanityPatch =
        sanityPatch.ifRevisionId(fresh._rev);
    }

    try {
      await sanityPatch.commit();
    } catch (error) {
      const after = await getDonationById(fresh._id);

      if (
        !after ||
        !isSuccessfulStatus(after.status)
      ) {
        throw error;
      }
    }
  }

  const updated = await getDonationById(fresh._id);

  if (
    !updated ||
    !isSuccessfulStatus(updated.status) ||
    updated.paymentVerified !== true
  ) {
    throw new Error(
      "Gagal memastikan pembayaran sukses dan terverifikasi di Sanity."
    );
  }

  await syncSupabaseStatus(updated, "success");

  console.log("[CASAKU PAYMENT SUCCESS]", {
    sanityId: updated._id,
    orderId: updated.orderId,
    transactionId: updated.transactionId,
    amount: actualAmount,
    paidAt,
  });
}

// ============================================================================
// MARK PAYMENT FAILED
// ============================================================================

async function markTransactionFailed(
  transaction: DonationTransaction,
  result: CasakuCheckResult
): Promise<void> {
  const fresh = await getDonationById(transaction._id);

  if (!fresh) {
    throw new Error(
      "Transaksi tidak ditemukan."
    );
  }

  if (isSuccessfulStatus(fresh.status)) {
    console.warn(
      "[CASAKU] Status gagal diabaikan karena transaksi sudah sukses:",
      fresh._id
    );

    return;
  }

  const patch: Record<string, unknown> = {
    status: "failed",
    paymentProvider: "casaku",
    paymentMethod: "qris",
    updatedAt: new Date().toISOString(),
  };

  if (result.expiredAt) {
    patch.expiresAt = result.expiredAt;
  }

  let sanityPatch = paymentSanityClient
    .patch(fresh._id)
    .set(patch);

  if (fresh._rev) {
    sanityPatch =
      sanityPatch.ifRevisionId(fresh._rev);
  }

  try {
    await sanityPatch.commit();
  } catch (error) {
    const after = await getDonationById(fresh._id);

    if (
      after &&
      isSuccessfulStatus(after.status)
    ) {
      return;
    }

    throw error;
  }

  const updated = await getDonationById(fresh._id);

  if (
    updated &&
    !isSuccessfulStatus(updated.status)
  ) {
    await syncSupabaseStatus(updated, "failed");
  }
}

// ============================================================================
// CREDIT PROGRAM
// ============================================================================

async function creditProgram(
  transaction: DonationTransaction
): Promise<CreditResult> {
  const fresh = await getDonationById(transaction._id);

  if (!fresh) {
    throw new Error(
      "Transaksi tidak ditemukan saat credit program."
    );
  }

  if (fresh.programCreditedAt) {
    return {
      credited: false,
      reason: "already_credited",
    };
  }

  if (!fresh.programId) {
    return {
      credited: false,
      reason: "no_program_reference",
    };
  }

  const amount = safeNumber(fresh.amount);

  if (amount <= 0) {
    return {
      credited: false,
      reason: "invalid_amount",
    };
  }

  const existingDonor =
    await paymentSanityClient.fetch<boolean>(
      `count(
        *[
          _type == "program" &&
          _id == $programId &&
          count(
            donors[
              (
                defined(orderId) &&
                orderId == $orderId
              ) ||
              (
                defined(transactionId) &&
                transactionId == $transactionId
              )
            ]
          ) > 0
        ]
      ) > 0`,
      {
        programId: fresh.programId,
        orderId: fresh.orderId || "",
        transactionId: fresh.transactionId || "",
      }
    );

  if (existingDonor) {
    let markerPatch = paymentSanityClient
      .patch(fresh._id)
      .set({
        programCreditedAt: new Date().toISOString(),
      });

    if (fresh._rev) {
      markerPatch =
        markerPatch.ifRevisionId(fresh._rev);
    }

    try {
      await markerPatch.commit();
    } catch {
      const after = await getDonationById(fresh._id);

      if (!after?.programCreditedAt) {
        throw new Error(
          "Gagal menyimpan marker kredit program."
        );
      }
    }

    return {
      credited: false,
      reason: "donor_already_exists",
    };
  }

  const donor = {
    _key: randomUUID(),
    _type: "verifiedDonor",

    name:
      cleanText(fresh.donorName, 150) ||
      "Hamba Allah",

    amount,

    date: formatDonationDate(
      fresh.paidAt || new Date().toISOString()
    ),

    orderId: fresh.orderId,
    transactionId: fresh.transactionId,
  };

  if (!fresh._rev) {
    throw new Error(
      "Revision transaksi tidak tersedia."
    );
  }

  try {
    await paymentSanityClient
      .transaction()

      .patch(fresh.programId, (patch) =>
        patch
          .setIfMissing({
            collectedAmount: 0,
            collectedRaw: 0,
            donors: [],
          })
          .inc({
            collectedAmount: amount,
            collectedRaw: amount,
          })
          .append("donors", [donor])
      )

      .patch(fresh._id, (patch) =>
        patch
          .ifRevisionId(fresh._rev!)
          .set({
            programCreditedAt: new Date().toISOString(),
          })
      )

      .commit();

    return {
      credited: true,
      reason: "credited",
    };

  } catch (error) {
    const after = await getDonationById(fresh._id);

    if (after?.programCreditedAt) {
      return {
        credited: false,
        reason: "already_credited",
      };
    }

    throw error;
  }
}

// ============================================================================
// CREDIT FUNDRAISER
// ============================================================================

async function creditFundraiser(
  transaction: DonationTransaction
): Promise<CreditResult> {
  const fresh = await getDonationById(transaction._id);

  if (!fresh) {
    throw new Error(
      "Transaksi tidak ditemukan saat credit fundraiser."
    );
  }

  if (fresh.fundraiserCreditedAt) {
    return {
      credited: false,
      reason: "already_credited",
    };
  }

  const fundraiserPhone = normalizePhone(
    fresh.fundraiserPhone
  );

  if (!fundraiserPhone) {
    return {
      credited: false,
      reason: "no_fundraiser",
    };
  }

  const phone62 = fundraiserPhone.startsWith("0")
    ? `62${fundraiserPhone.slice(1)}`
    : fundraiserPhone;

  const phonePlus62 = `+${phone62}`;

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
        phone0: fundraiserPhone,
        phone62,
        phonePlus62,
      }
    );

  if (!fundraiser) {
    return {
      credited: false,
      reason: "fundraiser_not_found",
    };
  }

  if (
    fundraiser.status &&
    fundraiser.status !== "active"
  ) {
    return {
      credited: false,
      reason: "fundraiser_inactive",
    };
  }

  if (
    Array.isArray(fundraiser.supportedProgramIds) &&
    fundraiser.supportedProgramIds.length > 0 &&
    fresh.programId &&
    !fundraiser.supportedProgramIds.includes(
      fresh.programId
    )
  ) {
    return {
      credited: false,
      reason: "program_not_supported",
    };
  }

  const donationAmount = safeNumber(fresh.amount);

  if (donationAmount <= 0) {
    return {
      credited: false,
      reason: "invalid_amount",
    };
  }

  const feePercentage = Math.max(
    0,
    Math.min(
      100,
      safeNumber(fundraiser.feePercentage)
    )
  );

  const feeAmount = Math.round(
    donationAmount * (feePercentage / 100)
  );

  if (!fresh._rev) {
    throw new Error(
      "Revision transaksi tidak tersedia."
    );
  }

  try {
    await paymentSanityClient
      .transaction()

      .patch(fundraiser._id, (patch) =>
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
      )

      .patch(fresh._id, (patch) =>
        patch
          .ifRevisionId(fresh._rev!)
          .set({
            fundraiserCreditedAt: new Date().toISOString(),
          })
      )

      .commit();

    return {
      credited: true,
      reason: "credited",
      feeAmount,
    };

  } catch (error) {
    const after = await getDonationById(fresh._id);

    if (after?.fundraiserCreditedAt) {
      return {
        credited: false,
        reason: "already_credited",
      };
    }

    throw error;
  }
}

// ============================================================================
// ENSURE DONATION CREDITS
// ============================================================================

export async function ensureDonationCredits(
  transaction: DonationTransaction
) {
  const fresh = await getDonationById(transaction._id);

  if (!fresh) {
    throw new Error(
      "Transaksi tidak ditemukan saat memastikan kredit donasi."
    );
  }

  if (!isSuccessfulStatus(fresh.status)) {
    return {
      program: {
        credited: false,
        reason: "payment_not_success",
      } as CreditResult,

      fundraiser: {
        credited: false,
        reason: "payment_not_success",
      } as CreditResult,
    };
  }

  let program: CreditResult;
  let fundraiser: CreditResult;

  try {
    program = await creditProgram(fresh);
  } catch (error) {
    console.error(
      "[CREDIT PROGRAM ERROR]",
      fresh._id,
      error
    );

    program = {
      credited: false,
      reason: "credit_program_error",
    };
  }

  try {
    const refreshed = await getDonationById(fresh._id);

    if (!refreshed) {
      throw new Error(
        "Transaksi tidak ditemukan saat credit fundraiser."
      );
    }

    fundraiser = await creditFundraiser(refreshed);

  } catch (error) {
    console.error(
      "[CREDIT FUNDRAISER ERROR]",
      fresh._id,
      error
    );

    fundraiser = {
      credited: false,
      reason: "credit_fundraiser_error",
    };
  }

  console.log("[DONATION CREDITS]", {
    orderId: fresh.orderId,
    transactionId: fresh.transactionId,
    program,
    fundraiser,
  });

  return {
    program,
    fundraiser,
  };
}

// ============================================================================
// RECONCILE ONE TRANSACTION
// ============================================================================

export async function reconcileDonation(
  transaction: DonationTransaction
) {
  const fresh = await getDonationById(transaction._id);

  if (!fresh) {
    throw new Error(
      "Transaksi tidak ditemukan di database."
    );
  }

  // SUDAH LUNAS
  if (isSuccessfulStatus(fresh.status)) {
    const credits = await ensureDonationCredits(fresh);

    return {
      status: "success",
      casakuStatus: "paid" as CasakuStatus,
      credits,
      transaction: await getDonationById(fresh._id),
    };
  }

  // ID ASLI CASAKU
  const transactionId = getGatewayTransactionId(fresh);

  if (!transactionId) {
    throw new Error(
      "ID transaksi Casaku tidak ditemukan. Field transactionId kosong."
    );
  }

  // CEK LANGSUNG KE CASAKU
  const casaku = await checkCasakuTransaction(transactionId);

  // PAID
  if (casaku.status === "paid") {
    await markTransactionSuccess(fresh, casaku);

    const paidTransaction =
      await getDonationById(fresh._id);

    if (!paidTransaction) {
      throw new Error(
        "Transaksi tidak ditemukan setelah settlement."
      );
    }

    const credits = await ensureDonationCredits(
      paidTransaction
    );

    return {
      status: "success",
      casakuStatus: casaku.status,
      credits,
      transaction: await getDonationById(fresh._id),
    };
  }

  // EXPIRED / CANCEL
  if (
    casaku.status === "expired" ||
    casaku.status === "cancel"
  ) {
    await markTransactionFailed(fresh, casaku);

    const after = await getDonationById(fresh._id);

    if (after && isSuccessfulStatus(after.status)) {
      const credits = await ensureDonationCredits(after);

      return {
        status: "success",
        casakuStatus: "paid" as CasakuStatus,
        credits,
        transaction: after,
      };
    }

    return {
      status: "failed",
      casakuStatus: casaku.status,
      credits: null,
      transaction: after,
    };
  }

  // PENDING
  return {
    status: "pending",
    casakuStatus: "pending" as CasakuStatus,
    credits: null,
    transaction: fresh,
  };
}

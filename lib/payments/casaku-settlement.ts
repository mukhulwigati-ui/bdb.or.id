
import crypto from "crypto";
import { createClient } from "@sanity/client";
import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";

// ============================================================================
// CONFIG
// ============================================================================

const CASAKU_STATUS_URL =
  "https://api.casaku.id/api/generate/check-status";

const SANITY_TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_TOKEN;

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ks29gg6v";

const dataset = (
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  "production"
).trim();

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
  // Transaksi baru: orderId dan transactionId sama.
  // Transaksi lama: transactionId biasanya berisi ID Casaku.
  return firstText(
    transaction.transactionId,
    transaction.orderId
  );
}

function getLocalOrderIds(
  transaction: DonationTransaction
): string[] {
  return [
    ...new Set(
      [
        cleanText(transaction.orderId, 250),
        cleanText(transaction.transactionId, 250),
      ].filter(Boolean)
    ),
  ];
}

function isSuccessfulStatus(value: unknown): boolean {
  return [
    "success",
    "paid",
    "settlement",
    "completed",
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
// GET DONATION
// ============================================================================

export async function getDonationByOrderId(
  orderId: string
): Promise<DonationTransaction | null> {
  return paymentSanityClient.fetch(
    `*[
      _type == "donationTransaction" &&
      orderId == $orderId
    ][0]{
      ${DONATION_PROJECTION}
    }`,
    { orderId }
  );
}

export async function getDonationByTransactionId(
  transactionId: string
): Promise<DonationTransaction | null> {
  return paymentSanityClient.fetch(
    `*[
      _type == "donationTransaction" &&
      transactionId == $transactionId
    ][0]{
      ${DONATION_PROJECTION}
    }`,
    { transactionId }
  );
}

export async function getDonationById(
  id: string
): Promise<DonationTransaction | null> {
  return paymentSanityClient.fetch(
    `*[
      _type == "donationTransaction" &&
      _id == $id
    ][0]{
      ${DONATION_PROJECTION}
    }`,
    { id }
  );
}

// ============================================================================
// CHECK CASAKU TRANSACTION
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

  const normalizedId = cleanText(
    transactionId,
    250
  );

  if (!normalizedId) {
    throw new Error(
      "ID transaksi Casaku tidak boleh kosong."
    );
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const response = await fetch(
      CASAKU_STATUS_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-license-key": licenseKey,
        },

        body: JSON.stringify({
          transactionId: normalizedId,
        }),

        cache: "no-store",
        signal: controller.signal,
      }
    );

    const raw = await response.text();

    let json: any = null;

    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error(
        `Respons Casaku bukan JSON yang valid: ${raw.slice(0, 300)}`
      );
    }

    if (!response.ok || !json) {
      throw new Error(
        cleanText(json?.message) ||
          `Casaku HTTP ${response.status}: ${raw.slice(0, 300)}`
      );
    }

    if (json.success === false) {
      throw new Error(
        cleanText(json.message) ||
          "Casaku gagal memeriksa transaksi."
      );
    }

    // Mendukung data di dalam data, atau respons langsung.
    const data =
      json?.data &&
      typeof json.data === "object"
        ? json.data
        : json;

    const returnedTransactionId = firstText(
      data.transactionId,
      data.transaction_id,
      data.trx_id,
      data.order_id,
      data.reference_id,
      data.reference,
      data.id
    );

    // Pastikan respons gateway sesuai transaksi yang diperiksa.
    if (
      returnedTransactionId &&
      returnedTransactionId !== normalizedId
    ) {
      throw new Error(
        `ID transaksi Casaku tidak cocok. Diminta: ${normalizedId}, diterima: ${returnedTransactionId}.`
      );
    }

    const rawStatus = firstValue(
      data.status,
      data.paymentStatus,
      data.payment_status,
      data.transactionStatus,
      data.transaction_status,
      json.status
    );

    const returnedAmount = safeNumber(
      firstValue(
        data.totalAmount,
        data.total_amount,
        data.paidAmount,
        data.paid_amount,
        data.amount,
        json.totalAmount,
        json.amount
      )
    );

    const paidAt = firstText(
      data.paidAt,
      data.paid_at,
      data.settlementTime,
      data.settlement_time,
      data.completedAt,
      data.completed_at
    );

    const expiredAt = firstText(
      data.expiredAt,
      data.expired_at,
      data.expiresAt,
      data.expires_at
    );

    const result: CasakuCheckResult = {
      status: normalizeCasakuStatus(rawStatus),

      transactionId: normalizedId,

      amount: returnedAmount,

      paidAt: paidAt || null,

      expiredAt: expiredAt || null,

      packageName: firstText(
        data.packageName,
        data.package_name
      ),

      appName: firstText(
        data.appName,
        data.app_name
      ),
    };

    console.log("[CASAKU STATUS]", {
      transactionId: normalizedId,
      gatewayTransactionId: returnedTransactionId,
      rawStatus,
      normalizedStatus: result.status,
      amount: result.amount,
    });

    return result;

  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "Timeout ketika memeriksa status pembayaran Casaku."
      );
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// SUPABASE MIRROR
// ============================================================================

async function syncSupabaseStatus(
  transaction: DonationTransaction,
  status: "pending" | "success" | "failed"
): Promise<void> {
  const ids = getLocalOrderIds(transaction);

  if (!ids.length) return;

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
      .in("invoice_id", ids);

    if (error) {
      console.error(
        "[CASAKU] Supabase sync gagal:",
        error.message
      );
    } else {
      console.log(
        "[CASAKU] Supabase status diperbarui:",
        { ids, status }
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
  // Ambil dokumen terbaru agar tidak menimpa perubahan proses lain.
  const fresh = await getDonationById(
    transaction._id
  );

  if (!fresh) {
    throw new Error(
      "Transaksi tidak ditemukan di Sanity."
    );
  }

  const currentStatus = normalizeLocalStatus(
    fresh.status
  );

  const expectedAmount = safeNumber(
    fresh.paymentAmount ?? fresh.amount
  );

  // Verifikasi nominal sebelum mengesahkan pembayaran.
  if (
    result.amount > 0 &&
    expectedAmount > 0 &&
    result.amount !== expectedAmount
  ) {
    throw new Error(
      `Nominal pembayaran tidak cocok. Seharusnya Rp${expectedAmount}, Casaku melaporkan Rp${result.amount}.`
    );
  }

  const paidAmount =
    result.amount > 0
      ? result.amount
      : expectedAmount;

  if (paidAmount <= 0) {
    throw new Error(
      "Nominal pembayaran tidak valid."
    );
  }

  const paidAt =
    result.paidAt ||
    fresh.paidAt ||
    new Date().toISOString();

  if (!isSuccessfulStatus(currentStatus)) {
    const patch: Record<string, unknown> = {
      status: "success",

      paymentProvider: "casaku",
      paymentMethod: "qris",

      paymentVerified: true,

      paidAt,
      paidAmount,

      updatedAt: new Date().toISOString(),
    };

    if (result.packageName) {
      patch.paymentPackageName =
        result.packageName;
    }

    if (result.appName) {
      patch.paymentAppName =
        result.appName;
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
      // Bisa terjadi karena proses lain sudah menyelesaikan transaksi.
      const after = await getDonationById(
        fresh._id
      );

      if (!after || !isSuccessfulStatus(after.status)) {
        throw error;
      }
    }
  }

  const updated = await getDonationById(
    fresh._id
  );

  if (!updated || !isSuccessfulStatus(updated.status)) {
    throw new Error(
      "Gagal memastikan status pembayaran di Sanity."
    );
  }

  await syncSupabaseStatus(
    updated,
    "success"
  );
}

// ============================================================================
// MARK PAYMENT FAILED
// ============================================================================

async function markTransactionFailed(
  transaction: DonationTransaction,
  result: CasakuCheckResult
): Promise<void> {
  const fresh = await getDonationById(
    transaction._id
  );

  if (!fresh) {
    throw new Error(
      "Transaksi tidak ditemukan."
    );
  }

  // Jangan pernah menurunkan status transaksi yang sudah lunas.
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
    const after = await getDonationById(
      fresh._id
    );

    if (after && isSuccessfulStatus(after.status)) {
      return;
    }

    throw error;
  }

  const updated = await getDonationById(
    fresh._id
  );

  if (
    updated &&
    !isSuccessfulStatus(updated.status)
  ) {
    await syncSupabaseStatus(
      updated,
      "failed"
    );
  }
}

// ============================================================================
// CREDIT PROGRAM
// ============================================================================

async function creditProgram(
  transaction: DonationTransaction
): Promise<CreditResult> {
  const fresh = await getDonationById(
    transaction._id
  );

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

  // Pastikan donor belum pernah ditambahkan.
  const existingDonor = await paymentSanityClient.fetch<boolean>(
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

  // Jika sudah pernah tercatat, jangan menambah nominal lagi.
  if (existingDonor) {
    let markerPatch = paymentSanityClient
      .patch(fresh._id)
      .set({
        programCreditedAt:
          new Date().toISOString(),
      });

    if (fresh._rev) {
      markerPatch =
        markerPatch.ifRevisionId(fresh._rev);
    }

    try {
      await markerPatch.commit();
    } catch {
      const after = await getDonationById(
        fresh._id
      );

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
    _key: crypto.randomUUID(),
    _type: "verifiedDonor",

    name:
      cleanText(fresh.donorName, 150) ||
      "Hamba Allah",

    amount,

    date: formatDonationDate(
      fresh.paidAt ||
      new Date().toISOString()
    ),

    orderId: fresh.orderId,
    transactionId: fresh.transactionId,
  };

  if (!fresh._rev) {
    throw new Error(
      "Revision transaksi tidak tersedia."
    );
  }

  // Program dan marker transaksi disimpan dalam satu transaksi Sanity.
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
            programCreditedAt:
              new Date().toISOString(),
          })
      )

      .commit();

    return {
      credited: true,
      reason: "credited",
    };

  } catch (error) {
    const after = await getDonationById(
      fresh._id
    );

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
  const fresh = await getDonationById(
    transaction._id
  );

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

  const donationAmount = safeNumber(
    fresh.amount
  );

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
            fundraiserCreditedAt:
              new Date().toISOString(),
          })
      )

      .commit();

    return {
      credited: true,
      reason: "credited",
      feeAmount,
    };

  } catch (error) {
    const after = await getDonationById(
      fresh._id
    );

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
  const fresh = await getDonationById(
    transaction._id
  );

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

  // Program dan fundraiser diproses terpisah.
  // Jika salah satunya gagal, yang lain tetap bisa diselesaikan.
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
    const refreshed = await getDonationById(
      fresh._id
    );

    if (!refreshed) {
      throw new Error(
        "Transaksi tidak ditemukan saat credit fundraiser."
      );
    }

    fundraiser = await creditFundraiser(
      refreshed
    );
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
    transactionId: getGatewayTransactionId(fresh),
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
  const fresh = await getDonationById(
    transaction._id
  );

  if (!fresh) {
    throw new Error(
      "Transaksi tidak ditemukan di database."
    );
  }

  // ========================================================
  // SUDAH LUNAS
  // ========================================================

  if (isSuccessfulStatus(fresh.status)) {
    const credits = await ensureDonationCredits(
      fresh
    );

    return {
      status: "success",
      casakuStatus: "paid" as CasakuStatus,
      credits,
      transaction: await getDonationById(
        fresh._id
      ),
    };
  }

  // ========================================================
  // AMBIL ID GATEWAY
  // ========================================================

  const transactionId =
    getGatewayTransactionId(fresh);

  if (!transactionId) {
    throw new Error(
      "ID transaksi Casaku tidak ditemukan. orderId dan transactionId kosong."
    );
  }

  // ========================================================
  // CEK STATUS LANGSUNG KE CASAKU
  // ========================================================

  const casaku = await checkCasakuTransaction(
    transactionId
  );

  // ========================================================
  // PAID
  // ========================================================

  if (casaku.status === "paid") {
    await markTransactionSuccess(
      fresh,
      casaku
    );

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
      transaction: await getDonationById(
        fresh._id
      ),
    };
  }

  // ========================================================
  // EXPIRED / CANCEL
  // ========================================================

  if (
    casaku.status === "expired" ||
    casaku.status === "cancel"
  ) {
    await markTransactionFailed(
      fresh,
      casaku
    );

    const after = await getDonationById(
      fresh._id
    );

    // Jika pembayaran sudah success oleh proses lain,
    // status success harus tetap dipertahankan.
    if (
      after &&
      isSuccessfulStatus(after.status)
    ) {
      const credits = await ensureDonationCredits(
        after
      );

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

  // ========================================================
  // PENDING
  // ========================================================

  return {
    status: "pending",
    casakuStatus: "pending" as CasakuStatus,
    credits: null,
    transaction: fresh,
  };
}

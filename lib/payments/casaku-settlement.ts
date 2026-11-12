
import crypto from "crypto";
import { createClient } from "@sanity/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// CONSTANTS
// ============================================================================

const CASAKU_STATUS_URL =
  "https://api.casaku.id/api/generate/check-status";

type InternalStatus = "pending" | "success" | "failed";

export type CasakuStatus =
  | "pending"
  | "paid"
  | "expired"
  | "cancel";

// ============================================================================
// TYPES
// ============================================================================

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
// ENVIRONMENT & SANITY
// ============================================================================

function requiredEnv(name: string, value?: string): string {
  const result = value?.trim();

  if (!result) {
    throw new Error(`${name} belum dikonfigurasi.`);
  }

  return result;
}

function getSanityClient() {
  return createClient({
    projectId: requiredEnv(
      "NEXT_PUBLIC_SANITY_PROJECT_ID",
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    ),
    dataset: (
      process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
    ).trim(),
    apiVersion: "2026-08-31",
    useCdn: false,
    token: requiredEnv(
      "SANITY_API_WRITE_TOKEN / SANITY_API_TOKEN",
      process.env.SANITY_API_WRITE_TOKEN ||
        process.env.SANITY_API_TOKEN
    ),
  });
}

// Lazy client: tidak melempar error ketika modul baru diimpor.
export const paymentSanityClient = new Proxy(
  {} as ReturnType<typeof createClient>,
  {
    get(_target, property) {
      const client = getSanityClient();
      const value = Reflect.get(client, property, client);

      return typeof value === "function"
        ? value.bind(client)
        : value;
    },
  }
);

// ============================================================================
// HELPERS
// ============================================================================

function cleanText(value: unknown, maxLength = 500): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeNumber(value: unknown): number {
  const number = Number(value ?? 0);

  return Number.isFinite(number) && number >= 0
    ? number
    : 0;
}

function normalizePhone(value: unknown): string {
  let phone = cleanText(value, 30).replace(/\D/g, "");

  if (phone.startsWith("62")) {
    phone = `0${phone.slice(2)}`;
  }

  return phone;
}

function normalizeCasakuStatus(value: unknown): CasakuStatus {
  const status = cleanText(value, 50).toLowerCase();

  if (
    [
      "paid",
      "success",
      "successful",
      "settlement",
      "settled",
      "completed",
    ].includes(status)
  ) {
    return "paid";
  }

  if (["expired", "expire", "timeout"].includes(status)) {
    return "expired";
  }

  if (
    ["cancel", "cancelled", "canceled", "void"].includes(status)
  ) {
    return "cancel";
  }

  return "pending";
}

function asObject(value: unknown): Record<string, any> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, any>)
    : {};
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

function expectedDonationAmount(
  transaction: DonationTransaction
): number {
  return safeNumber(
    transaction.paymentAmount ?? transaction.amount
  );
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
  "programId": programName->_id,
  "programTitle": programName->title
`;

export async function getDonationByOrderId(
  orderId: string
): Promise<DonationTransaction | null> {
  return getSanityClient().fetch(
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
  return getSanityClient().fetch(
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
  return getSanityClient().fetch(
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
// CHECK CASAKU STATUS
// ============================================================================

export async function checkCasakuTransaction(
  transactionId: string
): Promise<CasakuCheckResult> {
  const licenseKey = requiredEnv(
    "CASAKU_LICENSE_KEY",
    process.env.CASAKU_LICENSE_KEY
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(CASAKU_STATUS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-license-key": licenseKey,
      },
      body: JSON.stringify({ transactionId }),
      cache: "no-store",
      signal: controller.signal,
    });

    const raw = await response.text();

    let json: Record<string, any>;

    try {
      json = asObject(raw ? JSON.parse(raw) : null);
    } catch {
      throw new Error("Respons Casaku bukan JSON yang valid.");
    }

    console.log("[BDB CASAKU SETTLEMENT CHECK]", {
      httpStatus: response.status,
      transactionId,
      response: json,
    });

    if (!response.ok) {
      throw new Error(
        cleanText(json.message) ||
          `Casaku HTTP ${response.status}`
      );
    }

    if (
      json.success === false ||
      cleanText(json.status).toLowerCase() === "error"
    ) {
      throw new Error(
        cleanText(json.message) ||
          "Casaku gagal memeriksa status transaksi."
      );
    }

    const root = asObject(json.data);
    const nested = asObject(root.transaction);
    const data = Object.keys(root).length > 0 ? root : json;

    const returnedTransactionId = cleanText(
      data.transactionId ??
        nested.transactionId ??
        json.transactionId
    );

    if (
      returnedTransactionId &&
      returnedTransactionId !== transactionId
    ) {
      throw new Error("Transaction ID Casaku tidak cocok.");
    }

    const rawStatus =
      data.status ??
      data.transactionStatus ??
      data.paymentStatus ??
      nested.status ??
      json.status;

    const amount = safeNumber(
      data.totalAmount ??
        data.amount ??
        nested.totalAmount ??
        nested.amount ??
        json.totalAmount ??
        json.amount
    );

    return {
      status: normalizeCasakuStatus(rawStatus),
      transactionId,
      amount,
      paidAt:
        cleanText(
          data.paidAt ?? nested.paidAt ?? json.paidAt,
          100
        ) || null,
      expiredAt:
        cleanText(
          data.expiredAt ??
            data.expiresAt ??
            nested.expiredAt ??
            json.expiredAt,
          100
        ) || null,
      packageName: cleanText(
        data.packageName ?? nested.packageName,
        150
      ),
      appName: cleanText(
        data.appName ?? nested.appName,
        150
      ),
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// SUPABASE MIRROR
// ============================================================================

async function syncSupabaseStatus(
  orderId: string | undefined,
  status: InternalStatus
) {
  if (!orderId) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "[BDB CASAKU] Supabase service role belum dikonfigurasi."
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
      .eq("invoice_id", orderId);

    if (error) {
      console.error(
        "[BDB CASAKU SUPABASE SYNC ERROR]",
        error.message
      );
    }
  } catch (error) {
    console.error("[BDB CASAKU SUPABASE ERROR]", error);
  }
}

// ============================================================================
// MARK PAYMENT SUCCESS
// ============================================================================

async function markTransactionSuccess(
  transaction: DonationTransaction,
  result: CasakuCheckResult
) {
  if (result.status !== "paid") {
    throw new Error(
      "Transaksi belum terverifikasi lunas oleh Casaku."
    );
  }

  const expectedAmount = expectedDonationAmount(transaction);

  // Nominal wajib tersedia dan harus sama persis.
  if (
    expectedAmount <= 0 ||
    result.amount <= 0 ||
    result.amount !== expectedAmount
  ) {
    throw new Error(
      `Nominal pembayaran tidak cocok. Expected ${expectedAmount}, received ${result.amount}.`
    );
  }

  const sanity = getSanityClient();
  const fresh = await getDonationById(transaction._id);

  if (!fresh) {
    throw new Error("Transaksi BDB tidak ditemukan.");
  }

  if (fresh.status === "success") {
    await syncSupabaseStatus(fresh.orderId, "success");
    return fresh;
  }

  const paidAt =
    result.paidAt ||
    fresh.paidAt ||
    new Date().toISOString();

  const patch: Record<string, unknown> = {
    status: "success",
    paymentProvider: "casaku",
    paymentMethod: "qris",
    paymentVerified: true,
    paidAt,
    paidAmount: expectedAmount,
    updatedAt: new Date().toISOString(),
  };

  if (result.packageName) {
    patch.paymentPackageName = result.packageName;
  }

  if (result.appName) {
    patch.paymentAppName = result.appName;
  }

  let mutation = sanity.patch(fresh._id).set(patch);

  if (fresh._rev) {
    mutation = mutation.ifRevisionId(fresh._rev);
  }

  await mutation.commit();

  await syncSupabaseStatus(fresh.orderId, "success");

  return getDonationById(fresh._id);
}

// ============================================================================
// MARK FAILED
// ============================================================================

async function markTransactionFailed(
  transaction: DonationTransaction,
  result: CasakuCheckResult
) {
  const sanity = getSanityClient();
  const fresh = await getDonationById(transaction._id);

  if (!fresh || fresh.status === "success") {
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

  let mutation = sanity.patch(fresh._id).set(patch);

  if (fresh._rev) {
    mutation = mutation.ifRevisionId(fresh._rev);
  }

  await mutation.commit();

  await syncSupabaseStatus(fresh.orderId, "failed");
}

// ============================================================================
// CREDIT PROGRAM
// ============================================================================

async function creditProgram(
  transaction: DonationTransaction
): Promise<CreditResult> {
  const sanity = getSanityClient();
  const fresh = await getDonationById(transaction._id);

  if (!fresh) {
    throw new Error("Transaksi tidak ditemukan saat kredit program.");
  }

  if (fresh.status !== "success") {
    return {
      credited: false,
      reason: "payment_not_success",
    };
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

  // Cegah donor ganda jika data donor sudah pernah dimasukkan.
  const donorExists = await sanity.fetch<boolean>(
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
      programId: fresh.programId,
      transactionId: fresh.transactionId || "",
      orderId: fresh.orderId || "",
    }
  );

  if (donorExists) {
    let markerPatch = sanity
      .patch(fresh._id)
      .set({
        programCreditedAt: new Date().toISOString(),
      });

    if (fresh._rev) {
      markerPatch = markerPatch.ifRevisionId(fresh._rev);
    }

    await markerPatch.commit();

    return {
      credited: false,
      reason: "donor_already_exists",
    };
  }

  const donor = {
    _key: crypto.randomUUID(),
    _type: "verifiedDonor",
    name: cleanText(fresh.donorName, 150) || "Hamba Allah",
    amount,
    date: formatDonationDate(
      fresh.paidAt || new Date().toISOString()
    ),
    orderId: fresh.orderId,
    transactionId: fresh.transactionId,
  };

  // Program dan marker transaksi diperbarui dalam satu transaksi Sanity.
  try {
    let transaction = sanity.transaction().patch(
      fresh.programId,
      (patch) =>
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
    );

    transaction = transaction.patch(
      fresh._id,
      (patch) => {
        let next = patch.set({
          programCreditedAt: new Date().toISOString(),
        });

        if (fresh._rev) {
          next = next.ifRevisionId(fresh._rev);
        }

        return next;
      }
    );

    await transaction.commit();

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
  const sanity = getSanityClient();
  const fresh = await getDonationById(transaction._id);

  if (!fresh) {
    throw new Error("Transaksi tidak ditemukan saat kredit fundraiser.");
  }

  if (fresh.status !== "success") {
    return {
      credited: false,
      reason: "payment_not_success",
    };
  }

  if (fresh.fundraiserCreditedAt) {
    return {
      credited: false,
      reason: "already_credited",
    };
  }

  const fundraiserPhone = normalizePhone(fresh.fundraiserPhone);

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
    await sanity.fetch<FundraiserDocument | null>(
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
        "supportedProgramIds": supportedPrograms[]._ref,
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

  if (fundraiser.status && fundraiser.status !== "active") {
    return {
      credited: false,
      reason: "fundraiser_inactive",
    };
  }

  if (
    Array.isArray(fundraiser.supportedProgramIds) &&
    fundraiser.supportedProgramIds.length > 0 &&
    fresh.programId &&
    !fundraiser.supportedProgramIds.includes(fresh.programId)
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
    Math.min(100, safeNumber(fundraiser.feePercentage))
  );

  const feeAmount = Math.round(
    donationAmount * (feePercentage / 100)
  );

  try {
    let transaction = sanity.transaction().patch(
      fundraiser._id,
      (patch) =>
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

    transaction = transaction.patch(
      fresh._id,
      (patch) => {
        let next = patch.set({
          fundraiserCreditedAt: new Date().toISOString(),
        });

        if (fresh._rev) {
          next = next.ifRevisionId(fresh._rev);
        }

        return next;
      }
    );

    await transaction.commit();

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
        feeAmount,
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

  if (!fresh || fresh.status !== "success") {
    const notPaid: CreditResult = {
      credited: false,
      reason: "payment_not_success",
    };

    return {
      program: notPaid,
      fundraiser: notPaid,
    };
  }

  const program = await creditProgram(fresh);

  // Ambil ulang agar marker dan status terbaru digunakan.
  const refreshed = await getDonationById(fresh._id);

  const fundraiser = refreshed
    ? await creditFundraiser(refreshed)
    : {
        credited: false,
        reason: "transaction_not_found",
      };

  return {
    program,
    fundraiser,
  };
}

// ============================================================================
// SETTLE FROM CASAKU WEBHOOK
// ============================================================================

// Jangan percaya nominal/status yang dikirim pemanggil webhook.
// Periksa ulang transaksi langsung ke API Casaku sebelum settlement.

export async function settleCasakuWebhook({
  transactionId,
  amount,
}: {
  transactionId: string;
  amount?: number;
  packageName?: string;
  appName?: string;
  paidAt?: string | null;
}) {
  const transaction =
    await getDonationByTransactionId(transactionId);

  if (!transaction) {
    throw new Error("Transaksi BDB tidak ditemukan.");
  }

  const casaku = await checkCasakuTransaction(transactionId);

  if (casaku.status !== "paid") {
    throw new Error(
      `Casaku belum mengonfirmasi pembayaran. Status: ${casaku.status}`
    );
  }

  const expectedAmount = expectedDonationAmount(transaction);

  if (
    expectedAmount <= 0 ||
    casaku.amount <= 0 ||
    casaku.amount !== expectedAmount
  ) {
    throw new Error("Nominal pembayaran tidak cocok.");
  }

  // Jika webhook mengirim nominal, cocokkan juga.
  if (
    amount !== undefined &&
    safeNumber(amount) !== expectedAmount
  ) {
    throw new Error("Nominal webhook tidak cocok.");
  }

  await markTransactionSuccess(transaction, casaku);

  const refreshed = await getDonationById(transaction._id);

  if (!refreshed) {
    throw new Error("Gagal membaca transaksi setelah settlement.");
  }

  const credits = await ensureDonationCredits(refreshed);

  return {
    success: true,
    transaction: await getDonationById(transaction._id),
    credits,
  };
}

// ============================================================================
// RECONCILE ONE TRANSACTION
// ============================================================================

export async function reconcileDonation(
  transaction: DonationTransaction
) {
  // Selalu ambil data terbaru. Jangan mengandalkan object lama
  // yang mungkin belum memiliki marker kredit.
  const fresh = await getDonationById(transaction._id);

  if (!fresh) {
    throw new Error("Transaksi BDB tidak ditemukan.");
  }

  // Jika sudah sukses, lanjutkan proses kredit yang belum selesai.
  if (fresh.status === "success") {
    await syncSupabaseStatus(fresh.orderId, "success");

    const credits = await ensureDonationCredits(fresh);

    return {
      status: "success",
      casakuStatus: "paid" as CasakuStatus,
      credits,
      transaction: await getDonationById(fresh._id),
    };
  }

  const transactionId = cleanText(fresh.transactionId, 250);

  if (!transactionId) {
    throw new Error("transactionId Casaku tidak ditemukan.");
  }

  const casaku = await checkCasakuTransaction(transactionId);

  // PAID
  if (casaku.status === "paid") {
    await markTransactionSuccess(fresh, casaku);

    const paidTransaction = await getDonationById(fresh._id);

    if (!paidTransaction) {
      throw new Error("Transaksi tidak ditemukan setelah settlement.");
    }

    const credits = await ensureDonationCredits(paidTransaction);

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

    return {
      status: "failed",
      casakuStatus: casaku.status,
      credits: null,
      transaction: await getDonationById(fresh._id),
    };
  }

  // PENDING
  await syncSupabaseStatus(fresh.orderId, "pending");

  return {
    status: "pending",
    casakuStatus: "pending" as CasakuStatus,
    credits: null,
    transaction: fresh,
  };
}

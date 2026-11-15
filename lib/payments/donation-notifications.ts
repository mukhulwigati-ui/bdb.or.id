// lib/payments/donation-notifications.ts

import { createClient } from "@sanity/client";
import crypto from "node:crypto";

// ============================================================================
// TYPES
// ============================================================================

interface Donation {
  _id: string;
  _rev?: string;

  orderId?: string;
  donorName?: string;
  donorPhone?: string;
  donorEmail?: string;

  amount?: number;
  programTitle?: string;
  paidAt?: string | null;

  status?: string;
  paymentVerified?: boolean;

  whatsappSentAt?: string;
  whatsappSendingAt?: string;

  googleSheetLoggedAt?: string;
  googleSheetSendingAt?: string;
}

type NotificationChannel =
  | "whatsapp"
  | "google_sheets";

interface ChannelResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

// ============================================================================
// CONFIG
// ============================================================================

const CLAIM_TIMEOUT_MS = 15 * 60 * 1000;

function getSanityClient() {
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();

  const dataset = (
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    "production"
  ).trim();

  const token =
    process.env.SANITY_API_WRITE_TOKEN?.trim() ||
    process.env.SANITY_API_TOKEN?.trim();

  if (!projectId || !token) {
    throw new Error(
      "Konfigurasi Sanity belum lengkap untuk notifikasi donasi."
    );
  }

  return createClient({
    projectId,
    dataset,
    apiVersion: "2026-08-31",
    useCdn: false,
    token,
  });
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

function safeAmount(value: unknown): number {
  const amount = Number(value ?? 0);

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Nominal donasi tidak valid untuk notifikasi."
    );
  }

  return amount;
}

function normalizePhone(value: unknown): string {
  let phone = cleanText(value, 30).replace(/\D/g, "");

  if (!phone) return "";

  if (phone.startsWith("0")) {
    phone = `62${phone.slice(1)}`;
  } else if (phone.startsWith("8")) {
    phone = `62${phone}`;
  }

  return phone;
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPaidDate(value?: string): string {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date());
  }

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function isRecentClaim(value?: string): boolean {
  if (!value) return false;

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) return false;

  return Date.now() - timestamp < CLAIM_TIMEOUT_MS;
}

function getChannelFields(channel: NotificationChannel) {
  if (channel === "whatsapp") {
    return {
      sent: "whatsappSentAt",
      sending: "whatsappSendingAt",
    } as const;
  }

  return {
    sent: "googleSheetLoggedAt",
    sending: "googleSheetSendingAt",
  } as const;
}

// ============================================================================
// GET FRESH DONATION
// ============================================================================

async function getFreshDonation(
  id: string
): Promise<Donation | null> {
  const sanity = getSanityClient();

  return sanity.fetch<Donation | null>(
    `*[
      _type == "donationTransaction" &&
      _id == $id
    ][0]{
      _id,
      _rev,

      orderId,
      donorName,
      donorPhone,
      donorEmail,

      amount,
      paidAt,

      status,
      paymentVerified,

      "programTitle": programName->title,

      whatsappSentAt,
      whatsappSendingAt,

      googleSheetLoggedAt,
      googleSheetSendingAt
    }`,
    { id }
  );
}

// ============================================================================
// CLAIM NOTIFICATION
// ============================================================================

/**
 * Mengunci satu channel notifikasi menggunakan revision Sanity.
 *
 * Dua proses bersamaan tidak dapat mengambil revision yang sama.
 * Claim yang sudah terlalu lama dapat diambil kembali.
 */

async function claimNotification(
  donationId: string,
  channel: NotificationChannel
): Promise<Donation | null> {
  const sanity = getSanityClient();
  const fields = getChannelFields(channel);

  const fresh = await getFreshDonation(donationId);

  if (!fresh || !fresh._rev) {
    return null;
  }

  if (
    fresh.status !== "success" ||
    fresh.paymentVerified !== true
  ) {
    return null;
  }

  if (fresh[fields.sent]) {
    return null;
  }

  if (isRecentClaim(fresh[fields.sending])) {
    return null;
  }

  const now = new Date().toISOString();

  try {
    await sanity
      .patch(fresh._id)
      .ifRevisionId(fresh._rev)
      .set({
        [fields.sending]: now,
        updatedAt: now,
      })
      .commit();

    return await getFreshDonation(fresh._id);

  } catch (error) {
    console.warn(
      `[BDB NOTIFICATION] Claim ${channel} gagal atau sudah diambil proses lain.`,
      fresh.orderId,
      error
    );

    return null;
  }
}

// ============================================================================
// COMPLETE NOTIFICATION
// ============================================================================

async function completeNotification(
  donationId: string,
  channel: NotificationChannel
): Promise<void> {
  const sanity = getSanityClient();
  const fields = getChannelFields(channel);

  await sanity
    .patch(donationId)
    .set({
      [fields.sent]: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .unset([fields.sending])
    .commit();
}

// ============================================================================
// RELEASE NOTIFICATION CLAIM
// ============================================================================

async function releaseNotification(
  donationId: string,
  channel: NotificationChannel
): Promise<void> {
  const sanity = getSanityClient();
  const fields = getChannelFields(channel);

  try {
    await sanity
      .patch(donationId)
      .unset([fields.sending])
      .set({
        updatedAt: new Date().toISOString(),
      })
      .commit();

  } catch (error) {
    console.error(
      `[BDB NOTIFICATION] Gagal melepas claim ${channel}.`,
      donationId,
      error
    );
  }
}

// ============================================================================
// GOOGLE SERVICE ACCOUNT JWT
// ============================================================================

function base64url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

let cachedGoogleToken = "";
let googleTokenExpiresAt = 0;

async function getGoogleAccessToken(): Promise<string> {
  if (
    cachedGoogleToken &&
    Date.now() < googleTokenExpiresAt - 60_000
  ) {
    return cachedGoogleToken;
  }

  const email = cleanText(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  );

  const privateKey = cleanText(
    process.env.GOOGLE_PRIVATE_KEY,
    10000
  )
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL atau GOOGLE_PRIVATE_KEY belum dikonfigurasi."
    );
  }

  const now = Math.floor(Date.now() / 1000);

  const header = base64url(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
    })
  );

  const payload = base64url(
    JSON.stringify({
      iss: email,
      scope:
        "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  const unsignedToken = `${header}.${payload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign(
    privateKey,
    "base64url"
  );

  const assertion =
    `${unsignedToken}.${signature}`;

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      cache: "no-store",
    }
  );

  const result = await response.json();

  if (!response.ok || !result.access_token) {
    throw new Error(
      result.error_description ||
      result.error ||
      "Gagal mendapatkan akses Google Sheets."
    );
  }

  cachedGoogleToken = result.access_token;

  googleTokenExpiresAt =
    Date.now() +
    Number(result.expires_in || 3600) * 1000;

  return cachedGoogleToken;
}

// ============================================================================
// GOOGLE SHEETS HELPERS
// ============================================================================

function getGoogleSheetConfig() {
  const sheetId = cleanText(
    process.env.GOOGLE_SHEET_ID
  );

  const sheetTab = cleanText(
    process.env.GOOGLE_SHEET_TAB || "Sheet1",
    100
  );

  if (!sheetId) {
    throw new Error(
      "GOOGLE_SHEET_ID belum dikonfigurasi."
    );
  }

  return {
    sheetId,
    sheetTab,
  };
}

async function googleSheetsRequest(
  url: string,
  token: string,
  init?: RequestInit
): Promise<any> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const raw = await response.text();

  let result: any;

  try {
    result = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      "Respons Google Sheets bukan JSON valid."
    );
  }

  if (!response.ok) {
    throw new Error(
      result?.error?.message ||
      `Google Sheets HTTP ${response.status}.`
    );
  }

  return result;
}

// ============================================================================
// SAVE DONATION TO GOOGLE SHEETS
// ============================================================================

async function saveToGoogleSheets(
  donation: Donation
): Promise<void> {
  const { sheetId, sheetTab } =
    getGoogleSheetConfig();

  const orderId = cleanText(donation.orderId, 250);

  if (!orderId) {
    throw new Error(
      "Order ID kosong. Google Sheets tidak dapat diperbarui."
    );
  }

  const amount = safeAmount(donation.amount);
  const token = await getGoogleAccessToken();

  const baseUrl =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values`;

  const sheetName = encodeURIComponent(sheetTab);

  // --------------------------------------------------------------------------
  // PERIKSA ORDER ID DI KOLOM B
  // --------------------------------------------------------------------------

  const checkUrl =
    `${baseUrl}/${sheetName}%21B%3AB`;

  const checkResult = await googleSheetsRequest(
    checkUrl,
    token
  );

  const existingOrderIds: string[] = (
    checkResult.values || []
  ).flat().map((value: unknown) => String(value));

  if (existingOrderIds.includes(orderId)) {
    console.log(
      "[BDB SHEETS] Order ID sudah tercatat.",
      orderId
    );

    return;
  }

  // --------------------------------------------------------------------------
  // DATA SESUAI ENAM KOLOM GOOGLE SHEETS
  // --------------------------------------------------------------------------

  const row = [
    formatPaidDate(donation.paidAt),
    orderId,
    cleanText(donation.donorName, 150) ||
      "Hamba Allah",
    normalizePhone(donation.donorPhone),
    amount,
    cleanText(donation.programTitle, 250) ||
      "Donasi Umum",
  ];

  const appendUrl =
    `${baseUrl}/${sheetName}%21A%3AF:append` +
    `?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

  await googleSheetsRequest(
    appendUrl,
    token,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        majorDimension: "ROWS",
        values: [row],
      }),
    }
  );

  console.log(
    "[BDB SHEETS] Donasi berhasil dicatat.",
    orderId
  );
}

// ============================================================================
// FONNTE WHATSAPP
// ============================================================================

async function sendFonnteMessage(
  donation: Donation
): Promise<void> {
  const token = cleanText(
    process.env.FONNTE_TOKEN
  );

  const target = normalizePhone(
    donation.donorPhone
  );

  if (!token) {
    throw new Error(
      "FONNTE_TOKEN belum dikonfigurasi."
    );
  }

  if (!target) {
    throw new Error(
      "Nomor WhatsApp donatur tidak tersedia atau tidak valid."
    );
  }

  const amount = safeAmount(donation.amount);

  const donorName =
    cleanText(donation.donorName, 150) ||
    "Hamba Allah";

  const programTitle =
    cleanText(donation.programTitle, 250) ||
    "Donasi Umum";

  const orderId = cleanText(
    donation.orderId,
    250
  );

  const message = [
    "Assalamu'alaikum warahmatullahi wabarakatuh.",
    "",
    `Alhamdulillah, donasi Anda sebesar Rp${formatRupiah(amount)} telah kami terima melalui BDB.or.id.`,
    "",
    `Nama Donatur: ${donorName}`,
    `Program Donasi: ${programTitle}`,
    `Order ID: ${orderId}`,
    "",
    "Terima kasih atas kepercayaan dan kebaikan Anda.",
    "",
    "Semoga Allah menerima amal ibadah ini, melipatgandakan pahala, melapangkan rezeki, serta menjadikannya amal jariyah yang terus mengalir.",
    "",
    "Jazakumullahu khairan katsiran.",
    "",
    "Salam hangat,",
    "Tim BDB.or.id",
  ].join("\n");

  const response = await fetch(
    "https://api.fonnte.com/send",
    {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        target,
        message,
        countryCode: "62",
      }),
      cache: "no-store",
    }
  );

  const raw = await response.text();

  let result: any;

  try {
    result = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      "Respons Fonnte bukan JSON valid."
    );
  }

  if (
    !response.ok ||
    result?.status === false ||
    result?.status === "false"
  ) {
    throw new Error(
      result?.reason ||
      result?.message ||
      `Fonnte HTTP ${response.status}.`
    );
  }

  console.log(
    "[BDB FONNTE] Permintaan pengiriman diterima.",
    {
      orderId,
      target,
      detail: result?.detail || null,
    }
  );
}

// ============================================================================
// PROCESS ONE CHANNEL
// ============================================================================

async function processChannel(
  donation: Donation,
  channel: NotificationChannel
): Promise<ChannelResult> {
  const claimed = await claimNotification(
    donation._id,
    channel
  );

  if (!claimed) {
    return {
      success: false,
      skipped: true,
      reason:
        "Sudah terkirim, sedang diproses, atau transaksi belum memenuhi syarat.",
    };
  }

  try {
    if (channel === "whatsapp") {
      await sendFonnteMessage(claimed);
    } else {
      await saveToGoogleSheets(claimed);
    }

    await completeNotification(
      claimed._id,
      channel
    );

    return {
      success: true,
    };

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      `[BDB NOTIFICATION ERROR] ${channel}`,
      {
        orderId: claimed.orderId,
        sanityId: claimed._id,
        message,
      }
    );

    await releaseNotification(
      claimed._id,
      channel
    );

    return {
      success: false,
      error: message,
    };
  }
}

// ============================================================================
// MAIN: SEND DONATION NOTIFICATIONS
// ============================================================================

export async function sendDonationNotifications(
  donation: Donation
): Promise<{
  whatsapp: ChannelResult;
  googleSheets: ChannelResult;
}> {
  const skipped: ChannelResult = {
    success: false,
    skipped: true,
    reason: "Pembayaran belum terverifikasi.",
  };

  if (
    !donation?._id ||
    donation.status !== "success" ||
    donation.paymentVerified !== true
  ) {
    return {
      whatsapp: skipped,
      googleSheets: skipped,
    };
  }

  const fresh = await getFreshDonation(
    donation._id
  );

  if (
    !fresh ||
    fresh.status !== "success" ||
    fresh.paymentVerified !== true
  ) {
    return {
      whatsapp: skipped,
      googleSheets: skipped,
    };
  }

  // Kedua channel dijalankan terpisah.
  // Kegagalan salah satu tidak menghentikan channel lainnya.

  const [whatsapp, googleSheets] =
    await Promise.all([
      processChannel(fresh, "whatsapp"),
      processChannel(fresh, "google_sheets"),
    ]);

  console.log("[BDB DONATION NOTIFICATIONS]", {
    orderId: fresh.orderId,
    whatsapp,
    googleSheets,
  });

  return {
    whatsapp,
    googleSheets,
  };
}

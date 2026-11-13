
import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { Casaku } from "casaku";

// ============================================================================
// ROUTE CONFIG
// ============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

// ============================================================================
// PAYMENT CONFIG
// ============================================================================

const CASAKU_EXPIRED_MINUTES = 15;
const CASAKU_PREFIX = "BDB";

const CASAKU_PACKAGE_IDS = ["id.dana"];

// ============================================================================
// SANITY CONFIG
// ============================================================================

const SANITY_TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_TOKEN;

function getSanityClient() {
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();

  const dataset =
    process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() ||
    "production";

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

  return createClient({
    projectId,
    dataset,
    useCdn: false,
    apiVersion: "2026-08-31",
    token: SANITY_TOKEN,
  });
}

// ============================================================================
// TYPES
// ============================================================================

interface DonateRequestBody {
  donorName?: string;
  amount?: number | string;

  programId?: string;
  programTitle?: string;

  phone?: string;
  email?: string;
  donorEmail?: string;

  fundraiserPhone?: string | null;
  category?: string;
  slug?: string;
}

interface CasakuGenerateData {
  transactionId: string;

  originalAmount: number;
  totalAmount: number;
  uniqueNominal: number;

  packageIds: string[];
  expiredInMinutes: number;

  qrType: "dynamic" | "static";
  paymentMethod: "qris" | "ewallet";
  useQris: boolean;

  qr_string?: string;
  status: "pending" | "paid" | "cancel" | "expired";

  createdAt?: string;
  expiredAt?: string;
}

interface CasakuGenerateResult {
  transactionId: string;
  originalAmount: number;
  totalAmount: number;
  uniqueNominal: number;
  qrString: string;
  status: string;
  createdAt: string;
  expiredAt: string;
  expiredInMinutes: number;
  raw: CasakuGenerateData;
}

// ============================================================================
// HELPERS
// ============================================================================

function cleanAmountValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0
      ? value
      : 0;
  }

  const cleaned = String(value ?? "")
    .replace(/[^0-9]/g, "");

  const amount = Number(cleaned);

  return Number.isSafeInteger(amount) && amount > 0
    ? amount
    : 0;
}

function cleanText(
  value: unknown,
  maxLength = 255
): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function normalizePhone(value: unknown): string {
  return String(value ?? "")
    .replace(/[^0-9]/g, "");
}

function getFirstText(...values: unknown[]): string {
  for (const value of values) {
    const result = cleanText(value, 10000);

    if (result) {
      return result;
    }
  }

  return "";
}

function isValidPaymentStatus(
  value: unknown
): value is "pending" | "paid" | "cancel" | "expired" {
  return [
    "pending",
    "paid",
    "cancel",
    "expired",
  ].includes(
    cleanText(value, 50).toLowerCase()
  );
}

function getExpiryDate(
  createdAt: string,
  expiredAt: string | undefined,
  expiredInMinutes: number
): string {
  if (expiredAt) {
    const parsed = new Date(expiredAt);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const created = new Date(createdAt);

  const baseDate = Number.isNaN(created.getTime())
    ? new Date()
    : created;

  return new Date(
    baseDate.getTime() +
      expiredInMinutes * 60 * 1000
  ).toISOString();
}

// ============================================================================
// GENERATE INTERNAL ORDER ID
// ============================================================================

function generateOrderId(): string {
  const timestamp = Date.now();

  const uniqueId = randomUUID()
    .replace(/-/g, "")
    .slice(0, 12)
    .toUpperCase();

  return `${CASAKU_PREFIX}-${timestamp}-${uniqueId}`;
}

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

function getRequiredEnvironment() {
  const licenseKey =
    process.env.CASAKU_LICENSE_KEY?.trim();

  const qrisId =
    process.env.CASAKU_QRIS_ID?.trim();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!licenseKey) {
    throw new Error(
      "CASAKU_LICENSE_KEY belum dikonfigurasi."
    );
  }

  if (!qrisId) {
    throw new Error(
      "CASAKU_QRIS_ID belum dikonfigurasi."
    );
  }

  if (!SANITY_TOKEN) {
    throw new Error(
      "SANITY_API_WRITE_TOKEN atau SANITY_API_TOKEN belum dikonfigurasi."
    );
  }

  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim()) {
    throw new Error(
      "NEXT_PUBLIC_SANITY_PROJECT_ID belum dikonfigurasi."
    );
  }

  return {
    licenseKey,
    qrisId,
    supabaseUrl,
    supabaseAnonKey,
  };
}

// ============================================================================
// CASAKU - CREATE QRIS TRANSACTION USING OFFICIAL SDK
// ============================================================================

async function createCasakuTransaction({
  licenseKey,
  qrisId,
  amount,
}: {
  licenseKey: string;
  qrisId: string;
  amount: number;
}): Promise<CasakuGenerateResult> {
  try {
    const casaku = new Casaku({
      licenseKey,
    });

    // Gunakan SDK resmi Casaku.
    // Parameter mengikuti dokumentasi generateQRISv2.
    const response = await casaku.generateQRISv2({
      qr_id: qrisId,
      amount,

      useUniqueCode: true,

      packageIds: CASAKU_PACKAGE_IDS,

      expiredInMinutes: CASAKU_EXPIRED_MINUTES,

      qrType: "dynamic",
      paymentMethod: "qris",
      useQris: true,

      prefix: CASAKU_PREFIX,
    });

    // Status ini adalah status respons API,
    // BUKAN status pembayaran.
    if (response.status !== 200) {
      throw new Error(
        `Casaku API mengembalikan status ${response.status}.`
      );
    }

    const data = response.data as CasakuGenerateData;

    if (!data || typeof data !== "object") {
      throw new Error(
        "Casaku tidak mengembalikan data transaksi."
      );
    }

    // ID transaksi yang diberikan oleh Casaku.
    const transactionId = cleanText(
      data.transactionId,
      250
    );

    if (!transactionId) {
      console.error(
        "[CASAKU CREATE] transactionId kosong:",
        data
      );

      throw new Error(
        "Casaku tidak mengembalikan transactionId."
      );
    }

    // QRIS string dari SDK.
    const qrString = cleanText(
      data.qr_string,
      10000
    );

    if (!qrString) {
      console.error(
        "[CASAKU CREATE] qr_string kosong:",
        data
      );

      throw new Error(
        "Casaku tidak mengembalikan qr_string."
      );
    }

    // Nominal awal harus sama dengan nominal yang diminta.
    const originalAmount = Number(
      data.originalAmount
    );

    if (
      !Number.isFinite(originalAmount) ||
      originalAmount !== amount
    ) {
      throw new Error(
        `Nominal awal Casaku tidak cocok. Diminta Rp${amount}, dikembalikan Rp${originalAmount}.`
      );
    }

    // totalAmount termasuk kode unik jika digunakan.
    const totalAmount = Number(
      data.totalAmount
    );

    if (
      !Number.isSafeInteger(totalAmount) ||
      totalAmount <= 0 ||
      totalAmount < originalAmount
    ) {
      console.error(
        "[CASAKU CREATE] totalAmount tidak valid:",
        data
      );

      throw new Error(
        "Casaku mengembalikan totalAmount yang tidak valid."
      );
    }

    const uniqueNominal = Number(
      data.uniqueNominal ?? 0
    );

    if (
      !Number.isFinite(uniqueNominal) ||
      uniqueNominal < 0
    ) {
      throw new Error(
        "Casaku mengembalikan uniqueNominal yang tidak valid."
      );
    }

    // Status pembayaran berasal dari data.status.
    const status = cleanText(
      data.status,
      50
    ).toLowerCase();

    if (!isValidPaymentStatus(status)) {
      throw new Error(
        `Status transaksi Casaku tidak dikenal: ${status || "(kosong)"}.`
      );
    }

    const createdAt =
      getFirstText(data.createdAt) ||
      new Date().toISOString();

    const expiredInMinutes = Number(
      data.expiredInMinutes ??
      CASAKU_EXPIRED_MINUTES
    );

    if (
      !Number.isFinite(expiredInMinutes) ||
      expiredInMinutes <= 0
    ) {
      throw new Error(
        "Masa berlaku transaksi Casaku tidak valid."
      );
    }

    const expiredAt = getExpiryDate(
      createdAt,
      data.expiredAt,
      expiredInMinutes
    );

    console.log(
      "[CASAKU CREATE SUCCESS]",
      {
        transactionId,
        originalAmount,
        totalAmount,
        uniqueNominal,
        status,
        createdAt,
        expiredAt,
      }
    );

    return {
      transactionId,
      originalAmount,
      totalAmount,
      uniqueNominal,
      qrString,
      status,
      createdAt,
      expiredAt,
      expiredInMinutes,
      raw: data,
    };

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "[CASAKU CREATE ERROR]",
      message
    );

    throw new Error(
      `Gagal membuat QRIS Casaku: ${message}`
    );
  }
}

// ============================================================================
// SUPABASE SESSION
// ============================================================================

async function getSupabaseSessionClient(
  supabaseUrl: string | undefined,
  supabaseAnonKey: string | undefined
): Promise<{
  client: SupabaseClient | null;
  userId: string | null;
}> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[DONATE] Konfigurasi Supabase SSR tidak lengkap."
    );

    return {
      client: null,
      userId: null,
    };
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },

          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(
                ({ name, value, options }) => {
                  cookieStore.set(
                    name,
                    value,
                    options
                  );
                }
              );
            } catch {
              // Cookie tidak dapat ditulis pada sebagian konteks.
              // Tidak menggagalkan pembuatan transaksi.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.warn(
        "[DONATE] Gagal membaca user Supabase:",
        error.message
      );
    }

    return {
      client: supabase,
      userId: user?.id || null,
    };

  } catch (error) {
    console.error(
      "[DONATE] Supabase session error:",
      error
    );

    return {
      client: null,
      userId: null,
    };
  }
}

// ============================================================================
// VALIDATE PROGRAM IN SANITY
// ============================================================================

async function validateProgram(
  sanityClient: ReturnType<typeof createClient>,
  programId: string
): Promise<{
  id: string;
  title: string;
}> {
  const program =
    await sanityClient.fetch<{
      _id: string;
      title?: string;
    } | null>(
      `*[
        _type == "program" &&
        _id == $programId
      ][0]{
        _id,
        title
      }`,
      {
        programId,
      }
    );

  if (!program) {
    throw new Error(
      "Program donasi tidak ditemukan atau ID program tidak valid."
    );
  }

  return {
    id: program._id,
    title: cleanText(program.title, 200),
  };
}

// ============================================================================
// POST /api/donate
// ============================================================================

export async function POST(request: Request) {
  try {
    // ========================================================
    // 1. VALIDASI ENVIRONMENT
    // ========================================================

    const {
      licenseKey,
      qrisId,
      supabaseUrl,
      supabaseAnonKey,
    } = getRequiredEnvironment();

    const sanityClient = getSanityClient();

    // ========================================================
    // 2. BACA REQUEST BODY
    // ========================================================

    let body: DonateRequestBody;

    try {
      body = (await request.json()) as DonateRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Payload transaksi tidak valid.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // 3. VALIDASI NOMINAL
    // ========================================================

    const cleanAmount = cleanAmountValue(
      body.amount
    );

    if (
      cleanAmount < 1000 ||
      cleanAmount > 10_000_000
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            cleanAmount < 1000
              ? "Nominal donasi minimal Rp 1.000."
              : "Nominal transaksi QRIS maksimal Rp 10.000.000.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // 4. NORMALISASI DATA DONATUR
    // ========================================================

    const normalizedDonorName =
      cleanText(body.donorName, 150) ||
      "Hamba Allah";

    const normalizedPhone =
      normalizePhone(body.phone);

    const normalizedEmail = cleanText(
      body.donorEmail || body.email,
      200
    );

    const normalizedProgramId =
      cleanText(body.programId, 200);

    const normalizedProgramTitle =
      cleanText(body.programTitle, 200) ||
      "Sedekah Umum";

    const normalizedCategory =
      cleanText(body.category, 100) ||
      "Kemanusiaan";

    const normalizedFundraiserPhone =
      normalizePhone(body.fundraiserPhone);

    const normalizedSlug =
      cleanText(body.slug, 300);

    // ========================================================
    // 5. VALIDASI WHATSAPP
    // ========================================================

    const isValidPhoneFormat =
      normalizedPhone.length >= 9 &&
      normalizedPhone.length <= 15 &&
      (
        normalizedPhone.startsWith("0") ||
        normalizedPhone.startsWith("62") ||
        normalizedPhone.startsWith("8")
      );

    if (!isValidPhoneFormat) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nomor WhatsApp wajib diisi dengan benar.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // 6. VALIDASI PROGRAM
    // ========================================================

    if (!normalizedProgramId) {
      return NextResponse.json(
        {
          success: false,
          message: "Program donasi tidak ditemukan.",
        },
        { status: 400 }
      );
    }

    const program = await validateProgram(
      sanityClient,
      normalizedProgramId
    );

    const finalProgramTitle =
      program.title || normalizedProgramTitle;

    // ========================================================
    // 7. AMBIL USER SUPABASE
    // ========================================================

    const {
      client: supabase,
      userId,
    } = await getSupabaseSessionClient(
      supabaseUrl,
      supabaseAnonKey
    );

    // ========================================================
    // 8. GENERATE QRIS CASAKU
    // ========================================================

    const casaku = await createCasakuTransaction({
      licenseKey,
      qrisId,
      amount: cleanAmount,
    });

    // ========================================================
    // 9. BUAT ID INTERNAL WEBSITE
    // ========================================================

    // orderId adalah ID transaksi milik website.
    // transactionId adalah ID transaksi asli dari Casaku.
    // Keduanya tidak boleh disamakan.

    const orderId = generateOrderId();

    const transactionId = casaku.transactionId;

    const now = new Date().toISOString();

    console.log(
      "[DONATE] TRANSACTION IDENTIFIERS",
      {
        orderId,
        transactionId,
        sanityProgramId: program.id,
      }
    );

    // ========================================================
    // 10. SIMPAN KE SANITY
    // ========================================================

    // PENTING:
    // amount        = nominal donasi awal.
    // paymentAmount = totalAmount dari Casaku, termasuk kode unik.
    //
    // Settlement membandingkan Casaku amount dengan paymentAmount.

    const sanityTransaction =
      await sanityClient.create({
        _type: "donationTransaction",

        orderId,
        transactionId,

        donorName: normalizedDonorName,
        donorPhone: normalizedPhone,
        donorEmail: normalizedEmail,

        amount: casaku.originalAmount,
        paymentAmount: casaku.totalAmount,

        fundraiserPhone:
          normalizedFundraiserPhone,

        programName: {
          _type: "reference",
          _ref: program.id,
        },

        status: "pending",

        paymentProvider: "casaku",
        paymentMethod: "qris",

        paymentVerified: false,

        qrString: casaku.qrString,
        paymentUrl: "",

        expiresAt: casaku.expiredAt,

        createdAt: now,
        updatedAt: now,

        campaignSlug: normalizedSlug,
      });

    console.log(
      "[DONATE] SANITY CREATED",
      {
        sanityId: sanityTransaction._id,
        orderId,
        transactionId,
        amount: casaku.originalAmount,
        paymentAmount: casaku.totalAmount,
      }
    );

    // ========================================================
    // 11. SINKRONKAN KE SUPABASE
    // ========================================================

    if (supabase) {
      try {
        const {
          error: supabaseError,
        } = await supabase
          .from("donations")
          .insert([
            {
              user_id: userId,

              donor_name:
                normalizedDonorName,

              program_name:
                finalProgramTitle,

              category:
                normalizedCategory,

              amount:
                casaku.originalAmount,

              status: "pending",

              payment_url: "",

              // invoice_id selalu menggunakan orderId internal.
              invoice_id: orderId,
            },
          ]);

        if (supabaseError) {
          console.error(
            "[DONATE] SUPABASE INSERT ERROR",
            {
              orderId,
              message: supabaseError.message,
              code: supabaseError.code,
            }
          );
        } else {
          console.log(
            "[DONATE] SUPABASE INSERT SUCCESS",
            orderId
          );
        }

      } catch (error) {
        console.error(
          "[DONATE] SUPABASE SYNC ERROR",
          error
        );
      }
    }

    // ========================================================
    // 12. RESPONS KE FRONTEND
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        provider: "casaku",

        // ID internal website.
        orderId,

        // ID asli Casaku.
        transactionId,

        // Nominal donasi awal.
        amount: casaku.originalAmount,

        // Total pembayaran QRIS.
        totalAmount: casaku.totalAmount,
        paymentAmount: casaku.totalAmount,

        // Informasi kode unik.
        uniqueNominal: casaku.uniqueNominal,

        // QRIS.
        qrString: casaku.qrString,

        // Status pembayaran.
        status: casaku.status,

        // Masa berlaku.
        expiredAt: casaku.expiredAt,
        expiresAt: casaku.expiredAt,
        expiredInMinutes: casaku.expiredInMinutes,

        createdAt: casaku.createdAt,

        programId: program.id,
        programTitle: finalProgramTitle,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );

  } catch (error) {
    console.error(
      "[DONATE API ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan sistem.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}


import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ============================================================================
// CONFIG
// ============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const CASAKU_API_BASE_URL = "https://api.casaku.id";
const CASAKU_GENERATE_ENDPOINT =
  `${CASAKU_API_BASE_URL}/api/generate/v2/qris`;

const CASAKU_EXPIRED_MINUTES = 15;
const CASAKU_PREFIX = "BDB";

// ============================================================================
// SANITY CONFIG
// ============================================================================

const SANITY_TOKEN =
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_API_TOKEN;

const serverClient = createClient({
  projectId:
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ks29gg6v",
  dataset: (
    process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
  ).trim(),
  useCdn: false,
  apiVersion: "2026-08-31",
  token: SANITY_TOKEN,
});

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
  transactionId?: string;
  id?: string;
  trx_id?: string;
  transaction_id?: string;
  reference?: string;
  reference_id?: string;
  order_id?: string;

  amount?: number | string;
  totalAmount?: number | string;
  total_amount?: number | string;

  qr_string?: string;
  qrString?: string;
  qris?: string;
  qrCode?: string;
  qr_code?: string;

  status?: number | string | boolean;

  createdAt?: string;
  created_at?: string;

  expiredAt?: string;
  expired_at?: string;
  expiresAt?: string;
  expires_at?: string;

  [key: string]: unknown;
}

interface CasakuGenerateResponse {
  status?: number | string | boolean;
  success?: boolean;
  message?: string;

  data?: CasakuGenerateData;

  transactionId?: string;
  id?: string;
  trx_id?: string;
  transaction_id?: string;
  reference?: string;

  qr_string?: string;
  qrString?: string;
  qris?: string;

  amount?: number | string;
  totalAmount?: number | string;

  [key: string]: unknown;
}

// ============================================================================
// HELPERS
// ============================================================================

function cleanAmountValue(value: unknown): number {
  return (
    Number(String(value ?? "").replace(/[^0-9]/g, "")) || 0
  );
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
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function getFirstText(
  ...values: unknown[]
): string {
  for (const value of values) {
    const result = cleanText(value, 10000);

    if (result) return result;
  }

  return "";
}

function getRequiredEnvironment() {
  const licenseKey =
    process.env.CASAKU_LICENSE_KEY?.trim();

  const qrisId =
    process.env.CASAKU_QRIS_ID?.trim();

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

  return {
    licenseKey,
    qrisId,
  };
}

// ============================================================================
// CASAKU - CREATE QRIS TRANSACTION
// ============================================================================

async function createCasakuTransaction({
  licenseKey,
  qrisId,
  amount,
}: {
  licenseKey: string;
  qrisId: string;
  amount: number;
}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 20000);

  try {
    const response = await fetch(
      CASAKU_GENERATE_ENDPOINT,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-license-key": licenseKey,
          Accept: "application/json",
        },

        body: JSON.stringify({
          qr_id: qrisId,
          amount,

          useUniqueCode: true,

          packageIds: ["id.dana"],

          expiredInMinutes:
            CASAKU_EXPIRED_MINUTES,

          qrType: "dynamic",
          paymentMethod: "qris",
          useQris: true,

          prefix: CASAKU_PREFIX,
        }),

        cache: "no-store",
        signal: controller.signal,
      }
    );

    const rawText = await response.text();

    let json: CasakuGenerateResponse | null = null;

    try {
      json = rawText
        ? JSON.parse(rawText)
        : null;
    } catch {
      console.error(
        "[CASAKU CREATE] Respons bukan JSON:",
        rawText
      );
    }

    if (!response.ok || !json) {
      throw new Error(
        json?.message ||
          `Casaku gagal. HTTP ${response.status}: ${rawText.slice(0, 500)}`
      );
    }

    // Validasi respons Casaku.
    const responseStatus = String(
      json.status ?? ""
    )
      .toLowerCase()
      .trim();

    const validResponseStatus = [
      "",
      "200",
      "201",
      "true",
      "success",
    ].includes(responseStatus);

    if (
      json.success === false ||
      !validResponseStatus
    ) {
      throw new Error(
        json.message ||
          `Casaku menolak transaksi: ${rawText.slice(0, 500)}`
      );
    }

    const data =
      json.data &&
      typeof json.data === "object"
        ? json.data
        : json;

    // ========================================================
    // AMBIL ID ASLI DARI CASAKU
    // ========================================================

    const transactionId = getFirstText(
      data.transactionId,
      data.transaction_id,
      data.trx_id,
      data.id,
      data.reference,
      data.reference_id,
      data.order_id,

      json.transactionId,
      json.transaction_id,
      json.trx_id,
      json.id,
      json.reference
    );

    // ========================================================
    // AMBIL QRIS
    // ========================================================

    const qrString = getFirstText(
      data.qr_string,
      data.qrString,
      data.qris,
      data.qrCode,
      data.qr_code,

      json.qr_string,
      json.qrString,
      json.qris,
      json.qrCode,
      json.qr_code
    );

    // ========================================================
    // AMBIL NOMINAL
    // ========================================================

    const rawTotalAmount =
      data.totalAmount ??
      data.total_amount ??
      data.amount ??
      json.totalAmount ??
      json.amount ??
      amount;

    const totalAmount = Number(rawTotalAmount);

    if (
      !Number.isFinite(totalAmount) ||
      totalAmount <= 0
    ) {
      throw new Error(
        "Nominal pembayaran yang dikembalikan Casaku tidak valid."
      );
    }

    if (!transactionId) {
      console.error(
        "[CASAKU CREATE] ID tidak ditemukan:",
        json
      );

      throw new Error(
        "Casaku tidak mengembalikan ID transaksi."
      );
    }

    if (!qrString) {
      console.error(
        "[CASAKU CREATE] QRIS tidak ditemukan:",
        json
      );

      throw new Error(
        "Casaku tidak mengembalikan kode QRIS."
      );
    }

    const createdAt = getFirstText(
      data.createdAt,
      data.created_at,
      json.createdAt,
      json.created_at
    );

    const expiredAt = getFirstText(
      data.expiredAt,
      data.expired_at,
      data.expiresAt,
      data.expires_at,

      json.expiredAt,
      json.expired_at,
      json.expiresAt,
      json.expires_at
    );

    const status = cleanText(
      data.status ?? json.status ?? "pending",
      50
    );

    console.log(
      "[CASAKU CREATE] Transaksi berhasil dibuat:",
      {
        transactionId,
        amount,
        totalAmount,
        status,
        expiredAt,
      }
    );

    return {
      transactionId,
      qrString,
      totalAmount,
      status,
      createdAt: createdAt || null,
      expiredAt: expiredAt || null,
      raw: json,
    };

  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "Koneksi ke Casaku timeout. Silakan coba kembali."
      );
    }

    throw error;

  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// POST /api/donate
// ============================================================================

export async function POST(request: Request) {
  try {
    // 1. Validasi konfigurasi.
    const {
      licenseKey,
      qrisId,
    } = getRequiredEnvironment();

    // 2. Baca payload.
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

    const {
      donorName,
      amount,
      programId,
      phone,
      fundraiserPhone,
      programTitle,
      category,
      slug,
    } = body;

    // 3. Validasi nominal.
    const cleanAmount = cleanAmountValue(amount);

    if (
      !cleanAmount ||
      cleanAmount < 1000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Nominal donasi minimal Rp 1.000.",
        },
        { status: 400 }
      );
    }

    if (cleanAmount > 10_000_000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nominal transaksi QRIS maksimal Rp 10.000.000.",
        },
        { status: 400 }
      );
    }

    // 4. Normalisasi data donatur.
    const normalizedDonorName =
      cleanText(donorName, 150) ||
      "Hamba Allah";

    const normalizedPhone =
      normalizePhone(phone);

    // Frontend mengirim donorEmail.
    // Tetap mendukung email untuk kompatibilitas.
    const normalizedEmail = cleanText(
      body.donorEmail || body.email,
      200
    );

    const normalizedProgramId =
      cleanText(programId, 200);

    const normalizedProgramTitle =
      cleanText(programTitle, 200) ||
      "Sedekah Umum";

    const normalizedCategory =
      cleanText(category, 100) ||
      "Kemanusiaan";

    const normalizedFundraiserPhone =
      normalizePhone(fundraiserPhone);

    const normalizedSlug =
      cleanText(slug, 300);

    // 5. Validasi WhatsApp.
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

    // 6. Validasi program.
    if (!normalizedProgramId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Program donasi tidak ditemukan.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // 7. AMBIL USER SUPABASE
    // ========================================================

    let userId: string | null = null;

    let supabase:
      | ReturnType<typeof createServerClient>
      | null = null;

    try {
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

      const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (
        supabaseUrl &&
        supabaseAnonKey
      ) {
        const cookieStore = await cookies();

        supabase = createServerClient(
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
                  // Cookie tidak harus diubah
                  // untuk proses pembuatan donasi.
                }
              },
            },
          }
        );

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!error) {
          userId = user?.id || null;
        }
      }
    } catch (error) {
      console.warn(
        "[DONATE] Gagal membaca sesi Supabase:",
        error
      );
    }

    // ========================================================
    // 8. BUAT TRANSAKSI DI CASAKU
    // ========================================================

    const casaku =
      await createCasakuTransaction({
        licenseKey,
        qrisId,
        amount: cleanAmount,
      });

    // ========================================================
    // 9. GUNAKAN SATU ID TRANSAKSI
    // ========================================================

    // ID asli dari Casaku menjadi identitas utama.
    // Tidak lagi membuat ID TRX secara terpisah.

    const orderId = casaku.transactionId;

    const transactionId = casaku.transactionId;

    console.log(
      "[DONATE] ID TRANSAKSI UTAMA:",
      orderId
    );

    // ========================================================
    // 10. SIMPAN TRANSAKSI KE SANITY
    // ========================================================

    const now = new Date().toISOString();

    const sanityTransaction =
      await serverClient.create({
        _type: "donationTransaction",

        // KEDUA FIELD MENGGUNAKAN ID YANG SAMA.
        orderId,
        transactionId,

        donorName: normalizedDonorName,
        donorPhone: normalizedPhone,
        donorEmail: normalizedEmail,

        amount: cleanAmount,
        paymentAmount: casaku.totalAmount,

        fundraiserPhone:
          normalizedFundraiserPhone,

        programName: {
          _type: "reference",
          _ref: normalizedProgramId,
        },

        status: "pending",

        paymentProvider: "casaku",
        paymentMethod: "qris",

        qrString: casaku.qrString,
        paymentUrl: "",

        expiresAt: casaku.expiredAt,

        createdAt: now,

        campaignSlug: normalizedSlug,
      });

    console.log(
      "[DONATE] Sanity berhasil menyimpan transaksi:",
      {
        sanityId: sanityTransaction._id,
        orderId,
        transactionId,
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
                normalizedProgramTitle,

              category:
                normalizedCategory,

              amount: cleanAmount,

              status: "pending",

              payment_url: "",

              // ID YANG SAMA DENGAN SANITY.
              invoice_id: orderId,
            },
          ]);

        if (supabaseError) {
          console.error(
            "[DONATE] Supabase gagal menyimpan:",
            supabaseError.message
          );
        } else {
          console.log(
            "[DONATE] Supabase berhasil disinkronkan:",
            orderId
          );
        }

      } catch (error) {
        console.error(
          "[DONATE] Error sinkronisasi Supabase:",
          error
        );
      }
    }

    // ========================================================
    // 12. KIRIM RESPONS KE FRONTEND
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        provider: "casaku",

        // SATU ID UNTUK SEMUA PROSES.
        orderId,
        transactionId,

        amount: cleanAmount,

        totalAmount:
          casaku.totalAmount,

        paymentAmount:
          casaku.totalAmount,

        qrString:
          casaku.qrString,

        status:
          casaku.status || "pending",

        expiredAt:
          casaku.expiredAt,

        expiresAt:
          casaku.expiredAt,

        expiredInMinutes:
          CASAKU_EXPIRED_MINUTES,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
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
      { status: 500 }
    );
  }
}

// app/api/donate/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ============================================================================
// CONFIG
// ============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CASAKU_API_BASE_URL = "https://api.casaku.id";
const CASAKU_GENERATE_ENDPOINT = `${CASAKU_API_BASE_URL}/api/generate/v2/qris`;

const CASAKU_EXPIRED_MINUTES = 15;
const CASAKU_PREFIX = "ISLAMI";

// ============================================================================
// SANITY CLIENT
// ============================================================================

const serverClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "xqggeww8",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
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

  amount?: number;
  totalAmount?: number;

  qr_string?: string;
  qrString?: string;
  qris?: string;
  qrCode?: string;

  status?: string;
  createdAt?: string;
  expiredAt?: string;
  expiresAt?: string;

  [key: string]: unknown;
}

interface CasakuGenerateResponse {
  status?: number | string;
  success?: boolean;
  message?: string;
  data?: CasakuGenerateData;
  [key: string]: unknown;
}

// ============================================================================
// HELPERS
// ============================================================================

function cleanAmountValue(value: unknown): number {
  return Number(String(value ?? "").replace(/[^0-9]/g, "")) || 0;
}

function cleanText(value: unknown, maxLength = 255): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizePhone(value: unknown): string {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function generateOrderId(): string {
  const now = Date.now();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `TRX-${now}-${random}`;
}

function getRequiredEnvironment() {
  const licenseKey = process.env.CASAKU_LICENSE_KEY?.trim();
  const qrisId = process.env.CASAKU_QRIS_ID?.trim();
  const sanityToken = process.env.SANITY_API_TOKEN?.trim();

  if (!licenseKey) {
    throw new Error("CASAKU_LICENSE_KEY belum dikonfigurasi.");
  }
  if (!qrisId) {
    throw new Error("CASAKU_QRIS_ID belum dikonfigurasi.");
  }
  if (!sanityToken) {
    throw new Error("SANITY_API_TOKEN belum dikonfigurasi.");
  }

  return { licenseKey, qrisId };
}

// ============================================================================
// CASAKU
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
  }, 20_000);

  try {
    const response = await fetch(CASAKU_GENERATE_ENDPOINT, {
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
        expiredInMinutes: CASAKU_EXPIRED_MINUTES,
        qrType: "dynamic",
        paymentMethod: "qris",
        useQris: true,
        prefix: CASAKU_PREFIX,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const rawText = await response.text();
    console.log("🔍 RAW RESPONSE DARI CASAKU:", rawText);

    let json: CasakuGenerateResponse | null = null;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      json = null;
    }

    if (!response.ok || !json) {
      throw new Error(
        json?.message || `Casaku API gagal dengan HTTP ${response.status}: ${rawText}`
      );
    }

    // Tangkap error dari Casaku jika success bernilai false atau status bukan indikator sukses
    if (json.success === false || (json.status && json.status !== 200 && json.status !== 201 && json.status !== true && json.status !== "success")) {
      throw new Error(json.message || `Casaku menolak permintaan: ${rawText}`);
    }

    const data =
      json.data && typeof json.data === "object"
        ? json.data
        : (json as unknown as CasakuGenerateData);

    const transactionId = cleanText(
      data.transactionId ||
        data.id ||
        data.trx_id ||
        data.transaction_id ||
        data.reference ||
        data.reference_id ||
        data.order_id ||
        json.transactionId ||
        json.id ||
        json.trx_id ||
        json.reference,
      200
    );

    const qrString = cleanText(
      data.qr_string ||
        data.qrString ||
        data.qris ||
        data.qrCode ||
        json.qr_string ||
        json.qrString ||
        json.qris,
      10_000
    );

    const totalAmount =
      Number(
        data.totalAmount ??
          data.amount ??
          json.totalAmount ??
          json.amount ??
          amount
      ) || amount;

    if (!transactionId) {
      throw new Error(
        json.message || `Casaku tidak mengembalikan transactionId. Respons lengkap: ${rawText}`
      );
    }

    if (!qrString) {
      throw new Error(
        json.message || `Casaku tidak mengembalikan QRIS. Respons lengkap: ${rawText}`
      );
    }

    return {
      transactionId,
      qrString,
      totalAmount,
      status: cleanText(String(data.status || json.status || "pending"), 50) || "pending",
      createdAt: cleanText(data.createdAt || json.createdAt, 100) || null,
      expiredAt: cleanText(data.expiredAt || data.expiresAt || json.expiredAt || json.expiresAt, 100) || null,
      raw: json,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Koneksi ke Casaku timeout. Silakan coba kembali.");
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
  let createdSanityId: string | null = null;

  try {
    // 1. VALIDASI ENVIRONMENT
    const { licenseKey, qrisId } = getRequiredEnvironment();

    // 2. BACA REQUEST
    let body: DonateRequestBody;
    try {
      body = (await request.json()) as DonateRequestBody;
    } catch {
      return NextResponse.json(
        { success: false, message: "Payload transaksi tidak valid." },
        { status: 400 }
      );
    }

    const {
      donorName,
      amount,
      programId,
      phone,
      email,
      fundraiserPhone,
      programTitle,
      category,
      slug,
    } = body;

    // 3. VALIDASI NOMINAL
    const cleanAmount = cleanAmountValue(amount);

    if (!cleanAmount || cleanAmount < 1000) {
      return NextResponse.json(
        { success: false, message: "Nominal donasi minimal Rp 1.000." },
        { status: 400 }
      );
    }

    if (cleanAmount > 10_000_000) {
      return NextResponse.json(
        {
          success: false,
          message: "Nominal transaksi QRIS maksimal Rp 10.000.000.",
        },
        { status: 400 }
      );
    }

    // 4. NORMALISASI & VALIDASI DATA DONATUR
    const normalizedDonorName = cleanText(donorName, 150) || "Hamba Allah";
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = cleanText(email, 200);
    const normalizedProgramId = cleanText(programId, 200);
    const normalizedProgramTitle = cleanText(programTitle, 200) || "Sedekah Umum";
    const normalizedCategory = cleanText(category, 100) || "Kemanusiaan";
    const normalizedFundraiserPhone = normalizePhone(fundraiserPhone);
    const normalizedSlug = cleanText(slug, 300);

    const isValidPhoneFormat =
      normalizedPhone.length >= 9 &&
      normalizedPhone.length <= 15 &&
      (normalizedPhone.startsWith("0") ||
        normalizedPhone.startsWith("62") ||
        normalizedPhone.startsWith("8"));

    if (!isValidPhoneFormat) {
      return NextResponse.json(
        {
          success: false,
          message: "Nomor WhatsApp wajib diisi dengan benar.",
        },
        { status: 400 }
      );
    }

    if (!normalizedProgramId) {
      return NextResponse.json(
        { success: false, message: "Program donasi tidak ditemukan." },
        { status: 400 }
      );
    }

    // 5. GENERATE ORDER ID INTERNAL
    const orderId = generateOrderId();

    // 6. DAPATKAN USER SUPABASE JIKA LOGIN
    let userId: string | null = null;
    let supabase: ReturnType<typeof createServerClient> | null = null;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        const cookieStore = await cookies();
        supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
          },
        });

        const {
          data: { user },
        } = await supabase.auth.getUser();

        userId = user?.id || null;
      }
    } catch (error) {
      console.warn("⚠️ Gagal membaca user Supabase:", error);
    }

    // 7. BUAT TRANSAKSI QRIS CASAKU
    const casaku = await createCasakuTransaction({
      licenseKey,
      qrisId,
      amount: cleanAmount,
    });

    const paymentAmount = casaku.totalAmount;

    // 8. SIMPAN TRANSAKSI UTAMA KE SANITY
    const sanityTransaction = await serverClient.create({
      _type: "donationTransaction",
      orderId,
      transactionId: casaku.transactionId,
      donorName: normalizedDonorName,
      donorPhone: normalizedPhone,
      donorEmail: normalizedEmail,
      amount: cleanAmount,
      paymentAmount,
      fundraiserPhone: normalizedFundraiserPhone,
      programName: normalizedProgramId
        ? {
            _type: "reference",
            _ref: normalizedProgramId,
          }
        : undefined,
      status: "pending",
      paymentProvider: "casaku",
      paymentMethod: "qris",
      qrString: casaku.qrString,
      paymentUrl: "",
      expiresAt: casaku.expiredAt,
      createdAt: new Date().toISOString(),
      campaignSlug: normalizedSlug,
    });

    createdSanId = sanityTransaction._id;

    // 9. SINKRONKAN KE SUPABASE
    if (supabase) {
      try {
        const { error: supabaseError } = await supabase
          .from("donations")
          .insert([
            {
              user_id: userId,
              donor_name: normalizedDonorName,
              program_name: normalizedProgramTitle,
              category: normalizedCategory,
              amount: cleanAmount,
              status: "pending",
              payment_url: "",
              invoice_id: orderId,
            },
          ]);

        if (supabaseError) {
          console.warn(
            "⚠️ Supabase tidak berhasil mencatat transaksi:",
            supabaseError.message
          );
        }
      } catch (supabaseError) {
        console.warn("⚠️ Error sinkronisasi Supabase:", supabaseError);
      }
    }

    // 10. RESPONSE KE FRONTEND
    return NextResponse.json(
      {
        success: true,
        provider: "casaku",
        orderId,
        transactionId: casaku.transactionId,
        amount: cleanAmount,
        totalAmount: paymentAmount,
        qrString: casaku.qrString,
        status: casaku.status || "pending",
        expiredAt: casaku.expiredAt,
        expiredInMinutes: CASAKU_EXPIRED_MINUTES,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("🔥 Error Transaksi Casaku:", error);

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan sistem.";

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
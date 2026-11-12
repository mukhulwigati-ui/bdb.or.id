
// app/api/donate/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CASAKU_GENERATE_URL =
  "https://api.casaku.id/api/generate/v2/qris";

const QRIS_ID =
  process.env.CASAKU_QRIS_ID ||
  "7a08021a-160b-410a-a561-b784590418f0";

function getRequiredEnv(name: string, value?: string): string {
  const result = value?.trim();

  if (!result) {
    throw new Error(`${name} belum dikonfigurasi di Vercel.`);
  }

  return result;
}

function getSanityClient() {
  const projectId = getRequiredEnv(
    "NEXT_PUBLIC_SANITY_PROJECT_ID",
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  );

  const dataset = (
    process.env.NEXT_PUBLIC_SANITY_DATASET || "production"
  ).trim();

  const token = getRequiredEnv(
    "SANITY_API_TOKEN / SANITY_API_WRITE_TOKEN",
    process.env.SANITY_API_WRITE_TOKEN ||
      process.env.SANITY_API_TOKEN
  );

  return createClient({
    projectId,
    dataset,
    apiVersion: "2026-08-31",
    useCdn: false,
    token,
  });
}

export async function POST(request: Request) {
  try {
    // =========================================
    // 1. VALIDASI KONFIGURASI
    // =========================================

    const sanityClient = getSanityClient();

    const licenseKey = getRequiredEnv(
      "CASAKU_LICENSE_KEY",
      process.env.CASAKU_LICENSE_KEY
    );

    const packageIds = (
      process.env.CASAKU_PACKAGE_IDS || "id.dana"
    )
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!packageIds.length) {
      throw new Error("CASAKU_PACKAGE_IDS belum dikonfigurasi.");
    }

    // =========================================
    // 2. AMBIL DATA DONASI
    // =========================================

    const body = await request.json();

    const donorName = String(
      body.donorName || "Hamba Allah"
    ).trim().slice(0, 150);

    const phone = String(
      body.phone || ""
    ).trim().slice(0, 30);

    const email = String(
      body.email || ""
    ).trim().slice(0, 150);

    const fundraiserPhone = String(
      body.fundraiserPhone || ""
    ).trim().slice(0, 30);

    const programId = String(
      body.programId || ""
    ).trim();

    const programTitle = String(
      body.programTitle || "Sedekah / Infak Online"
    ).trim().slice(0, 150);

    const category = String(
      body.category || "Kemanusiaan"
    ).trim().slice(0, 100);

    const amount = Number(
      String(body.amount || "").replace(/[^0-9]/g, "")
    );

    if (!Number.isSafeInteger(amount) || amount < 1000) {
      return NextResponse.json(
        {
          success: false,
          message: "Nominal donasi minimal Rp 1.000.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // 3. BUAT ORDER ID INTERNAL BDB
    // =========================================

    const orderId =
      `BDB-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    // =========================================
    // 4. IDENTIFIKASI USER SUPABASE
    // =========================================

    const cookieStore = await cookies();

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let supabase: ReturnType<typeof createServerClient> | null = null;
    let userId: string | null = null;

    if (supabaseUrl && supabaseAnonKey) {
      supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll() {
              // Tidak mengubah cookie pada endpoint ini.
            },
          },
        }
      );

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.warn(
          "[BDB SUPABASE AUTH]",
          authError.message
        );
      }

      userId = user?.id || null;
    }

    // =========================================
    // 5. GENERATE QRIS CASAKU
    // =========================================

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      20000
    );

    let casakuResponse: Response;

    try {
      casakuResponse = await fetch(
        CASAKU_GENERATE_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-license-key": licenseKey,
          },
          body: JSON.stringify({
            qr_id: QRIS_ID,
            amount,
            packageIds,
            expiredInMinutes: 15,
            qrType: "dynamic",
            paymentMethod: "qris",
            useQris: true,
            useUniqueCode: true,
            prefix: "BDB",
          }),
          cache: "no-store",
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const rawResponse = await casakuResponse.text();

    let casakuJson: any;

    try {
      casakuJson = JSON.parse(rawResponse);
    } catch {
      throw new Error(
        "Respons generate QRIS Casaku bukan JSON valid."
      );
    }

    if (!casakuResponse.ok) {
      console.error(
        "[BDB CASAKU HTTP ERROR]",
        casakuResponse.status,
        casakuJson
      );

      throw new Error(
        casakuJson?.message ||
          `Casaku gagal membuat QRIS (HTTP ${casakuResponse.status}).`
      );
    }

    if (
      casakuJson?.success === false ||
      casakuJson?.status === "error"
    ) {
      console.error(
        "[BDB CASAKU API ERROR]",
        casakuJson
      );

      throw new Error(
        casakuJson?.message ||
          "Casaku menolak permintaan pembuatan QRIS."
      );
    }

    const data =
      casakuJson?.data &&
      typeof casakuJson.data === "object"
        ? casakuJson.data
        : casakuJson;

    const transactionId = String(
      data?.transactionId || ""
    ).trim();

    const qrString = String(
      data?.qr_string || ""
    ).trim();

    const paymentAmount = Number(
      data?.totalAmount ?? data?.amount ?? 0
    );

    if (
      !transactionId ||
      !qrString ||
      !Number.isSafeInteger(paymentAmount)
    ) {
      console.error(
        "[BDB CASAKU INVALID RESPONSE]",
        casakuJson
      );

      throw new Error(
        "Data QRIS Casaku tidak lengkap atau tidak valid."
      );
    }

    if (paymentAmount < amount) {
      throw new Error(
        "Nominal pembayaran dari Casaku tidak valid."
      );
    }

    const expiresAt =
      data?.expiredAt ||
      data?.expiresAt ||
      null;

    // =========================================
    // 6. SIMPAN TRANSAKSI KE SANITY
    // =========================================

    const transactionDocument = {
      _type: "donationTransaction",
      orderId,
      transactionId,
      donorName,
      donorPhone: phone,
      donorEmail: email,
      amount,
      paymentAmount,
      fundraiserPhone,

      ...(programId
        ? {
            programName: {
              _type: "reference",
              _ref: programId,
            },
          }
        : {}),

      status: "pending",
      paymentProvider: "casaku",
      paymentMethod: "qris",
      paymentVerified: false,
      paymentUrl: "",
      qrString,
      ...(expiresAt ? { expiresAt } : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await sanityClient.create(transactionDocument);

    // =========================================
    // 7. SIMPAN SALINAN KE SUPABASE
    // =========================================

    if (supabase) {
      const { error } = await supabase
        .from("donations")
        .insert({
          user_id: userId,
          donor_name: donorName,
          program_name: programTitle,
          category,
          amount,
          status: "pending",
          payment_url: "",
          invoice_id: orderId,
        });

      if (error) {
        console.error(
          "[BDB SUPABASE INSERT ERROR]",
          error.message
        );
      }
    }

    // =========================================
    // 8. RESPONSE KE FRONTEND
    // =========================================

    return NextResponse.json({
      success: true,
      provider: "casaku",
      orderId,
      transactionId,
      amount,
      paymentAmount,
      totalAmount: paymentAmount,
      qrString,
      expiresAt,
      expiredAt: expiresAt,
      expiredInMinutes: 15,
      paymentMethod: "qris",
    });

  } catch (error) {
    console.error(
      "[BDB DONATE ERROR]",
      error
    );

    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Koneksi ke Casaku timeout."
          : error.message
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

// app/api/donation/status/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { checkCasakuTransaction, ensureDonationCredits, getDonationByOrderId, getDonationByTransactionId } from "@/lib/payments/casaku-settlement";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSanityClient() {
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ks29gg6v",
    dataset: (process.env.NEXT_PUBLIC_SANITY_DATASET || "production").trim(),
    apiVersion: "2026-08-31",
    useCdn: false,
    token: process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN,
  });
}

async function syncSupabaseStatus(orderId: string | undefined, status: string): Promise<void> {
  if (!orderId) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  try {
    const { createClient: createSupabase } = await import("@supabase/supabase-js");
    const supabase = createSupabase(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await supabase.from("donations").update({ status }).eq("invoice_id", orderId);
  } catch (err) {
    console.error("[SUPABASE SYNC ERROR]", err);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get("orderId") || searchParams.get("transactionId");

    if (!identifier) {
      return NextResponse.json({ success: false, message: "ID tidak valid." }, { status: 400 });
    }

    // 1. Cari data transaksi di Sanity
    let transaction = await getDonationByOrderId(identifier);
    if (!transaction) {
      transaction = await getDonationByTransactionId(identifier);
    }

    if (!transaction) {
      return NextResponse.json({ success: false, message: "Transaksi tidak ditemukan di database." }, { status: 404 });
    }

    // 2. Jika di database sudah sukses, langsung kembalikan paid
    const currentStatus = String(transaction.status || "").trim().toLowerCase();
    if (["success", "paid", "settlement", "completed"].includes(currentStatus)) {
      return NextResponse.json({ success: true, status: "paid", transaction: { ...transaction, status: "paid" } });
    }

    // 3. KUNCI UTAMA: Wajib menggunakan transactionId asli dari Casaku (BDB-...), BUKAN orderId (TRX-...)
    const casakuTrxId = transaction.transactionId;
    
    if (!casakuTrxId) {
      return NextResponse.json({ success: true, status: "pending", transaction });
    }

    // 4. Tanyakan langsung ke server Casaku menggunakan transactionId asli
    try {
      const casakuResult = await checkCasakuTransaction(casakuTrxId);
      console.log(`[STATUS CHECK] Hasil cek Casaku untuk ${casakuTrxId}:`, casakuResult);

      if (casakuResult.status === "paid") {
        const sanity = getSanityClient();
        const paidAt = casakuResult.paidAt || new Date().toISOString();
        const finalAmount = casakuResult.amount > 0 ? casakuResult.amount : (transaction.paymentAmount || transaction.amount || 0);

        // Update status di Sanity menjadi success
        await sanity.patch(transaction._id).set({
          status: "success",
          paymentProvider: "casaku",
          paymentMethod: "qris",
          paymentVerified: true,
          paidAt,
          paidAmount: finalAmount,
          updatedAt: new Date().toISOString(),
        }).commit();

        // Sinkronkan ke Supabase
        await syncSupabaseStatus(transaction.orderId, "success");

        // Masukkan kredit ke Program dan Fundraiser
        const fresh = await getDonationById(transaction._id);
        if (fresh) {
          await ensureDonationCredits(fresh);
        }

        return NextResponse.json({
          success: true,
          status: "paid",
          transaction: { ...transaction, status: "paid" },
        });
      }
    } catch (casakuErr) {
      console.warn("⚠️ Gagal verifikasi online ke Casaku:", casakuErr);
    }

    return NextResponse.json({
      success: true,
      status: transaction.status || "pending",
      transaction,
    });
  } catch (error) {
    console.error("[STATUS API ERROR]", error);
    return NextResponse.json({ success: false, message: "Terjadi kesalahan server." }, { status: 500 });
  }
}
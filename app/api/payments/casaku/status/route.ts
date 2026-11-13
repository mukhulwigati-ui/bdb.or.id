// app/api/payments/casaku/status/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getDonationById,
  checkCasakuTransaction,
  ensureDonationCredits,
} from "@/lib/payments/casaku-settlement";

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

function cleanText(value: unknown, maxLength = 500): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

async function syncSupabaseStatus(orderId: string | undefined, status: string): Promise<void> {
  if (!orderId) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  try {
    const supabase = createSupabaseClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await supabase.from("donations").update({ status }).eq("invoice_id", orderId);
  } catch (error) {
    console.error("[BDB SUPABASE SYNC ERROR]", error);
  }
}

// ============================================================================
// GET: Digunakan oleh polling frontend (CampaignDetailClient)
// ============================================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get("orderId") || searchParams.get("transactionId");

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: "orderId atau transactionId wajib disertakan." },
        { status: 400 }
      );
    }

    const sanity = getSanityClient();

    // Cari transaksi di Sanity berdasarkan orderId, transactionId, atau _id
    const transaction = await sanity.fetch(
      `*[
        _type == "donationTransaction" &&
        (orderId == $identifier || transactionId == $identifier || _id == $identifier)
      ][0]{
        _id,
        orderId,
        transactionId,
        status,
        paymentAmount,
        amount
      }`,
      { identifier }
    );

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Transaksi BDB tidak ditemukan." },
        { status: 404 }
      );
    }

    // Jika di database statusnya sudah sukses/paid, langsung kembalikan sukses
    const currentStatus = String(transaction.status || "").trim().toLowerCase();
    const isPaid = ["success", "paid", "settlement", "completed"].includes(currentStatus);

    if (isPaid) {
      return NextResponse.json({
        success: true,
        transaction: {
          orderId: transaction.orderId,
          transactionId: transaction.transactionId,
          status: "paid",
        },
      });
    }

    // Jika masih pending, cek langsung ke Casaku menggunakan modul settlement BDB
    const casakuTrxId = transaction.transactionId;
    if (casakuTrxId) {
      try {
        const casakuResult = await checkCasakuTransaction(casakuTrxId);

        if (casakuResult.status === "paid") {
          const expectedAmount = Number(transaction.paymentAmount ?? transaction.amount ?? 0);

          if (casakuResult.amount > 0 && expectedAmount > 0 && casakuResult.amount === expectedAmount) {
            const paidAt = casakuResult.paidAt || new Date().toISOString();
            
            // Update status transaksi jadi success di Sanity
            await sanity.patch(transaction._id).set({
              status: "success",
              paymentProvider: "casaku",
              paymentMethod: "qris",
              paymentVerified: true,
              paidAt,
              paidAmount: expectedAmount,
              updatedAt: new Date().toISOString(),
            }).commit();

            // Sinkronkan ke Supabase
            await syncSupabaseStatus(transaction.orderId, "success");

            // Proses kredit program & fundraiser BDB
            const fresh = await getDonationById(transaction._id);
            if (fresh) {
              await ensureDonationCredits(fresh);
            }

            return NextResponse.json({
              success: true,
              transaction: {
                orderId: transaction.orderId,
                transactionId: transaction.transactionId,
                status: "paid",
              },
            });
          }
        }
      } catch (err) {
        console.warn("⚠️ Gagal verifikasi online ke Casaku via GET:", err);
      }
    }

    return NextResponse.json({
      success: true,
      transaction: {
        orderId: transaction.orderId,
        transactionId: transaction.transactionId,
        status: transaction.status || "pending",
      },
    });
  } catch (error) {
    console.error("[BDB STATUS GET ERROR]", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Kompatibilitas server-to-server / manual trigger / webhook check
// ============================================================================
export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Payload request tidak valid." },
        { status: 400 }
      );
    }

    const identifier = cleanText(body?.transactionId || body?.orderId, 250);
    if (!identifier) {
      return NextResponse.json(
        { success: false, message: "transactionId atau orderId wajib diisi." },
        { status: 400 }
      );
    }

    const sanity = getSanityClient();
    const transaction = await sanity.fetch(
      `*[
        _type == "donationTransaction" &&
        (transactionId == $identifier || orderId == $identifier || _id == $identifier)
      ][0]{
        _id,
        orderId,
        transactionId,
        status
      }`,
      { identifier }
    );

    if (!transaction || !transaction.transactionId) {
      return NextResponse.json(
        { success: false, message: "Transaksi BDB tidak ditemukan." },
        { status: 404 }
      );
    }

    const casakuResult = await checkCasakuTransaction(transaction.transactionId);

    if (casakuResult.status === "paid") {
      const fresh = await getDonationById(transaction._id);
      if (fresh && fresh.status !== "success") {
        await sanity.patch(fresh._id).set({
          status: "success",
          paymentProvider: "casaku",
          paymentMethod: "qris",
          paymentVerified: true,
          paidAt: casakuResult.paidAt || new Date().toISOString(),
          paidAmount: casakuResult.amount,
          updatedAt: new Date().toISOString(),
        }).commit();

        await syncSupabaseStatus(fresh.orderId, "success");

        const paidFresh = await getDonationById(fresh._id);
        if (paidFresh) {
          await ensureDonationCredits(paidFresh);
        }
      }

      return NextResponse.json({
        success: true,
        status: "paid",
        transactionId: transaction.transactionId,
      });
    }

    return NextResponse.json({
      success: true,
      status: casakuResult.status,
      transactionId: transaction.transactionId,
    });
  } catch (error) {
    console.error("[BDB STATUS POST ERROR]", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
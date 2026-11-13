// app/api/donation/status/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import {
  checkCasakuTransaction,
  ensureDonationCredits,
  getDonationByOrderId,
  getDonationByTransactionId,
  getDonationById,
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get("orderId") || searchParams.get("transactionId");

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: "ID transaksi (orderId atau transactionId) wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Cari data transaksi di Sanity secara fleksibel (berdasarkan orderId atau transactionId)
    let transaction = await getDonationByOrderId(identifier);
    if (!transaction) {
      transaction = await getDonationByTransactionId(identifier);
    }
    if (!transaction) {
      transaction = await getDonationById(identifier);
    }

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Transaksi tidak ditemukan di database." },
        { status: 404 }
      );
    }

    // 2. Jika di database lokal sudah status sukses, pastikan kredit sudah masuk lalu kembalikan 'paid'
    const currentStatus = cleanText(transaction.status, 50).toLowerCase();
    if (["success", "paid", "settlement", "completed"].includes(currentStatus)) {
      if (transaction._id) {
        await ensureDonationCredits(transaction);
      }
      return NextResponse.json({
        success: true,
        status: "paid",
        transaction: { ...transaction, status: "paid" },
      });
    }

    // 3. Ambil ID Gateway Casaku yang valid (transactionId berformat BDB-...)
    const casakuTrxId = cleanText(transaction.transactionId || transaction.orderId, 250);

    if (!casakuTrxId) {
      return NextResponse.json({
        success: true,
        status: "pending",
        transaction,
        message: "ID Transaksi Gateway belum tersedia pada data lokal.",
      });
    }

    // 4. Periksa status langsung ke server Casaku
    const casakuResult = await checkCasakuTransaction(casakuTrxId);
    console.log(`[STATUS CHECK] Hasil cek Casaku untuk ${casakuTrxId}:`, casakuResult);

    // 5. Jika Casaku menyatakan lunas (paid / success)
    if (casakuResult.status === "paid") {
      const sanity = getSanityClient();
      const paidAt = casakuResult.paidAt || transaction.paidAt || new Date().toISOString();
      const expectedAmount = Number(transaction.paymentAmount ?? transaction.amount ?? 0);
      const finalAmount = casakuResult.amount > 0 ? casakuResult.amount : expectedAmount;

      // Update dokumen Sanity menjadi sukses
      await sanity
        .patch(transaction._id)
        .set({
          status: "success",
          paymentProvider: "casaku",
          paymentMethod: "qris",
          paymentVerified: true,
          paidAt,
          paidAmount: finalAmount,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      // Ambil data terbaru setelah dipatch
      const freshTransaction = await getDonationById(transaction._id);

      // Masukkan kredit ke program dan fundraiser secara atomik
      if (freshTransaction) {
        await ensureDonationCredits(freshTransaction);
      }

      const finalUpdated = await getDonationById(transaction._id);

      return NextResponse.json({
        success: true,
        status: "paid",
        transaction: finalUpdated ? { ...finalUpdated, status: "paid" } : { ...transaction, status: "paid" },
      });
    }

    // 6. Jika status dari Casaku adalah expired atau cancel
    if (casakuResult.status === "expired" || casakuResult.status === "cancel") {
      const sanity = getSanityClient();
      const patchData: Record<string, unknown> = {
        status: "failed",
        paymentProvider: "casaku",
        paymentMethod: "qris",
        updatedAt: new Date().toISOString(),
      };
      if (casakuResult.expiredAt) {
        patchData.expiresAt = casakuResult.expiredAt;
      }

      await sanity.patch(transaction._id).set(patchData).commit();

      const failedTransaction = await getDonationById(transaction._id);
      return NextResponse.json({
        success: true,
        status: "failed",
        transaction: failedTransaction || transaction,
      });
    }

    // 7. Default jika masih pending
    return NextResponse.json({
      success: true,
      status: transaction.status || "pending",
      transaction,
    });

  } catch (error: any) {
    console.error("[STATUS API ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Terjadi kesalahan pada server saat mengecek status.",
      },
      { status: 500 }
    );
  }
}
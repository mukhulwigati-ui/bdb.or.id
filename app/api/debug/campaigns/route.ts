import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sanity = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "ks29gg6v",
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
      apiVersion: "2026-08-31",
      useCdn: false,
      token: process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_TOKEN,
    });

    // Ambil seluruh dokumen untuk melihat tipe dan slug yang ada
    const documents = await sanity.fetch(`*[true][0...30]{
      _id,
      _type,
      title,
      "slug": slug.current
    }`);

    return NextResponse.json({
      success: true,
      totalFound: documents.length,
      documents,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Terjadi kesalahan",
    }, { status: 500 });
  }
}
// app/api/views/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// ============================================================================
// ROUTE CONFIG
// ============================================================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ============================================================================
// TYPES
// ============================================================================

type ContentType = "news" | "campaign";

// ============================================================================
// VALIDATOR
// ============================================================================

function isValidType(value: unknown): value is ContentType {
  return value === "news" || value === "campaign";
}

function isValidSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 300
  );
}

// ============================================================================
// BOT DETECTOR
// ============================================================================
//
// Googlebot, Bingbot, Facebook preview, WhatsApp,
// Telegram, Twitter/X dan crawler lainnya tidak dihitung.
//
// ============================================================================

function isBot(userAgent: string): boolean {
  return /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|twitterbot|linkedinbot|pinterest|preview/i.test(
    userAgent
  );
}

// ============================================================================
// HELPER RESPONSE
// ============================================================================

function noCacheHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };
}

// ============================================================================
// GET
// Mengambil jumlah view TANPA menambah counter
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // ------------------------------------------------------------------------
    // PARAMETER
    // ------------------------------------------------------------------------

    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type");
    const slug = searchParams.get("slug");

    // ------------------------------------------------------------------------
    // VALIDASI TYPE
    // ------------------------------------------------------------------------

    if (!isValidType(type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Content type tidak valid",
        },
        {
          status: 400,
          headers: noCacheHeaders(),
        }
      );
    }

    // ------------------------------------------------------------------------
    // VALIDASI SLUG
    // ------------------------------------------------------------------------

    if (!isValidSlug(slug)) {
      return NextResponse.json(
        {
          success: false,
          message: "Slug tidak valid",
        },
        {
          status: 400,
          headers: noCacheHeaders(),
        }
      );
    }

    const cleanSlug = slug.trim();

    // ------------------------------------------------------------------------
    // SUPABASE ADMIN
    //
    // Client baru dibuat di runtime setelah request masuk.
    // Tidak dibuat saat module sedang dievaluasi oleh Turbopack.
    // ------------------------------------------------------------------------

    const supabaseAdmin = getSupabaseAdmin();

    // ------------------------------------------------------------------------
    // AMBIL COUNTER
    // ------------------------------------------------------------------------

    const { data, error } = await supabaseAdmin
      .from("content_views")
      .select("views")
      .eq("content_type", type)
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (error) {
      console.error("GET VIEW ERROR:", {
        type,
        slug: cleanSlug,
        error,
      });

      return NextResponse.json(
        {
          success: false,
          message:
            type === "campaign"
              ? "Gagal mengambil jumlah pengunjung"
              : "Gagal mengambil jumlah pembaca",
        },
        {
          status: 500,
          headers: noCacheHeaders(),
        }
      );
    }

    // ------------------------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        type,
        slug: cleanSlug,
        views: Number(data?.views ?? 0),
      },
      {
        status: 200,
        headers: noCacheHeaders(),
      }
    );
  } catch (error) {
    console.error("GET /api/views ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      {
        status: 500,
        headers: noCacheHeaders(),
      }
    );
  }
}

// ============================================================================
// POST
// Menambah jumlah view
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // ------------------------------------------------------------------------
    // USER AGENT
    // ------------------------------------------------------------------------

    const userAgent =
      request.headers.get("user-agent") || "";

    // ------------------------------------------------------------------------
    // BODY
    // ------------------------------------------------------------------------

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Body request tidak valid",
        },
        {
          status: 400,
          headers: noCacheHeaders(),
        }
      );
    }

    const type = body?.type;
    const slug = body?.slug;

    // ------------------------------------------------------------------------
    // VALIDASI TYPE
    // ------------------------------------------------------------------------

    if (!isValidType(type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Content type tidak valid",
        },
        {
          status: 400,
          headers: noCacheHeaders(),
        }
      );
    }

    // ------------------------------------------------------------------------
    // VALIDASI SLUG
    // ------------------------------------------------------------------------

    if (!isValidSlug(slug)) {
      return NextResponse.json(
        {
          success: false,
          message: "Slug tidak valid",
        },
        {
          status: 400,
          headers: noCacheHeaders(),
        }
      );
    }

    const cleanSlug = slug.trim();

    // ------------------------------------------------------------------------
    // SUPABASE ADMIN
    // ------------------------------------------------------------------------

    const supabaseAdmin = getSupabaseAdmin();

    // =========================================================================
    // BOT / CRAWLER
    // =========================================================================
    //
    // Bot tidak menambah view.
    // Hanya mengembalikan counter yang sudah ada.
    //
    // =========================================================================

    if (isBot(userAgent)) {
      const { data, error } = await supabaseAdmin
        .from("content_views")
        .select("views")
        .eq("content_type", type)
        .eq("slug", cleanSlug)
        .maybeSingle();

      if (error) {
        console.error("BOT VIEW FETCH ERROR:", {
          type,
          slug: cleanSlug,
          error,
        });
      }

      return NextResponse.json(
        {
          success: true,
          type,
          slug: cleanSlug,
          views: Number(data?.views ?? 0),
          counted: false,
          reason: "bot",
        },
        {
          status: 200,
          headers: noCacheHeaders(),
        }
      );
    }

    // =========================================================================
    // ATOMIC INCREMENT
    // =========================================================================
    //
    // Memanggil function Supabase:
    //
    // increment_content_view(
    //   p_content_type,
    //   p_slug
    // )
    //
    // Function harus mengembalikan jumlah views terbaru.
    //
    // =========================================================================

    const { data, error } = await supabaseAdmin.rpc(
      "increment_content_view",
      {
        p_content_type: type,
        p_slug: cleanSlug,
      }
    );

    // ------------------------------------------------------------------------
    // ERROR
    // ------------------------------------------------------------------------

    if (error) {
      console.error("INCREMENT VIEW ERROR:", {
        type,
        slug: cleanSlug,
        error,
      });

      return NextResponse.json(
        {
          success: false,
          message:
            type === "campaign"
              ? "Gagal menambah jumlah pengunjung"
              : "Gagal menambah jumlah pembaca",
        },
        {
          status: 500,
          headers: noCacheHeaders(),
        }
      );
    }

    // ------------------------------------------------------------------------
    // NORMALISASI HASIL RPC
    // ------------------------------------------------------------------------

    let views = 0;

    if (typeof data === "number") {
      views = data;
    } else if (typeof data === "string") {
      views = Number(data) || 0;
    } else if (Array.isArray(data) && data.length > 0) {
      const first = data[0];

      if (typeof first === "number") {
        views = first;
      } else if (typeof first === "object" && first !== null) {
        views = Number(
          first.views ??
            first.increment_content_view ??
            0
        );
      }
    } else if (
      typeof data === "object" &&
      data !== null
    ) {
      const result = data as Record<string, unknown>;

      views = Number(
        result.views ??
          result.increment_content_view ??
          0
      );
    }

    // ------------------------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        type,
        slug: cleanSlug,
        views,
        counted: true,
      },
      {
        status: 200,
        headers: noCacheHeaders(),
      }
    );
  } catch (error) {
    console.error("POST /api/views ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      {
        status: 500,
        headers: noCacheHeaders(),
      }
    );
  }
}
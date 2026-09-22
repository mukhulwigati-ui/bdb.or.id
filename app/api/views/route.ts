// app/api/views/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// =========================================================
// TYPES
// =========================================================

type ContentType = "news" | "campaign";

// =========================================================
// VALIDATOR
// =========================================================

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

// =========================================================
// BOT DETECTOR
// =========================================================
//
// Agar Googlebot, Bingbot, Facebook preview,
// WhatsApp preview, dll tidak menambah jumlah pembaca.
//
// =========================================================

function isBot(userAgent: string) {
  return /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|twitterbot|linkedinbot|pinterest/i.test(
    userAgent
  );
}

// =========================================================
// GET
// Ambil jumlah view tanpa menambah
// =========================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type");
    const slug = searchParams.get("slug");

    if (!isValidType(type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Content type tidak valid",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidSlug(slug)) {
      return NextResponse.json(
        {
          success: false,
          message: "Slug tidak valid",
        },
        {
          status: 400,
        }
      );
    }

    const cleanSlug = slug.trim();

    const { data, error } = await supabaseAdmin
      .from("content_views")
      .select("views")
      .eq("content_type", type)
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (error) {
      console.error("GET VIEW ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Gagal mengambil jumlah pembaca",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        views: Number(data?.views ?? 0),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/views ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// POST
// Tambah jumlah view
// =========================================================

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get("user-agent") || "";

    const body = await request.json();

    const type = body?.type;
    const slug = body?.slug;

    if (!isValidType(type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Content type tidak valid",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidSlug(slug)) {
      return NextResponse.json(
        {
          success: false,
          message: "Slug tidak valid",
        },
        {
          status: 400,
        }
      );
    }

    const cleanSlug = slug.trim();

    // =====================================================
    // BOT TIDAK DITAMBAHKAN
    // =====================================================

    if (isBot(userAgent)) {
      const { data } = await supabaseAdmin
        .from("content_views")
        .select("views")
        .eq("content_type", type)
        .eq("slug", cleanSlug)
        .maybeSingle();

      return NextResponse.json(
        {
          success: true,
          views: Number(data?.views ?? 0),
          counted: false,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // =====================================================
    // ATOMIC INCREMENT
    // =====================================================

    const { data, error } = await supabaseAdmin.rpc(
      "increment_content_view",
      {
        p_content_type: type,
        p_slug: cleanSlug,
      }
    );

    if (error) {
      console.error("INCREMENT VIEW ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Gagal menambah jumlah pembaca",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        views: Number(data ?? 0),
        counted: true,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("POST /api/views ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}
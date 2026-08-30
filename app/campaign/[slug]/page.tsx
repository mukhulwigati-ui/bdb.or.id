// app/campaign/[slug]/page.tsx

import type { Metadata } from "next";
import { headers } from "next/headers";
import CampaignDetailClient from "@/components/CampaignDetailClient";

interface Props {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    ref?: string;
  }>;
}

interface ProgramData {
  _id?: string;
  _updatedAt?: string;

  slug?: string;
  title?: string;

  description?: unknown;
  excerpt?: unknown;

  image?: string;

  [key: string]: any;
}

interface ProgramsApiResponse {
  success?: boolean;
  data?: ProgramData[];
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================
// WEBSITE
// ============================================================

const SITE_URL = "https://www.bdb.or.id";

const DEFAULT_TITLE =
  "Program Donasi | Balai Dakwah Banjarnegara";

const DEFAULT_DESCRIPTION =
  "Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui Balai Dakwah Banjarnegara.";

const DEFAULT_IMAGE =
  `${SITE_URL}/images/banner.png`;

// ============================================================
// NORMALISASI SLUG
// Harus sama dengan CampaignDetailClient
// ============================================================

function normalizeSlug(value: string): string {
  return decodeURIComponent(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// ============================================================
// PORTABLE TEXT / HTML -> PLAIN TEXT
// ============================================================

function toPlainText(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((block: any) => {
        if (
          block?._type === "block" &&
          Array.isArray(block.children)
        ) {
          return block.children
            .map((child: any) => child?.text || "")
            .join("");
        }

        return "";
      })
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return "";
}

// ============================================================
// DESCRIPTION
// ============================================================

function createDescription(
  value: unknown,
  fallback: string
): string {
  const text = toPlainText(value);

  if (!text) {
    return fallback;
  }

  if (text.length <= 155) {
    return text;
  }

  return `${text.slice(0, 152).trim()}...`;
}

// ============================================================
// ABSOLUTE URL
// ============================================================

function makeAbsoluteUrl(
  value: string | null | undefined
): string {
  if (!value) {
    return DEFAULT_IMAGE;
  }

  const url = String(value).trim();

  if (!url) {
    return DEFAULT_IMAGE;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("/")) {
    return `${SITE_URL}${url}`;
  }

  return `${SITE_URL}/${url}`;
}

// ============================================================
// OPTIMASI GAMBAR UNTUK WHATSAPP / FACEBOOK
//
// Gambar tetap berasal dari program.image.
//
// Jika berasal dari Sanity:
// - 1200x630
// - JPEG
// - quality 70
// - crop
//
// Tujuannya supaya ukuran file jauh lebih kecil dan
// mudah dibaca crawler WhatsApp.
// ============================================================

function makeSocialImage(
  originalImage: string,
  updatedAt?: string
): string {
  const absoluteImage =
    makeAbsoluteUrl(originalImage);

  try {
    const url = new URL(absoluteImage);

    // ========================================================
    // SANITY CDN
    // ========================================================

    if (
      url.hostname === "cdn.sanity.io" ||
      url.hostname.endsWith(".sanity.io")
    ) {
      // Hapus parameter lama yang mungkin membuat konflik
      url.searchParams.delete("w");
      url.searchParams.delete("h");
      url.searchParams.delete("width");
      url.searchParams.delete("height");

      url.searchParams.delete("q");
      url.searchParams.delete("quality");

      url.searchParams.delete("fm");
      url.searchParams.delete("format");

      url.searchParams.delete("fit");
      url.searchParams.delete("crop");
      url.searchParams.delete("rect");

      // Gambar Open Graph yang ringan
      url.searchParams.set("w", "1200");
      url.searchParams.set("h", "630");
      url.searchParams.set("fit", "crop");

      // Paksa JPEG supaya kompatibel dengan WA
      url.searchParams.set("fm", "jpg");

      // Cukup tajam untuk preview,
      // tetapi file jauh lebih kecil
      url.searchParams.set("q", "70");
    }

    // ========================================================
    // CACHE BUSTER GAMBAR
    // ========================================================

    if (updatedAt) {
      const timestamp =
        new Date(updatedAt).getTime();

      if (!Number.isNaN(timestamp)) {
        url.searchParams.set(
          "v",
          timestamp.toString()
        );
      }
    }

    return url.toString();
  } catch {
    return absoluteImage;
  }
}

// ============================================================
// BASE URL UNTUK INTERNAL FETCH
// ============================================================

async function getRequestBaseUrl(): Promise<string> {
  try {
    const headerList =
      await headers();

    const forwardedHost =
      headerList.get("x-forwarded-host");

    const host =
      forwardedHost ||
      headerList.get("host");

    const forwardedProto =
      headerList.get("x-forwarded-proto");

    if (!host) {
      return SITE_URL;
    }

    const protocol =
      forwardedProto ||
      (host.includes("localhost")
        ? "http"
        : "https");

    return `${protocol}://${host}`;
  } catch {
    return SITE_URL;
  }
}

// ============================================================
// GET PROGRAM
//
// Mengambil API YANG SAMA dengan CampaignDetailClient.
// ============================================================

async function getProgram(
  requestedSlug: string
): Promise<ProgramData | null> {
  try {
    const baseUrl =
      await getRequestBaseUrl();

    const apiUrl =
      `${baseUrl}/api/programs?t=${Date.now()}`;

    const response =
      await fetch(apiUrl, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

    if (!response.ok) {
      console.error(
        "[Metadata] /api/programs HTTP:",
        response.status
      );

      return null;
    }

    const json =
      (await response.json()) as ProgramsApiResponse;

    if (
      !json.success ||
      !Array.isArray(json.data)
    ) {
      console.error(
        "[Metadata] Data /api/programs tidak valid"
      );

      return null;
    }

    // ========================================================
    // SAMA DENGAN CampaignDetailClient
    // ========================================================

    const cleanParamSlug =
      normalizeSlug(requestedSlug);

    const found =
      json.data.find((program) => {
        const programSlug =
          String(program?.slug || "");

        const cleanDbSlug =
          programSlug
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

        return (
          cleanDbSlug === cleanParamSlug ||
          programSlug === requestedSlug ||
          program?._id === requestedSlug
        );
      }) || null;

    return found;
  } catch (error) {
    console.error(
      "[Metadata] getProgram error:",
      error
    );

    return null;
  }
}

// ============================================================
// GENERATE METADATA
// ============================================================

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}): Promise<Metadata> {
  const { slug } =
    await params;

  const decodedSlug =
    decodeURIComponent(slug).trim();

  const canonicalUrl =
    `${SITE_URL}/campaign/${encodeURIComponent(
      decodedSlug
    )}`;

  // ==========================================================
  // AMBIL PROGRAM
  // ==========================================================

  const program =
    await getProgram(decodedSlug);

  // ==========================================================
  // TITLE
  // ==========================================================

  const title =
    program?.title &&
    String(program.title).trim()
      ? `${String(
          program.title
        ).trim()} | Balai Dakwah Banjarnegara`
      : DEFAULT_TITLE;

  // ==========================================================
  // DESCRIPTION
  // ==========================================================

  const description =
    program
      ? createDescription(
          program.excerpt ||
            program.description,
          DEFAULT_DESCRIPTION
        )
      : DEFAULT_DESCRIPTION;

  // ==========================================================
  // GAMBAR ASLI YANG DIPAKAI BLOG DETAIL
  // ==========================================================

  const originalImage =
    program?.image &&
    typeof program.image === "string" &&
    program.image.trim()
      ? program.image.trim()
      : DEFAULT_IMAGE;

  // ==========================================================
  // GAMBAR KHUSUS SOCIAL PREVIEW
  //
  // Sumber tetap originalImage/program.image.
  // Hanya dioptimasi ukurannya.
  // ==========================================================

  const socialImage =
    makeSocialImage(
      originalImage,
      program?._updatedAt
    );

  // ==========================================================
  // DEBUG
  // ==========================================================

  console.log(
    "[Campaign OpenGraph]",
    {
      slug: decodedSlug,
      title: program?.title,
      originalImage,
      socialImage,
    }
  );

  // ==========================================================
  // METADATA
  // ==========================================================

  return {
    metadataBase:
      new URL(SITE_URL),

    title,
    description,

    alternates: {
      canonical:
        canonicalUrl,
    },

    robots: {
      index: true,
      follow: true,
    },

    openGraph: {
      type: "article",

      locale:
        "id_ID",

      siteName:
        "Balai Dakwah Banjarnegara",

      url:
        canonicalUrl,

      title,

      description,

      images: [
        {
          url:
            socialImage,

          secureUrl:
            socialImage,

          width:
            1200,

          height:
            630,

          type:
            "image/jpeg",

          alt:
            program?.title ||
            title,
        },
      ],
    },

    twitter: {
      card:
        "summary_large_image",

      title,

      description,

      images: [
        {
          url:
            socialImage,

          alt:
            program?.title ||
            title,
        },
      ],
    },

    // ========================================================
    // TAMBAHAN UNTUK CRAWLER LAIN
    // ========================================================

    other: {
      "og:image:type":
        "image/jpeg",

      "og:image:width":
        "1200",

      "og:image:height":
        "630",
    },
  };
}

// ============================================================
// PAGE
// ============================================================

export default async function CampaignPage({
  params,
  searchParams,
}: Props) {
  const { slug } =
    await params;

  const { ref } =
    await searchParams;

  return (
    <CampaignDetailClient
      slug={slug}
      referral={ref ?? null}
    />
  );
}
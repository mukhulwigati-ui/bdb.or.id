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

  // INI YANG DIPAKAI CampaignDetailClient
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
// KONFIGURASI WEBSITE
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
//
// HARUS SAMA DENGAN CampaignDetailClient
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

  if (text.length <= 160) {
    return text;
  }

  return `${text.slice(0, 157).trim()}...`;
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
// BASE URL UNTUK FETCH INTERNAL API
// ============================================================

async function getRequestBaseUrl(): Promise<string> {
  try {
    const headerList = await headers();

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

    let protocol = forwardedProto;

    if (!protocol) {
      protocol = host.includes("localhost")
        ? "http"
        : "https";
    }

    return `${protocol}://${host}`;
  } catch {
    return SITE_URL;
  }
}

// ============================================================
// AMBIL PROGRAM
//
// PENTING:
// DATA DIAMBIL DARI API YANG SAMA DENGAN CampaignDetailClient
// ============================================================

async function getProgram(
  requestedSlug: string
): Promise<ProgramData | null> {
  try {
    const baseUrl =
      await getRequestBaseUrl();

    const apiUrl =
      `${baseUrl}/api/programs?t=${Date.now()}`;

    const response = await fetch(apiUrl, {
      cache: "no-store",

      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        "[Metadata] /api/programs gagal:",
        response.status,
        response.statusText
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
        "[Metadata] Format /api/programs tidak valid"
      );

      return null;
    }

    // --------------------------------------------------------
    // LOGIKA PENCARIAN INI SAMA DENGAN CampaignDetailClient
    // --------------------------------------------------------

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
      "[Metadata] Gagal mengambil program:",
      error
    );

    return null;
  }
}

// ============================================================
// CACHE BUSTER GAMBAR
// ============================================================

function addImageVersion(
  imageUrl: string,
  program?: ProgramData | null
): string {
  try {
    const url = new URL(imageUrl);

    /*
     * Kalau API menyediakan _updatedAt,
     * gunakan sebagai cache buster.
     *
     * Saat gambar/program diubah,
     * Facebook/WhatsApp melihat URL baru.
     */
    if (program?._updatedAt) {
      const timestamp =
        new Date(
          program._updatedAt
        ).getTime();

      if (!Number.isNaN(timestamp)) {
        url.searchParams.set(
          "v",
          timestamp.toString()
        );
      }
    }

    return url.toString();
  } catch {
    return imageUrl;
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
  // AMBIL DATA DARI SUMBER YANG SAMA DENGAN DETAIL
  // ==========================================================

  const program =
    await getProgram(decodedSlug);

  // ==========================================================
  // DEFAULT
  // ==========================================================

  let title =
    DEFAULT_TITLE;

  let description =
    DEFAULT_DESCRIPTION;

  let image =
    DEFAULT_IMAGE;

  // ==========================================================
  // TITLE
  // ==========================================================

  if (
    program?.title &&
    String(program.title).trim()
  ) {
    title =
      `${String(
        program.title
      ).trim()} | Balai Dakwah Banjarnegara`;
  }

  // ==========================================================
  // DESCRIPTION
  // ==========================================================

  if (program) {
    description =
      createDescription(
        program.excerpt ||
          program.description,
        DEFAULT_DESCRIPTION
      );
  }

  // ==========================================================
  // GAMBAR
  //
  // INI BAGIAN TERPENTING.
  //
  // CampaignDetailClient:
  //
  // <img src={program.image} ... />
  //
  // Maka OpenGraph WAJIB mengambil:
  //
  // program.image
  //
  // BUKAN:
  // image.asset->url
  // thumbnail
  // banner
  // mainImage
  // dll.
  // ==========================================================

  if (
    program?.image &&
    typeof program.image === "string" &&
    program.image.trim()
  ) {
    image =
      makeAbsoluteUrl(
        program.image
      );
  }

  // ==========================================================
  // CACHE BUSTER
  // ==========================================================

  const socialImage =
    addImageVersion(
      makeAbsoluteUrl(image),
      program
    );

  // Debug server Vercel
  console.log(
    "[Campaign Metadata]",
    {
      slug: decodedSlug,
      id: program?._id,
      title: program?.title,
      imageDetail: program?.image,
      ogImage: socialImage,
    }
  );

  // ==========================================================
  // RETURN METADATA
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

      locale: "id_ID",

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
        socialImage,
      ],
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
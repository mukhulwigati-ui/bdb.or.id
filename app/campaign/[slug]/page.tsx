// app/campaign/[slug]/page.tsx

import type { Metadata } from "next";
import { createClient } from "@sanity/client";

import CampaignDetailClient from "@/components/CampaignDetailClient";

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    ref?: string;
  }>;
}

interface CampaignMetadataData {
  title?: string;

  description?: unknown;

  excerpt?: unknown;

  imageUrl?: string;
}

// ============================================================================
// RENDERING
// ============================================================================

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// SITE CONFIG
// ============================================================================

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.bdb.or.id"
).replace(/\/$/, "");

const SITE_NAME = "BDB.or.id";

const DEFAULT_TITLE =
  "Program Donasi | bdb.or.id";

const DEFAULT_DESCRIPTION =
  "Salurkan donasi, infak, sedekah, zakat, dan wakaf terbaik Anda melalui bdb.or.id.";

/**
 * Fallback jika campaign tidak memiliki gambar.
 *
 * Saya sarankan tetap sediakan:
 *
 * public/og-image.jpg
 *
 * ukuran:
 *
 * 1200 x 630 px
 * JPEG asli
 *
 * sehingga bisa dibuka:
 *
 * https://www.bdb.or.id/og-image.jpg
 */
const DEFAULT_OG_IMAGE =
  `${SITE_URL}/og-image.jpg`;

// ============================================================================
// SANITY CLIENT
// ============================================================================

const sanityMetaClient = createClient({
  projectId:
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    "xqggeww8",

  dataset:
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    "production",

  apiVersion:
    "2026-09-19",

  useCdn:
    false,

  perspective:
    "published",

  /**
   * JANGAN hardcode token di source code.
   *
   * Jika dataset public, token sebenarnya tidak diperlukan.
   *
   * Kalau dataset private, buat environment variable di Vercel:
   *
   * SANITY_API_READ_TOKEN
   */
  token:
    process.env.SANITY_API_READ_TOKEN,
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Mengubah string / HTML / Portable Text sederhana
 * menjadi plain text untuk meta description.
 */
function toPlainText(
  value: unknown
): string {
  if (!value) {
    return "";
  }

  // --------------------------------------------------------------------------
  // STRING / HTML
  // --------------------------------------------------------------------------

  if (typeof value === "string") {
    return value
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  // --------------------------------------------------------------------------
  // PORTABLE TEXT
  // --------------------------------------------------------------------------

  if (Array.isArray(value)) {
    return value
      .map((block: any) => {
        if (
          block?._type !== "block" ||
          !Array.isArray(block?.children)
        ) {
          return "";
        }

        return block.children
          .map((child: any) => {
            if (
              typeof child?.text === "string"
            ) {
              return child.text;
            }

            return "";
          })
          .join("");
      })
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return "";
}

/**
 * Meta description dibuat tidak terlalu panjang.
 */
function createMetaDescription(
  value: unknown,
  fallback: string
): string {
  const plainText =
    toPlainText(value);

  if (!plainText) {
    return fallback;
  }

  if (plainText.length <= 160) {
    return plainText;
  }

  return `${plainText
    .slice(0, 157)
    .trim()}...`;
}

/**
 * Mengubah URL gambar Sanity menjadi:
 *
 * - JPEG asli
 * - 1200 x 630
 * - crop
 * - quality 85
 *
 * Ini penting supaya crawler WhatsApp tidak mendapatkan
 * file berukuran / format yang berbeda dari metadata.
 */
function buildSocialImageUrl(
  sourceImage?: string
): string {
  if (!sourceImage) {
    return DEFAULT_OG_IMAGE;
  }

  let absoluteImage =
    sourceImage.trim();

  // --------------------------------------------------------------------------
  // RELATIVE URL
  // --------------------------------------------------------------------------

  if (
    absoluteImage.startsWith("/")
  ) {
    absoluteImage =
      `${SITE_URL}${absoluteImage}`;
  } else if (
    !absoluteImage.startsWith("http://") &&
    !absoluteImage.startsWith("https://")
  ) {
    absoluteImage =
      `${SITE_URL}/${absoluteImage.replace(/^\/+/, "")}`;
  }

  // --------------------------------------------------------------------------
  // SANITY CDN
  // --------------------------------------------------------------------------

  try {
    const url =
      new URL(absoluteImage);

    if (
      url.hostname ===
      "cdn.sanity.io"
    ) {
      /**
       * Jangan gunakan auto=format untuk OG WhatsApp.
       *
       * Kita paksa JPG supaya respons server benar-benar image/jpeg.
       */
      url.searchParams.set(
        "w",
        "1200"
      );

      url.searchParams.set(
        "h",
        "630"
      );

      url.searchParams.set(
        "fit",
        "crop"
      );

      url.searchParams.set(
        "fm",
        "jpg"
      );

      url.searchParams.set(
        "q",
        "85"
      );

      return url.toString();
    }

    return url.toString();
  } catch {
    return DEFAULT_OG_IMAGE;
  }
}

// ============================================================================
// GET CAMPAIGN METADATA
// ============================================================================

async function getCampaignMetadata(
  slug: string
): Promise<CampaignMetadataData | null> {
  try {
    const query = `
      *[
        (
          _type == "program" ||
          _type == "campaign"
        ) &&
        (
          slug.current == $slug ||
          _id == $slug
        )
      ][0] {
        title,

        description,

        excerpt,

        "imageUrl": coalesce(
          mainImage.asset->url,
          image.asset->url,
          thumbnail.asset->url,
          banner.asset->url
        )
      }
    `;

    const campaign =
      await sanityMetaClient.fetch<CampaignMetadataData | null>(
        query,
        {
          slug,
        },
        {
          cache:
            "no-store",
        }
      );

    return campaign || null;
  } catch (error) {
    console.error(
      "[CAMPAIGN METADATA] Gagal mengambil metadata dari Sanity:",
      error
    );

    return null;
  }
}

// ============================================================================
// GENERATE METADATA
// ============================================================================

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}): Promise<Metadata> {
  // ==========================================================================
  // SLUG
  // ==========================================================================

  const {
    slug,
  } = await params;

  const decodedSlug =
    decodeURIComponent(
      slug
    ).trim();

  /**
   * Encode kembali untuk menghasilkan URL canonical yang aman.
   */
  const encodedSlug =
    encodeURIComponent(
      decodedSlug
    );

  const campaignUrl =
    `${SITE_URL}/campaign/${encodedSlug}`;

  // ==========================================================================
  // GET DATA
  // ==========================================================================

  const campaign =
    await getCampaignMetadata(
      decodedSlug
    );

  // ==========================================================================
  // DEFAULT META
  // ==========================================================================

  let title =
    DEFAULT_TITLE;

  let description =
    DEFAULT_DESCRIPTION;

  let image =
    DEFAULT_OG_IMAGE;

  // ==========================================================================
  // CAMPAIGN META
  // ==========================================================================

  if (campaign) {
    // ------------------------------------------------------------------------
    // TITLE
    // ------------------------------------------------------------------------

    if (
      typeof campaign.title ===
        "string" &&
      campaign.title.trim()
    ) {
      title =
        campaign.title.trim();
    }

    // ------------------------------------------------------------------------
    // DESCRIPTION
    // ------------------------------------------------------------------------

    const rawDescription =
      campaign.excerpt ||
      campaign.description;

    description =
      createMetaDescription(
        rawDescription,
        `Dukung program ${title} bersama bdb.or.id.`
      );

    // ------------------------------------------------------------------------
    // IMAGE
    // ------------------------------------------------------------------------

    image =
      buildSocialImageUrl(
        campaign.imageUrl
      );
  }

  // ==========================================================================
  // RETURN METADATA
  // ==========================================================================

  return {
    metadataBase:
      new URL(
        SITE_URL
      ),

    // ------------------------------------------------------------------------
    // TITLE
    // ------------------------------------------------------------------------

    /**
     * absolute dipakai supaya template title dari root layout
     * tidak menghasilkan title ganda.
     */
    title: {
      absolute:
        title,
    },

    // ------------------------------------------------------------------------
    // DESCRIPTION
    // ------------------------------------------------------------------------

    description,

    // ------------------------------------------------------------------------
    // CANONICAL
    // ------------------------------------------------------------------------

    alternates: {
      canonical:
        campaignUrl,
    },

    // ------------------------------------------------------------------------
    // ROBOTS
    // ------------------------------------------------------------------------

    robots: {
      index:
        true,

      follow:
        true,

      googleBot: {
        index:
          true,

        follow:
          true,

        "max-image-preview":
          "large",

        "max-snippet":
          -1,

        "max-video-preview":
          -1,
      },
    },

    // ------------------------------------------------------------------------
    // OPEN GRAPH
    // ------------------------------------------------------------------------

    openGraph: {
      type:
        "website",

      locale:
        "id_ID",

      url:
        campaignUrl,

      siteName:
        SITE_NAME,

      title,

      description,

      images: [
        {
          /**
           * URL sudah absolut.
           *
           * Untuk Sanity akan berbentuk:
           *
           * https://cdn.sanity.io/images/...jpg?w=1200&h=630&fit=crop&fm=jpg&q=85
           */
          url:
            image,

          width:
            1200,

          height:
            630,

          alt:
            title,
        },
      ],
    },

    // ------------------------------------------------------------------------
    // TWITTER / X
    // ------------------------------------------------------------------------

    twitter: {
      card:
        "summary_large_image",

      title,

      description,

      images: [
        {
          url:
            image,

          alt:
            title,
        },
      ],
    },
  };
}

// ============================================================================
// PAGE
// ============================================================================

export default async function CampaignPage({
  params,
  searchParams,
}: Props) {
  // ==========================================================================
  // PARAMS
  // ==========================================================================

  const {
    slug,
  } = await params;

  const {
    ref,
  } = await searchParams;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <CampaignDetailClient
      slug={slug}
      referral={ref ?? null}
    />
  );
}
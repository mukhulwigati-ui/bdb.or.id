// app/campaign/[slug]/page.tsx

import type { Metadata } from "next";
import { createClient } from "@sanity/client";
import CampaignDetailClient from "@/components/CampaignDetailClient";

interface Props {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    ref?: string;
  }>;
}

interface CampaignMetadata {
  _id?: string;
  _updatedAt?: string;
  title?: string;
  description?: unknown;
  excerpt?: unknown;
  imageUrl?: string | null;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================
// KONFIGURASI
// ============================================================

const SITE_URL = "https://www.bdb.or.id";

const DEFAULT_TITLE =
  "Program Donasi | Balai Dakwah Banjarnegara";

const DEFAULT_DESCRIPTION =
  "Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui Balai Dakwah Banjarnegara.";

const DEFAULT_IMAGE =
  `${SITE_URL}/images/banner.png`;

// ============================================================
// SANITY CLIENT
// ============================================================

const sanityMetaClient = createClient({
  projectId: "xqggeww8",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  perspective: "published",

  // Jangan hardcode token di source code.
  // Jika dataset Sanity public, bagian token ini boleh dihapus.
  token: process.env.SANITY_API_READ_TOKEN,
});

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
// POTONG DESCRIPTION
// ============================================================

function makeDescription(
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

  const url = value.trim();

  if (!url) {
    return DEFAULT_IMAGE;
  }

  if (url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("http://")) {
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
// SOCIAL IMAGE
// ============================================================

function makeSocialImage(
  imageUrl: string,
  updatedAt?: string
): string {
  try {
    const url = new URL(imageUrl);

    // --------------------------------------------------------
    // JIKA GAMBAR BERASAL DARI SANITY
    // --------------------------------------------------------

    if (url.hostname === "cdn.sanity.io") {
      url.searchParams.set("w", "1200");
      url.searchParams.set("h", "630");
      url.searchParams.set("fit", "crop");
      url.searchParams.set("fm", "jpg");
      url.searchParams.set("q", "90");
    }

    // --------------------------------------------------------
    // CACHE BUSTER
    // --------------------------------------------------------

    if (updatedAt) {
      const timestamp = new Date(updatedAt).getTime();

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
  const { slug } = await params;

  const decodedSlug =
    decodeURIComponent(slug).trim();

  const canonicalUrl =
    `${SITE_URL}/campaign/${encodeURIComponent(decodedSlug)}`;

  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  let image = DEFAULT_IMAGE;
  let updatedAt: string | undefined;

  try {
    // ========================================================
    // QUERY SANITY
    //
    // PENTING:
    // Query pertama-tama mengambil field "image".
    //
    // Kalau CampaignDetailClient juga menggunakan field image,
    // maka gambar detail dan gambar medsos akan sama.
    // ========================================================

    const query = `
      *[
        (_type == "campaign" || _type == "program") &&
        slug.current == $slug
      ][0] {
        _id,
        _updatedAt,
        title,
        description,
        excerpt,

        "imageUrl": image.asset->url
      }
    `;

    const campaign =
      await sanityMetaClient.fetch<CampaignMetadata | null>(
        query,
        {
          slug: decodedSlug,
        }
      );

    if (campaign) {
      // ------------------------------------------------------
      // TITLE
      // ------------------------------------------------------

      if (
        campaign.title &&
        campaign.title.trim()
      ) {
        title =
          `${campaign.title.trim()} | Balai Dakwah Banjarnegara`;
      }

      // ------------------------------------------------------
      // DESCRIPTION
      // ------------------------------------------------------

      const rawDescription =
        campaign.excerpt ||
        campaign.description;

      description = makeDescription(
        rawDescription,
        DEFAULT_DESCRIPTION
      );

      // ------------------------------------------------------
      // IMAGE
      // ------------------------------------------------------

      if (
        campaign.imageUrl &&
        typeof campaign.imageUrl === "string"
      ) {
        image = makeAbsoluteUrl(
          campaign.imageUrl
        );
      }

      // ------------------------------------------------------
      // UPDATED AT
      // ------------------------------------------------------

      if (campaign._updatedAt) {
        updatedAt =
          campaign._updatedAt;
      }
    }
  } catch (error) {
    console.error(
      "[generateMetadata] Sanity error:",
      error
    );
  }

  // ==========================================================
  // FINAL IMAGE
  // ==========================================================

  const socialImage =
    makeSocialImage(
      makeAbsoluteUrl(image),
      updatedAt
    );

  // ==========================================================
  // METADATA
  // ==========================================================

  return {
    metadataBase: new URL(SITE_URL),

    title,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    robots: {
      index: true,
      follow: true,
    },

    openGraph: {
      type: "article",
      locale: "id_ID",
      siteName: "Balai Dakwah Banjarnegara",
      url: canonicalUrl,
      title,
      description,

      images: [
        {
          url: socialImage,
          secureUrl: socialImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
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
  const { slug } = await params;
  const { ref } = await searchParams;

  return (
    <CampaignDetailClient
      slug={slug}
      referral={ref ?? null}
    />
  );
}
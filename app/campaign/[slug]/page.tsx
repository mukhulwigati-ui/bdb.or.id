// app/campaign/[slug]/page.tsx

import type { Metadata } from "next";
import CampaignDetailClient from "@/components/CampaignDetailClient";
import { createClient } from "@sanity/client";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ======================================================
// KONFIGURASI
// ======================================================

const SITE_URL = "https://www.bdb.or.id";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

if (!projectId) {
  throw new Error(
    "NEXT_PUBLIC_SANITY_PROJECT_ID belum tersedia."
  );
}

// ======================================================
// PENTING:
// JANGAN hard-code projectId Sanity di sini.
// Gunakan project yang SAMA dengan halaman detail.
// ======================================================

const sanityMetaClient = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  perspective: "published",

  // Kalau dataset private:
  token: process.env.SANITY_API_READ_TOKEN,
});

// ======================================================
// PORTABLE TEXT / HTML -> PLAIN TEXT
// ======================================================

function toPlainText(value: any): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (Array.isArray(value)) {
    return value
      .filter(
        (block: any) =>
          block?._type === "block" &&
          Array.isArray(block.children)
      )
      .map((block: any) =>
        block.children
          .map((child: any) => child?.text || "")
          .join("")
      )
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return "";
}

// ======================================================
// ABSOLUTE URL
// ======================================================

function absoluteUrl(url?: string | null): string {
  if (!url) {
    return `${SITE_URL}/images/banner.png`;
  }

  const value = String(url).trim();

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (value.startsWith("/")) {
    return `${SITE_URL}${value}`;
  }

  return `${SITE_URL}/${value}`;
}

// ======================================================
// SOCIAL IMAGE
// ======================================================

function socialImage(
  imageUrl: string,
  updatedAt?: string
): string {
  try {
    const url = new URL(imageUrl);

    // Optimasi hanya jika gambar memang dari Sanity
    if (url.hostname === "cdn.sanity.io") {
      url.searchParams.set("w", "1200");
      url.searchParams.set("h", "630");
      url.searchParams.set("fit", "crop");
      url.searchParams.set("auto", "format");
      url.searchParams.set("q", "90");
    }

    // Cache busting
    if (updatedAt) {
      url.searchParams.set(
        "v",
        new Date(updatedAt).getTime().toString()
      );
    }

    return url.toString();
  } catch {
    return imageUrl;
  }
}

// ======================================================
// METADATA
// ======================================================

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const decodedSlug =
    decodeURIComponent(slug).trim();

  const canonicalUrl =
    `${SITE_URL}/campaign/${encodeURIComponent(
      decodedSlug
    )}`;

  // Default
  let title =
    "Program Donasi | Balai Dakwah Banjarnegara";

  let description =
    "Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui Balai Dakwah Banjarnegara.";

  let image =
    `${SITE_URL}/images/banner.png`;

  let updatedAt = "";

  try {
    // ==================================================
    // PENTING:
    //
    // 1. Cari berdasarkan SLUG saja.
    // 2. Ambil document TERBARU.
    // 3. Jangan menggunakan _id == slug.
    //
    // Ini mencegah pengambilan document lama / salah.
    // ==================================================

    const query = `
      *[
        slug.current == $slug &&
        (
          _type == "campaign" ||
          _type == "program"
        )
      ]
      | order(_updatedAt desc)
      [0]
      {
        _id,
        _type,
        _updatedAt,

        title,
        excerpt,
        description,

        /*
         * PRIORITAS GAMBAR DETAIL
         *
         * Field image diletakkan BELAKANG
         * karena kemungkinan merupakan gambar lama.
         */
        "detailImage": coalesce(
          mainImage.asset->url,
          featuredImage.asset->url,
          coverImage.asset->url,
          thumbnail.asset->url,
          banner.asset->url,

          mainImageUrl,
          featuredImageUrl,
          coverImageUrl,
          thumbnailUrl,
          bannerUrl,

          image.asset->url,
          imageUrl
        )
      }
    `;

    const campaign =
      await sanityMetaClient.fetch(
        query,
        {
          slug: decodedSlug,
        },
        {
          cache: "no-store",
        }
      );

    console.log(
      "[OG CAMPAIGN]",
      decodedSlug,
      campaign
    );

    if (campaign) {
      // ----------------------------------------------
      // TITLE
      // ----------------------------------------------

      if (campaign.title) {
        title =
          `${campaign.title} | Balai Dakwah Banjarnegara`;
      }

      // ----------------------------------------------
      // DESCRIPTION
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
// SANITY CLIENT KHUSUS SERVER / METADATA
// ======================================================
const sanityMetaClient = createClient({
  projectId: "xqggeww8",
  dataset: "production",
  useCdn: false,
  apiVersion: "2024-01-01",

  // Jika dataset PUBLIC, token sebenarnya tidak diperlukan.
  // Jika PRIVATE, simpan token di .env.local:
  // SANITY_API_READ_TOKEN=xxxx
  token: process.env.SANITY_API_READ_TOKEN,

  perspective: "published",
});

// ======================================================
// HELPER: UBAH PORTABLE TEXT / HTML MENJADI TEKS BIASA
// ======================================================
function getPlainText(value: any): string {
  if (!value) return "";

  // Jika description berbentuk string / HTML
  if (typeof value === "string") {
    return value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Jika berbentuk Portable Text Sanity
  if (Array.isArray(value)) {
    return value
      .filter(
        (block: any) =>
          block?._type === "block" && Array.isArray(block.children)
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
// HELPER: PASTIKAN URL ABSOLUT
// ======================================================
function makeAbsoluteUrl(
  url: string | null | undefined,
  siteUrl: string
): string {
  if (!url) {
    return `${siteUrl}/images/banner.png`;
  }

  const cleanUrl = String(url).trim();

  if (/^https?:\/\//i.test(cleanUrl)) {
    return cleanUrl;
  }

  if (cleanUrl.startsWith("//")) {
    return `https:${cleanUrl}`;
  }

  if (cleanUrl.startsWith("/")) {
    return `${siteUrl}${cleanUrl}`;
  }

  return `${siteUrl}/${cleanUrl}`;
}

// ======================================================
// HELPER: BUAT GAMBAR KHUSUS SOCIAL MEDIA
// Tetap berasal dari gambar campaign yang sama.
// ======================================================
function createSocialImageUrl(
  originalUrl: string,
  updatedAt?: string
): string {
  try {
    const url = new URL(originalUrl);

    // Jika gambar dari Sanity CDN, buat ukuran ideal
    // untuk WhatsApp, Facebook, X, Telegram, dll.
    if (url.hostname === "cdn.sanity.io") {
      url.searchParams.set("w", "1200");
      url.searchParams.set("h", "630");
      url.searchParams.set("fit", "crop");
      url.searchParams.set("fm", "jpg");
      url.searchParams.set("q", "90");
    }

    // Cache-busting.
    // Ketika campaign/gambar diupdate di Sanity,
    // URL metadata gambar ikut berubah.
    if (updatedAt) {
      url.searchParams.set(
        "v",
        String(new Date(updatedAt).getTime())
      );
    }

    return url.toString();
  } catch {
    return originalUrl;
  }
}

// ======================================================
// GENERATE METADATA
// ======================================================
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const decodedSlug = decodeURIComponent(slug).trim();

  const siteUrl = "https://www.bdb.or.id";

  const canonicalUrl =
    `${siteUrl}/campaign/${encodeURIComponent(decodedSlug)}`;

  // ======================================================
  // DEFAULT / FALLBACK
  // ======================================================
  let title =
    "Program Donasi | Balai Dakwah Banjarnegara";

  let description =
    "Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui Balai Dakwah Banjarnegara (bdb.or.id).";

  let imageUrl =
    `${siteUrl}/images/banner.png`;

  let updatedAt: string | undefined;

  try {
    // ======================================================
    // QUERY CAMPAIGN
    //
    // PENTING:
    // Metadata tidak lagi hanya mencari image.asset->url.
    //
    // Kita cek beberapa kemungkinan field gambar supaya
    // gambar metadata sama dengan gambar halaman detail.
    // ======================================================

    const query = `
      *[
        (_type == "program" || _type == "campaign")
        &&
        (
          slug.current == $slug ||
          _id == $slug
        )
      ][0] {
        _id,
        _type,
        _updatedAt,

        title,
        description,
        excerpt,

        "imageUrl": coalesce(

          // Field utama
          image.asset->url,

          // Beberapa nama field Sanity yang umum
          mainImage.asset->url,
          featuredImage.asset->url,
          thumbnail.asset->url,
          coverImage.asset->url,
          banner.asset->url,

          // Jika field gambar disimpan sebagai URL string
          imageUrl,
          mainImageUrl,
          thumbnailUrl,
          coverImageUrl,
          bannerUrl
        )
      }
    `;

    const campaign = await sanityMetaClient.fetch(
      query,
      {
        slug: decodedSlug,
      }
    );

    if (campaign) {
      // ====================================================
      // TITLE
      // ====================================================
      if (campaign.title) {
        title =
          `${campaign.title} | Balai Dakwah Banjarnegara`;
      }

      // ====================================================
      // DESCRIPTION
      // ====================================================
      const rawDescription =
        campaign.excerpt ||
        campaign.description;

      const plainDescription =
        getPlainText(rawDescription);

      if (plainDescription) {
        description =
          plainDescription.length > 160
            ? `${plainDescription.substring(0, 157)}...`
            : plainDescription;
      }

      // ====================================================
      // IMAGE
      // ====================================================
      if (
        campaign.imageUrl &&
        typeof campaign.imageUrl === "string"
      ) {
        imageUrl = campaign.imageUrl;
      }

      if (campaign._updatedAt) {
        updatedAt = campaign._updatedAt;
      }
    }
  } catch (error) {
    console.error(
      "[Campaign Metadata] Gagal mengambil metadata:",
      error
    );
  }

  // ======================================================
  // PASTIKAN URL GAMBAR ABSOLUT
  // ======================================================
  const absoluteImageUrl =
    makeAbsoluteUrl(imageUrl, siteUrl);

  // ======================================================
  // URL GAMBAR SOCIAL MEDIA
  // ======================================================
  const socialImageUrl =
    createSocialImageUrl(
      absoluteImageUrl,
      updatedAt
    );

  // ======================================================
  // RETURN METADATA
  // ======================================================
  return {
    metadataBase: new URL(siteUrl),

    title,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },

    openGraph: {
      type: "article",

      url: canonicalUrl,

      siteName:
        "Balai Dakwah Banjarnegara",

      locale: "id_ID",

      title,
      description,

      images: [
        {
          url: socialImageUrl,
          secureUrl: socialImageUrl,
          width: 1200,
          height: 630,
          alt: campaignImageAlt(title),
        },
      ],
    },

    twitter: {
      card: "summary_large_image",

      title,
      description,

      images: [
        {
          url: socialImageUrl,
          alt: campaignImageAlt(title),
        },
      ],
    },

    other: {
      // Membantu beberapa crawler/platform
      "og:image": socialImageUrl,
      "og:image:secure_url": socialImageUrl,
      "og:image:width": "1200",
      "og:image:height": "630",
    },
  };
}

// ======================================================
// ALT GAMBAR
// ======================================================
function campaignImageAlt(title: string): string {
  return title
    .replace(
      /\s*[|\-]\s*Balai Dakwah Banjarnegara\s*$/i,
      ""
    )
    .trim();
}

// ======================================================
// PAGE
// ======================================================
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
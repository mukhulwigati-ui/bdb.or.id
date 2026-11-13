// app/campaign/[slug]/page.tsx

import type { Metadata } from "next";
import { createClient } from "@sanity/client";
import { notFound } from "next/navigation";

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

const DEFAULT_TITLE = "Program Donasi | bdb.or.id";

const DEFAULT_DESCRIPTION =
  "Salurkan donasi, infak, sedekah, zakat, dan wakaf terbaik Anda melalui bdb.or.id.";

const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

// ============================================================================
// SANITY CLIENT
// ============================================================================

const sanityMetaClient = createClient({
  projectId:
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    "ks29gg6v",

  dataset:
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    "production",

  apiVersion: "2026-08-31",
  useCdn: false,
  perspective: "published",
  token: process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_TOKEN,
});

// ============================================================================
// HELPERS
// ============================================================================

function toPlainText(value: unknown): string {
  if (!value) return "";
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

  if (Array.isArray(value)) {
    return value
      .map((block: any) => {
        if (block?._type !== "block" || !Array.isArray(block?.children)) {
          return "";
        }
        return block.children
          .map((child: any) => (typeof child?.text === "string" ? child.text : ""))
          .join("");
      })
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return "";
}

function createMetaDescription(value: unknown, fallback: string): string {
  const plainText = toPlainText(value);
  if (!plainText) return fallback;
  if (plainText.length <= 160) return plainText;
  return `${plainText.slice(0, 157).trim()}...`;
}

function buildSocialImageUrl(sourceImage?: string): string {
  if (!sourceImage) return DEFAULT_OG_IMAGE;
  let absoluteImage = sourceImage.trim();

  if (absoluteImage.startsWith("/")) {
    absoluteImage = `${SITE_URL}${absoluteImage}`;
  } else if (!absoluteImage.startsWith("http://") && !absoluteImage.startsWith("https://")) {
    absoluteImage = `${SITE_URL}/${absoluteImage.replace(/^\/+/, "")}`;
  }

  try {
    const url = new URL(absoluteImage);
    if (url.hostname === "cdn.sanity.io") {
      url.searchParams.set("w", "1200");
      url.searchParams.set("h", "630");
      url.searchParams.set("fit", "crop");
      url.searchParams.set("fm", "jpg");
      url.searchParams.set("q", "85");
      return url.toString();
    }
    return url.toString();
  } catch {
    return DEFAULT_OG_IMAGE;
  }
}

// ============================================================================
// FETCH CAMPAIGN DATA
// ============================================================================

async function getCampaignData(slug: string) {
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
        _id,
        "id": _id,
        title,
        "slug": slug.current,
        category,
        description,
        excerpt,
        collectedAmount,
        targetAmount,
        "daysLeft": round(datetime(coalesce(endDate, "2026-12-31T23:59:59Z")) - datetime(now()) / 86400),
        donors,
        reports,
        "image": coalesce(
          mainImage.asset->url,
          image.asset->url,
          thumbnail.asset->url,
          banner.asset->url
        )
      }
    `;

    const campaign = await sanityMetaClient.fetch(query, { slug }, { cache: "no-store" });
    return campaign || null;
  } catch (error) {
    console.error("[CAMPAIGN DATA] Gagal mengambil data program dari Sanity:", error);
    return null;
  }
}

// ============================================================================
// GENERATE METADATA
// ============================================================================

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim();
  const encodedSlug = encodeURIComponent(decodedSlug);
  const campaignUrl = `${SITE_URL}/campaign/${encodedSlug}`;

  const campaign = await getCampaignData(decodedSlug);

  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  let image = DEFAULT_OG_IMAGE;

  if (campaign) {
    if (typeof campaign.title === "string" && campaign.title.trim()) {
      title = campaign.title.trim();
    }
    const rawDescription = campaign.excerpt || campaign.description;
    description = createMetaDescription(rawDescription, `Dukung program ${title} bersama bdb.or.id.`);
    image = buildSocialImageUrl(campaign.image);
  }

  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: title },
    description,
    alternates: { canonical: campaignUrl },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: campaignUrl,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: title }],
    },
  };
}

// ============================================================================
// PAGE
// ============================================================================

export default async function CampaignPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ref } = await searchParams;

  const decodedSlug = decodeURIComponent(slug).trim();
  const programData = await getCampaignData(decodedSlug);

  if (!programData) {
    notFound();
  }

  return (
    <CampaignDetailClient
      slug={slug}
      referral={ref ?? null}
      program={programData}
    />
  );
}
// app/blog/[slug]/page.tsx

import type { Metadata } from 'next';
import { createClient } from '@sanity/client';
import BlogDetailClient from '@/components/BlogDetailClient';

interface Props {
  params: Promise<{ slug: string }>;
}

// ===================================================================
// 🌐 KONFIGURASI WEBSITE
// ===================================================================

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bdb.or.id'
).replace(/\/+$/, '');

const SITE_NAME = 'BDB.OR.ID';

const DEFAULT_DESCRIPTION =
  'Informasi, inspirasi, dan artikel terbaru dari BDB.OR.ID.';

const FALLBACK_IMAGE = `${SITE_URL}/images/og-default.jpg`;

// ===================================================================
// 🧠 SANITY SERVER CLIENT
// ===================================================================

const serverClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '915u7hh1',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,

  // Jika dataset public sebenarnya token tidak wajib.
  token: process.env.SANITY_API_TOKEN,
});

// Artikel selalu dirender dari server.
// Cocok agar crawler WhatsApp/Facebook mendapatkan metadata langsung.
export const dynamic = 'force-dynamic';

// ===================================================================
// 🖼️ OPTIMASI GAMBAR UNTUK OPEN GRAPH / WHATSAPP
// ===================================================================

function getOptimizedOgImage(imageUrl?: string | null): string {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return FALLBACK_IMAGE;
  }

  try {
    // Kalau URL dari Sanity CDN, buat versi khusus OG:
    // 1200x630, JPG, crop, kualitas 80.
    if (imageUrl.includes('cdn.sanity.io/images/')) {
      const url = new URL(imageUrl);

      url.searchParams.set('w', '1200');
      url.searchParams.set('h', '630');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('crop', 'center');
      url.searchParams.set('fm', 'jpg');
      url.searchParams.set('q', '80');

      return url.toString();
    }

    // Jika dari domain lain dan sudah absolute URL.
    if (
      imageUrl.startsWith('https://') ||
      imageUrl.startsWith('http://')
    ) {
      return imageUrl;
    }

    // Jika path lokal.
    return `${SITE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  } catch {
    return FALLBACK_IMAGE;
  }
}

// ===================================================================
// ✂️ MEMBUAT DESKRIPSI AMAN UNTUK META TAG
// ===================================================================

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

function truncateText(text: string, maxLength = 160): string {
  const cleaned = cleanText(text);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength).trim()}...`;
}

function portableTextToPlainText(content: any): string {
  if (!Array.isArray(content)) return '';

  return content
    .filter(
      (block: any) =>
        block?._type === 'block' && Array.isArray(block?.children)
    )
    .map((block: any) =>
      block.children
        .map((child: any) =>
          typeof child?.text === 'string' ? child.text : ''
        )
        .join('')
    )
    .join(' ')
    .trim();
}

// ===================================================================
// 🚀 DYNAMIC METADATA
// ===================================================================

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;

  const canonicalUrl = `${SITE_URL}/blog/${encodeURIComponent(slug)}`;

  let articleTitle = 'Artikel | BDB.OR.ID';
  let articleExcerpt = DEFAULT_DESCRIPTION;
  let imageUrl = FALLBACK_IMAGE;

  try {
    const article = await serverClient.fetch(
      `
      *[
        _type in ["news", "post", "article"] &&
        slug.current == $slug
      ][0]{
        title,
        excerpt,
        content,
        publishedAt,

        "imageUrl": coalesce(
          mainImage.asset->url,
          image.asset->url,
          banner.asset->url
        ),

        "imageAlt": coalesce(
          mainImage.alt,
          image.alt,
          banner.alt
        )
      }
      `,
      { slug }
    );

    if (article) {
      // =============================================================
      // TITLE
      // =============================================================

      if (
        typeof article.title === 'string' &&
        article.title.trim()
      ) {
        articleTitle = cleanText(article.title);
      }

      // =============================================================
      // DESCRIPTION
      // =============================================================

      if (
        typeof article.excerpt === 'string' &&
        article.excerpt.trim()
      ) {
        articleExcerpt = truncateText(article.excerpt);
      } else {
        const plainContent = portableTextToPlainText(article.content);

        if (plainContent) {
          articleExcerpt = truncateText(plainContent);
        } else {
          articleExcerpt = `Baca selengkapnya artikel "${articleTitle}" di BDB.OR.ID.`;
        }
      }

      // =============================================================
      // OG IMAGE
      // =============================================================

      imageUrl = getOptimizedOgImage(article.imageUrl);
    }
  } catch (error) {
    console.error('🔥 generateMetadata Sanity error:', error);
  }

  return {
    // ===============================================================
    // BASIC SEO
    // ===============================================================

    metadataBase: new URL(SITE_URL),

    title: articleTitle,

    description: articleExcerpt,

    alternates: {
      canonical: canonicalUrl,
    },

    // ===============================================================
    // OPEN GRAPH
    // WhatsApp / Facebook / Messenger / dll
    // ===============================================================

    openGraph: {
      type: 'article',

      locale: 'id_ID',

      url: canonicalUrl,

      siteName: SITE_NAME,

      title: articleTitle,

      description: articleExcerpt,

      images: [
        {
          url: imageUrl,

          secureUrl: imageUrl,

          width: 1200,

          height: 630,

          type: 'image/jpeg',

          alt: articleTitle,
        },
      ],
    },

    // ===============================================================
    // TWITTER / X
    // ===============================================================

    twitter: {
      card: 'summary_large_image',

      title: articleTitle,

      description: articleExcerpt,

      images: [
        {
          url: imageUrl,
          alt: articleTitle,
        },
      ],
    },

    // ===============================================================
    // ROBOTS
    // ===============================================================

    robots: {
      index: true,
      follow: true,

      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

// ===================================================================
// 🖥️ SERVER COMPONENT
// ===================================================================

export default async function BlogPage({ params }: Props) {
  const { slug } = await params;

  return <BlogDetailClient slug={slug} />;
}
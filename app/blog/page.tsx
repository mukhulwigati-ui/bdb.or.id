// app/blog/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@sanity/client';

// ===================================================================
// 🌐 KONFIGURASI WEBSITE
// ===================================================================

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bdb.or.id'
).replace(/\/+$/, '');

const SITE_NAME = 'BDB.OR.ID';

// ===================================================================
// 🧠 SANITY CLIENT
// ===================================================================

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '915u7hh1',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

// ===================================================================
// 🔍 SEO METADATA HALAMAN BLOG
// ===================================================================

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: 'Blog & Berita Terbaru | BDB.OR.ID',

  description:
    'Baca artikel, berita, informasi, dan inspirasi terbaru dari BDB.OR.ID.',

  alternates: {
    canonical: `${SITE_URL}/blog`,
  },

  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: `${SITE_URL}/blog`,
    siteName: SITE_NAME,

    title: 'Blog & Berita Terbaru | BDB.OR.ID',

    description:
      'Baca artikel, berita, informasi, dan inspirasi terbaru dari BDB.OR.ID.',

    images: [
      {
        url: `${SITE_URL}/images/og-default.jpg`,
        width: 1200,
        height: 630,
        type: 'image/jpeg',
        alt: 'Blog & Berita BDB.OR.ID',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',

    title: 'Blog & Berita Terbaru | BDB.OR.ID',

    description:
      'Baca artikel, berita, informasi, dan inspirasi terbaru dari BDB.OR.ID.',

    images: [`${SITE_URL}/images/og-default.jpg`],
  },

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

// ===================================================================
// 📦 TYPE DATA
// ===================================================================

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  image: string;
  publishedAt?: string;
}

// ===================================================================
// 📰 AMBIL DAFTAR ARTIKEL LANGSUNG DARI SANITY
// ===================================================================

async function getNews(): Promise<BlogPost[]> {
  try {
    const data = await sanityClient.fetch(
      `
      *[
        _type in ["news", "post", "article"] &&
        defined(slug.current)
      ]
      | order(publishedAt desc, _createdAt desc) {
        "id": _id,
        title,
        "slug": slug.current,

        "image": coalesce(
          mainImage.asset->url,
          image.asset->url,
          banner.asset->url
        ),

        publishedAt
      }
      `
    );

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('🔥 Blog fetch error:', error);

    return [];
  }
}

// ===================================================================
// 📅 FORMAT TANGGAL
// ===================================================================

function formatDate(date?: string): string {
  if (!date) return 'Artikel terbaru';

  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  } catch {
    return 'Artikel terbaru';
  }
}

// ===================================================================
// 🖥️ BLOG PAGE
// ===================================================================

export default async function BlogPage() {
  const newsList = await getNews();

  return (
    <main className="min-h-screen bg-gray-50 pt-6 pb-24">
      <div className="w-full max-w-md mx-auto px-3 space-y-4">

        {/* ============================================================
            JUDUL
        ============================================================ */}

        <header className="text-center">
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Blog & Berita Terbaru
          </h1>

          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Informasi dan artikel terbaru dari BDB.OR.ID
          </p>
        </header>

        {/* ============================================================
            DAFTAR ARTIKEL
        ============================================================ */}

        {newsList.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-xs sm:text-sm">
            Belum ada artikel blog yang diterbitkan.
          </div>
        ) : (
          <div className="space-y-3">
            {newsList.map((post) => {
              const imageUrl =
                typeof post.image === 'string' && post.image
                  ? post.image
                  : '/images/placeholder.jpg';

              return (
                <Link
                  key={post.id || post.slug}
                  href={`/blog/${post.slug}`}
                  className="
                    group
                    bg-white
                    p-3
                    shadow-sm
                    border
                    border-gray-200/90
                    hover:shadow-md
                    transition-all
                    duration-300
                    flex
                    items-center
                    gap-3.5
                  "
                >
                  {/* Thumbnail */}

                  <div
                    className="
                      relative
                      w-28
                      sm:w-32
                      aspect-[16/10]
                      overflow-hidden
                      shrink-0
                      bg-gray-100
                    "
                  >
                    <img
                      src={imageUrl}
                      alt={post.title || 'Gambar artikel'}
                      loading="lazy"
                      decoding="async"
                      className="
                        w-full
                        h-full
                        object-cover
                        group-hover:scale-105
                        transition-transform
                        duration-300
                      "
                    />
                  </div>

                  {/* Informasi artikel */}

                  <div className="flex flex-col justify-between flex-1 pr-1 py-0.5 text-left">

                    <h2
                      className="
                        text-xs
                        sm:text-sm
                        font-bold
                        text-slate-800
                        leading-snug
                        tracking-tight
                        line-clamp-2
                        group-hover:text-[#0d5c91]
                        transition-colors
                      "
                    >
                      {post.title}
                    </h2>

                    <time
                      dateTime={post.publishedAt}
                      className="
                        text-[10px]
                        sm:text-[11px]
                        font-medium
                        text-slate-400
                        mt-2.5
                        block
                      "
                    >
                      {formatDate(post.publishedAt)}
                    </time>

                  </div>
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
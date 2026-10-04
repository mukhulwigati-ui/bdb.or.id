// app/blog/[slug]/BlogDetailClient.tsx

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PortableText } from '@portabletext/react';

import RelatedNews from '@/components/RelatedNews';
import ViewCounter from '@/components/ViewCounter';

// ============================================================================
// PORTABLE TEXT COMPONENTS
// ============================================================================

const portableTextComponents = {
  // ==========================================================================
  // CUSTOM TYPE
  // ==========================================================================

  types: {
    image: ({ value }: any) => {
      if (!value?.asset?.url) return null;

      const imageAlt =
        typeof value?.alt === 'string' && value.alt.trim()
          ? value.alt
          : 'Gambar Berita';

      return (
        <div className="my-6 min-w-0 w-full max-w-full space-y-2 overflow-hidden text-left">
          <div className="aspect-[16/9] w-full max-w-full overflow-hidden border border-gray-200/90 bg-gray-50 shadow-sm">
            <img
              src={value.asset.url}
              alt={imageAlt}
              loading="lazy"
              decoding="async"
              className="h-full w-full max-w-full object-cover"
            />
          </div>

          {typeof value?.caption === 'string' &&
            value.caption.trim() && (
              <p className="max-w-full break-words text-center text-xs font-medium italic leading-relaxed text-slate-500 sm:text-sm">
                {value.caption}
              </p>
            )}
        </div>
      );
    },
  },

  // ==========================================================================
  // MARK
  // ==========================================================================

  marks: {
    link: ({ children, value }: any) => {
      const href =
        typeof value?.href === 'string'
          ? value.href
          : '#';

      const isInternal =
        href.startsWith('/') ||
        href.startsWith('#');

      return (
        <a
          href={href}
          rel={!isInternal ? 'noreferrer noopener' : undefined}
          target={!isInternal ? '_blank' : undefined}
          className="
            max-w-full
            break-all
            font-bold
            text-[#0d5c91]
            underline
            underline-offset-2
            transition-colors
            hover:text-sky-900
          "
        >
          {children}
        </a>
      );
    },
  },

  // ==========================================================================
  // BLOCK
  // ==========================================================================

  block: {
    normal: ({ children }: any) => (
      <p
        className="
          mb-5
          min-w-0
          max-w-full
          break-words
          whitespace-normal
          text-base
          leading-relaxed
          text-slate-800
          sm:text-lg
        "
      >
        {children}
      </p>
    ),

    h1: ({ children }: any) => (
      <h1
        className="
          mb-4
          mt-8
          min-w-0
          max-w-full
          break-words
          whitespace-normal
          text-xl
          font-extrabold
          leading-snug
          tracking-tight
          text-slate-900
          sm:text-2xl
        "
      >
        {children}
      </h1>
    ),

    h2: ({ children }: any) => (
      <h2
        className="
          mb-3
          mt-7
          min-w-0
          max-w-full
          break-words
          whitespace-normal
          text-lg
          font-bold
          leading-snug
          tracking-tight
          text-slate-900
          sm:text-xl
        "
      >
        {children}
      </h2>
    ),

    h3: ({ children }: any) => (
      <h3
        className="
          mb-2.5
          mt-5
          min-w-0
          max-w-full
          break-words
          whitespace-normal
          text-base
          font-bold
          leading-snug
          text-slate-800
          sm:text-lg
        "
      >
        {children}
      </h3>
    ),

    blockquote: ({ children }: any) => (
      <blockquote
        className="
          my-5
          min-w-0
          max-w-full
          overflow-hidden
          break-words
          border-l-4
          border-[#0d5c91]
          bg-sky-50/60
          py-3
          pl-4
          pr-3
          italic
          leading-relaxed
          text-slate-700
        "
      >
        {children}
      </blockquote>
    ),
  },

  // ==========================================================================
  // LIST
  // ==========================================================================

  list: {
    bullet: ({ children }: any) => (
      <ul
        className="
          mb-5
          min-w-0
          max-w-full
          list-disc
          space-y-2
          break-words
          pl-6
          text-base
          text-slate-800
          sm:text-lg
        "
      >
        {children}
      </ul>
    ),

    number: ({ children }: any) => (
      <ol
        className="
          mb-5
          min-w-0
          max-w-full
          list-decimal
          space-y-2
          break-words
          pl-6
          text-base
          text-slate-800
          sm:text-lg
        "
      >
        {children}
      </ol>
    ),
  },

  // ==========================================================================
  // LIST ITEM
  // ==========================================================================

  listItem: {
    bullet: ({ children }: any) => (
      <li className="min-w-0 max-w-full break-words leading-relaxed">
        {children}
      </li>
    ),

    number: ({ children }: any) => (
      <li className="min-w-0 max-w-full break-words leading-relaxed">
        {children}
      </li>
    ),
  },
};

// ============================================================================
// PROPS
// ============================================================================

interface BlogDetailClientProps {
  slug: string;
}

// ============================================================================
// HELPER STRING
// ============================================================================

function renderSafeString(
  value: any,
  fallback: string = ''
): string {
  if (!value) return fallback;

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'object' &&
    typeof value.current === 'string'
  ) {
    return value.current;
  }

  return fallback;
}

// ============================================================================
// HELPER TANGGAL
// ============================================================================

function formatArticleDate(
  publishedAt?: string,
  fallback?: string
): string {
  if (!publishedAt) {
    return fallback || 'Berita Terbaru';
  }

  const date = new Date(publishedAt);

  if (Number.isNaN(date.getTime())) {
    return fallback || 'Berita Terbaru';
  }

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function BlogDetailClient({
  slug,
}: BlogDetailClientProps) {
  const [data, setData] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(false);

  const [copied, setCopied] = useState(false);

  // ==========================================================================
  // FETCH ARTICLE
  // ==========================================================================

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    async function loadArticle() {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch(
          `/api/news/${encodeURIComponent(slug)}?v=${Date.now()}`,
          {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,

            headers: {
              Accept: 'application/json',
              'Cache-Control':
                'no-cache, no-store, must-revalidate',
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Gagal mengambil artikel: ${response.status}`
          );
        }

        const json = await response.json();

        if (
          json?.success === true &&
          json?.data
        ) {
          setData(json.data);
        } else {
          setData(null);
          setError(true);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }

        console.error(
          'Fetch blog detail error:',
          err
        );

        setData(null);
        setError(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadArticle();

    return () => {
      controller.abort();
    };
  }, [slug]);

  // ==========================================================================
  // COPY LINK
  // ==========================================================================

  async function handleCopyLink() {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      await navigator.clipboard.writeText(
        window.location.href
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        'Gagal menyalin link:',
        error
      );
    }
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (loading) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-gray-50 pb-24 pt-6">
        <div className="mx-auto w-full max-w-3xl animate-pulse space-y-4 px-4 sm:px-6 lg:px-8">

          {/* Judul */}

          <div className="space-y-2">
            <div className="h-6 w-full bg-gray-200" />
            <div className="h-6 w-3/4 bg-gray-200" />
          </div>

          {/* Metadata */}

          <div className="flex justify-between">
            <div className="h-3 w-28 bg-gray-200" />
            <div className="h-3 w-20 bg-gray-200" />
          </div>

          {/* Gambar */}

          <div className="aspect-[16/9] w-full bg-gray-200" />

          {/* Isi */}

          <div className="space-y-3 pt-2">
            <div className="h-4 w-full bg-gray-200" />
            <div className="h-4 w-full bg-gray-200" />
            <div className="h-4 w-full bg-gray-200" />
            <div className="h-4 w-2/3 bg-gray-200" />
          </div>

        </div>
      </div>
    );
  }

  // ==========================================================================
  // ARTIKEL TIDAK DITEMUKAN
  // ==========================================================================

  if (
    error ||
    !data ||
    !data.article
  ) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-gray-50 px-4 pb-24 pt-16 text-center">

        <div className="mx-auto max-w-sm border border-gray-200 bg-white px-5 py-10">

          <div className="mb-3 text-3xl">
            📄
          </div>

          <p className="text-base font-bold text-slate-700">
            Artikel tidak ditemukan
          </p>

          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Artikel mungkin telah dipindahkan,
            dihapus, atau belum diterbitkan.
          </p>

          <Link
            href="/blog"
            className="mt-5 inline-flex border border-sky-100 bg-sky-50 px-4 py-2.5 text-xs font-bold text-[#0d5c91] transition hover:bg-sky-100"
          >
            ← Kembali ke Berita
          </Link>

        </div>
      </div>
    );
  }

  // ==========================================================================
  // DATA
  // ==========================================================================

  const {
    article,
    allNews,
  } = data;

  const titleString = renderSafeString(
    article?.title,
    'Detail Berita'
  );

  const categoryString = renderSafeString(
    article?.category,
    'Kabar Terbaru'
  );

  const formattedDate = formatArticleDate(
    article?.publishedAt,
    article?.timeAgo
  );

  const imageUrl =
    typeof article?.imageUrl === 'string' &&
    article.imageUrl.trim()
      ? article.imageUrl
      : '/images/placeholder.jpg';

  const imageAlt = renderSafeString(
    article?.alt,
    titleString
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-gray-50 pb-28 pt-4">

      {/* ==================================================================== */}
      {/* CONTAINER */}
      {/* ==================================================================== */}

      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 sm:px-6 lg:px-8">

        {/* ================================================================== */}
        {/* ARTICLE */}
        {/* ================================================================== */}

        <article
          className="
            min-w-0
            w-full
            max-w-full
            overflow-hidden
            space-y-4
            border
            border-gray-200/90
            bg-white
            p-4
            shadow-sm
            sm:p-6
          "
        >

          {/* ================================================================ */}
          {/* BREADCRUMB */}
          {/* ================================================================ */}

          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-xs font-medium text-slate-400"
          >
            <Link
              href="/"
              className="shrink-0 transition-colors hover:text-[#0d5c91]"
            >
              Home
            </Link>

            <span
              aria-hidden="true"
              className="shrink-0"
            >
              /
            </span>

            <Link
              href="/blog"
              className="shrink-0 transition-colors hover:text-[#0d5c91]"
            >
              Berita
            </Link>

            {categoryString && (
              <>
                <span
                  aria-hidden="true"
                  className="shrink-0"
                >
                  /
                </span>

                <span className="min-w-0 max-w-full truncate text-slate-500">
                  {categoryString}
                </span>
              </>
            )}
          </nav>

          {/* ================================================================ */}
          {/* JUDUL */}
          {/* ================================================================ */}

          <h1
            className="
              min-w-0
              max-w-full
              break-words
              whitespace-normal
              text-xl
              font-extrabold
              leading-snug
              tracking-tight
              text-slate-900
              sm:text-2xl
            "
          >
            {titleString}
          </h1>

          {/* ================================================================ */}
          {/* METADATA: TANGGAL + JUMLAH PEMBACA */}
          {/* ================================================================ */}

          <div className="flex min-w-0 max-w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-100 pb-3">

            {/* Tanggal */}

            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-500 sm:text-sm">
              <span
                aria-hidden="true"
                className="shrink-0"
              >
                📅
              </span>

              <span className="min-w-0 break-words">
                {formattedDate}
              </span>
            </span>

            {/* ============================================================ */}
            {/* VIEW COUNTER */}
            {/* ============================================================ */}

            <ViewCounter
              type="news"
              slug={slug}
              className="shrink-0 font-medium"
            />

          </div>

          {/* ================================================================ */}
          {/* GAMBAR UTAMA */}
          {/* ================================================================ */}

          <div className="min-w-0 w-full max-w-full space-y-2 overflow-hidden pt-1">

            <div className="aspect-[16/9] w-full max-w-full overflow-hidden border border-gray-200/80 bg-gray-100 shadow-inner">
              <img
                src={imageUrl}
                alt={imageAlt}
                fetchPriority="high"
                decoding="async"
                className="h-full w-full max-w-full object-cover"
              />
            </div>

            {article?.caption && (
              <p className="max-w-full break-words text-center text-xs font-medium italic leading-relaxed text-slate-500 sm:text-sm">
                Foto:{' '}
                {renderSafeString(
                  article.caption,
                  ''
                )}
              </p>
            )}

          </div>

          {/* ================================================================ */}
          {/* ISI ARTIKEL */}
          {/* ================================================================ */}

          <div
            className="
              min-w-0
              w-full
              max-w-full
              overflow-hidden
              break-words
              border-b
              border-gray-100
              pb-6
              pt-2

              [&_*]:max-w-full
              [&_img]:h-auto
              [&_img]:max-w-full
              [&_pre]:max-w-full
              [&_pre]:overflow-x-auto
              [&_table]:max-w-full
            "
          >
            {article?.content ? (
              <PortableText
                value={article.content}
                components={portableTextComponents}
              />
            ) : (
              <p className="max-w-full break-words text-base italic text-slate-400">
                Isi berita belum diunggah.
              </p>
            )}
          </div>

          {/* ================================================================ */}
          {/* SHARE */}
          {/* ================================================================ */}

          <div className="flex min-w-0 max-w-full flex-wrap items-center justify-between gap-3 pt-1">

            <span className="min-w-0 break-words text-xs font-bold text-slate-600 sm:text-sm">
              Bagikan berita ini:
            </span>

            <button
              type="button"
              onClick={handleCopyLink}
              className="
                shrink-0
                border
                border-sky-100
                bg-sky-50
                px-4
                py-2.5
                text-xs
                font-bold
                text-[#0d5c91]
                shadow-sm
                transition
                hover:bg-sky-100
                sm:text-sm
              "
            >
              {copied
                ? '✓ Link Disalin'
                : '🔗 Salin Link'}
            </button>

          </div>

        </article>

        {/* ================================================================== */}
        {/* ARTIKEL TERKAIT */}
        {/* ================================================================== */}

        <div className="min-w-0 w-full max-w-full overflow-hidden pt-2">

          <RelatedNews
            currentSlug={slug}
            category={categoryString}
            allNews={
              Array.isArray(allNews)
                ? allNews
                : []
            }
          />

        </div>

      </div>
    </main>
  );
}
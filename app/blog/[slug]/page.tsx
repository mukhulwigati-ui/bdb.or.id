// app/blog/[slug]/page.tsx
import { Metadata } from 'next';
import { createClient } from '@sanity/client';
import BlogDetailClient from '@/components/BlogDetailClient';

interface Props {
  params: Promise<{ slug: string }>;
}

// Inisialisasi Sanity Client untuk kebutuhan server-side metadata
const serverClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '915u7hh1',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
});

export const dynamic = 'force-dynamic';
export const revalidate = 60;

// ===================================================================
// 🚀 DYNAMIC METADATA: Open Graph & SEO untuk Detail Artikel
// ===================================================================
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lazisku.com';
  const fallbackImage = `${siteUrl}/images/banner-utama.png`;

  let imageUrl = fallbackImage;
  let articleTitle = 'Kabar Berita | LAZIS Khoiro Ummah';
  let articleExcerpt = '';

  try {
    // 🚀 Query langsung ke Sanity untuk metadata yang presisi dan cepat
    const article = await serverClient.fetch(
      `*[_type in ["news", "post", "article"] && slug.current == $slug][0]{
        title,
        excerpt,
        content,
        "imageUrl": coalesce(mainImage.asset->url, image.asset->url, banner.asset->url)
      }`,
      { slug }
    );

    if (article) {
      if (article.title) articleTitle = article.title;

      // Generasi Cuplikan / Excerpt
      if (article.excerpt && typeof article.excerpt === 'string') {
        articleExcerpt = article.excerpt;
      } else if (article.content) {
        if (typeof article.content === 'string') {
          articleExcerpt = article.content.slice(0, 150) + '...';
        } else if (Array.isArray(article.content)) {
          const plainText = article.content
            .filter((block: any) => block._type === 'block' && block.children)
            .map((block: any) => block.children.map((child: any) => child.text).join(''))
            .join(' ');

          articleExcerpt = plainText ? plainText.slice(0, 150) + '...' : '';
        }
      }

      if (!articleExcerpt) {
        articleExcerpt = `Baca kabar berita lengkap mengenai "${articleTitle}" secara resmi di platform LAZIS Khoiro Ummah.`;
      }

      if (article.imageUrl && typeof article.imageUrl === 'string') {
        imageUrl = article.imageUrl.startsWith('http')
          ? article.imageUrl
          : `${siteUrl}${article.imageUrl.startsWith('/') ? '' : '/'}${article.imageUrl}`;
      }
    }
  } catch (error) {
    console.error('🔥 Metadata fetch error:', error);
    articleExcerpt = 'Salurkan sedekah dan zakat Anda secara amanah melalui LAZIS Khoiro Ummah.';
  }

  return {
    title: articleTitle,
    description: articleExcerpt,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: articleTitle,
      description: articleExcerpt,
      url: `${siteUrl}/blog/${slug}`,
      siteName: 'LAZIS Khoiro Ummah',
      locale: 'id_ID',
      type: 'article',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: articleTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: articleTitle,
      description: articleExcerpt,
      images: [imageUrl],
    },
  };
}

// ===================================================================
// 🖥️ SERVER COMPONENT ENTRY
// ===================================================================
export default async function BlogPage({ params }: Props) {
  const { slug } = await params;
  return <BlogDetailClient slug={slug} />;
}
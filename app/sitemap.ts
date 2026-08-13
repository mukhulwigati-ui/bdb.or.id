// app/sitemap.ts
import { MetadataRoute } from 'next';
import { createClient } from '@sanity/client';

// 🚀 CONFIG SANITY CLIENT UNTUK SITEMAP
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

if (!projectId) {
  throw new Error('🔥 GAGAL: NEXT_PUBLIC_SANITY_PROJECT_ID belum disetel di environment variables.');
}

const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2026-06-20',
  useCdn: true,
});

// 🚀 URL Domain Utama islami.or.id
const BASE_URL = 'https://www.islami.or.id';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  
  // 1. Rute Statis Utama (Halaman Inti Web)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/news`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/zakat`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/fundraiser/stats`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/peta-situs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  let campaignRoutes: MetadataRoute.Sitemap = [];
  let newsRoutes: MetadataRoute.Sitemap = [];

  try {
    // Ambil data dinamis langsung dari Sanity CMS dalam satu query GROQ
    const query = `{
      "programs": *[_type == "program" && defined(slug.current)] { "slug": slug.current, _updatedAt },
      "news": *[_type == "news" && defined(slug.current)] { "slug": slug.current, publishedAt, _updatedAt }
    }`;

    const data = await sanityClient.fetch(query);

    // 2. Mapping Rute Program / Campaign
    if (data.programs && Array.isArray(data.programs)) {
      campaignRoutes = data.programs.map((program: any) => ({
        url: `${BASE_URL}/campaign/${program.slug}`,
        lastModified: program._updatedAt ? new Date(program._updatedAt) : new Date(),
        changeFrequency: 'hourly',
        priority: 0.9,
      }));
    }

    // 3. Mapping Rute Berita / News
    if (data.news && Array.isArray(data.news)) {
      newsRoutes = data.news.map((article: any) => ({
        url: `${BASE_URL}/news/${article.slug}`,
        lastModified: article.publishedAt ? new Date(article.publishedAt) : (article._updatedAt ? new Date(article._updatedAt) : new Date()),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    }

  } catch (error) {
    console.error('Failed to fetch dynamic sitemap data from Sanity:', error);
  }

  // 4. Gabungkan semua rute menjadi satu kesatuan sitemap utuh
  return [...staticRoutes, ...campaignRoutes, ...newsRoutes];
}
// app/campaign/[slug]/page.tsx
import { Metadata } from "next";
import CampaignDetailClient from "@/components/CampaignDetailClient";
import { createClient } from "@sanity/client";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

const sanityMetaClient = createClient({
  projectId: "xqggeww8",
  dataset: "production",
  useCdn: false,
  apiVersion: "2024-01-01",
  token: "skzKLS9YXZtUK01FN8VMv2TUleuscVo9d9SXtqAlcLjt3MvaRh0IWaaruV6ObSlpJwD5UoDI0QpPJ26Xh8EpaZsK7DIIMSZ1aq7EnLzUiCUY7aHsAm1a6LeJZb9I9ygWcRTKjEJzw8c5rRCbcFAxPhzjvAgPF715JSXnJxy2lbtWm6ePtVfl",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).trim();

  const siteUrl = "https://www.bdb.or.id";

  let title = "Program Donasi | Balai Dakwah Banjarnegara";
  let description = "Salurkan sedekah, infak, zakat, dan wakaf terbaik Anda melalui Balai Dakwah Banjarnegara (bdb.or.id).";
  let image = `${siteUrl}/images/banner.png`;

  try {
    // 🚀 Perbaikan Query GROQ: Mengambil langsung dari "image.asset->url" (sesuai gambar card Anda)
    const query = `*[(_type == "program" || _type == "campaign") && (slug.current == $slug || _id == $slug)][0] {
      title,
      description,
      excerpt,
      "imageUrl": image.asset->url
    }`;

    const campaign = await sanityMetaClient.fetch(query, { slug: decodedSlug });

    if (campaign) {
      if (campaign.title) {
        title = `${campaign.title} - Balai Dakwah Banjarnegara`;
      }

      const rawDesc = campaign.excerpt || campaign.description;
      if (rawDesc) {
        if (typeof rawDesc === 'string') {
          description = rawDesc.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().substring(0, 160);
        } else if (Array.isArray(rawDesc)) {
          const plainText = rawDesc
            .filter((block: any) => block._type === 'block' && block.children)
            .map((block: any) => block.children.map((child: any) => child.text).join(''))
            .join(' ');
          if (plainText) {
            description = plainText.replace(/\s+/g, " ").trim().substring(0, 160);
          }
        }
      }

      if (campaign.imageUrl) {
        image = campaign.imageUrl;
      }
    }
  } catch (err) {
    console.error("Sanity Metadata Error:", err);
  }

  // Bersihkan parameter format gambar jika ada dari Sanity CDN
  image = image
    .replace("?format=jpg", "")
    .replace("&format=jpg", "")
    .replace("?fm=jpg", "")
    .replace("&fm=jpg", "");

  // 🚀 Pastikan URL Gambar Bersifat Absolut
  if (image.startsWith("/")) {
    image = `${siteUrl}${image}`;
  } else if (!image.startsWith("http")) {
    image = `${siteUrl}/${image}`;
  }

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/campaign/${slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "article",
      url: `${siteUrl}/campaign/${slug}`,
      siteName: "Balai Dakwah Banjarnegara",
      locale: "id_ID",
      title,
      description,
      images: [
        {
          url: image, // Mengambil gambar asli (Sedekah Subuh dengan ilustrasi kotak celengan & HP)
          width: 1200,
          height: 630,
          alt: title,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

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
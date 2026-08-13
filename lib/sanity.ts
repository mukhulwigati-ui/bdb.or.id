// lib/sanity.ts

import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { Image } from "sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;

const config = {
  projectId,
  dataset,
  apiVersion: "2026-07-18",
};

export const clientPublik = createClient({
  ...config,
  useCdn: true,
});

export const clientInternal = createClient({
  ...config,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
});

const builder = imageUrlBuilder(clientPublik);

export function urlFor(source: Image | any) {
  return builder.image(source);
}

export default clientPublik;
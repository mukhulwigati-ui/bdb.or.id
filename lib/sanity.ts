import { createClient } from '@sanity/client';
const coreConfig = {
projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'ks29gg6v',
dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
apiVersion: '2026-07-18',
};
/**
* JALUR 1: CLIENT PUBLIK (GRATIS & UNLIMITED)
* Diarahkan langsung ke API CDN Sanity global yang memiliki cache bawaan.
* Digunakan untuk: Halaman Beranda, Daftar Campaign, Cerita, dan Artikel Berita.
*/
export const clientPublik = createClient({
...coreConfig,
useCdn: true, // KUNCI PERTAHANAN: Menggunakan Edge Cache Gratis
});
/**
* JALUR 2: CLIENT INTERNAL & MUTASI (MENGURANGI KUOTA)
* Menembak database utama secara real-time bypass cache.
* Digunakan KHUSUS untuk: Webhook API Pakasir (/api/webhook/pakasir).
*/
export const clientInternal = createClient({
...coreConfig,
useCdn: false, // Menembak langsung database (Gunakan hanya untuk webhook)
token: process.env.SANITY_API_WRITE_TOKEN || 'TOKEN_WRITE_BARU_ANDA',
});
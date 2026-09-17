// schemas/index.ts

import program from './program'; // Skema program donasi
import news from './news'; // Skema kabar berita
import category from './category'; // Skema kategori artikel/berita
import donationTransaction from './donationTransaction'; // Data transaksi donasi

// Laporan campaign / yayasan lama
import laporan from './laporan';

// Laporan keuangan bulanan baru
import { laporanBulanan } from './laporan-bulanan';

import fundraiser from './fundraiser'; // Skema pendaftaran fundraiser
import heroBanner from './slider'; // Skema hero banner slider

export const schemaTypes = [
  program,

  // Laporan campaign lama
  laporan,

  // Laporan keuangan bulanan
  laporanBulanan,

  category,
  news,
  donationTransaction,
  fundraiser,
  heroBanner,
];
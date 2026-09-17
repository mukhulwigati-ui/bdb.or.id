// sanity/schemaTypes/index.ts

import program from './program';
import news from './news';
import category from './category';
import donationTransaction from './donationTransaction';

// ============================================================================
// LAPORAN
// ============================================================================

// Laporan campaign / yayasan lama
import laporan from './laporan';

// Laporan keuangan bulanan baru
import laporanBulanan from './laporanBulanan';

// ============================================================================
// SCHEMA LAIN
// ============================================================================

import fundraiser from './fundraiser';
import heroBanner from './slider';

// ============================================================================
// DAFTAR SELURUH SCHEMA
// ============================================================================

export const schemaTypes = [
  program,

  // Laporan campaign
  laporan,

  // Laporan keuangan bulanan
  laporanBulanan,

  category,
  news,
  donationTransaction,
  fundraiser,
  heroBanner,
];
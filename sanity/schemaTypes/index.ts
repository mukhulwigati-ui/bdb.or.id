// schemas/index.ts
import program from './program';           // File skema program donasi Anda
import news from './news';                  // Skema kabar berita
import category from './category';          // Skema kategori artikel/berita
import donationTransaction from './donationTransaction'; // Penampung data transaksi pending (Nama & WA)
import laporan from './laporan';           // Skema laporan yayasan
import fundraiser from './fundraiser';      // Skema pendaftaran fundraiser
import heroBanner from './slider';          // 🚀 Skema hero banner slider

export const schemaTypes = [
  program,
  laporan, 
  category, 
  news,      
  donationTransaction,
  fundraiser,
  heroBanner, // 🚀 Didaftarkan ke dalam array agar aktif di Sanity Studio
];
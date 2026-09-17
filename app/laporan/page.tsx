// app/laporan/page.tsx

import type { Metadata } from 'next';
import { createClient } from '@sanity/client';

// ============================================================================
// CONFIG
// ============================================================================

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bdb.or.id'
).replace(/\/+$/, '');

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '915u7hh1',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

export const dynamic = 'force-dynamic';
export const revalidate = 60;

// ============================================================================
// SEO
// ============================================================================

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: 'Laporan Keuangan | BDB.OR.ID',

  description:
    'Laporan keuangan bulanan BDB.OR.ID sebagai bentuk transparansi dan pertanggungjawaban kepada para donatur.',

  alternates: {
    canonical: `${SITE_URL}/laporan`,
  },

  openGraph: {
    title: 'Laporan Keuangan | BDB.OR.ID',
    description:
      'Laporan keuangan bulanan sebagai bentuk transparansi dan pertanggungjawaban kepada para donatur.',
    url: `${SITE_URL}/laporan`,
    siteName: 'BDB.OR.ID',
    locale: 'id_ID',
    type: 'website',
  },

  robots: {
    index: true,
    follow: true,
  },
};

// ============================================================================
// TYPES
// ============================================================================

interface Pemasukan {
  _key?: string;
  nama?: string;
  jumlah?: number;
  tanggal?: string;
  keterangan?: string;
}

interface Pengeluaran {
  _key?: string;
  nama?: string;
  jumlah?: number;
  tanggal?: string;
  keterangan?: string;
}

interface LaporanKeuangan {
  _id: string;
  judul?: string;

  bulan?: string;
  tahun?: number;

  periode?: string;

  bulanHijriah?: string;

  keterangan?: string;

  pemasukan?: Pemasukan[];

  pengeluaran?: Pengeluaran[];

  publishedAt?: string;
}

// ============================================================================
// FORMAT RUPIAH
// ============================================================================

function formatRupiah(value?: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

// ============================================================================
// FORMAT TANGGAL
// ============================================================================

function formatTanggal(date?: string) {
  if (!date) return '-';

  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  } catch {
    return '-';
  }
}

// ============================================================================
// FETCH LAPORAN DARI SANITY
// ============================================================================

async function getLaporan(): Promise<LaporanKeuangan[]> {
  try {
    const laporan = await sanityClient.fetch(
      `
      *[
        _type == "laporanKeuangan"
      ]
      | order(tahun desc, periode desc, _createdAt desc) {
        _id,
        judul,
        bulan,
        tahun,
        periode,
        bulanHijriah,
        keterangan,
        publishedAt,

        pemasukan[]{
          _key,
          nama,
          jumlah,
          tanggal,
          keterangan
        },

        pengeluaran[]{
          _key,
          nama,
          jumlah,
          tanggal,
          keterangan
        }
      }
      `
    );

    return Array.isArray(laporan) ? laporan : [];
  } catch (error) {
    console.error('🔥 Gagal mengambil laporan keuangan:', error);

    return [];
  }
}

// ============================================================================
// PAGE
// ============================================================================

export default async function LaporanPage() {
  const laporanList = await getLaporan();

  return (
    <main className="min-h-screen bg-gray-50 pb-28">
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}

      <section className="bg-white border-b border-gray-200">
        <div className="w-full max-w-md mx-auto px-4 py-7 text-center">
          <div className="w-12 h-1 bg-green-700 mx-auto mb-4" />

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Laporan Keuangan
          </h1>

          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Transparansi pengelolaan dana sebagai bentuk amanah dan
            pertanggungjawaban kepada para donatur.
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* CONTENT */}
      {/* ================================================================== */}

      <div className="w-full max-w-md mx-auto px-3 py-5">
        {laporanList.length === 0 ? (
          <div className="bg-white border border-gray-200 px-4 py-14 text-center">
            <div className="text-4xl mb-3">📊</div>

            <h2 className="font-bold text-slate-800">
              Laporan belum tersedia
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              Laporan keuangan akan ditampilkan setelah data diterbitkan.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {laporanList.map((laporan) => {
              const pemasukan = laporan.pemasukan || [];
              const pengeluaran = laporan.pengeluaran || [];

              const totalPemasukan = pemasukan.reduce(
                (total, item) => total + Number(item.jumlah || 0),
                0
              );

              const totalPengeluaran = pengeluaran.reduce(
                (total, item) => total + Number(item.jumlah || 0),
                0
              );

              const saldo = totalPemasukan - totalPengeluaran;

              return (
                <article
                  key={laporan._id}
                  className="bg-white border border-gray-200 shadow-sm"
                >
                  {/* ====================================================== */}
                  {/* JUDUL LAPORAN */}
                  {/* ====================================================== */}

                  <div className="px-4 py-6 text-center border-b border-gray-100">
                    <p className="text-[11px] uppercase font-bold tracking-[0.15em] text-green-700">
                      Laporan Bulanan
                    </p>

                    <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                      {laporan.judul ||
                        `${laporan.bulan || ''} ${laporan.tahun || ''}`}
                    </h2>

                    {laporan.bulanHijriah && (
                      <p className="text-sm text-slate-600 mt-1">
                        {laporan.bulanHijriah}
                      </p>
                    )}

                    {laporan.keterangan && (
                      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                        {laporan.keterangan}
                      </p>
                    )}
                  </div>

                  {/* ====================================================== */}
                  {/* RINGKASAN */}
                  {/* ====================================================== */}

                  <div className="grid grid-cols-3 border-b border-gray-200">
                    <div className="p-3 text-center border-r border-gray-200">
                      <p className="text-[10px] text-slate-500 mb-1">
                        Pemasukan
                      </p>

                      <p className="text-xs font-extrabold text-green-700">
                        {formatRupiah(totalPemasukan)}
                      </p>
                    </div>

                    <div className="p-3 text-center border-r border-gray-200">
                      <p className="text-[10px] text-slate-500 mb-1">
                        Pengeluaran
                      </p>

                      <p className="text-xs font-extrabold text-red-600">
                        {formatRupiah(totalPengeluaran)}
                      </p>
                    </div>

                    <div className="p-3 text-center">
                      <p className="text-[10px] text-slate-500 mb-1">
                        Saldo
                      </p>

                      <p className="text-xs font-extrabold text-slate-900">
                        {formatRupiah(saldo)}
                      </p>
                    </div>
                  </div>

                  {/* ====================================================== */}
                  {/* PEMASUKAN */}
                  {/* ====================================================== */}

                  <section className="py-5">
                    <div className="px-4 mb-3 flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Daftar Pemasukan
                      </h3>

                      <span className="text-[11px] font-semibold text-green-700">
                        {pemasukan.length} transaksi
                      </span>
                    </div>

                    {pemasukan.length === 0 ? (
                      <p className="px-4 text-xs text-slate-400">
                        Belum ada data pemasukan.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[10px] uppercase text-slate-500">
                              <th className="px-3 py-2.5 text-center border-y border-gray-200">
                                No
                              </th>

                              <th className="px-3 py-2.5 text-left border-y border-gray-200">
                                Nama
                              </th>

                              <th className="px-3 py-2.5 text-left border-y border-gray-200">
                                Tanggal
                              </th>

                              <th className="px-3 py-2.5 text-right border-y border-gray-200">
                                Jumlah
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {pemasukan.map((item, index) => (
                              <tr
                                key={item._key || `${laporan._id}-${index}`}
                                className="text-xs border-b border-gray-100"
                              >
                                <td className="px-3 py-2.5 text-center text-slate-400">
                                  {index + 1}
                                </td>

                                <td className="px-3 py-2.5 font-semibold text-slate-700">
                                  {item.nama || 'Hamba Allah'}
                                </td>

                                <td className="px-3 py-2.5 text-slate-500">
                                  {formatTanggal(item.tanggal)}
                                </td>

                                <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                                  {formatRupiah(item.jumlah)}
                                </td>
                              </tr>
                            ))}
                          </tbody>

                          <tfoot>
                            <tr className="bg-green-50">
                              <td
                                colSpan={3}
                                className="px-3 py-3 text-right font-extrabold text-xs text-green-800"
                              >
                                TOTAL PEMASUKAN
                              </td>

                              <td className="px-3 py-3 text-right font-extrabold text-xs text-green-800">
                                {formatRupiah(totalPemasukan)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </section>

                  {/* ====================================================== */}
                  {/* PENGELUARAN */}
                  {/* ====================================================== */}

                  <section className="py-5 border-t border-gray-200">
                    <div className="px-4 mb-3 flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Daftar Pengeluaran
                      </h3>

                      <span className="text-[11px] font-semibold text-red-600">
                        {pengeluaran.length} transaksi
                      </span>
                    </div>

                    {pengeluaran.length === 0 ? (
                      <p className="px-4 text-xs text-slate-400">
                        Belum ada data pengeluaran.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[10px] uppercase text-slate-500">
                              <th className="px-3 py-2.5 text-center border-y border-gray-200">
                                No
                              </th>

                              <th className="px-3 py-2.5 text-left border-y border-gray-200">
                                Keterangan
                              </th>

                              <th className="px-3 py-2.5 text-left border-y border-gray-200">
                                Tanggal
                              </th>

                              <th className="px-3 py-2.5 text-right border-y border-gray-200">
                                Jumlah
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {pengeluaran.map((item, index) => (
                              <tr
                                key={item._key || `${laporan._id}-out-${index}`}
                                className="text-xs border-b border-gray-100"
                              >
                                <td className="px-3 py-2.5 text-center text-slate-400">
                                  {index + 1}
                                </td>

                                <td className="px-3 py-2.5 font-semibold text-slate-700">
                                  {item.nama || item.keterangan || '-'}
                                </td>

                                <td className="px-3 py-2.5 text-slate-500">
                                  {formatTanggal(item.tanggal)}
                                </td>

                                <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                                  {formatRupiah(item.jumlah)}
                                </td>
                              </tr>
                            ))}
                          </tbody>

                          <tfoot>
                            <tr className="bg-red-50">
                              <td
                                colSpan={3}
                                className="px-3 py-3 text-right font-extrabold text-xs text-red-700"
                              >
                                TOTAL PENGELUARAN
                              </td>

                              <td className="px-3 py-3 text-right font-extrabold text-xs text-red-700">
                                {formatRupiah(totalPengeluaran)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </section>

                  {/* ====================================================== */}
                  {/* SALDO AKHIR */}
                  {/* ====================================================== */}

                  <div className="border-t-4 border-green-700 bg-slate-900 text-white px-4 py-5">
                    <div className="flex justify-between items-center gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Saldo Akhir
                        </p>

                        <p className="text-xs text-slate-300 mt-1">
                          Pemasukan dikurangi pengeluaran
                        </p>
                      </div>

                      <p className="text-lg font-extrabold">
                        {formatRupiah(saldo)}
                      </p>
                    </div>
                  </div>

                  {/* ====================================================== */}
                  {/* FOOTER */}
                  {/* ====================================================== */}

                  <div className="px-4 py-4 text-center">
                    <p className="text-[10px] leading-relaxed text-slate-400">
                      Laporan ini diterbitkan sebagai bentuk transparansi dan
                      pertanggungjawaban pengelolaan dana kepada seluruh
                      donatur.
                    </p>

                    {laporan.publishedAt && (
                      <p className="text-[10px] text-slate-400 mt-2">
                        Diterbitkan {formatTanggal(laporan.publishedAt)}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
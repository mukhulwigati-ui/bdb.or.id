// sanity/schemaTypes/laporan-bulanan.ts

import {
  defineType,
  defineField,
  defineArrayMember,
} from 'sanity';

// ============================================================================
// HELPER
// ============================================================================

const formatRupiah = (value: number = 0): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

// ============================================================================
// LAPORAN KEUANGAN BULANAN
// ============================================================================
//
// PENTING:
//
// laporan.ts
// → tetap digunakan untuk laporan campaign.
//
// laporan-bulanan.ts
// → khusus laporan keuangan bulanan.
//
// _type Sanity untuk file ini:
// → laporanKeuangan
//
// Ini sesuai dengan query:
// *[_type == "laporanKeuangan"]
//
// ============================================================================

const laporanBulanan = defineType({
  name: 'laporanKeuangan',
  title: 'Laporan Keuangan Bulanan',
  type: 'document',

  // ==========================================================================
  // GROUP / TAB
  // ==========================================================================

  groups: [
    {
      name: 'informasi',
      title: 'Informasi Laporan',
      default: true,
    },
    {
      name: 'pemasukan',
      title: 'Pemasukan',
    },
    {
      name: 'pengeluaran',
      title: 'Pengeluaran',
    },
  ],

  // ==========================================================================
  // FIELD
  // ==========================================================================

  fields: [
    // ========================================================================
    // INFORMASI LAPORAN
    // ========================================================================

    defineField({
      name: 'judul',
      title: 'Judul Laporan',
      type: 'string',
      group: 'informasi',

      description:
        'Contoh: Laporan Keuangan Agustus 2026',

      validation: (Rule) =>
        Rule.required()
          .min(5)
          .error('Judul laporan wajib diisi.'),
    }),

    // ------------------------------------------------------------------------

    defineField({
      name: 'bulan',
      title: 'Bulan',
      type: 'string',
      group: 'informasi',

      options: {
        list: [
          { title: 'Januari', value: 'Januari' },
          { title: 'Februari', value: 'Februari' },
          { title: 'Maret', value: 'Maret' },
          { title: 'April', value: 'April' },
          { title: 'Mei', value: 'Mei' },
          { title: 'Juni', value: 'Juni' },
          { title: 'Juli', value: 'Juli' },
          { title: 'Agustus', value: 'Agustus' },
          { title: 'September', value: 'September' },
          { title: 'Oktober', value: 'Oktober' },
          { title: 'November', value: 'November' },
          { title: 'Desember', value: 'Desember' },
        ],

        layout: 'dropdown',
      },

      validation: (Rule) =>
        Rule.required().error(
          'Bulan laporan wajib dipilih.'
        ),
    }),

    // ------------------------------------------------------------------------

    defineField({
      name: 'tahun',
      title: 'Tahun',
      type: 'number',
      group: 'informasi',

      description:
        'Contoh: 2026',

      validation: (Rule) =>
        Rule.required()
          .integer()
          .min(2020)
          .max(2100)
          .error('Masukkan tahun yang valid.'),
    }),

    // ------------------------------------------------------------------------

    defineField({
      name: 'periode',
      title: 'Periode',
      type: 'string',
      group: 'informasi',

      description:
        'Gunakan format YYYY-MM. Contoh: 2026-08 untuk Agustus 2026.',

      placeholder: '2026-08',

      validation: (Rule) =>
        Rule.required()
          .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
            name: 'periode-bulanan',
          })
          .error(
            'Format periode harus YYYY-MM. Contoh: 2026-08.'
          ),
    }),

    // ------------------------------------------------------------------------

    defineField({
      name: 'bulanHijriah',
      title: 'Periode Hijriah',
      type: 'string',
      group: 'informasi',

      description:
        'Contoh: Rabiul Awal 1447 H',

      placeholder:
        'Rabiul Awal 1447 H',
    }),

    // ------------------------------------------------------------------------

    defineField({
      name: 'keterangan',
      title: 'Keterangan Laporan',
      type: 'text',
      group: 'informasi',

      rows: 3,

      description:
        'Keterangan singkat mengenai laporan keuangan pada periode tersebut.',
    }),

    // ------------------------------------------------------------------------

    defineField({
      name: 'publishedAt',
      title: 'Tanggal Diterbitkan',
      type: 'datetime',
      group: 'informasi',

      initialValue: () =>
        new Date().toISOString(),

      validation: (Rule) =>
        Rule.required().error(
          'Tanggal penerbitan laporan wajib diisi.'
        ),
    }),

    // ========================================================================
    // PEMASUKAN
    // ========================================================================

    defineField({
      name: 'pemasukan',
      title: 'Daftar Pemasukan',
      type: 'array',
      group: 'pemasukan',

      description:
        'Masukkan seluruh donasi, infak, sedekah, zakat, atau sumber pemasukan lainnya pada periode ini.',

      of: [
        defineArrayMember({
          name: 'itemPemasukan',
          title: 'Pemasukan',
          type: 'object',

          fields: [
            // ----------------------------------------------------------------
            // NAMA
            // ----------------------------------------------------------------

            defineField({
              name: 'nama',
              title: 'Nama Donatur / Sumber Dana',
              type: 'string',

              initialValue:
                'Hamba Allah',

              validation: (Rule) =>
                Rule.required().error(
                  'Nama donatur atau sumber dana wajib diisi.'
                ),
            }),

            // ----------------------------------------------------------------
            // TANGGAL
            // ----------------------------------------------------------------

            defineField({
              name: 'tanggal',
              title: 'Tanggal',
              type: 'date',

              options: {
                dateFormat: 'DD-MM-YYYY',
              },

              validation: (Rule) =>
                Rule.required().error(
                  'Tanggal pemasukan wajib diisi.'
                ),
            }),

            // ----------------------------------------------------------------
            // JUMLAH
            // ----------------------------------------------------------------

            defineField({
              name: 'jumlah',
              title: 'Jumlah Pemasukan',
              type: 'number',

              description:
                'Masukkan angka saja tanpa Rp dan titik. Contoh: 100000',

              validation: (Rule) =>
                Rule.required()
                  .integer()
                  .positive()
                  .error(
                    'Jumlah pemasukan harus berupa angka lebih dari 0.'
                  ),
            }),

            // ----------------------------------------------------------------
            // KETERANGAN
            // ----------------------------------------------------------------

            defineField({
              name: 'keterangan',
              title: 'Jenis / Keterangan',
              type: 'string',

              description:
                'Contoh: Sedekah, Infak, Zakat, Donasi Program.',
            }),
          ],

          // ==================================================================
          // PREVIEW PEMASUKAN
          // ==================================================================

          preview: {
            select: {
              nama: 'nama',
              jumlah: 'jumlah',
              tanggal: 'tanggal',
              keterangan: 'keterangan',
            },

            prepare({
              nama,
              jumlah,
              tanggal,
              keterangan,
            }) {
              const detail = [
                formatRupiah(
                  Number(jumlah || 0)
                ),

                tanggal || null,

                keterangan || null,
              ]
                .filter(Boolean)
                .join(' • ');

              return {
                title:
                  nama || 'Hamba Allah',

                subtitle:
                  detail,
              };
            },
          },
        }),
      ],
    }),

    // ========================================================================
    // PENGELUARAN
    // ========================================================================

    defineField({
      name: 'pengeluaran',
      title: 'Daftar Pengeluaran',
      type: 'array',
      group: 'pengeluaran',

      description:
        'Masukkan seluruh penggunaan atau pengeluaran dana pada periode laporan.',

      of: [
        defineArrayMember({
          name: 'itemPengeluaran',
          title: 'Pengeluaran',
          type: 'object',

          fields: [
            // ----------------------------------------------------------------
            // NAMA
            // ----------------------------------------------------------------

            defineField({
              name: 'nama',
              title: 'Nama Pengeluaran',
              type: 'string',

              description:
                'Contoh: Program Dakwah, Santunan Dhuafa, Operasional, dan sebagainya.',

              validation: (Rule) =>
                Rule.required().error(
                  'Nama pengeluaran wajib diisi.'
                ),
            }),

            // ----------------------------------------------------------------
            // TANGGAL
            // ----------------------------------------------------------------

            defineField({
              name: 'tanggal',
              title: 'Tanggal',
              type: 'date',

              options: {
                dateFormat:
                  'DD-MM-YYYY',
              },

              validation: (Rule) =>
                Rule.required().error(
                  'Tanggal pengeluaran wajib diisi.'
                ),
            }),

            // ----------------------------------------------------------------
            // JUMLAH
            // ----------------------------------------------------------------

            defineField({
              name: 'jumlah',
              title: 'Jumlah Pengeluaran',
              type: 'number',

              description:
                'Masukkan angka saja tanpa Rp dan titik. Contoh: 500000',

              validation: (Rule) =>
                Rule.required()
                  .integer()
                  .positive()
                  .error(
                    'Jumlah pengeluaran harus berupa angka lebih dari 0.'
                  ),
            }),

            // ----------------------------------------------------------------
            // KETERANGAN
            // ----------------------------------------------------------------

            defineField({
              name: 'keterangan',
              title: 'Keterangan',
              type: 'text',

              rows: 2,

              description:
                'Detail tambahan mengenai penggunaan dana.',
            }),
          ],

          // ==================================================================
          // PREVIEW PENGELUARAN
          // ==================================================================

          preview: {
            select: {
              nama: 'nama',
              jumlah: 'jumlah',
              tanggal: 'tanggal',
              keterangan: 'keterangan',
            },

            prepare({
              nama,
              jumlah,
              tanggal,
              keterangan,
            }) {
              const detail = [
                formatRupiah(
                  Number(jumlah || 0)
                ),

                tanggal || null,

                keterangan || null,
              ]
                .filter(Boolean)
                .join(' • ');

              return {
                title:
                  nama || 'Pengeluaran',

                subtitle:
                  detail,
              };
            },
          },
        }),
      ],
    }),
  ],

  // ==========================================================================
  // URUTAN LAPORAN DI SANITY
  // ==========================================================================

  orderings: [
    {
      title: 'Laporan Terbaru',
      name: 'laporanTerbaru',

      by: [
        {
          field: 'periode',
          direction: 'desc',
        },
        {
          field: 'publishedAt',
          direction: 'desc',
        },
      ],
    },

    {
      title: 'Laporan Terlama',
      name: 'laporanTerlama',

      by: [
        {
          field: 'periode',
          direction: 'asc',
        },
      ],
    },
  ],

  // ==========================================================================
  // PREVIEW DOKUMEN LAPORAN
  // ==========================================================================

  preview: {
    select: {
      judul: 'judul',
      bulan: 'bulan',
      tahun: 'tahun',
      periode: 'periode',
      pemasukan: 'pemasukan',
      pengeluaran: 'pengeluaran',
    },

    prepare({
      judul,
      bulan,
      tahun,
      periode,
      pemasukan,
      pengeluaran,
    }) {
      // ======================================================================
      // TOTAL PEMASUKAN
      // ======================================================================

      const totalPemasukan =
        Array.isArray(pemasukan)
          ? pemasukan.reduce(
              (
                total: number,
                item: {
                  jumlah?: number;
                }
              ) =>
                total +
                Number(
                  item?.jumlah || 0
                ),
              0
            )
          : 0;

      // ======================================================================
      // TOTAL PENGELUARAN
      // ======================================================================

      const totalPengeluaran =
        Array.isArray(pengeluaran)
          ? pengeluaran.reduce(
              (
                total: number,
                item: {
                  jumlah?: number;
                }
              ) =>
                total +
                Number(
                  item?.jumlah || 0
                ),
              0
            )
          : 0;

      // ======================================================================
      // SALDO
      // ======================================================================

      const saldo =
        totalPemasukan -
        totalPengeluaran;

      // ======================================================================
      // PREVIEW
      // ======================================================================

      return {
        title:
          judul ||
          `Laporan Keuangan ${bulan || ''} ${tahun || ''}`,

        subtitle: [
          periode ||
            `${bulan || ''} ${tahun || ''}`,

          `Masuk ${formatRupiah(
            totalPemasukan
          )}`,

          `Keluar ${formatRupiah(
            totalPengeluaran
          )}`,

          `Saldo ${formatRupiah(
            saldo
          )}`,
        ]
          .filter(Boolean)
          .join(' • '),
      };
    },
  },
});

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default laporanBulanan;
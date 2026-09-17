// sanity/schemaTypes/laporan.ts

import {
  defineType,
  defineField,
  defineArrayMember,
} from 'sanity';

export const laporan = defineType({
  name: 'laporanKeuangan',
  title: 'Laporan Keuangan',
  type: 'document',

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

  fields: [
    // =================================================================
    // INFORMASI LAPORAN
    // =================================================================

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
        Rule.required().error('Bulan laporan wajib dipilih.'),
    }),

    defineField({
      name: 'tahun',
      title: 'Tahun',
      type: 'number',
      group: 'informasi',

      description: 'Contoh: 2026',

      validation: (Rule) =>
        Rule.required()
          .integer()
          .min(2020)
          .max(2100)
          .error('Masukkan tahun yang valid.'),
    }),

    defineField({
      name: 'periode',
      title: 'Periode',
      type: 'string',
      group: 'informasi',

      description:
        'Digunakan untuk membantu pengurutan laporan. Contoh: 2026-08',

      placeholder: '2026-08',

      validation: (Rule) =>
        Rule.required()
          .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
            name: 'format-periode',
            invert: false,
          })
          .error('Format periode harus YYYY-MM, contoh: 2026-08'),
    }),

    defineField({
      name: 'bulanHijriah',
      title: 'Periode Hijriah',
      type: 'string',
      group: 'informasi',

      description:
        'Contoh: Rabiul Awal 1447 H',

      placeholder: 'Rabiul Awal 1447 H',
    }),

    defineField({
      name: 'keterangan',
      title: 'Keterangan Laporan',
      type: 'text',
      rows: 3,
      group: 'informasi',

      description:
        'Keterangan singkat yang akan ditampilkan pada bagian atas laporan.',
    }),

    defineField({
      name: 'publishedAt',
      title: 'Tanggal Diterbitkan',
      type: 'datetime',
      group: 'informasi',

      initialValue: () => new Date().toISOString(),

      validation: (Rule) =>
        Rule.required().error('Tanggal penerbitan wajib diisi.'),
    }),

    // =================================================================
    // PEMASUKAN
    // =================================================================

    defineField({
      name: 'pemasukan',
      title: 'Daftar Pemasukan',
      type: 'array',
      group: 'pemasukan',

      description:
        'Masukkan daftar pemasukan atau donasi pada periode laporan.',

      of: [
        defineArrayMember({
          type: 'object',
          name: 'itemPemasukan',
          title: 'Pemasukan',

          fields: [
            defineField({
              name: 'nama',
              title: 'Nama Donatur / Sumber Dana',
              type: 'string',

              initialValue: 'Hamba Allah',

              validation: (Rule) =>
                Rule.required().error(
                  'Nama donatur atau sumber dana wajib diisi.'
                ),
            }),

            defineField({
              name: 'tanggal',
              title: 'Tanggal',
              type: 'date',

              options: {
                dateFormat: 'DD-MM-YYYY',
              },
            }),

            defineField({
              name: 'jumlah',
              title: 'Jumlah',
              type: 'number',

              description:
                'Masukkan nominal tanpa tanda titik. Contoh: 100000',

              validation: (Rule) =>
                Rule.required()
                  .positive()
                  .integer()
                  .error('Nominal pemasukan harus lebih dari 0.'),
            }),

            defineField({
              name: 'keterangan',
              title: 'Keterangan',
              type: 'string',

              description:
                'Opsional. Contoh: Sedekah, Infak, Zakat, Donasi Program.',
            }),
          ],

          preview: {
            select: {
              title: 'nama',
              jumlah: 'jumlah',
              tanggal: 'tanggal',
            },

            prepare({
              title,
              jumlah,
              tanggal,
            }) {
              const nominal = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(jumlah || 0);

              return {
                title: title || 'Hamba Allah',

                subtitle: [
                  nominal,
                  tanggal || null,
                ]
                  .filter(Boolean)
                  .join(' • '),
              };
            },
          },
        }),
      ],
    }),

    // =================================================================
    // PENGELUARAN
    // =================================================================

    defineField({
      name: 'pengeluaran',
      title: 'Daftar Pengeluaran',
      type: 'array',
      group: 'pengeluaran',

      description:
        'Masukkan seluruh pengeluaran pada periode laporan.',

      of: [
        defineArrayMember({
          type: 'object',
          name: 'itemPengeluaran',
          title: 'Pengeluaran',

          fields: [
            defineField({
              name: 'nama',
              title: 'Nama Pengeluaran',
              type: 'string',

              description:
                'Contoh: Program Dakwah, Operasional, Santunan Dhuafa.',

              validation: (Rule) =>
                Rule.required().error(
                  'Nama pengeluaran wajib diisi.'
                ),
            }),

            defineField({
              name: 'tanggal',
              title: 'Tanggal',
              type: 'date',

              options: {
                dateFormat: 'DD-MM-YYYY',
              },
            }),

            defineField({
              name: 'jumlah',
              title: 'Jumlah',
              type: 'number',

              description:
                'Masukkan nominal tanpa titik. Contoh: 500000',

              validation: (Rule) =>
                Rule.required()
                  .positive()
                  .integer()
                  .error('Nominal pengeluaran harus lebih dari 0.'),
            }),

            defineField({
              name: 'keterangan',
              title: 'Keterangan',
              type: 'text',
              rows: 2,

              description:
                'Detail tambahan mengenai penggunaan dana.',
            }),
          ],

          preview: {
            select: {
              title: 'nama',
              jumlah: 'jumlah',
              tanggal: 'tanggal',
            },

            prepare({
              title,
              jumlah,
              tanggal,
            }) {
              const nominal = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(jumlah || 0);

              return {
                title: title || 'Pengeluaran',

                subtitle: [
                  nominal,
                  tanggal || null,
                ]
                  .filter(Boolean)
                  .join(' • '),
              };
            },
          },
        }),
      ],
    }),
  ],

  // ===================================================================
  // ORDERINGS
  // ===================================================================

  orderings: [
    {
      title: 'Laporan Terbaru',
      name: 'laporanTerbaru',

      by: [
        {
          field: 'tahun',
          direction: 'desc',
        },
        {
          field: 'periode',
          direction: 'desc',
        },
      ],
    },
  ],

  // ===================================================================
  // PREVIEW DOCUMENT
  // ===================================================================

  preview: {
    select: {
      title: 'judul',
      bulan: 'bulan',
      tahun: 'tahun',
      pemasukan: 'pemasukan',
      pengeluaran: 'pengeluaran',
    },

    prepare({
      title,
      bulan,
      tahun,
      pemasukan,
      pengeluaran,
    }) {
      const totalPemasukan = Array.isArray(pemasukan)
        ? pemasukan.reduce(
            (
              total: number,
              item: { jumlah?: number }
            ) => total + Number(item?.jumlah || 0),
            0
          )
        : 0;

      const totalPengeluaran = Array.isArray(pengeluaran)
        ? pengeluaran.reduce(
            (
              total: number,
              item: { jumlah?: number }
            ) => total + Number(item?.jumlah || 0),
            0
          )
        : 0;

      const saldo =
        totalPemasukan - totalPengeluaran;

      const formatRupiah = (value: number) =>
        new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(value);

      return {
        title:
          title ||
          `Laporan ${bulan || ''} ${tahun || ''}`,

        subtitle:
          `${bulan || ''} ${tahun || ''} • ` +
          `Saldo ${formatRupiah(saldo)}`,
      };
    },
  },
});
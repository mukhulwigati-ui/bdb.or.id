// schemas/fundraiser.ts
import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'fundraiser',
  title: 'Pendaftaran Fundraiser',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Nama Lengkap',
      type: 'string',
      validation: (Rule) => Rule.required().error('Nama wajib diisi'),
    }),
    defineField({
      name: 'phone',
      title: 'Nomor WhatsApp',
      type: 'string',
      validation: (Rule) => Rule.required().error('Nomor WhatsApp wajib diisi'),
    }),
    
    // ===================================================================
    // 🚀 ARRAY OF REFERENCES (Mendukung Banyak Program)
    // ===================================================================
    defineField({
      name: 'supportedPrograms',
      title: 'Program yang Didukung',
      description: 'Pilih program spesifik. JIKA DIKOSONGKAN, fundraiser otomatis dapat mengakses semua program aktif.',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'program' }] }],
    }),

    // ===================================================================
    // 📊 FIELD OTOMATIS (Read-only agar tidak bisa dimanipulasi manual)
    // ===================================================================
    defineField({
      name: 'totalDanaDihimpun',
      title: 'Total Dana Dihimpun (Otomatis)',
      type: 'number',
      readOnly: true,
      initialValue: 0,
    }),
    defineField({
      name: 'totalTransaksiSukses',
      title: 'Total Transaksi Sukses (Otomatis)',
      type: 'number',
      readOnly: true,
      initialValue: 0,
    }),
    defineField({
      name: 'sisaSaldoFee',
      title: 'Sisa Saldo Fee Tersedia (Otomatis)',
      type: 'number',
      readOnly: true,
      initialValue: 0,
    }),

    // ===================================================================
    // 💰 FIELD MANUAL (Input Admin)
    // ===================================================================
    defineField({
      name: 'feePaid',
      title: 'Fee Yang Sudah Dibayarkan (Rp)',
      type: 'number',
      description: 'Input akumulasi total fee yang sudah ditransfer yayasan kepada relawan ini',
      initialValue: 0,
      validation: (Rule) => Rule.min(0).integer(),
    }),
  ],

  // 💡 Preview di Sanity Studio menampilkan Nama dan Nomor WhatsApp
  preview: {
    select: {
      title: 'name',
      phone: 'phone',
    },
    prepare({ title, phone }) {
      return {
        title: title || 'Tanpa Nama',
        subtitle: phone || '-',
      };
    },
  },
});
// schemas/program.ts
import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'program',
  title: 'Program Donasi',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Judul Campaign',
      type: 'string',
      validation: (Rule) => Rule.required().error('Judul wajib diisi'),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required().error('Slug wajib digenerate'),
    }),
    defineField({
      name: 'category',
      title: 'Kategori',
      type: 'string',
      options: {
        list: [
          { title: 'Kemanusiaan', value: 'Kemanusiaan' },
          { title: 'Pendidikan', value: 'Pendidikan' },
          { title: 'Kesehatan', value: 'Kesehatan' },
          { title: 'Infrastruktur', value: 'Infrastruktur' },
          { title: 'Zakat', value: 'Zakat' },
          { title: 'Infak / Sedekah', value: 'Infak' },
          { title: 'Wakaf', value: 'Wakaf' },
        ],
      },
      initialValue: 'Kemanusiaan',
    }),
    defineField({
      name: 'sectionType',
      title: 'Penempatan Bagian (Section)',
      type: 'string',
      options: {
        list: [
          { title: 'Penggalangan Dana Mendesak', value: 'mendesak' },
          { title: 'Program Unggulan', value: 'unggulan' },
          { title: 'Program Pilihan', value: 'pilihan' },
        ],
        layout: 'radio',
      },
      initialValue: 'pilihan',
      description: 'Pilih di bagian mana campaign ini akan ditampilkan pada halaman utama.',
    }),
    defineField({
      name: 'image',
      title: 'Foto / Cover Utama',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required().error('Foto wajib diunggah'),
    }),
    defineField({
      name: 'collectedAmount',
      title: 'Nominal Terkumpul (Otomatis dari DOKU)',
      type: 'number',
      initialValue: 0,
      readOnly: true, 
      description: 'Field ini terkunci otomatis. Angka akan bertambah sendiri secara realtime saat pembayaran donasi DOKU sukses.',
    }),
    // 🚀 DITAMBAHKAN: Mengatasi error Unknown field found pada collectedRaw
    defineField({
      name: 'collectedRaw',
      title: 'Collected Raw Amount',
      type: 'number',
      initialValue: 0,
      readOnly: true,
      description: 'Cadangan perhitungan nominal mentah dari sistem webhook.',
    }),
    defineField({
      name: 'targetAmount',
      title: 'Target Donasi (Rupiah)',
      type: 'number',
      initialValue: 50000000,
      description: 'Contoh: 50000000 untuk target Rp 50 Juta.',
    }),
    defineField({
      name: 'daysLeft',
      title: 'Sisa Hari (Opsional)',
      type: 'number',
      description: 'Jumlah sisa hari penggalangan dana (jika ingin ditampilkan).',
    }),
    defineField({
      name: 'description',
      title: 'Cerita / Deskripsi Lengkap',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Tulis narasi lengkap atau cerita edukasi program di sini.',
    }),
    defineField({
      name: 'donors',
      title: 'Daftar Donatur Terverifikasi',
      type: 'array',
      readOnly: true, 
      description: 'List riwayat nama hamba allah dan donatur yang masuk dari sistem pembayaran DOKU.',
      of: [
        {
          type: 'object',
          title: 'Detail Donatur',
          fields: [
            { name: 'name', type: 'string', title: 'Nama Donatur' },
            { name: 'amount', type: 'number', title: 'Nominal Donasi' },
            { name: 'date', type: 'string', title: 'Tanggal Donasi' },
          ],
        },
      ],
    }),
  ],
});
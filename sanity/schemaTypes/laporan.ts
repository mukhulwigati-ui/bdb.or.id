// schemas/laporan.ts
import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'laporan',
  title: 'Laporan Penyaluran',
  type: 'document',
  fields: [
    defineField({
      name: 'program',
      title: 'Dihubungkan ke Program Donasi',
      type: 'reference',
      to: [{ type: 'program' }],
      validation: (Rule) => Rule.required().error('Laporan wajib dihubungkan ke salah satu program donasi!'),
      description: 'Pilih program donasi yang sesuai dengan implementasi dana ini.',
    }),
    defineField({
      name: 'title',
      title: 'Judul Aktivitas Laporan',
      type: 'string',
      validation: (Rule) => Rule.required().error('Judul laporan wajib diisi'),
      description: 'Contoh: Pembelian Material Semen Tahap Belanja Utama',
    }),
    defineField({
      name: 'date',
      title: 'Tanggal Penyaluran',
      type: 'date',
      options: {
        dateFormat: 'YYYY-MM-DD',
      },
      validation: (Rule) => Rule.required().error('Tanggal wajib diisi'),
      description: 'Pilih tanggal aktual pelaksanaan penyaluran.',
    }),
    defineField({
      name: 'content',
      title: 'Detail Catatan Implementasi',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Tulis deskripsi detail penyaluran amanah secara transparan di sini.',
    }),
    defineField({
      name: 'image',
      title: 'Foto / Bukti Dokumentasi Lapangan',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required().error('Bukti dokumentasi lapangan wajib diunggah'),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'date',
      media: 'image',
    },
    prepare(selection) {
      const { title, subtitle, media } = selection;
      return {
        title: title || 'Laporan Tanpa Judul',
        subtitle: subtitle ? `Tanggal: ${subtitle}` : '',
        media: media,
      };
    },
  },
});
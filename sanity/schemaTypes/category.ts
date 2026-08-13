// schemas/category.ts
import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'category',
  title: 'Kategori',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Nama Kategori',
      type: 'string',
      validation: (Rule) => Rule.required().error('Nama kategori wajib diisi'),
    }),
    defineField({
      name: 'slug',
      title: 'Slug URL',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
        // 🚀 FIXED: Membersihkan karakter khusus selain huruf, angka, dan strip (-) agar URL SEO-friendly
        slugify: (input) => 
          input
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .slice(0, 96),
      },
      validation: (Rule) => Rule.required().error('Slug kategori wajib digenerate'),
    }),
    defineField({
      name: 'description',
      title: 'Deskripsi Kategori',
      type: 'text',
      rows: 3,
      description: 'Penjelasan singkat mengenai ruang lingkup kategori ini (opsional).',
    }),
  ],
});
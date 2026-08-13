export default {
  name: 'heroBanner',
  title: 'Hero Banner Slider',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Judul / Alt Text Banner',
      type: 'string',
      description: 'Deskripsi singkat atau nama banner untuk keperluan SEO/Alt text',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'image',
      title: 'Gambar Banner Flyer',
      type: 'image',
      options: {
        hotspot: true,
      },
      description: 'Rekomendasi rasio 16:9 (misal: 1280x720px atau 800x450px)',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'link',
      title: 'Link / URL Tujuan (Opsional)',
      type: 'string',
      description: 'Contoh: /program/sedekah-subuh atau https://lazisku.com/donasi/zakat',
    },
    {
      name: 'order',
      title: 'Urutan Tampil',
      type: 'number',
      description: 'Angka lebih kecil tampil lebih awal (misal: 1, 2, 3)',
      initialValue: 1,
    },
    {
      name: 'active',
      title: 'Status Aktif',
      type: 'boolean',
      description: 'Aktifkan untuk menayangkan banner ini di halaman utama',
      initialValue: true,
    },
  ],
  preview: {
    select: {
      title: 'title',
      media: 'image',
      active: 'active',
    },
    prepare(selection: any) {
      const { title, media, active } = selection;
      return {
        title: title,
        subtitle: active === false ? '❌ Nonaktif' : '✅ Aktif',
        media: media,
      };
    },
  },
};
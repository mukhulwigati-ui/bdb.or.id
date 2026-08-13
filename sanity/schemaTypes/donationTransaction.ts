// schemas/donationTransaction.ts
import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'donationTransaction',
  title: 'Donation Transaction (Pending Box)',
  type: 'document',
  fields: [
    defineField({
      name: 'orderId',
      title: 'Order ID / Invoice Number',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'donorName',
      title: 'Nama Donatur',
      type: 'string',
    }),
    defineField({
      name: 'donorPhone',
      title: 'Nomor WhatsApp Donatur',
      type: 'string',
    }),
    defineField({
      name: 'amount',
      title: 'Nominal Donasi',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'programName',
      title: 'Nama Program / Kampanye',
      type: 'reference',
      to: [{ type: 'program' }], // 🚀 Diubah dari 'campaign' menjadi 'program' agar sesuai dengan schemaTypes/program.ts
    }),
    defineField({
      name: 'status',
      title: 'Status Pembayaran',
      type: 'string',
      readOnly: true,
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Success', value: 'success' },
          { title: 'Failed', value: 'failed' }
        ]
      },
      initialValue: 'pending',
    }),
    defineField({
      name: 'paymentUrl',
      title: 'URL Pembayaran DOKU',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'transactionId',
      title: 'Transaction UUID DOKU',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'fundraiserPhone',
      title: 'Nomor WhatsApp Fundraiser (Relawan)',
      type: 'string',
      readOnly: true,
    }),
  ]
});
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
      name: 'donorEmail',
      title: 'Email Donatur',
      type: 'string',
    }),
    defineField({
      name: 'amount',
      title: 'Nominal Donasi (Base)',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'paymentAmount',
      title: 'Nominal Tagihan Pembayaran',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'paidAmount',
      title: 'Nominal Aktual Dibayar (Paid Amount)',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'programName',
      title: 'Nama Program / Kampanye',
      type: 'reference',
      to: [{ type: 'program' }], 
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
      title: 'URL Pembayaran / QRIS',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'transactionId',
      title: 'ID Transaksi Gateway (BDB-...)',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'paymentProvider',
      title: 'Payment Provider',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'paymentMethod',
      title: 'Payment Method',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'paymentVerified',
      title: 'Payment Verified',
      type: 'boolean',
      readOnly: true,
    }),
    defineField({
      name: 'paidAt',
      title: 'Waktu Lunas (Paid At)',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'expiresAt',
      title: 'Waktu Kedaluwarsa',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'fundraiserPhone',
      title: 'Nomor WhatsApp Fundraiser (Relawan)',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'campaignSlug',
      title: 'Campaign Slug',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'programCreditedAt',
      title: 'Program Credited At',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'fundraiserCreditedAt',
      title: 'Fundraiser Credited At',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'paymentPackageName',
      title: 'Payment Package Name',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'paymentAppName',
      title: 'Payment App Name',
      type: 'string',
      readOnly: true,
    }),
  ]
});
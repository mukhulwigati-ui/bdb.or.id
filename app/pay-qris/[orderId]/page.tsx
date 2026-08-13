// app/pay-qris/[orderId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@sanity/client';

const sanityFetchClient = createClient({
  projectId: 'jmgc1ejr',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
});

export default function PayQrisPage() {
  const params = useParams();
  const orderId = params?.orderId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transaction, setTransaction] = useState<any>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchTransactionDetails = async () => {
      try {
        const query = `*[_type == "donationTransaction" && orderId == $orderId][0]`;
        const data = await sanityFetchClient.fetch(query, { orderId });

        if (!data) {
          setError('Detail transaksi tidak ditemukan.');
        } else {
          setTransaction(data);
        }
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError('Gagal memuat data transaksi.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [orderId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif', color: '#6b7280' }}>
        {/* 🚀 FIXED: Typo 'fontWith' diubah menjadi properti valid 'fontWeight' */}
        <p style={{ fontSize: '14px', fontWeight: 600 }}>Menyiapkan halaman pembayaran...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif', color: '#ef4444' }}>
        <p style={{ fontSize: '14px', fontWeight: 600 }}>⚠️ {error || 'Terjadi kesalahan sistem.'}</p>
      </div>
    );
  }

  // Fungsi mengirim pesan konfirmasi rapi ke WA Admin
  const handleWhatsAppConfirm = () => {
    const messageText = `Assalamu'alaikum Admin, saya ingin konfirmasi donasi.\n\n*Detail Transaksi*:\n• Nama: ${transaction.donorName}\n• Order ID: ${transaction.orderId}\n• Nominal + Kode Unik: *Rp ${transaction.totalAmount.toLocaleString('id-ID')}*\n\nSaya sudah melakukan transfer via QRIS, mohon divalidasi ya Admin. Terima kasih.`;
    window.open(`https://wa.me/6282230076051?text=${encodeURIComponent(messageText)}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '440px', margin: '40px auto', padding: '24px', fontFamily: 'sans-serif', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', borderRadius: '16px', background: '#ffffff', border: '1px solid #f3f4f6' }}>
      
      {/* Header */}
      <div style={{ background: '#e6f7f0', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '15px', color: '#10b981', fontWeight: 800, letterSpacing: '0.3px' }}>
          YAYASAN GENERASI INDONESIA MENGAJI
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#047857', fontWeight: 600 }}>
          DONASI METODE QRIS
        </p>
      </div>

      <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '16px', fontWeight: 500 }}>
        Silakan screenshot/pindai QRIS Resmi Yayasan di bawah ini:
      </p>

      {/* Tampilan Gambar Asli QRIS.jpeg */}
      <img
        src="/images/QRIS.jpeg"
        alt="QRIS Resmi Yayasan"
        style={{ width: '260px', height: 'auto', margin: '0 auto 20px auto', display: 'block', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '4px', background: '#fff' }}
        onError={(e) => {
          e.currentTarget.src = "https://via.placeholder.com/260?text=KODE+QRIS+UTAMA";
        }}
      />

      {/* Informasi Nominal */}
      <div style={{ margin: '20px 0', borderTop: '2px dashed #e5e7eb', borderBottom: '2px dashed #e5e7eb', padding: '16px 0' }}>
        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', fontWeight: 600, letterSpacing: '0.5px' }}>
          TOTAL NOMINAL WAJIB TRANSFER
        </p>
        
        <h1 style={{ margin: '6px 0', fontSize: '32px', fontWeight: 800, color: '#111827' }}>
          Rp {transaction.totalAmount.toLocaleString('id-ID')}
        </h1>
        
        <div style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#b91c1c', background: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'left', lineHeight: '1.4' }}>
          <strong>⚠️ PENTING:</strong> Mohon transfer <strong>TEPAT</strong> sampai 3 angka terakhir <strong>({transaction.uniqueCode})</strong> agar pencatatan keuangan internal yayasan rapi dan tidak tertukar.
        </div>
      </div>

      {/* Meta Transaksi */}
      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '20px', textAlign: 'left', background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>ID Transaksi:</span>
          <strong style={{ color: '#374151' }}>{transaction.orderId}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Donatur:</span>
          <strong style={{ color: '#374151' }}>{transaction.donorName}</strong>
        </div>
      </div>

      {/* Tombol Konfirmasi Utama */}
      <button
        onClick={handleWhatsAppConfirm}
        style={{ width: '100%', background: '#25d366', color: '#ffffff', border: 'none', padding: '14px', fontSize: '14px', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(37, 211, 102, 0.2)', transition: 'all 0.2s' }}
      >
        💬 Sudah Transfer? Konfirmasi ke WhatsApp
      </button>
    </div>
  );
}
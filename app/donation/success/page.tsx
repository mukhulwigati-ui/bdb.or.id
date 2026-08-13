// app/donation/success/page.tsx
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

function DonationSuccessContent() {
  const searchParams = useSearchParams();
  
  // Menangkap parameter invoice atau order id dari redirect DOKU
  const orderId = searchParams.get('orderId') || searchParams.get('invoice_number') || searchParams.get('order_id') || searchParams.get('id') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'failed'>('loading');
  const [transactionData, setTransactionData] = useState<any>(null);

  useEffect(() => {
    async function verifyTransaction() {
      if (!orderId) {
        setStatus('pending');
        return;
      }

      try {
        // Melakukan pengecekan status transaksi real-time ke backend/Sanity
        const res = await fetch(`/api/donation/status?orderId=${orderId}`, { cache: 'no-store' });
        const json = await res.json();

        if (json.success && json.transaction) {
          setTransactionData(json.transaction);
          if (json.transaction.status === 'success' || json.transaction.status === 'paid') {
            setStatus('success');
          } else {
            setStatus('pending');
          }
        } else {
          // Fallback jika API status belum ada, cek parameter atau anggap pending agar tidak langsung memvonis sukses palsu
          setStatus('pending');
        }
      } catch (err) {
        console.error('Gagal memverifikasi status:', err);
        setStatus('pending');
      }
    }

    verifyTransaction();
  }, [orderId]);

  if (status === 'loading') {
    return (
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center text-center space-y-4 rounded-2xl">
        <Loader2 className="w-10 h-10 animate-spin text-[#0d5c91]" />
        <p className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wider">Memverifikasi status pembayaran Anda...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-col justify-between text-center space-y-5 rounded-2xl">
      <div>
        {/* Ikon Dinamis Sesuai Status */}
        {status === 'success' ? (
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 shadow-inner rounded-full">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        ) : (
          <div className="w-14 h-14 bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4 shadow-inner rounded-full">
            <Clock className="w-7 h-7" />
          </div>
        )}

        {/* Judul & Kalimat Apresiasi */}
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          {status === 'success' ? 'Alhamdulillah!' : 'Menunggu Pembayaran'}
        </h1>
        <p className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider mt-1 ${status === 'success' ? 'text-emerald-600' : 'text-amber-600'}`}>
          {status === 'success' ? 'Donasi Terverifikasi Otomatis' : 'Transaksi Belum Diselesaikan'}
        </p>
        
        <p className="text-xs sm:text-sm text-slate-700 mt-3 mb-5 leading-relaxed font-normal">
          {status === 'success' ? (
            <>Infak/Sedekah Anda telah berhasil diproses melalui sistem pembayaran resmi <span className="font-semibold text-slate-900">islami.or.id</span>. Terima kasih banyak atas kepercayaan Anda menyalurkan dana kebajikan melalui kami, semoga menjadi aliran amal jariyah yang berlipat ganda. Aamiin.</>
          ) : (
            <>Transaksi dengan nomor invoice di bawah ini belum menyelesaikan proses pembayaran di DOKU. Selesaikan pembayaran Anda atau lakukan donasi ulang jika mengalami kendala.</>
          )}
        </p>

        {/* Kotak Status Detail Transaksi */}
        <div className="bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-left rounded-xl">
          <div className="flex justify-between items-center text-xs sm:text-sm font-medium">
            <span className="text-slate-400 uppercase tracking-wider">No. Invoice</span>
            <span className="text-slate-900 font-bold font-mono">{orderId || 'INV-ISLAMI-XXXXXX'}</span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm font-medium border-t border-slate-200 pt-2.5">
            <span className="text-slate-400 uppercase tracking-wider">Status Dana</span>
            {status === 'success' ? (
              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 font-black text-xs uppercase tracking-wider border border-emerald-200 rounded-md">
                Paid / Success
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 px-2.5 py-1 font-black text-xs uppercase tracking-wider border border-amber-200 rounded-md">
                Pending / Unpaid
              </span>
            )}
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm font-medium border-t border-slate-200 pt-2.5">
            <span className="text-slate-400 uppercase tracking-wider">Metode Pembayaran</span>
            <span className="text-slate-800 font-bold uppercase tracking-wider text-xs">
              DOKU Checkout Resmi
            </span>
          </div>
        </div>
      </div>

      {/* Tombol Aksi Menuju Beranda Utama */}
      <div className="pt-2">
        <Link 
          href="/" 
          className="block w-full text-center bg-[#0d5c91] hover:bg-sky-900 text-white font-bold py-3.5 transition text-xs sm:text-sm uppercase tracking-wider shadow-sm rounded-xl cursor-pointer"
        >
          Kembali ke Beranda 🚀
        </Link>
      </div>
    </div>
  );
}

export default function DonationSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Memuat Status Transaksi...</div>}>
        <DonationSuccessContent />
      </Suspense>
    </div>
  );
}
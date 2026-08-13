// app/donation/error/page.tsx
import Link from 'next/link';

export default function DonationErrorPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm text-center border border-slate-100">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ✕
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Pembayaran Belum Selesai</h1>
        <p className="text-slate-600 text-sm mb-6">
          Transaksi dibatalkan atau mengalami kendala saat diproses. Silakan coba ulangi kembali jika ingin melanjutkan donasi.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 rounded-xl transition text-sm"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
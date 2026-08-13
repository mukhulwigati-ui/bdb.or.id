// app/zakat/page.tsx
import React from 'react';
import ZakatCalculator from '@/components/ZakatCalculator';

export const metadata = {
  title: 'Kalkulator Zakat Otomatis | yaibadurrohman.or.id',
  description: 'Hitung kewajiban zakat maal, zakat penghasilan, dan zakat emas Anda secara instan dan transparan sesuai syariat bersama yaibadurrohman.or.id.',
};

export default function KalkulatorPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-3 sm:py-12 flex flex-col items-center justify-start">
      <div className="w-full max-w-md bg-white border border-gray-200/90 shadow-sm rounded-2xl p-4 sm:p-6 text-left space-y-5">
        
        {/* Header Title */}
        <div className="text-center space-y-1.5 border-b border-gray-100 pb-4">
          <div className="w-10 h-10 bg-sky-50 text-[#0d5c91] rounded-full flex items-center justify-center mx-auto shadow-inner mb-1">
            <span className="text-lg">🧮</span>
          </div>
          <h1 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Kalkulator Zakat Digital</h1>
          <p className="text-[11px] text-gray-500 leading-relaxed px-1">
            Permudah hitung amanah kewajiban mensucikan harta Anda secara akurat hanya dalam hitungan detik.
          </p>
        </div>

        {/* Komponen Utama Kalkulator */}
        <ZakatCalculator />
        
      </div>
    </div>
  );
}
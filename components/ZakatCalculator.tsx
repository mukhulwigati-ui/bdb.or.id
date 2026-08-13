'use client';

import React, { useState } from 'react';

type ZakatType = 'penghasilan' | 'maal' | 'emas';

export default function ZakatCalculator() {
  const [activeTab, setActiveTab] = useState<ZakatType>('penghasilan');
  
  // State Form Inputs
  const [penghasilan, setPenghasilan] = useState('');
  const [bonus, setBonus] = useState('');
  
  const [tabungan, setTabungan] = useState('');
  const [investasi, setInvestasi] = useState('');
  
  const [beratEmas, setBeratEmas] = useState('');

  // Konfigurasi Standar Asumsi Harga Emas 2026 (Rp / gram)
  const HARGA_EMAS = 1400000; 
  const NISHAB_EMAS_GRAM = 85;
  const NISHAB_TAHUNAN = NISHAB_EMAS_GRAM * HARGA_EMAS; // Rp 119.000.000
  const NISHAB_BULANAN = Math.round(NISHAB_TAHUNAN / 12); // Rp 9.916.667

  // Format ribuan ke Rupiah saat mengetik
  const formatRupiah = (value: string) => {
    const raw = value.replace(/[^0-9]/g, '');
    return raw ? Number(raw).toLocaleString('id-ID') : '';
  };

  const getCleanNumber = (value: string) => Number(value.replace(/\./g, '')) || 0;

  // Logika Kalkulasi Utama
  let totalWajibZakat = 0;
  let isWajib = false;
  let deskripsiNishab = '';

  if (activeTab === 'penghasilan') {
    const totalInput = getCleanNumber(penghasilan) + getCleanNumber(bonus);
    isWajib = totalInput >= NISHAB_BULANAN;
    totalWajibZakat = isWajib ? Math.round(totalInput * 0.025) : 0;
    deskripsiNishab = `Nishab zakat penghasilan bulanan saat ini adalah Rp ${NISHAB_BULANAN.toLocaleString('id-ID')} (Setara 1/12 dari 85g Emas).`;
  } else if (activeTab === 'maal') {
    const totalHarta = getCleanNumber(tabungan) + getCleanNumber(investasi);
    isWajib = totalHarta >= NISHAB_TAHUNAN;
    totalWajibZakat = isWajib ? Math.round(totalHarta * 0.025) : 0;
    deskripsiNishab = `Nishab zakat maal tahunan adalah Rp ${NISHAB_TAHUNAN.toLocaleString('id-ID')} (Setara 85g Emas).`;
  } else if (activeTab === 'emas') {
    const berat = Number(beratEmas) || 0;
    isWajib = berat >= NISHAB_EMAS_GRAM;
    totalWajibZakat = isWajib ? Math.round((berat * HARGA_EMAS) * 0.025) : 0;
    deskripsiNishab = `Nishab zakat emas simpanan minimal adalah ${NISHAB_EMAS_GRAM} gram.`;
  }

  // Aksi Checkout Otomatis mengarahkan ke halaman pembayaran program Zakat
  const handleRedirectZakat = () => {
    if (totalWajibZakat <= 0) return;
    
    // Kita arahkan donatur langsung ke halaman detail campaign zakat 
    // dengan membawa parameter nominal otomatis (query string)
    window.location.href = `/campaign/zakat-maal-dan-penghasilan?amount=${totalWajibZakat}`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white border border-gray-200 rounded-none shadow-sm overflow-hidden">
      {/* Tab Menu Utama */}
      <div className="flex border-b border-gray-200 text-xs font-bold text-gray-400">
        <button
          onClick={() => setActiveTab('penghasilan')}
          className={`flex-1 py-4 text-center transition focus:outline-none rounded-none ${
            activeTab === 'penghasilan' ? 'text-emerald-600 bg-gray-50/50 border-b-2 border-emerald-600 font-black' : 'hover:text-gray-600 border-b-2 border-transparent'
          }`}
        >
          💼 ZAKAT PENGHASILAN
        </button>
        <button
          onClick={() => setActiveTab('maal')}
          className={`flex-1 py-4 text-center transition focus:outline-none rounded-none ${
            activeTab === 'maal' ? 'text-emerald-600 bg-gray-50/50 border-b-2 border-emerald-600 font-black' : 'hover:text-gray-600 border-b-2 border-transparent'
          }`}
        >
          💰 ZAKAT MAAL / TABUNGAN
        </button>
        <button
          onClick={() => setActiveTab('emas')}
          className={`flex-1 py-4 text-center transition focus:outline-none rounded-none ${
            activeTab === 'emas' ? 'text-emerald-600 bg-gray-50/50 border-b-2 border-emerald-600 font-black' : 'hover:text-gray-600 border-b-2 border-transparent'
          }`}
        >
          ✨ ZAKAT EMAS
        </button>
      </div>

      <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* KOLOM KIRI: FORM DATA MASUKAN */}
        <div className="space-y-4 text-left">
          <p className="text-[11px] text-gray-400 font-medium leading-relaxed mb-2">
            ℹ️ {deskripsiNishab}
          </p>

          {activeTab === 'penghasilan' && (
            <>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Pendapatan Bulanan (Gaji Pokok)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-gray-400">Rp</span>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-none pl-9 pr-3.5 py-2.5 text-xs font-bold text-gray-800 focus:outline-emerald-500"
                    placeholder="Contoh: 10.000.000"
                    value={penghasilan}
                    onChange={(e) => setPenghasilan(formatRupiah(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Pendapatan Lain / Bonus (Opsional)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-gray-400">Rp</span>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-none pl-9 pr-3.5 py-2.5 text-xs font-bold text-gray-800 focus:outline-emerald-500"
                    placeholder="0"
                    value={bonus}
                    onChange={(e) => setBonus(formatRupiah(e.target.value))}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'maal' && (
            <>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Total Uang Simpanan (Tabungan/Deposito/Cash)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-gray-400">Rp</span>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-none pl-9 pr-3.5 py-2.5 text-xs font-bold text-gray-800 focus:outline-emerald-500"
                    placeholder="Contoh: 150.000.000"
                    value={tabungan}
                    onChange={(e) => setTabungan(formatRupiah(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Nilai Aset Reksadana / Saham / Emas Batangan</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-gray-400">Rp</span>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-none pl-9 pr-3.5 py-2.5 text-xs font-bold text-gray-800 focus:outline-emerald-500"
                    placeholder="0"
                    value={investasi}
                    onChange={(e) => setInvestasi(formatRupiah(e.target.value))}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'emas' && (
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Total Berat Emas Yang Disimpan (Gram)</label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-none px-3.5 py-2.5 text-xs font-bold text-gray-800 focus:outline-emerald-500"
                  placeholder="Contoh: 90"
                  value={beratEmas}
                  onChange={(e) => setBeratEmas(e.target.value)}
                />
                <span className="absolute right-3.5 text-xs font-bold text-gray-400">Gram</span>
              </div>
            </div>
          )}
        </div>

        {/* KOLOM KANAN: HASIL KALKULASI & ACTION BUTTON */}
        <div className="bg-gray-50 border border-gray-100 p-6 text-center space-y-4 flex flex-col justify-between h-full rounded-none">
          <div className="space-y-2 text-left md:text-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
              Besaran Wajib Zakat Anda
            </span>
            <div className="text-3xl font-black text-emerald-600 tracking-tight py-2">
              Rp {totalWajibZakat.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] leading-relaxed font-medium text-gray-500">
              {totalWajibZakat > 0 ? (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 uppercase tracking-wide">
                  🎉 Anda Wajib Zakat (Mencapai Nishab)
                </span>
              ) : (
                <span className="text-gray-400 italic">
                  Harta belum mencapai batas minimum nishab wajib zakat 2.5%.
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleRedirectZakat}
            disabled={totalWajibZakat <= 0}
            className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-none transition text-xs uppercase tracking-widest hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md shadow-emerald-100/60"
          >
            Tunaikan Zakat Sekarang 🚀
          </button>
        </div>

      </div>
    </div>
  );
}
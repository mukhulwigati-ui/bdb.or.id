// components/TotalAccumulationWidget.tsx

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TotalAccumulationWidget() {
  const [stats, setStats] = useState({
    totalCollected: 0,
    totalDonors: 0,
    totalPrograms: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/programs?v=' + Date.now(), {
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const calculated = json.data.reduce(
            (acc: any, program: any) => {
              const collected = Number(
                program.collectedRaw ||
                  program.collectedAmount ||
                  0
              );

              const donorCount = Number(
                program.donorsCount || 0
              );

              return {
                totalCollected:
                  acc.totalCollected + collected,

                totalDonors:
                  acc.totalDonors + donorCount,
              };
            },

            {
              totalCollected: 0,
              totalDonors: 0,
            }
          );

          setStats({
            totalCollected:
              calculated.totalCollected,

            totalDonors:
              calculated.totalDonors,

            totalPrograms:
              json.data.length,
          });
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error(
          'Fetch accumulation statistics error:',
          err
        );

        setLoading(false);
      });
  }, []);

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (loading) {
    return (
      <div className="w-full py-3">
        <div className="text-center text-xs text-gray-400 font-bold tracking-wider uppercase animate-pulse">
          MENGAKUMULASIKAN DATA AMANAH...
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="w-full space-y-2">

      {/* ================================================================== */}
      {/* STATISTIK UTAMA */}
      {/* ================================================================== */}

      <div className="grid grid-cols-3 bg-white border border-gray-200/95 rounded-none shadow-sm divide-x divide-gray-100 overflow-hidden">

        {/* ================================================================ */}
        {/* KOTAK 1: TOTAL DANA */}
        {/* ================================================================ */}

        <div className="p-3 sm:p-4 flex flex-col items-center justify-center text-center space-y-1.5 transition-colors hover:bg-gray-50/60">

          <span className="text-[10px] sm:text-xs font-extrabold text-gray-500 uppercase tracking-tight flex items-center gap-1">
            <span>💰</span>
            DANA
          </span>

          {stats.totalCollected > 0 ? (
            <span className="text-xs sm:text-sm font-extrabold text-emerald-600 tracking-tight leading-snug">
              Rp{' '}
              {stats.totalCollected.toLocaleString(
                'id-ID'
              )}
            </span>
          ) : (
            <span className="text-xs sm:text-sm font-extrabold text-emerald-600 uppercase tracking-tight block">
              🌱 SIAP
            </span>
          )}

          <span className="text-[10px] text-gray-400 font-medium leading-none">
            Disalurkan
          </span>
        </div>

        {/* ================================================================ */}
        {/* KOTAK 2: DONATUR */}
        {/* ================================================================ */}

        <div className="p-3 sm:p-4 flex flex-col items-center justify-center text-center space-y-1.5 transition-colors hover:bg-gray-50/60">

          <span className="text-[10px] sm:text-xs font-extrabold text-gray-500 uppercase tracking-tight flex items-center gap-1">
            <span>🤝</span>
            DONATUR
          </span>

          {stats.totalDonors > 0 ? (
            <span className="text-xs sm:text-sm font-extrabold text-gray-800 tracking-tight leading-snug">
              {stats.totalDonors.toLocaleString(
                'id-ID'
              )}{' '}

              <span className="text-[10px] font-bold text-gray-400 uppercase">
                Jiwa
              </span>
            </span>
          ) : (
            <span className="text-xs sm:text-sm font-extrabold text-emerald-600 uppercase tracking-tight block">
              🤝 MULAI
            </span>
          )}

          <span className="text-[10px] text-gray-400 font-medium leading-none">
            {stats.totalDonors > 0
              ? 'Terverifikasi'
              : 'Kebaikan'}
          </span>
        </div>

        {/* ================================================================ */}
        {/* KOTAK 3: PROGRAM */}
        {/* ================================================================ */}

        <div className="p-3 sm:p-4 flex flex-col items-center justify-center text-center space-y-1.5 transition-colors hover:bg-gray-50/60">

          <span className="text-[10px] sm:text-xs font-extrabold text-gray-500 uppercase tracking-tight flex items-center gap-1">
            <span>📦</span>
            PROGRAM
          </span>

          <span className="text-xs sm:text-sm font-extrabold text-gray-800 tracking-tight leading-snug">
            {stats.totalPrograms}{' '}

            <span className="text-[10px] font-bold text-gray-400 uppercase">
              Aktif
            </span>
          </span>

          <span className="text-[10px] text-gray-400 font-medium leading-none">
            Campaign
          </span>
        </div>

      </div>

      {/* ================================================================== */}
      {/* TOMBOL LAPORAN BULANAN */}
      {/* ================================================================== */}

      <Link
        href="/laporan"
        className="
          group
          w-full
          bg-white
          border
          border-gray-200/95
          shadow-sm
          px-4
          py-3
          flex
          items-center
          justify-between
          transition-all
          duration-200
          hover:bg-emerald-50/50
          hover:border-emerald-200
        "
      >
        <div className="flex items-center gap-2.5">

          <div className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-base">
            📊
          </div>

          <div className="text-left">
            <div className="text-xs sm:text-sm font-extrabold text-gray-700 group-hover:text-emerald-700 transition-colors">
              Laporan Bulanan
            </div>

            <div className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">
              Lihat transparansi pengelolaan dana
            </div>
          </div>

        </div>

        <span className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all text-lg leading-none">
          ›
        </span>
      </Link>

    </div>
  );
}
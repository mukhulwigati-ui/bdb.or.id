'use client';

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, CheckCheck, Info, ChevronLeft, ArrowRight, ShieldCheck } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

export default function NotifikasiPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 🚀 Diatur kosong [] secara default
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    checkUser();
  }, [supabase]);

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-xs font-medium text-slate-500 animate-pulse">Memuat halaman notifikasi...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 py-6 px-3 pb-24 flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto bg-white border border-slate-200 shadow-sm p-6 text-center space-y-4 rounded-xl">
          <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Info className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-base font-extrabold text-slate-900">Akses Terbatas</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Kamu belum masuk. Silakan login terlebih dahulu untuk melihat riwayat pemberitahuan dan status transaksi akunmu.
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <Link
              href="/login"
              className="w-full block bg-[#0d5c91] hover:bg-sky-900 text-white font-bold text-[11px] uppercase tracking-wider py-3 rounded-lg transition shadow-sm"
            >
              Masuk Sekarang 🚀
            </Link>
            <Link
              href="/"
              className="w-full block border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider py-2.5 rounded-lg transition"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 px-3 pb-24">
      <div className="w-full max-w-sm mx-auto space-y-3">
        
        <div className="bg-white border border-slate-200 shadow-sm p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              aria-label="Kembali"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Pusat Notifikasi</h1>
              <p className="text-[10px] text-slate-400">Riwayat pemberitahuan akun Anda</p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[10px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Baca Semua
            </button>
          )}
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Bell className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-500">Belum ada notifikasi baru untuk saat ini.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div 
                key={item.id} 
                className={`p-4 transition-colors hover:bg-slate-50 flex gap-3.5 ${!item.read ? 'bg-sky-50/50' : ''}`}
              >
                <div className="pt-0.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    item.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 text-[#0d5c91]'
                  }`}>
                    {item.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </div>
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-slate-900">{item.title}</h2>
                    <span className="text-[9px] text-slate-400 font-medium">{item.date}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{item.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-sky-50 border border-sky-100 p-3.5 rounded-xl text-center space-y-2">
          <p className="text-[10px] text-sky-800 font-medium leading-relaxed">
            Semua aktivitas dan informasi penting terkait akun Anda tercatat secara aman dan transparan di sistem yaibadurrohman.or.id.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#0d5c91] hover:underline uppercase tracking-wider"
          >
            Kembali ke Beranda <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Info, X, ChevronRight } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false); // 🚀 Mencegah Hydration Mismatch
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // 🚀 Pastikan komponen hanya mengecek sesi setelah benar-benar mounted di client
  useEffect(() => {
    setIsMounted(true);
    const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUserSession();
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  // 🚀 Selama render awal server & client sebelum mounted, tampilkan tampilan statis yang aman (tanpa beda server/client)
  if (!isMounted) {
    return (
      <div className="relative inline-block text-left">
        <button className="relative p-2 text-white hover:text-sky-200 transition-colors focus:outline-none" aria-label="Notifikasi">
          <Bell className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:text-sky-200 transition-colors focus:outline-none"
        aria-label="Notifikasi"
      >
        <Bell className="w-5 h-5" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#0d5c91]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} Baru
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 transition"
                  title="Tandai semua dibaca"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Baca Semua
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
            {!user ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto">
                  <Info className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">Kamu Belum Masuk</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Silakan masuk terlebih dahulu untuk melihat riwayat notifikasi dan status transaksi pribadi Anda.
                  </p>
                </div>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="inline-block w-full bg-[#0d5c91] hover:bg-sky-900 text-white font-bold text-[11px] uppercase tracking-wider py-2.5 rounded-xl transition shadow-sm"
                >
                  Masuk Sekarang 🚀
                </Link>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada notifikasi saat ini.
              </div>
            ) : (
              notifications.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-3.5 transition-colors hover:bg-slate-50 flex gap-3 ${!item.read ? 'bg-sky-50/40' : ''}`}
                >
                  <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!item.read ? 'bg-sky-600' : 'bg-transparent'}`} />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      <span className="text-[9px] text-slate-400">{item.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{item.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {user && (
            <div className="bg-slate-50 border-t border-slate-100 p-2 text-center">
              <Link
                href="/notifikasi"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-bold text-[#0d5c91] hover:underline flex items-center justify-center gap-1 py-1"
              >
                Lihat Semua Notifikasi <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
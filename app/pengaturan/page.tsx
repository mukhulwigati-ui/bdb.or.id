// app/pengaturan/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { ArrowLeft, Settings, CheckCircle2, Loader2, Bell, Shield } from 'lucide-react';

export default function PengaturanPage() {
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (data) {
          setProfile(data);
          setName(data.name || '');
          setPhone(data.phone || '');
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesi habis');

      const { error } = await supabase
        .from('profiles')
        .update({ name, phone, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;
      setMessage('Pengaturan akun berhasil disimpan! 🎉');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-500 animate-pulse">Memuat pengaturan...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-28 pt-4 px-4">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* Header */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <Link href="/akun" className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition">
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </Link>
          <h1 className="font-extrabold text-base text-slate-900">Pengaturan Akun</h1>
        </div>

        {/* Form Pengaturan */}
        <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 rounded-xl focus:outline-[#0d5c91]"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Email Terdaftar</label>
            <input
              type="email"
              disabled
              value={profile?.email || ''}
              className="w-full border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-400 bg-slate-50 rounded-xl cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Email terhubung dengan Google Auth dan tidak dapat diubah.</span>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Nomor WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 rounded-xl focus:outline-[#0d5c91]"
            />
          </div>

          {message && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#0d5c91] hover:bg-sky-900 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-sm"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>

      </div>
    </div>
  );
}
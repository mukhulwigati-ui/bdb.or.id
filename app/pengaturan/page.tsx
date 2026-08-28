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
        const meta = user.user_metadata || {};
        const googleAvatar = meta.avatar_url || meta.picture || '';
        const googleName = meta.full_name || meta.name || user.email?.split('@')[0] || 'Dermawan';

        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        
        if (data) {
          setProfile(data);
          setName(data.name || googleName);
          setPhone(data.phone || '');
        } else {
          // Jika profil belum ada di database, siapkan nilai default dari Google Metadata
          setProfile({ id: user.id, email: user.email, name: googleName, avatar: googleAvatar, phone: '' });
          setName(googleName);
          setPhone('');
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

      const meta = user.user_metadata || {};
      const googleAvatar = meta.avatar_url || meta.picture || '';

      // Menggunakan .upsert agar jika baris belum ada maka akan dibuat, jika sudah ada akan di-update
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name,
          phone,
          avatar: profile?.avatar || googleAvatar,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setMessage('Pengaturan akun berhasil disimpan! 🎉');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center text-xs font-bold text-slate-500 animate-pulse">Memuat pengaturan...</div>;

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-28 pt-5 px-3 flex justify-center text-slate-900">
      <div className="w-[calc(100%-1.5rem)] max-w-[calc(28rem-1.5rem)] space-y-4">
        
        {/* Header */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-none border border-slate-200/80 shadow-xs">
          <Link href="/akun" className="p-2 bg-slate-100 rounded-none hover:bg-slate-200 transition">
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </Link>
          <h1 className="font-extrabold text-base text-slate-900">Pengaturan Akun</h1>
        </div>

        {/* Form Pengaturan */}
        <form onSubmit={handleSave} className="bg-white p-5 rounded-none border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 rounded-none focus:outline-[#0d5c91]"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Email Terdaftar</label>
            <input
              type="email"
              disabled
              value={profile?.email || ''}
              className="w-full border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-400 bg-slate-50 rounded-none cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Email terhubung dengan Google Auth dan tidak dapat diubah.</span>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Nomor WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 rounded-none focus:outline-[#0d5c91]"
            />
          </div>

          {message && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-none">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#0d5c91] hover:bg-sky-900 text-white font-bold py-3 rounded-none text-xs uppercase tracking-wider transition cursor-pointer shadow-sm"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>

      </div>
    </div>
  );
}
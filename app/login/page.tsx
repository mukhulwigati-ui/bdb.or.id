// app/login/page.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
  
  const router = useRouter();

  // 🚀 Cek apakah user sudah login, jika ya, langsung lempar ke beranda atau halaman akun
  useEffect(() => {
    async function checkUserSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace('/akun'); // Diarahkan ke halaman akun jika sudah login
        }
      } catch (err) {
        console.error('Error checking session:', err);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkUserSession();
  }, [supabase, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        alert(error.message);
      } else {
        if (data.session) {
          router.push('/');
          router.refresh();
        } else {
          alert('Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi atau langsung masuk.');
          setMode('login');
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        alert(error.message);
      } else {
        router.push('/');
        router.refresh();
      }
    }
    
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/auth/callback` 
      }
    });

    if (error) {
      alert(error.message);
    }
  };

  // Tampilkan loading sebentar saat memeriksa status login agar tidak berkedip
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-bold text-slate-500 animate-pulse">Memeriksa sesi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-left">
        
        {/* Header Tab Mode */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">
            {mode === 'login' ? 'Masuk' : 'Daftar Akun'}
          </h1>
          <button 
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs font-bold text-[#0d5c91] hover:underline cursor-pointer"
          >
            {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none transition text-slate-800 text-sm font-medium"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Kata Sandi</label>
            <input
              type="password"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none transition text-slate-800 text-sm font-medium"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0d5c91] hover:bg-sky-800 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-70 text-sm cursor-pointer"
          >
            {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar dengan Email'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-medium">Atau lanjutkan dengan</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          className="w-full flex items-center justify-center gap-2.5 border border-slate-200 hover:bg-slate-50 py-3 rounded-xl font-semibold text-slate-700 transition text-sm shadow-2xs cursor-pointer"
        >
          <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
          <span>Daftar / Masuk dengan Google</span>
        </button>
      </div>
    </div>
  );
}
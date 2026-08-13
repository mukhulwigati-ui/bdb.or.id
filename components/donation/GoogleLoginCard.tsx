// components/donation/GoogleLoginCard.tsx
'use client';

import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function GoogleLoginCard() {
  const handleGoogleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
        },
      });
    } catch (err) {
      console.error('Gagal login dengan Google:', err);
    }
  };

  return (
    <div className="bg-sky-50/60 border border-sky-100 p-4 rounded-xl text-center space-y-3">
      <p className="text-xs font-bold text-slate-800 uppercase">Masuk Lebih Cepat</p>
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl shadow-2xs transition flex items-center justify-center gap-2.5 cursor-pointer"
      >
        <span>Masuk dengan Google</span>
      </button>
    </div>
  );
}
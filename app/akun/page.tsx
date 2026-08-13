// app/akun/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  History, FileText, Bookmark, Phone, Settings, 
  HelpCircle, LogOut, ChevronRight, Target, Sparkles, X, Loader2, Eye 
} from 'lucide-react';

export default function AkunPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [referralClicks, setReferralClicks] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // State Modal Ubah WhatsApp
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const router = useRouter();

  useEffect(() => {
    const fetchAkunData = async () => {
      setLoading(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 1. Ambil Profil dari tabel profiles
      let { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!prof) {
        const meta = user.user_metadata || {};
        prof = {
          id: user.id,
          email: user.email,
          name: meta.full_name || meta.name || user.email?.split('@')[0] || 'Dermawan',
          avatar: meta.avatar_url || meta.picture || '',
          phone: ''
        };
        await supabase.from('profiles').upsert(prof);
      }
      setProfile(prof);
      setNewPhone(prof.phone || '');

      // 2. Ambil Riwayat Donasi untuk Statistik & Target
      const { data: donData } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', user.id);

      if (donData) setDonations(donData);

      // 3. Ambil Statistik Kunjungan / Klik Referral
      try {
        const phoneKey = prof?.phone || user.id;
        const { count, error: countErr } = await supabase
          .from('referral_visits')
          .select('*', { count: 'exact', head: true })
          .eq('ref_code', phoneKey);

        if (!countErr && count !== null) {
          setReferralClicks(count);
        }
      } catch (err) {
        console.log('Belum ada tabel pelacakan referral.');
      }

      setLoading(false);
    };

    fetchAkunData();
  }, [supabase, router]);

  // Statistik Donatur
  const successfulDonations = donations.filter(d => 
    ['success', 'paid', 'completed'].includes((d.status || '').toLowerCase())
  );
  
  const totalAmount = successfulDonations.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const uniqueProgramsCount = new Set(donations.map(d => d.program_name || d.programTitle)).size;

  // Level Kebaikan Berdasarkan Total Donasi
  let levelInfo = { name: 'Dermawan (Level 1)', min: 0, next: 500000 };
  if (totalAmount >= 5000000) levelInfo = { name: 'Wakif (Level 5)', min: 5000000, next: 10000000 };
  else if (totalAmount >= 2000000) levelInfo = { name: 'Muhsin (Level 4)', min: 2000000, next: 5000000 };
  else if (totalAmount >= 1000000) levelInfo = { name: 'Pejuang (Level 3)', min: 1000000, next: 2000000 };
  else if (totalAmount >= 500000) levelInfo = { name: 'Sahabat (Level 2)', min: 500000, next: 1000000 };

  // Target Sedekah Bulanan
  const targetBulanan = 500000;
  const progressPercent = Math.min(Math.round((totalAmount / targetBulanan) * 100), 100);

  // Simpan Nomor WhatsApp Baru via Modal
  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPhone.replace(/[^0-9]/g, '');
    if (clean.length < 9) {
      alert('Masukkan nomor WhatsApp yang valid!');
      return;
    }

    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: clean, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      setProfile((prev: any) => ({ ...prev, phone: clean }));
      setIsModalOpen(false);
      alert('Nomor WhatsApp berhasil diperbarui!');
    } catch (err: any) {
      alert('Gagal memperbarui: ' + err.message);
    } finally {
      setSavingPhone(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-widest animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin text-[#c59b27]" /> Memuat dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-28 pt-4 px-4">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* ================= 1. HEADER PROFIL (Avatar Bulat & Nuansa Coklat Kopi) ================= */}
        <div className="bg-white p-5 border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {profile?.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-14 h-14 rounded-full object-cover border-2 border-[#c59b27]/40 shadow-xs" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-stone-100 text-[#4a2e1b] flex items-center justify-center font-bold text-xl border-2 border-[#c59b27]/40 shadow-xs">
                {(profile?.name || 'D').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-base sm:text-lg text-stone-900 leading-snug">{profile?.name || 'Dermawan Islami'}</h1>
              <p className="text-xs text-stone-400">{profile?.email}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 mt-1">
                ✓ Member Islami.or.id
              </span>
            </div>
          </div>
        </div>

        {/* ================= 2. RINGKASAN DONASI & STATISTIK KUNJUNGAN REFERRAL ================= */}
        <div className="bg-gradient-to-br from-[#4a2e1b] to-[#2b180d] text-white p-5 shadow-lg space-y-3 relative overflow-hidden border-b-2 border-[#c59b27]">
          <div className="flex justify-between items-center">
            <span className="text-xs text-amber-200/80 font-bold uppercase tracking-wider">Total Donasi Anda</span>
            <span className="text-xs bg-[#c59b27]/20 border border-[#c59b27]/40 px-2.5 py-1 font-bold text-amber-200">{levelInfo.name}</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-extrabold text-white">Rp {totalAmount.toLocaleString('id-ID')}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/15 text-center text-xs">
            <div>
              <span className="text-stone-300 block text-[10px]">Program</span>
              <p className="font-extrabold text-sm text-white">{uniqueProgramsCount}</p>
            </div>
            <div className="border-x border-white/15 px-1">
              <span className="text-stone-300 block text-[10px]">Berhasil</span>
              <p className="font-extrabold text-sm text-white">{successfulDonations.length}x</p>
            </div>
            <div>
              <span className="text-stone-300 block text-[10px]">Kunjungan Ref</span>
              <p className="font-extrabold text-sm text-white flex items-center justify-center gap-1">
                <Eye className="w-3.5 h-3.5 text-amber-400" /> {referralClicks}
              </p>
            </div>
          </div>
        </div>

        {/* ================= 3. TARGET SEDEKAH BULANAN ================= */}
        <div className="bg-white p-4 border border-stone-200/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-stone-800 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#4a2e1b]" /> Target Sedekah Bulanan
            </span>
            <span className="font-bold text-[#c59b27]">Rp {totalAmount.toLocaleString('id-ID')} / Rp {targetBulanan.toLocaleString('id-ID')}</span>
          </div>
          <div className="w-full bg-stone-100 h-2.5 overflow-hidden shadow-inner">
            <div className="bg-[#c59b27] h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-[11px] text-stone-400 text-right">{progressPercent}% tercapai dari target bulan ini</p>
        </div>

        {/* ================= 4. NOMOR WHATSAPP ================= */}
        <div className="bg-white p-4 border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-stone-100 text-[#4a2e1b] flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Nomor WhatsApp</span>
              <span className="text-xs font-bold text-stone-800">{profile?.phone || 'Belum diatur'}</span>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold text-[#4a2e1b] hover:underline bg-stone-100 hover:bg-stone-200 px-3 py-1.5 transition cursor-pointer"
          >
            Ubah
          </button>
        </div>

        {/* ================= 5. MENU NAVIGASI UTAMA ================= */}
        <div className="bg-white border border-stone-200/80 shadow-xs overflow-hidden divide-y divide-stone-100">
          <Link href="/donasi-saya" className="flex items-center justify-between p-4 hover:bg-stone-50 transition cursor-pointer">
            <div className="flex items-center gap-3 text-stone-800 font-bold text-xs sm:text-sm">
              <History className="w-4 h-4 text-[#4a2e1b]" /> Riwayat Donasi
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </Link>

          <Link href="/kuitansi" className="flex items-center justify-between p-4 hover:bg-stone-50 transition cursor-pointer">
            <div className="flex items-center gap-3 text-stone-800 font-bold text-xs sm:text-sm">
              <FileText className="w-4 h-4 text-[#4a2e1b]" /> Kuitansi & Sertifikat
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </Link>

          <Link href="/favorit" className="flex items-center justify-between p-4 hover:bg-stone-50 transition cursor-pointer">
            <div className="flex items-center gap-3 text-stone-800 font-bold text-xs sm:text-sm">
              <Bookmark className="w-4 h-4 text-[#4a2e1b]" /> Program Favorit
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </Link>

          <Link href="/referral" className="flex items-center justify-between p-4 hover:bg-stone-50 transition cursor-pointer">
            <div className="flex items-center gap-3 text-stone-800 font-bold text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-[#4a2e1b]" /> Ajak Teman (Referral)
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </Link>

          <Link href="/pengaturan" className="flex items-center justify-between p-4 hover:bg-stone-50 transition cursor-pointer">
            <div className="flex items-center gap-3 text-stone-800 font-bold text-xs sm:text-sm">
              <Settings className="w-4 h-4 text-[#4a2e1b]" /> Pengaturan Akun
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </Link>

          <Link href="/bantuan" className="flex items-center justify-between p-4 hover:bg-stone-50 transition cursor-pointer">
            <div className="flex items-center gap-3 text-stone-800 font-bold text-xs sm:text-sm">
              <HelpCircle className="w-4 h-4 text-[#4a2e1b]" /> Bantuan & FAQ
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </Link>
        </div>

        {/* ================= 6. TOMBOL KELUAR (LOGOUT) ================= */}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full py-3 text-stone-500 hover:text-rose-600 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Keluar (Logout)
          </button>
        </div>

      </div>

      {/* ================= MODAL UBAH WHATSAPP ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm p-5 space-y-4 shadow-2xl border border-stone-200 text-left">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-extrabold text-stone-900 uppercase tracking-wide">Ubah Nomor WhatsApp</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePhone} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Nomor WhatsApp Baru</label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full border border-stone-300 px-3.5 py-2.5 text-sm font-semibold text-stone-900 focus:outline-[#4a2e1b]"
                />
              </div>

              <button
                type="submit"
                disabled={savingPhone}
                className="w-full bg-[#4a2e1b] hover:bg-[#3b2314] text-white font-bold py-3 text-xs uppercase tracking-wider transition cursor-pointer disabled:bg-stone-300 shadow-sm"
              >
                {savingPhone ? 'Menyimpan...' : 'Simpan Nomor Baru'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
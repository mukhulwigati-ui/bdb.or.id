import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies(); // Pastikan await di sini
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Menambahkan path: '/' agar cookie berlaku di semua halaman
            cookieStore.set({ name, value, ...options, path: '/' });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options, path: '/' });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Jika gagal, arahkan kembali ke login
  return NextResponse.redirect(`${origin}/login`);
}
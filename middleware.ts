// middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Jika env Supabase belum diisi, langsung loloskan agar tidak hang
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh sesi auth Supabase
  const { data: { user } } = await supabase.auth.getUser();

  // Proteksi rute: Jika belum login dan mengakses /akun atau /donasi-saya, arahkan ke /login
  const path = request.nextUrl.pathname;
  if (!user && (path.startsWith('/akun') || path.startsWith('/donasi-saya'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * PENTING: Mengecualikan /studio, semua rute /api/, file internal Next.js, dan aset statis
     * agar middleware tidak terpanggil pada area tersebut dan terhindar dari timeout 504.
     */
    '/((?!_next/static|_next/image|favicon.ico|studio|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)',
  ],
};
// middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

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
     * Lewati file-file internal Next.js, file statis, gambar, dan route API publik (seperti /api/donate)
     * agar middleware tidak terpanggil secara tidak perlu yang memicu timeout.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/donate|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)',
  ],
};
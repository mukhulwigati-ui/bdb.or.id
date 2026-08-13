import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.delete({ name, ...options });
        },
      },
    }
  );

  // Memeriksa status user
  const { data: { user } } = await supabase.auth.getUser();

  // Proteksi: Jika user belum login dan mencoba mengakses rute 'akun' atau 'donasi-saya',
  // arahkan mereka ke halaman login
  if (!user && (request.nextUrl.pathname.startsWith('/akun') || request.nextUrl.pathname.startsWith('/donasi-saya'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

// Menentukan rute mana saja yang akan diproses oleh middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (callback)
     * - login (halaman login)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth|login).*)',
  ],
};
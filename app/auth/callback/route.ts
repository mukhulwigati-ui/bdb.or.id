import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get('code');

  const origin = requestUrl.origin;

  if (!code) {
    console.error('OAuth callback: code tidak ditemukan');

    return NextResponse.redirect(
      `${origin}/login?error=oauth_code_missing`
    );
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },

          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(
                ({ name, value, options }) => {
                  cookieStore.set(
                    name,
                    value,
                    options
                  );
                }
              );
            } catch (error) {
              console.error(
                'Gagal menyimpan cookie Supabase:',
                error
              );
            }
          },
        },
      }
    );

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error(
        'exchangeCodeForSession error:',
        error
      );

      return NextResponse.redirect(
        `${origin}/login?error=oauth_exchange_failed`
      );
    }

    return NextResponse.redirect(`${origin}/`);
  } catch (error) {
    console.error(
      'OAuth callback fatal error:',
      error
    );

    return NextResponse.redirect(
      `${origin}/login?error=oauth_callback_failed`
    );
  }
}
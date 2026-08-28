// app/login/page.tsx

'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [
    checkingAuth,
    setCheckingAuth,
  ] =
    useState(true);

  const [mode, setMode] =
    useState<
      'login' | 'register'
    >('login');

  // ==========================================================
  // SUPABASE CLIENT
  // ==========================================================

  const supabase =
    useMemo(
      () =>
        createBrowserClient(
          process.env
            .NEXT_PUBLIC_SUPABASE_URL!,
          process.env
            .NEXT_PUBLIC_SUPABASE_ANON_KEY!
        ),
      []
    );

  // ==========================================================
  // CALLBACK URL
  // ==========================================================

  const getCallbackUrl =
    () => {
      if (
        typeof window ===
        'undefined'
      ) {
        return '';
      }

      return (
        `${window.location.origin}` +
        `/auth/callback`
      );
    };

  // ==========================================================
  // CEK AUTH AWAL
  // ==========================================================

  useEffect(() => {
    let isMounted =
      true;

    async function checkInitialAuth() {
      try {
        // ======================================================
        // getUser lebih terpercaya untuk memastikan user valid
        // ======================================================

        const {
          data: {
            user,
          },
          error,
        } =
          await supabase.auth.getUser();

        if (
          error
        ) {
          console.warn(
            'Initial auth check:',
            error.message
          );
        }

        if (
          user &&
          isMounted
        ) {
          router.replace(
            '/akun'
          );

          router.refresh();

          return;
        }
      } catch (
        error
      ) {
        console.error(
          'Error checking auth:',
          error
        );
      } finally {
        if (
          isMounted
        ) {
          setCheckingAuth(
            false
          );
        }
      }
    }

    checkInitialAuth();

    // ========================================================
    // LISTEN AUTH CHANGE
    // ========================================================

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          session
        ) => {
          console.log(
            'Auth event:',
            event
          );

          if (
            !isMounted
          ) {
            return;
          }

          if (
            session?.user
          ) {
            router.replace(
              '/akun'
            );

            router.refresh();
          }
        }
      );

    return () => {
      isMounted =
        false;

      subscription.unsubscribe();
    };
  }, [
    supabase,
    router,
  ]);

  // ==========================================================
  // EMAIL LOGIN / REGISTER
  // ==========================================================

  const handleAuth =
    async (
      e:
        React.FormEvent<HTMLFormElement>
    ) => {
      e.preventDefault();

      if (
        loading
      ) {
        return;
      }

      setLoading(
        true
      );

      try {
        // ======================================================
        // REGISTER
        // ======================================================

        if (
          mode ===
          'register'
        ) {
          const {
            data,
            error,
          } =
            await supabase.auth.signUp(
              {
                email:
                  email.trim(),

                password,

                options: {
                  emailRedirectTo:
                    getCallbackUrl(),
                },
              }
            );

          if (
            error
          ) {
            throw error;
          }

          // ====================================================
          // Jika email confirmation dimatikan
          // session bisa langsung terbentuk
          // ====================================================

          if (
            data.session?.user
          ) {
            router.replace(
              '/akun'
            );

            router.refresh();

            return;
          }

          alert(
            'Pendaftaran berhasil. Silakan periksa email Anda untuk verifikasi.'
          );

          setMode(
            'login'
          );

          return;
        }

        // ======================================================
        // LOGIN EMAIL
        // ======================================================

        const {
          data,
          error,
        } =
          await supabase.auth.signInWithPassword(
            {
              email:
                email.trim(),

              password,
            }
          );

        if (
          error
        ) {
          throw error;
        }

        if (
          !data.user
        ) {
          throw new Error(
            'Login berhasil tetapi data user tidak ditemukan.'
          );
        }

        router.replace(
          '/akun'
        );

        router.refresh();
      } catch (
        error: any
      ) {
        console.error(
          'Email auth error:',
          error
        );

        alert(
          error?.message ||
            'Proses autentikasi gagal.'
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  // ==========================================================
  // GOOGLE AUTH
  // ==========================================================

  const handleGoogleAuth =
    async () => {
      if (
        loading
      ) {
        return;
      }

      try {
        setLoading(
          true
        );

        const callbackUrl =
          getCallbackUrl();

        console.log(
          'Google OAuth redirectTo:',
          callbackUrl
        );

        const {
          data,
          error,
        } =
          await supabase.auth.signInWithOAuth(
            {
              provider:
                'google',

              options: {
                redirectTo:
                  callbackUrl,

                skipBrowserRedirect:
                  false,

                queryParams: {
                  access_type:
                    'offline',

                  prompt:
                    'select_account',
                },
              },
            }
          );

        if (
          error
        ) {
          throw error;
        }

        // Untuk debug
        console.log(
          'Google OAuth response:',
          data
        );

        // Browser akan diarahkan otomatis oleh Supabase
      } catch (
        error: any
      ) {
        console.error(
          'Google OAuth error:',
          error
        );

        alert(
          error?.message ||
            'Login Google gagal.'
        );

        setLoading(
          false
        );
      }
    };

  // ==========================================================
  // LOADING AUTH CHECK
  // ==========================================================

  if (
    checkingAuth
  ) {
    return (
      <div
        className="
          min-h-screen
          bg-slate-50
          flex
          items-center
          justify-center
        "
      >
        <p
          className="
            text-sm
            font-bold
            text-slate-500
            animate-pulse
          "
        >
          Memeriksa sesi...
        </p>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        min-h-screen
        bg-slate-50
        flex
        items-center
        justify-center
        p-4
      "
    >
      <div
        className="
          w-full
          max-w-sm
          bg-white
          p-8
          rounded-2xl
          shadow-sm
          border
          border-slate-100
          text-left
        "
      >
        {/* ====================================================
            HEADER
        ===================================================== */}

        <div
          className="
            flex
            justify-between
            items-center
            mb-6
            gap-4
          "
        >
          <h1
            className="
              text-2xl
              font-extrabold
              text-slate-900
            "
          >
            {mode ===
            'login'
              ? 'Masuk'
              : 'Daftar Akun'}
          </h1>

          <button
            type="button"
            disabled={
              loading
            }
            onClick={() =>
              setMode(
                mode ===
                'login'
                  ? 'register'
                  : 'login'
              )
            }
            className="
              text-xs
              font-bold
              text-[#0d5c91]
              hover:underline
              cursor-pointer
              disabled:opacity-50
            "
          >
            {mode ===
            'login'
              ? 'Belum punya akun? Daftar'
              : 'Sudah punya akun? Masuk'}
          </button>
        </div>

        {/* ====================================================
            EMAIL FORM
        ===================================================== */}

        <form
          onSubmit={
            handleAuth
          }
          className="
            space-y-4
          "
        >
          {/* EMAIL */}

          <div>
            <label
              className="
                text-sm
                font-semibold
                text-slate-600
                mb-1.5
                block
              "
            >
              Email
            </label>

            <input
              type="email"
              autoComplete="email"
              className="
                w-full
                px-4
                py-2.5
                bg-slate-50
                border
                border-slate-200
                rounded-xl
                focus:ring-2
                focus:ring-sky-500
                focus:outline-none
                transition
                text-slate-800
                text-sm
                font-medium
              "
              placeholder="nama@email.com"
              value={
                email
              }
              onChange={(
                e
              ) =>
                setEmail(
                  e.target.value
                )
              }
              required
            />
          </div>

          {/* PASSWORD */}

          <div>
            <label
              className="
                text-sm
                font-semibold
                text-slate-600
                mb-1.5
                block
              "
            >
              Kata Sandi
            </label>

            <input
              type="password"
              autoComplete={
                mode ===
                'login'
                  ? 'current-password'
                  : 'new-password'
              }
              minLength={
                6
              }
              className="
                w-full
                px-4
                py-2.5
                bg-slate-50
                border
                border-slate-200
                rounded-xl
                focus:ring-2
                focus:ring-sky-500
                focus:outline-none
                transition
                text-slate-800
                text-sm
                font-medium
              "
              placeholder="••••••••"
              value={
                password
              }
              onChange={(
                e
              ) =>
                setPassword(
                  e.target.value
                )
              }
              required
            />
          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              loading
            }
            className="
              w-full
              bg-[#0d5c91]
              hover:bg-sky-800
              text-white
              font-bold
              py-3
              rounded-xl
              transition-all
              shadow-md
              active:scale-[0.98]
              disabled:opacity-70
              text-sm
              cursor-pointer
            "
          >
            {loading
              ? 'Memproses...'
              : mode ===
                'login'
              ? 'Masuk'
              : 'Daftar dengan Email'}
          </button>
        </form>

        {/* ====================================================
            DIVIDER
        ===================================================== */}

        <div
          className="
            relative
            my-6
          "
        >
          <div
            className="
              absolute
              inset-0
              flex
              items-center
            "
          >
            <div
              className="
                w-full
                border-t
                border-slate-100
              "
            />
          </div>

          <div
            className="
              relative
              flex
              justify-center
              text-xs
              uppercase
            "
          >
            <span
              className="
                bg-white
                px-2
                text-slate-400
                font-medium
              "
            >
              Atau lanjutkan dengan
            </span>
          </div>
        </div>

        {/* ====================================================
            GOOGLE
        ===================================================== */}

        <button
          type="button"
          onClick={
            handleGoogleAuth
          }
          disabled={
            loading
          }
          className="
            w-full
            flex
            items-center
            justify-center
            gap-2.5
            border
            border-slate-200
            hover:bg-slate-50
            py-3
            rounded-xl
            font-semibold
            text-slate-700
            transition
            text-sm
            shadow-2xs
            cursor-pointer
            disabled:opacity-70
          "
        >
          <img
            src="/google-icon.svg"
            alt="Google"
            className="
              w-5
              h-5
            "
          />

          <span>
            {loading
              ? 'Menghubungkan...'
              : 'Daftar / Masuk dengan Google'}
          </span>
        </button>
      </div>
    </div>
  );
}
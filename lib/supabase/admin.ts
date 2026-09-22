// lib/supabase/admin.ts

import 'server-only';

import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

// ============================================================================
// LAZY SUPABASE ADMIN
// ============================================================================
//
// Jangan membuat client + throw error saat module pertama kali di-import.
// Turbopack dapat mengevaluasi module ketika proses build.
//
// Client baru dibuat ketika API benar-benar dipanggil.
//
// ============================================================================

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL belum dibuat di environment variables.'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY belum dibuat di environment variables.'
    );
  }

  adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  return adminClient;
}
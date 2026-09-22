// lib/supabase/admin.ts

import 'server-only';

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

// ============================================================================
// VALIDASI ENV
// ============================================================================

if (!supabaseUrl) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL belum dibuat di environment variables.'
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY belum dibuat di environment variables.'
  );
}

// ============================================================================
// SUPABASE ADMIN CLIENT
// ============================================================================
//
// PENTING:
// Client ini HANYA boleh digunakan di server:
//
// - app/api/*
// - Server Actions
// - Server Components tertentu
//
// JANGAN import file ini ke komponen dengan "use client"
// karena menggunakan SERVICE ROLE KEY.
//
// ============================================================================

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
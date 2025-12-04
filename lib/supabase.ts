import { createClient } from '@supabase/supabase-js';

// Helper functions to safely access environment variables.
// We use try-catch to handle cases where import.meta.env is undefined.
// We maintain the full static string 'import.meta.env.VITE_...' to allow Vite to replace it during build.

const getSupabaseUrl = () => {
  try {
    // @ts-ignore
    return import.meta.env.VITE_SUPABASE_URL;
  } catch (error) {
    return undefined;
  }
};

const getSupabaseAnonKey = () => {
  try {
    // @ts-ignore
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  } catch (error) {
    return undefined;
  }
};

// 1. Try to get from environment
const envUrl = getSupabaseUrl();
const envKey = getSupabaseAnonKey();

// 2. Fallback to hardcoded values if env vars are missing
const supabaseUrl = envUrl || 'https://vxrvmrvlzigmnaxdacah.supabase.co';
const supabaseAnonKey = envKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4cnZtcnZsemlnbW5heGRhY2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDQ2NjAsImV4cCI6MjA3OTE4MDY2MH0.qTAK0iEcOUI1pSR_4alvvX4hO0n4uL_q22yW1u7SgBU';

// 3. Validation flag
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co';

if (!isSupabaseConfigured) {
  console.warn("⚠️ Supabase credentials are missing or invalid.");
}

// 4. Initialize Client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
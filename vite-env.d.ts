// Removed /// <reference types="vite/client" /> as it was causing a "Cannot find type definition file" error.
// Type definitions for ImportMetaEnv are provided below.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

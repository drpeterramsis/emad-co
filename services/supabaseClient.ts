import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise fall back to the provided keys
const supabaseUrl = process.env.SUPABASE_URL || 'https://ivldywzgmpvjwublqzyy.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bGR5d3pnbXB2and1Ymxxenl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzY3NjQsImV4cCI6MjA3OTkxMjc2NH0.F9iXWjpWtcWDP9GN26_3mFToB4r5UgkitEib-9rgV6Y';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const isSupabaseEnabled = !!supabase;


import { createClient } from '@supabase/supabase-js';

// Hardcoded keys for stability in browser environments where process is undefined
const supabaseUrl = 'https://ivldywzgmpvjwublqzyy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bGR5d3pnbXB2and1Ymxxenl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzY3NjQsImV4cCI6MjA3OTkxMjc2NH0.F9iXWjpWtcWDP9GN26_3mFToB4r5UgkitEib-9rgV6Y';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseEnabled = true;
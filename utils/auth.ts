import { AUTHORIZED_USERS } from '../constants';
import { UserProfile } from '../types';
import { supabase } from '../services/supabaseClient';

export interface LoginResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

export const loginUser = async (email: string): Promise<LoginResult> => {
  // Simulate API delay for UX
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check Hardcoded List first (Fallback/Admin)
  const localUser = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
  if (localUser) {
    return { success: true, user: localUser };
  }

  // 2. Check Supabase 'allowed_users' table if enabled
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('allowed_users')
        .select('email, name, title')
        .ilike('email', normalizedEmail)
        .single();

      if (error) {
        console.error("Supabase Auth Error:", error);
        
        // Specific error message for missing table
        if (error.code === '42P01') {
           return { success: false, error: "Database setup incomplete. Table 'allowed_users' is missing." };
        }
        
        if (error.code === 'PGRST116') {
           // No rows found
           return { success: false, error: "Unauthorized access. This email is not in the allowed users list." };
        }

        return { success: false, error: "Database connection error." };
      }

      if (data) {
        return {
          success: true,
          user: {
            email: data.email,
            name: data.name || 'Authorized User',
            title: data.title || 'Staff'
          }
        };
      }
    } catch (err) {
      console.error("Unexpected Auth Error:", err);
      return { success: false, error: "An unexpected error occurred." };
    }
  }
  
  return { success: false, error: "Unauthorized access. This email is not in the allowed users list." };
};
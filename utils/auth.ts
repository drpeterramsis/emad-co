
import { AUTHORIZED_USERS } from '../constants';
import { UserProfile } from '../types';
import { supabase } from '../services/supabaseClient';

export interface LoginResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

export const loginUser = async (email: string, password: string): Promise<LoginResult> => {
  // Simulate API delay for UX
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (!email || !password) {
    return { success: false, error: "Please enter both email and password." };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check Hardcoded List first (Fallback/Admin)
  const localUser = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
  if (localUser) {
    if (localUser.password === password) {
      // Return user without password field to session
      const { password: _, ...userProfile } = localUser;
      return { success: true, user: userProfile };
    } else {
      return { success: false, error: "Invalid credentials." };
    }
  }

  // 2. Check Supabase 'allowed_users' table if enabled
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('allowed_users')
        .select('email, name, title, password')
        .ilike('email', normalizedEmail)
        .maybeSingle(); // Use maybeSingle to avoid 406 error on multiple or zero

      if (error) {
        console.error("Supabase Auth Error:", error);
        
        // Specific error message for missing table
        if (error.code === '42P01') {
           return { success: false, error: "Setup Incomplete: Table 'allowed_users' is missing in DB." };
        }
        // If 'password' column is missing (Code 42703 - Undefined Column)
        if (error.code === '42703') {
           return { success: false, error: "Schema Outdated: Missing 'password' column. Run SQL migration." };
        }
        // Fallback for connection issues
        return { success: false, error: "Unable to verify credentials. Please check connection." };
      }

      if (data) {
        // Verify password
        // Check if password exists in DB record (handling cases where migration ran but data is null)
        if (!data.password) {
           return { success: false, error: "Account has no password set. Contact admin." };
        }

        if (data.password === password) {
          return {
            success: true,
            user: {
              email: data.email,
              name: data.name || 'Authorized User',
              title: data.title || 'Staff'
            }
          };
        } else {
          return { success: false, error: "Invalid credentials." };
        }
      }
    } catch (err) {
      console.error("Unexpected Auth Error:", err);
      return { success: false, error: "An unexpected error occurred." };
    }
  }
  
  // If no user found in local list or DB
  return { success: false, error: "Account not found." };
};

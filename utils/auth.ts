
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
  
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check Hardcoded List first (Fallback/Admin)
  const localUser = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
  if (localUser) {
    if (localUser.password === password) {
      // Return user without password field to session
      const { password: _, ...userProfile } = localUser;
      return { success: true, user: userProfile };
    } else {
      return { success: false, error: "Invalid password." };
    }
  }

  // 2. Check Supabase 'allowed_users' table if enabled
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('allowed_users')
        .select('email, name, title, password')
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
           return { success: false, error: "Email not found." };
        }
        
        // If 'password' column is missing, it might throw an error code like 42703 (undefined_column)
        if (error.code === '42703') {
           return { success: false, error: "Security update: Database schema outdated (missing password column)." };
        }

        return { success: false, error: "Database connection error." };
      }

      if (data) {
        // Verify password
        // Note: In production, passwords should be hashed (bcrypt/argon2). 
        // For this template, we assume direct comparison or handle basic text.
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
          return { success: false, error: "Invalid password." };
        }
      }
    } catch (err) {
      console.error("Unexpected Auth Error:", err);
      return { success: false, error: "An unexpected error occurred." };
    }
  }
  
  return { success: false, error: "Account not found." };
};
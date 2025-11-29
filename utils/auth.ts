import { AUTHORIZED_USERS } from '../constants';
import { UserProfile } from '../types';
import { supabase } from '../services/supabaseClient';

export const loginUser = async (email: string): Promise<UserProfile | null> => {
  // Simulate API delay for UX
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check Hardcoded List first
  const localUser = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
  if (localUser) return localUser;

  // 2. Check Supabase 'allowed_users' table if enabled
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('allowed_users')
        .select('email, name, title')
        .ilike('email', normalizedEmail)
        .single();

      if (!error && data) {
        return {
          email: data.email,
          name: data.name || 'Authorized User',
          title: data.title || 'Staff'
        };
      }
    } catch (err) {
      console.warn("Error fetching user from Supabase:", err);
    }
  }
  
  return null;
};
import { AUTHORIZED_USERS } from '../constants';
import { UserProfile } from '../types';

export const loginUser = async (email: string): Promise<UserProfile | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const normalizedEmail = email.toLowerCase().trim();
  const user = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
  
  return user || null;
};
import React, { createContext, useContext, useState, useEffect, PropsWithChildren, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren<{}>) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track the last processed user ID to prevent redundant fetches
  const lastUserIdRef = useRef<string | null>(null);
  // Track the last access token to prevent redundant session updates on window focus
  const lastAccessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    // 0. Check configuration
    if (!isSupabaseConfigured) {
        setLoading(false);
        return;
    }

    // 1. Get Initial Session
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
           console.warn("Supabase init warning:", error.message);
           setLoading(false);
           return;
        }

        if (data && data.session) {
           setSession(data.session);
           lastAccessTokenRef.current = data.session.access_token;
           lastUserIdRef.current = data.session.user.id;
           fetchProfile(data.session);
        } else {
           setLoading(false);
        }
      } catch (err) {
        console.warn("Supabase connection failed:", err);
        setLoading(false);
      }
    };

    initSession();

    // 2. Listen for Changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Handle Sign Out
      if (event === 'SIGNED_OUT' || !newSession) {
          setSession(null);
          setProfile(null);
          lastUserIdRef.current = null;
          lastAccessTokenRef.current = null;
          setLoading(false);
          return;
      } 
      
      // Handle Session Updates
      // Only update if the access token has changed to prevent flickering on window focus
      if (newSession.access_token !== lastAccessTokenRef.current) {
          setSession(newSession);
          lastAccessTokenRef.current = newSession.access_token;
          
          // Only fetch profile if user ID changed or we don't have profile yet
          const userId = newSession.user.id;
          if (userId !== lastUserIdRef.current || !profile) {
              lastUserIdRef.current = userId;
              fetchProfile(newSession);
          }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (currentSession: Session, retryCount = 0) => {
    if (!isSupabaseConfigured || !currentSession.user) return;
    const userId = currentSession.user.id;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as UserProfile);
        setLoading(false);
      } else {
          // Profile missing.
          const createdAt = currentSession.user.created_at;
          const isNewUser = createdAt && (Date.now() - new Date(createdAt).getTime() < 45000);

          if (isNewUser && retryCount < 3) {
             // New user: Wait for DB trigger to create profile
             console.log(`Profile not found (New User). Retrying (${retryCount + 1}/3)...`);
             setTimeout(() => fetchProfile(currentSession, retryCount + 1), 1000);
          } else {
             // ZOMBIE ACCOUNT DETECTED
             console.warn("Zombie account detected (Auth exists, Profile missing). Cleaning up...");
             await cleanupZombieAccount();
          }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const cleanupZombieAccount = async () => {
      try {
          await supabase.rpc('delete_user');
          console.log("Zombie account cleaned up from Auth.");
      } catch (err) {
          console.error("Failed to auto-clean zombie account:", err);
      } finally {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          setLoading(false);
          alert("This account was previously deleted. Please Sign Up again to create a new profile.");
      }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    lastUserIdRef.current = null;
    lastAccessTokenRef.current = null;
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
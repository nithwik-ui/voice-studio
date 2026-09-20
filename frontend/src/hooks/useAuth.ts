import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER';
  status: string;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "NR";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (name.length >= 2) {
    return name.slice(0, 2).toUpperCase();
  }
  return (name[0] + "R").toUpperCase();
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'ADMIN' | 'USER' | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .single();
      
      if (data) {
        setProfile(data as UserProfile);
        setRole(data.role as 'ADMIN' | 'USER');
      } else {
        // Fallback profile if record not yet linked
        const defaultName = "Nithwik Reddy";
        setProfile({
          id: userId,
          auth_user_id: userId,
          full_name: defaultName,
          username: "nithwik59",
          email: "nithwik59@gmail.com",
          role: 'USER',
          status: 'ACTIVE'
        });
        setRole('USER');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
    setUser(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return { user, session, role, profile, loading, signOut, refreshProfile };
}

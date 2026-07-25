'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_color: string;
  status: string;
  last_seen_at: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateStatus: (status: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Update online presence
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').update({ status: 'online', last_seen_at: new Date().toISOString() }).eq('id', user.id).then(() => {});

    const interval = setInterval(() => {
      supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id).then(() => {});
    }, 60000);

    const handleVisibility = () => {
      if (document.hidden) {
        supabase.from('profiles').update({ status: 'away' }).eq('id', user.id).then(() => {});
      } else {
        supabase.from('profiles').update({ status: 'online', last_seen_at: new Date().toISOString() }).eq('id', user.id).then(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id).then(() => {});
    };
  }, [user]);

  async function signUp(email: string, password: string, displayName: string) {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
    return { error: error?.message ?? null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    if (user) await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function updateStatus(status: string) {
    if (!user) return;
    await supabase.from('profiles').update({ status }).eq('id', user.id);
    if (profile) setProfile({ ...profile, status });
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, updateStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

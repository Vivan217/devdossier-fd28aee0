import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getQuotaStatus, type QuotaStatus } from "@/services/devdossier";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  quota: QuotaStatus | null;
  isPro: boolean;
  refreshQuota: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  useEffect(() => {
    // Set up listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshQuota = async () => {
    if (!user) {
      setQuota(null);
      return;
    }
    const q = await getQuotaStatus(user.id);
    setQuota(q);
  };

  useEffect(() => {
    if (user) {
      refreshQuota();
    } else {
      setQuota(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/generate`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        quota,
        isPro: quota?.plan === "pro",
        refreshQuota,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
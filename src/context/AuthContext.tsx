import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void client.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (!cancelled) setSession(s);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue | null>(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) return null;
    return {
      user: session?.user ?? null,
      session,
      loading,
      signIn: async (email, password) => {
        const { error } = await client.auth.signInWithPassword({ email, password });
        return { error: error ? new Error(error.message) : null };
      },
      signUp: async (email, password) => {
        const { error } = await client.auth.signUp({ email, password });
        return { error: error ? new Error(error.message) : null };
      },
      signOut: async () => {
        await client.auth.signOut();
      },
    };
  }, [session, loading]);

  if (!isSupabaseConfigured || !value) {
    return (
      <div className="wb-app wb-app--bg-energy wb-app-surface wb-missing">
        <h1 className="wb-h1">Нужен Supabase</h1>
        <p className="wb-lead">
          Локально: скопируйте <code className="wb-code">.env.example</code> в <code className="wb-code">.env</code> и укажите{" "}
          <code className="wb-code">VITE_SUPABASE_URL</code> и <code className="wb-code">VITE_SUPABASE_ANON_KEY</code> из панели
          Supabase. На Vercel добавьте те же имена в{" "}
          <strong>Settings → Environment Variables</strong> и пересоберите деплой. Выполните SQL из{" "}
          <code className="wb-code">supabase/schema.sql</code>.
        </p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

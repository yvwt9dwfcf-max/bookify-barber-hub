import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface SignUpMetadata {
  name?: string;
  selected_plan?: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: Error | null }>;
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<{ data: unknown; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ data: unknown; error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeAuthError = (error: unknown) => {
  if (error instanceof Error) {
    return error;
  }

  return new Error('Falha inesperada na autenticação');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const bootstrapAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }

        applySession(data.session ?? null);
      } catch (error) {
        console.error('Erro ao restaurar sessão:', error);
        applySession(null);
      }
    };

    void bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    signIn: async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { data, error: error ? normalizeAuthError(error) : null };
      } catch (error) {
        return { data: null, error: normalizeAuthError(error) };
      }
    },
    signUp: async (email: string, password: string, metadata?: SignUpMetadata) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: metadata,
          },
        });

        return { data, error: error ? normalizeAuthError(error) : null };
      } catch (error) {
        return { data: null, error: normalizeAuthError(error) };
      }
    },
    signOut: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        return { error: error ? normalizeAuthError(error) : null };
      } catch (error) {
        return { error: normalizeAuthError(error) };
      }
    },
    resetPassword: async (email: string) => {
      try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        return { data, error: error ? normalizeAuthError(error) : null };
      } catch (error) {
        return { data: null, error: normalizeAuthError(error) };
      }
    },
  }), [loading, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
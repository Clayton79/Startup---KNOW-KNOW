import { useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setAccessTokenProvider } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Retorna `true` quando a conta já está logada, `false` se precisa confirmar o e-mail. */
  signUp: (input: SignUpInput) => Promise<boolean>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

setAccessTokenProvider(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setStatus(data.session ? 'authenticated' : 'anonymous');
    });

    // Importante: nenhuma chamada await ao Supabase aqui dentro (evita deadlock do cliente).
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'anonymous');
      if (event === 'SIGNED_OUT') queryClient.clear();
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async ({ name, email, password }: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, accepted_terms_at: new Date().toISOString() },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });
    if (error) throw error;
    return data.session !== null;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [status, session, signIn, signUp, signOut, requestPasswordReset, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}

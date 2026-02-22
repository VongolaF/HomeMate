"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import {
  REMEMBER_ME_KEY,
  SESSION_MAX_AGE_MS,
  SESSION_MAX_AGE_REMEMBER_MS,
  SESSION_STARTED_AT_KEY,
} from "@/lib/auth/constants";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const clearSessionTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const readRememberFlag = () => {
      if (typeof window === "undefined") return false;
      return window.localStorage.getItem(REMEMBER_ME_KEY) === "true";
    };

    const getMaxAgeMs = () =>
      readRememberFlag() ? SESSION_MAX_AGE_REMEMBER_MS : SESSION_MAX_AGE_MS;

    const ensureSessionStartedAt = () => {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem(SESSION_STARTED_AT_KEY);
      const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      const now = Date.now();
      window.localStorage.setItem(SESSION_STARTED_AT_KEY, String(now));
      return now;
    };

    const clearSessionStartedAt = () => {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(SESSION_STARTED_AT_KEY);
    };

    const enforceAndSchedule = async (nextSession: Session | null) => {
      clearSessionTimeout();

      if (!nextSession) {
        clearSessionStartedAt();
        return;
      }

      const startedAt = ensureSessionStartedAt();
      if (!startedAt) return;

      const maxAgeMs = getMaxAgeMs();
      const expiresAt = startedAt + maxAgeMs;
      const remainingMs = expiresAt - Date.now();

      if (remainingMs <= 0) {
        clearSessionStartedAt();
        await supabase.auth.signOut();
        return;
      }

      timeoutId = setTimeout(async () => {
        clearSessionStartedAt();
        await supabase.auth.signOut();
      }, remainingMs);
    };

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (error) {
        setSession(null);
        setUser(null);
      } else {
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      }
      await enforceAndSchedule(data.session ?? null);
      setLoading(false);
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;

      if (event === "SIGNED_IN") {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
        }
      }

      if (event === "SIGNED_OUT") {
        clearSessionStartedAt();
      }

      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      await enforceAndSchedule(nextSession ?? null);
      setLoading(false);
    });

    const refreshEnforcement = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      await enforceAndSchedule(data.session ?? null);
    };

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      void refreshEnforcement();
    };

    const handleFocus = () => {
      void refreshEnforcement();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      isMounted = false;
      clearSessionTimeout();
      authListener.subscription.unsubscribe();

      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

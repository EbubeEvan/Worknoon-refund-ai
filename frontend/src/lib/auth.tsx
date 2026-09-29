import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, ApiError, type SessionUser } from "./api.js";

/**
 * Auth state.
 *
 * Better Auth owns the session; this is a thin client for it. The server
 * cookie is the only source of truth, so after any sign-in the session is
 * refetched rather than constructed locally - the client never decides who the
 * user is or what role they hold.
 */

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  /**
   * Probe the session.
   *
   * Total by design: it never rejects. Callers get "signed in as X" or "signed
   * out" and nothing else, so a dead API or a 500 renders as signed-out rather
   * than crashing a route. This also keeps every setState inside an async
   * continuation instead of synchronously in an effect body.
   */
  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: SessionUser } | null>("/auth/get-session");
      setUser(data?.user ?? null);
    } catch (err) {
      // A 401 just means "not signed in", a normal state. Anything else means we
      // could not ask, which is also not a signed-in user.
      if (!(err instanceof ApiError && err.isAuth)) {
        console.warn("session probe failed; treating as signed out", err);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Resolve the session once on mount. Without this the app sits on the
    // loading spinner forever, because nothing else calls refresh().
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await api.post("/auth/sign-in/email", { email, password });
      await refresh();
      // Cached role-gated data from a previous user must not survive a login.
      queryClient.clear();
    },
    [refresh, queryClient],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await api.post("/auth/sign-up/email", { email, password, name });
      await refresh();
      queryClient.clear();
    },
    [refresh, queryClient],
  );

  const signOut = useCallback(async () => {
    await api.post("/auth/sign-out");
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAdmin: user?.role === "ADMIN",
      signIn,
      signUp,
      signOut,
      refresh,
    }),
    [user, isLoading, signIn, signUp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

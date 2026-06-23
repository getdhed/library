import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMe, login as loginRequest, register as registerRequest } from "../api/library";
import type { AuthPayload, User } from "../types";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  ready: boolean;
  login: (input: { username: string; password: string }) => Promise<void>;
  register: (input: { username: string; password: string; fullName: string }) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = "library-token";

function persist(payload: AuthPayload | null) {
  if (!payload) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, payload.token);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!token) {
        setReady(true);
        return;
      }

      try {
        const me = await getMe(token);
        if (!cancelled) {
          setUser(me);
        }
      } catch {
        if (!cancelled) {
          persist(null);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    bootstrap();

    return () => {

      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let timeoutId: number;

    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      // 15 minutes = 15 * 60 * 1000
      timeoutId = window.setTimeout(() => {
        persist(null);
        setToken(null);
        setUser(null);
      }, 15 * 60 * 1000);
    };

    resetTimer();

    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    const handleActivity = () => {
      // Throttle the reset slightly to avoid excessive calls on mousemove
      window.requestAnimationFrame(resetTimer);
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      ready,
      async login(input) {
        const payload = await loginRequest(input);
        persist(payload);
        setToken(payload.token);
        setUser(payload.user);
      },
      async register(input) {
        const payload = await registerRequest(input);
        persist(payload);
        setToken(payload.token);
        setUser(payload.user);
      },
      logout() {
        persist(null);
        setToken(null);
        setUser(null);
      },
    }),
    [ready, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}

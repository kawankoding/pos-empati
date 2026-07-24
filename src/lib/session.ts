import { useState, useCallback, useEffect } from "react";
import type { AuthUser } from "./api";
import { api } from "./api";

function readSession(): AuthUser | null {
  const raw = localStorage.getItem("pos-session");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id || !parsed?.username || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useSession() {
  // readSession is only used as initial state — the main process is the source of truth
  const [session, setSession] = useState<AuthUser | null>(readSession);

  useEffect(() => {
    let cancelled = false;

    const localUser = readSession();
    if (!localUser) return;

    api.restoreSession(localUser)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setSession(result.user);
        } else {
          localStorage.removeItem("pos-session");
          setSession(null);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const login = useCallback((user: AuthUser) => {
    localStorage.setItem("pos-session", JSON.stringify(user));
    setSession(user);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    localStorage.removeItem("pos-session");
    setSession(null);
  }, []);

  return { session, login, logout, isLoggedIn: session !== null };
}

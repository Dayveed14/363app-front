import { createContext, useContext, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";

const AuthContext = createContext(null);

// No tokens are stored here at all — access/refresh/pending-2FA tokens live
// only in httpOnly cookies set by the backend, invisible to this code (that
// is the point: it closes off token theft via XSS). The only client-side
// state is the signed-in user's profile, kept in memory for the session —
// not persisted, so a hard refresh re-derives it from the cookie via /me.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function hydrateSession() {
    try {
      const { user: me } = await api.me();
      setUser(me);
    } catch {
      // Access cookie missing/expired — try one silent refresh (uses the
      // refresh cookie) before giving up and treating the user as signed out.
      try {
        await api.refresh();
        const { user: me } = await api.me();
        setUser(me);
      } catch {
        setUser(null);
      }
    } finally {
      setReady(true);
    }
  }

  // --- Registration / verification (no session yet) ---

  async function register({ fullName, email, phone, password }) {
    return api.register({ fullName, email, phone, password });
  }

  async function verifyEmail({ email, code }) {
    return api.verifyEmail({ email, code });
  }

  async function resendOtp({ email, purpose }) {
    return api.resendOtp({ email, purpose });
  }

  // --- Login (two steps: password, then email OTP) ---

  async function login({ email, password }) {
    return api.login({ email, password }); // sets pending_2fa_token cookie server-side
  }

  async function verifyLoginOtp({ code }) {
    const result = await api.verifyLoginOtp({ code }); // sets access+refresh cookies server-side
    setUser(result.user);
    return result;
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, ready, register, verifyEmail, resendOtp, login, verifyLoginOtp, logout }}
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

export { ApiError };

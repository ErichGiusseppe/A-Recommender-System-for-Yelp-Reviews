import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { ColdStartProfile } from "../types";

const BASE          = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY     = "lantern_token";
const USER_KEY      = "lantern_user";
const COLD_START_KEY = "lantern_coldstart";

export interface AuthUser {
  user_id: string;
  name: string;
}

interface AuthContextValue {
  user:               AuthUser | null;
  token:              string | null;
  isGuest:            boolean;
  coldStartProfile:   ColdStartProfile | null;
  login:              (username: string, password: string) => Promise<void>;
  register:           (username: string, password: string, name: string) => Promise<void>;
  logout:             () => void;
  setColdStartProfile:(profile: ColdStartProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Helpers ──────────────────────────────────────────────────────────────────

function readLocalProfile(): ColdStartProfile | null {
  try {
    const raw = localStorage.getItem(COLD_START_KEY);
    return raw ? (JSON.parse(raw) as ColdStartProfile) : null;
  } catch {
    return null;
  }
}

function writeLocalProfile(profile: ColdStartProfile | null) {
  if (profile) {
    localStorage.setItem(COLD_START_KEY, JSON.stringify(profile));
  } else {
    localStorage.removeItem(COLD_START_KEY);
  }
}

// Fire-and-forget: push a profile to the backend for the given token.
function pushProfileToBackend(token: string, profile: ColdStartProfile) {
  fetch(`${BASE}/users/me/coldstart`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(profile),
  }).catch(() => {});
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  });
  const [coldStartProfile, _setColdStartProfile] = useState<ColdStartProfile | null>(
    readLocalProfile
  );

  // Clear auth state if token disappears
  useEffect(() => {
    if (!token) setUser(null);
  }, [token]);

  // When user becomes authenticated, try to restore their saved profile from backend.
  // The backend profile is only applied if the user has NO local profile yet
  // (local/guest profile takes priority — it was built this session).
  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/users/me/coldstart`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then((backendProfile: ColdStartProfile | null) => {
        if (!backendProfile) return;
        const localProfile = readLocalProfile();
        if (!localProfile) {
          // No guest session profile — restore from backend
          writeLocalProfile(backendProfile);
          _setColdStartProfile(backendProfile);
        }
      })
      .catch(() => {});
  }, [token]);

  // ── Auth actions ────────────────────────────────────────────────────────────

  function _applyAuthResponse(data: { access_token: string; user: AuthUser }) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);

    // Transfer any guest cold-start profile to the user's account
    const guestProfile = readLocalProfile();
    if (guestProfile) {
      pushProfileToBackend(data.access_token, guestProfile);
      _setColdStartProfile(guestProfile);
    }
  }

  async function login(username: string, password: string) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error("Invalid credentials");
    _applyAuthResponse(await res.json());
  }

  async function register(username: string, password: string, name: string) {
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, name }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _applyAuthResponse(await res.json());
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Keep the cold-start profile in localStorage so the next guest session
    // still benefits from it, but clear from state so wizard can re-show if needed.
    setToken(null);
    setUser(null);
    fetch(`${BASE}/auth/logout`, { method: "POST" }).catch(() => {});
  }

  // ── Cold-start profile setter (exposed to UI) ────────────────────────────

  const setColdStartProfile = useCallback(
    (profile: ColdStartProfile | null) => {
      writeLocalProfile(profile);
      _setColdStartProfile(profile);
      // If the user is logged in, persist to backend immediately
      if (token && profile) {
        pushProfileToBackend(token, profile);
      }
    },
    [token]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isGuest: !token,
        coldStartProfile,
        login,
        register,
        logout,
        setColdStartProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

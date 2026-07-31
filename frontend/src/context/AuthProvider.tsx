import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Role, User } from "../types";
import {
  clearActiveRole,
  clearAuthStorage,
  clearLegacyAuthStorage,
  clearRoleAuthStorage,
  getActiveRole,
  getRoleStorageKeys,
  readStorageItem,
  removeStorageItem,
  setActiveRole,
  writeStorageItem,
} from "../utils/storage";
import { AuthContext } from "./AuthContext";

type AuthSnapshot = {
  token: string | null;
  user: User | null;
};

function isRole(value: unknown): value is Role {
  return value === "USER" || value === "ADMIN";
}

function normalizeUser(value: unknown): User | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const id = Number(candidate.id);
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const email = typeof candidate.email === "string" ? candidate.email.trim() : "";
  const rawRole = typeof candidate.role === "string"
    ? candidate.role.replace(/^ROLE_/, "").toUpperCase()
    : "";
  const phone = typeof candidate.phone === "string" ? candidate.phone.trim() || null : null;
  const profileImageUrl = typeof candidate.profileImageUrl === "string" ? candidate.profileImageUrl.trim() || null : null;
  const banned = candidate.banned === true;

  if (!Number.isInteger(id) || id <= 0 || !name || !email || !isRole(rawRole)) {
    return null;
  }

  return { id, name, email, phone, profileImageUrl, banned, role: rawRole };
}

function clearRoleSession(role: Role) {
  const keys = getRoleStorageKeys(role);
  removeStorageItem("session", keys.token);
  removeStorageItem("session", keys.user);
}

function readRoleAuth(role: Role): AuthSnapshot | null {
  const keys = getRoleStorageKeys(role);
  const token = readStorageItem("session", keys.token);
  const storedUser = readStorageItem("session", keys.user);

  if (!token && !storedUser) return null;
  if (!token || !storedUser) {
    clearRoleSession(role);
    return null;
  }

  try {
    const user = normalizeUser(JSON.parse(storedUser));
    if (!user || user.role !== role) {
      clearRoleSession(role);
      return null;
    }
    return { token, user };
  } catch {
    clearRoleSession(role);
    return null;
  }
}

/**
 * Older builds could place accessToken/user in sessionStorage. Migrate only
 * that tab-local legacy data. We deliberately never migrate localStorage auth,
 * because localStorage is shared by every tab and caused account swapping.
 */
function migrateLegacySessionAuth(): AuthSnapshot | null {
  const token = readStorageItem("session", "accessToken");
  const storedUser = readStorageItem("session", "user");

  if (!token || !storedUser) return null;

  try {
    const user = normalizeUser(JSON.parse(storedUser));
    if (!user) return null;

    clearAuthStorage();
    const keys = getRoleStorageKeys(user.role);
    writeStorageItem("session", keys.token, token);
    writeStorageItem("session", keys.user, JSON.stringify(user));
    setActiveRole(user.role);
    return { token, user };
  } catch {
    return null;
  } finally {
    removeStorageItem("session", "accessToken");
    removeStorageItem("session", "user");
  }
}

function readStoredAuth(): AuthSnapshot {
  // Migrate only legacy data that already belongs to this tab, then purge all
  // shared localStorage auth left by older builds.
  const legacy = migrateLegacySessionAuth();
  clearLegacyAuthStorage();
  if (legacy) return legacy;

  const activeRole = getActiveRole();
  if (activeRole) {
    const activeAuth = readRoleAuth(activeRole);
    if (activeAuth) return activeAuth;
    clearActiveRole();
  }

  const customer = readRoleAuth("USER");
  const admin = readRoleAuth("ADMIN");

  if (customer && !admin) {
    setActiveRole("USER");
    return customer;
  }

  if (admin && !customer) {
    setActiveRole("ADMIN");
    return admin;
  }

  // A tab should represent one account only. If stale data contains both roles,
  // require a clean sign-in instead of guessing which identity to use.
  if (customer && admin) {
    clearAuthStorage();
  }

  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialAuth] = useState<AuthSnapshot>(readStoredAuth);
  const [token, setToken] = useState<string | null>(initialAuth.token);
  const [user, setUser] = useState<User | null>(initialAuth.user);

  const loginUser = useCallback((nextToken: string, nextUser: User) => {
    const normalizedUser = normalizeUser(nextUser);
    const normalizedToken = typeof nextToken === "string" ? nextToken.trim() : "";

    if (!normalizedToken || !normalizedUser) {
      throw new Error("The login response is missing valid account information.");
    }

    // One tab = one account. Clearing sessionStorage auth here affects only the
    // current tab, never an admin/customer logged in in another tab.
    clearAuthStorage();
    clearLegacyAuthStorage();

    const keys = getRoleStorageKeys(normalizedUser.role);
    const tokenSaved = writeStorageItem("session", keys.token, normalizedToken);
    const userSaved = writeStorageItem("session", keys.user, JSON.stringify(normalizedUser));

    // Storage can be blocked. The current React state still keeps the tab signed
    // in until it is refreshed, but normal browsers persist it across refresh.
    if (!tokenSaved || !userSaved) {
      clearRoleAuthStorage(normalizedUser.role);
    }

    setActiveRole(normalizedUser.role);
    setToken(normalizedToken);
    setUser(normalizedUser);
  }, []);

  const logoutUser = useCallback(() => {
    // Clear only this tab's auth session. Other tabs use separate sessionStorage.
    clearAuthStorage();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener("shopsflow:unauthorized", logoutUser);
    return () => {
      window.removeEventListener("shopsflow:unauthorized", logoutUser);
    };
  }, [logoutUser]);

  return (
    <AuthContext.Provider
      value={{ token, user, isLoggedIn: Boolean(token && user), loginUser, logoutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

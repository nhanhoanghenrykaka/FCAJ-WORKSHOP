import type { Role } from "../types";

export type StorageKind = "local" | "session";

const ACTIVE_ROLE_KEY = "shopsflowActiveRole";
const LEGACY_TOKEN_KEY = "accessToken";
const LEGACY_USER_KEY = "user";

const ROLE_KEYS: Record<Role, { token: string; user: string }> = {
  USER: {
    token: "customerAccessToken",
    user: "customerUser",
  },
  ADMIN: {
    token: "adminAccessToken",
    user: "adminUser",
  },
};

function resolveStorage(kind: StorageKind): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    const storage = kind === "local" ? window.localStorage : window.sessionStorage;
    const probeKey = "__shopsflow_storage_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

export function readStorageItem(kind: StorageKind, key: string) {
  try {
    return resolveStorage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorageItem(kind: StorageKind, key: string, value: string) {
  const storage = resolveStorage(kind);
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(kind: StorageKind, key: string) {
  try {
    resolveStorage(kind)?.removeItem(key);
  } catch {
    // Storage may be blocked by browser privacy settings. Treat it as empty.
  }
}

export function getRoleStorageKeys(role: Role) {
  return ROLE_KEYS[role];
}

/**
 * The active account is intentionally stored in sessionStorage.
 * sessionStorage belongs to one browser tab, survives refresh, and is not
 * overwritten when another tab signs in with a different account.
 */
export function getActiveRole(): Role | null {
  const value = readStorageItem("session", ACTIVE_ROLE_KEY);
  return value === "USER" || value === "ADMIN" ? value : null;
}

export function setActiveRole(role: Role) {
  return writeStorageItem("session", ACTIVE_ROLE_KEY, role);
}

export function clearActiveRole() {
  removeStorageItem("session", ACTIVE_ROLE_KEY);
}

/** Read a JWT only from this tab's session. Never fall back to localStorage. */
export function readRoleToken(role: Role) {
  const { token } = getRoleStorageKeys(role);
  return readStorageItem("session", token);
}

/** Clear one role only in the current tab. */
export function clearRoleAuthStorage(role: Role) {
  const keys = getRoleStorageKeys(role);
  removeStorageItem("session", keys.token);
  removeStorageItem("session", keys.user);
}

/**
 * Remove authentication left by older builds that used shared localStorage.
 * Shared localStorage must never be used for auth because one tab could then
 * replace the account used by every other tab on refresh.
 */
export function clearLegacyAuthStorage() {
  removeStorageItem("session", LEGACY_TOKEN_KEY);
  removeStorageItem("session", LEGACY_USER_KEY);

  removeStorageItem("local", LEGACY_TOKEN_KEY);
  removeStorageItem("local", LEGACY_USER_KEY);

  for (const role of ["USER", "ADMIN"] as const) {
    const keys = getRoleStorageKeys(role);
    removeStorageItem("local", keys.token);
    removeStorageItem("local", keys.user);
  }
}

/**
 * Normal sign-out clears only this tab. Other tabs keep their own independent
 * sessionStorage and therefore remain signed in as their existing accounts.
 */
export function clearAuthStorage(role?: Role) {
  if (role) {
    clearRoleAuthStorage(role);
    if (getActiveRole() === role) clearActiveRole();
    return;
  }

  clearRoleAuthStorage("USER");
  clearRoleAuthStorage("ADMIN");
  clearActiveRole();
  removeStorageItem("session", LEGACY_TOKEN_KEY);
  removeStorageItem("session", LEGACY_USER_KEY);
}

export function getActiveAuthToken() {
  const activeRole = getActiveRole();
  if (activeRole) return readRoleToken(activeRole);

  // Normally a tab has exactly one stored role. These fallbacks only protect
  // against an interrupted migration or an old session that lacks ACTIVE_ROLE.
  const customerToken = readRoleToken("USER");
  const adminToken = readRoleToken("ADMIN");

  if (customerToken && !adminToken) return customerToken;
  if (adminToken && !customerToken) return adminToken;

  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return adminToken;
  }

  return customerToken;
}

import type { Role, User } from "../types";
import { apiClient } from "./client";

export type LoginRequest = { email: string; password: string };
export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
  verificationToken: string;
};
export type SendRegistrationOtpResponse = {
  expiresInSeconds: number;
  resendAfterSeconds: number;
};
export type VerifyRegistrationOtpResponse = {
  verified: boolean;
  verificationToken: string;
  validForSeconds: number;
};
export type LoginResponse = { token: string; user: User };

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function normalizeRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const role = value.replace(/^ROLE_/, "").toUpperCase();
  return role === "USER" || role === "ADMIN" ? role : null;
}

function normalizeLoginResponse(value: unknown): LoginResponse {
  const source = record(value);
  const wrapped = record(source.data);
  const payload = Object.keys(wrapped).length > 0 ? wrapped : source;
  const rawUser = record(payload.user);
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const id = Number(rawUser.id);
  const name = typeof rawUser.name === "string" ? rawUser.name.trim() : "";
  const email = typeof rawUser.email === "string" ? rawUser.email.trim() : "";
  const role = normalizeRole(rawUser.role);
  const phone = typeof rawUser.phone === "string" ? rawUser.phone.trim() || null : null;
  const profileImageUrl = typeof rawUser.profileImageUrl === "string" ? rawUser.profileImageUrl.trim() || null : null;
  const banned = rawUser.banned === true;

  if (!token || !Number.isInteger(id) || id <= 0 || !name || !email || !role) {
    throw new Error("The backend returned an invalid login response.");
  }

  return { token, user: { id, name, email, phone, profileImageUrl, banned, role } };
}

export async function login(request: LoginRequest) {
  const response = await apiClient.post<unknown>("/auth/login", request);
  return normalizeLoginResponse(response.data);
}

export async function authenticateWithGoogle(credential: string) {
  const response = await apiClient.post<unknown>("/auth/google", { credential });
  return normalizeLoginResponse(response.data);
}

export async function sendRegistrationOtp(email: string) {
  const response = await apiClient.post<SendRegistrationOtpResponse>(
    "/auth/register/otp/send",
    { email },
  );
  return response.data;
}

export async function verifyRegistrationOtp(email: string, otp: string) {
  const response = await apiClient.post<VerifyRegistrationOtpResponse>(
    "/auth/register/otp/verify",
    { email, otp },
  );
  return response.data;
}

export async function register(request: RegisterRequest) {
  await apiClient.post<void>("/auth/register", request);
}

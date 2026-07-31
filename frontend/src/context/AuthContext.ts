import { createContext } from "react";
import type { User } from "../types";

export type AuthContextValue = {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
  loginUser: (token: string, user: User) => void;
  logoutUser: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

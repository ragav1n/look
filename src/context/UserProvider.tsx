import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

/**
 * Mock authentication + profile. In production this is Shopify's Customer
 * Account API (OAuth login, customer profile). Here it's a localStorage-backed
 * stub so the account UI is navigable in development — replace before launch.
 */
export interface UserProfile {
  name: string;
  email: string;
  phone: string;
}

interface UserContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, name?: string) => void;
  signup: (name: string, email: string, phone?: string) => void;
  logout: () => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useLocalStorage<UserProfile | null>("look.user", null);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login: (email, name) =>
        setUser({ name: name ?? email.split("@")[0] ?? "Guest", email, phone: "" }),
      signup: (name, email, phone = "") => setUser({ name, email, phone }),
      logout: () => setUser(null),
      updateProfile: (patch) => setUser((prev) => (prev ? { ...prev, ...patch } : prev)),
    }),
    [user, setUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}

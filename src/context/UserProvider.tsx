import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserProfile } from "@/types";
import { beginLogin, getSession, logout as endSession, updateProfile as saveProfile } from "@/lib/customer";
import { useToast } from "./ToastContext";

/**
 * Signed-in customer state. Backed by the customer-auth data layer: real Shopify
 * Customer Account API (OAuth, tokens held server-side by the /api BFF) in
 * production, a localStorage stub in dev. The context surface is kept stable so
 * consumers (Navbar, AccountLayout, Profile) don't care which is live.
 *
 * Login is passwordless and Shopify-hosted, so it's a full-page redirect rather
 * than an in-app form — `login(from)` leaves the app and returns to `from`.
 */
export type { UserProfile };

interface UserContextValue {
  user: UserProfile | null;
  /** false until the initial session check resolves — guards must wait on this */
  ready: boolean;
  isAuthenticated: boolean;
  /** Start login; `from` is the path to return to afterwards. Redirects away. */
  login: (from?: string) => void;
  logout: () => void;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const { push } = useToast();

  /* Resolve the session once on load. The account guard renders a loading state
     until `ready`, so a logged-in hard refresh doesn't flash to /login. */
  useEffect(() => {
    let active = true;
    getSession()
      .then((session) => {
        if (active) setUser(session.authenticated ? session.profile : null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      ready,
      isAuthenticated: user !== null,
      login: (from) => beginLogin(from),
      logout: () => {
        setUser(null);
        void endSession();
      },
      updateProfile: async (patch) => {
        try {
          setUser(await saveProfile(patch));
        } catch (err) {
          push(err instanceof Error ? err.message : "We couldn't save your profile.");
          throw err;
        }
      },
    }),
    [user, ready, push],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}

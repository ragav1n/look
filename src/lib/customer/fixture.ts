/**
 * DEV customer auth — no backend, no Shopify. Keeps the account UI navigable
 * under plain `vite` (VITE_CUSTOMER_AUTH_ENABLED unset). It deliberately mirrors
 * the real flow's full-page redirect so the same mount-time session check runs
 * on return, exercising the whole SPA path with zero infrastructure.
 */
import type { UserProfile } from "@/types";
import type { Session } from "./types";

const USER_KEY = "look.user";
const FLAG_KEY = "look.fixtureAuth";

/** Reuses the "Sushmitha R" persona the account fixtures are built around. */
const PERSONA: UserProfile = {
  name: "Sushmitha R",
  email: "sushmitha@look.in",
  phone: "+91 9150002116",
};

function readUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function writeUser(user: UserProfile | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

const isSignedIn = () => {
  try {
    return localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
};

export async function getSession(): Promise<Session> {
  if (!isSignedIn()) return { authenticated: false, profile: null };
  const user = readUser() ?? PERSONA;
  writeUser(user);
  return { authenticated: true, profile: user };
}

export function beginLogin(from?: string): void {
  try {
    localStorage.setItem(FLAG_KEY, "1");
  } catch {
    /* storage unavailable */
  }
  if (!readUser()) writeUser(PERSONA);
  window.location.assign(from && from.startsWith("/") ? from : "/account/profile");
}

export async function logout(): Promise<void> {
  try {
    localStorage.removeItem(FLAG_KEY);
  } catch {
    /* storage unavailable */
  }
  writeUser(null);
}

export async function updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  const next = { ...(readUser() ?? PERSONA), ...patch };
  writeUser(next);
  return next;
}

export async function linkCart(): Promise<void> {
  /* no cart backend in fixture mode */
}

export async function unlinkCart(): Promise<void> {
  /* no cart backend in fixture mode */
}

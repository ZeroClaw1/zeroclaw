import { apiRequest } from "./queryClient";
import type { SubscriptionTier, OnboardingState } from "@shared/schema";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  tier: SubscriptionTier;
  onboarding: OnboardingState;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

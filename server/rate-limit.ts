/**
 * Per-tier API rate limiting middleware.
 * Uses a sliding window counter per userId.
 */
import type { Request, Response, NextFunction } from "express";
import { PRICING_TIERS, type SubscriptionTier } from "@shared/schema";
import { storage } from "./storage";

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Requests per minute by tier
const RATE_LIMITS: Record<SubscriptionTier, number> = {
  free: 30,
  pro: 120,
  team: 300,
  enterprise: 1000,
};

const WINDOW_MS = 60_000; // 1 minute

const windows: Map<string, RateLimitEntry> = new Map();

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  if (!userId) return next(); // Unauthenticated routes have their own protection

  const user = storage.getUserById(userId);
  const tier: SubscriptionTier = user?.tier || "free";
  const limit = RATE_LIMITS[tier];

  const now = Date.now();
  const key = userId;
  let entry = windows.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    windows.set(key, entry);
  }

  entry.count++;

  // Set rate limit headers
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - entry.count));
  res.setHeader("X-RateLimit-Reset", Math.ceil((entry.windowStart + WINDOW_MS) / 1000));

  if (entry.count > limit) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      retryAfter: Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000),
      tier,
      limit,
      upgrade: tier === "free" ? "Upgrade to Pro for higher limits" : undefined,
    });
  }

  next();
}

/**
 * Check if a user can create more of a given resource based on their tier limits.
 */
export function checkTierLimit(
  userId: string,
  resource: "pipelines" | "agents" | "workflows",
  currentCount: number
): { allowed: boolean; limit: number; tier: SubscriptionTier; message?: string } {
  const user = storage.getUserById(userId);
  const tier: SubscriptionTier = user?.tier || "free";
  const tierConfig = PRICING_TIERS.find(t => t.id === tier);
  const limit = tierConfig?.limits[resource] ?? 3;

  if (limit === -1) return { allowed: true, limit: -1, tier }; // Unlimited

  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      tier,
      message: `You've reached the ${resource} limit (${limit}) for the ${tier} plan. Upgrade for more.`,
    };
  }

  return { allowed: true, limit, tier };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      windows.delete(key);
    }
  }
}, 5 * 60_000);

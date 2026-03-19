/**
 * Usage metering for ZeroClaw.
 * Checks per-tier resource limits before allowing creation of new resources.
 */
import { PRICING_TIERS, type SubscriptionTier } from "@shared/schema";
import type { IStorage } from "./storage";

export type MeteredResource = "pipelines" | "agents" | "workflows" | "claude_code_tasks";

export interface UsageLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  tierName: string;
}

/**
 * Returns the current month boundaries (UTC) for monthly-scoped limits.
 */
function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/**
 * Check whether a user is within their tier limit for a given resource.
 *
 * @param userId   The user's ID
 * @param resource One of: pipelines | agents | workflows | claude_code_tasks
 * @param storage  The storage instance
 * @returns        { allowed, current, limit, tierName }
 */
export function checkUsageLimit(
  userId: string,
  resource: MeteredResource,
  storage: IStorage
): UsageLimitResult {
  const user = storage.getUserById(userId);
  const tier: SubscriptionTier = user?.tier ?? "free";
  const tierConfig = PRICING_TIERS.find((t) => t.id === tier);
  const tierName = tierConfig?.name ?? tier;

  let current = 0;
  let limit = 0;

  switch (resource) {
    case "pipelines": {
      current = storage.getPipelines(userId).length;
      limit = tierConfig?.limits.pipelines ?? 3;
      break;
    }

    case "agents": {
      current = storage.getAgents(userId).length;
      limit = tierConfig?.limits.agents ?? 1;
      break;
    }

    case "workflows": {
      current = storage.getWorkflows(userId).length;
      limit = tierConfig?.limits.workflows ?? 5;
      break;
    }

    case "claude_code_tasks": {
      // Count tasks created this calendar month
      const { start, end } = currentMonthRange();
      const tasks = storage.getCodingTasks(userId);
      current = tasks.filter((t) => {
        const created = new Date(t.createdAt);
        return created >= start && created < end;
      }).length;
      // Map to buildsPerMonth as the closest equivalent limit
      limit = tierConfig?.limits.buildsPerMonth ?? 50;
      break;
    }
  }

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, current, limit: -1, tierName };
  }

  return {
    allowed: current < limit,
    current,
    limit,
    tierName,
  };
}

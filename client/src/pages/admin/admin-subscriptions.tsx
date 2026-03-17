import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { AdminLayout } from "./admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PRICING_TIERS } from "@shared/schema";
import { DollarSign, TrendingUp, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface RevenueData {
  mrr: number;
  arr: number;
  tierRevenue: Record<string, { count: number; revenue: number }>;
}

const TIER_COLORS: Record<string, string> = {
  free: "#6b7280",
  pro: "#14b8a6",
  team: "#a78bfa",
  enterprise: "#f59e0b",
};

export default function AdminSubscriptionsPage() {
  const { data: revenue, isLoading } = useQuery<RevenueData>({
    queryKey: ["/api/admin/revenue"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 10000,
  });

  const chartData = revenue
    ? Object.entries(revenue.tierRevenue)
        .filter(([, d]) => d.count > 0)
        .map(([tier, data]) => ({
          name: tier.charAt(0).toUpperCase() + tier.slice(1),
          revenue: data.revenue / 100,
          users: data.count,
          fill: TIER_COLORS[tier] || "#6b7280",
        }))
    : [];

  return (
    <AdminLayout title="Subscriptions" subtitle="Revenue and subscription analytics">
      {/* Revenue KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-border bg-card" data-testid="admin-sub-mrr">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly Recurring Revenue</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-1 text-emerald-400">
                    ${((revenue?.mrr ?? 0) / 100).toFixed(0)}
                  </p>
                )}
              </div>
              <div className="h-8 w-8 rounded-md flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card" data-testid="admin-sub-arr">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Annual Run Rate</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-1 text-primary">
                    ${((revenue?.arr ?? 0) / 100).toFixed(0)}
                  </p>
                )}
              </div>
              <div className="h-8 w-8 rounded-md flex items-center justify-center bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card" data-testid="admin-sub-paying">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Paying Users</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-1 text-foreground">
                    {revenue
                      ? Object.entries(revenue.tierRevenue)
                          .filter(([tier]) => tier !== "free")
                          .reduce((sum, [, d]) => sum + d.count, 0)
                      : 0}
                  </p>
                )}
              </div>
              <div className="h-8 w-8 rounded-md flex items-center justify-center bg-muted text-muted-foreground">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card className="border-border bg-card mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="h-48" data-testid="admin-sub-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }}
                    formatter={(value: number) => [`$${value}/mo`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing tiers reference */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pricing Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="admin-sub-tiers">
            {PRICING_TIERS.map((tier) => {
              const tierData = revenue?.tierRevenue[tier.id];
              return (
                <div
                  key={tier.id}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{tier.name}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{ borderColor: TIER_COLORS[tier.id], color: TIER_COLORS[tier.id] }}
                    >
                      {tierData?.count ?? 0} users
                    </Badge>
                  </div>
                  <p className="text-lg font-bold">
                    {tier.price < 0 ? "Custom" : tier.price === 0 ? "Free" : `$${tier.price / 100}/mo`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Revenue: ${((tierData?.revenue ?? 0) / 100).toFixed(0)}/mo
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

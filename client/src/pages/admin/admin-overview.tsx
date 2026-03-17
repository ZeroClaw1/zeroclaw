import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { AdminLayout } from "./admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, DollarSign, AlertTriangle, UserPlus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface AdminStats {
  totalUsers: number;
  tierBreakdown: Record<string, number>;
  suspendedCount: number;
  recentSignups: number;
}

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

export default function AdminOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 10000,
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery<RevenueData>({
    queryKey: ["/api/admin/revenue"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 10000,
  });

  const tierChartData = stats
    ? Object.entries(stats.tierBreakdown).map(([tier, count]) => ({
        name: tier.charAt(0).toUpperCase() + tier.slice(1),
        value: count,
        fill: TIER_COLORS[tier] || "#6b7280",
      }))
    : [];

  const revenueChartData = revenue
    ? Object.entries(revenue.tierRevenue).map(([tier, data]) => ({
        name: tier.charAt(0).toUpperCase() + tier.slice(1),
        revenue: data.revenue / 100,
        users: data.count,
        fill: TIER_COLORS[tier] || "#6b7280",
      }))
    : [];

  return (
    <AdminLayout title="Admin Panel" subtitle="Platform overview and analytics">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Total Users"
          value={stats?.totalUsers}
          icon={Users}
          loading={statsLoading}
          testId="admin-kpi-users"
        />
        <KpiCard
          title="MRR"
          value={revenue ? `$${(revenue.mrr / 100).toFixed(0)}` : undefined}
          icon={DollarSign}
          loading={revenueLoading}
          accent="text-emerald-400"
          testId="admin-kpi-mrr"
        />
        <KpiCard
          title="Suspended"
          value={stats?.suspendedCount}
          icon={AlertTriangle}
          loading={statsLoading}
          accent="text-red-400"
          testId="admin-kpi-suspended"
        />
        <KpiCard
          title="Signups (24h)"
          value={stats?.recentSignups}
          icon={UserPlus}
          loading={statsLoading}
          accent="text-amber-400"
          testId="admin-kpi-signups"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">User Distribution by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="h-48" data-testid="admin-chart-tiers">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tierChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {tierChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 -mt-2">
                  {tierChartData.map((t) => (
                    <div key={t.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <div className="h-2 w-2 rounded-full" style={{ background: t.fill }} />
                      {t.name} ({t.value})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="h-48" data-testid="admin-chart-revenue">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }}
                      formatter={(value: number) => [`$${value}/mo`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                      {revenueChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function KpiCard({ title, value, icon: Icon, loading, accent, testId }: {
  title: string;
  value: number | string | undefined;
  icon: React.ElementType;
  loading: boolean;
  accent?: string;
  testId: string;
}) {
  return (
    <Card className="border-border bg-card" data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className={`text-2xl font-bold mt-1 ${accent || "text-foreground"}`}>{value ?? 0}</p>
            )}
          </div>
          <div className={`h-8 w-8 rounded-md flex items-center justify-center bg-muted ${accent || "text-muted-foreground"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

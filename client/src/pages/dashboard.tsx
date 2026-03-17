import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { WorkflowStatusBadge } from "@/components/status-badge";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DashboardStats, DashboardSettings, Pipeline, ActivityEvent, Agent, Deployment } from "@shared/schema";
import {
  GitBranch,
  Rocket,
  Bot,
  TrendingUp,
  Clock,
  AlertTriangle,
  Activity,
  Zap,
  Sliders,
  ArrowUp,
  ArrowDown,
  Plus,
  Workflow,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  accent,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-4 relative">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {label}
            </span>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className={`text-xl font-bold tabular-nums ${accent || "text-foreground"}`}>
                {value}
              </span>
            )}
            {trend && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </span>
            )}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineRow({ pipeline }: { pipeline: Pipeline }) {
  const completedSteps = pipeline.steps.filter((s) => s.status === "success").length;
  const progress = pipeline.steps.length > 0 ? (completedSteps / pipeline.steps.length) * 100 : 0;

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors group" data-testid={`pipeline-row-${pipeline.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground truncate">{pipeline.name}</span>
          <WorkflowStatusBadge status={pipeline.status} />
        </div>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            {pipeline.branch}
          </span>
          <span className="font-mono">{pipeline.commit}</span>
          <span>{pipeline.author}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-24">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground mt-0.5 block text-right">
            {completedSteps}/{pipeline.steps.length} steps
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">
          {pipeline.duration > 0 ? `${pipeline.duration}s` : "--"}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ event }: { event: ActivityEvent }) {
  const iconMap: Record<string, React.ElementType> = {
    pipeline: GitBranch,
    deployment: Rocket,
    agent: Bot,
    openclaw: Zap,
  };
  const Icon = iconMap[event.type] || Activity;

  const colorMap: Record<string, string> = {
    running: "text-blue-400",
    success: "text-emerald-400",
    failed: "text-red-400",
    pending: "text-yellow-400",
    busy: "text-amber-400",
    online: "text-emerald-400",
    offline: "text-gray-400",
  };

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 border-b border-border/20 last:border-0">
      <div className={`mt-0.5 ${colorMap[event.status] || "text-muted-foreground"}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-foreground/90 leading-tight">{event.message}</p>
        <span className="text-[9px] text-muted-foreground">
          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

const defaultWidgetLayout = [
  { id: "kpi-stats", visible: true, order: 0 },
  { id: "recent-pipelines", visible: true, order: 1 },
  { id: "activity-feed", visible: true, order: 2 },
  { id: "agent-status", visible: true, order: 3 },
  { id: "deployment-summary", visible: true, order: 4 },
  { id: "quick-actions", visible: true, order: 5 },
];

const widgetNames: Record<string, string> = {
  "kpi-stats": "KPI Stats",
  "recent-pipelines": "Recent Pipelines",
  "activity-feed": "Activity Feed",
  "agent-status": "Agent Status",
  "deployment-summary": "Deployment Summary",
  "quick-actions": "Quick Actions",
};

function AgentStatusWidget({ agents }: { agents?: Agent[] }) {
  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Agent Status
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {agents && agents.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {agents.map((agent) => {
              const statusColor: Record<string, string> = {
                online: "bg-emerald-400",
                busy: "bg-amber-400",
                error: "bg-red-400",
                offline: "bg-gray-500",
              };
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 p-2 rounded bg-muted/20 border border-border/30"
                  data-testid={`agent-status-${agent.id}`}
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${statusColor[agent.status] || "bg-gray-500"}`} />
                  <span className="text-[10px] text-foreground truncate">{agent.name}</span>
                  <Badge variant="outline" className="text-[7px] ml-auto border-border/30 text-muted-foreground">
                    {agent.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground text-center py-4">No agents connected</p>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionsWidget() {
  const [, navigate] = useLocation();
  const actions = [
    { label: "Create Pipeline", icon: Plus, href: "/pipelines" },
    { label: "Connect Agent", icon: Bot, href: "/agents" },
    { label: "New Workflow", icon: Workflow, href: "/workflows" },
    { label: "Deploy", icon: Rocket, href: "/deployments" },
  ];

  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="h-auto py-3 flex flex-col items-center gap-1.5 text-xs border-border/40 hover:border-primary/40 hover:bg-primary/5"
              onClick={() => navigate(action.href)}
              data-testid={`quick-action-${action.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <action.icon className="h-4 w-4 text-primary" />
              <span className="text-[10px]">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showCustomize, setShowCustomize] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: pipelines, isLoading: pipelinesLoading } = useQuery<Pipeline[]>({
    queryKey: ["/api/pipelines"],
  });

  const { data: activity, isLoading: activityLoading } = useQuery<ActivityEvent[]>({
    queryKey: ["/api/activity"],
  });

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: deployments } = useQuery<Deployment[]>({
    queryKey: ["/api/deployments"],
  });

  const { data: settings } = useQuery<DashboardSettings>({
    queryKey: ["/api/settings"],
  });

  const layout = settings?.widgetLayout || defaultWidgetLayout;
  const sortedLayout = [...layout].sort((a, b) => a.order - b.order);

  const saveMutation = useMutation({
    mutationFn: async (newLayout: typeof layout) => {
      await apiRequest("PATCH", "/api/settings", { widgetLayout: newLayout });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const toggleWidget = (id: string) => {
    const newLayout = layout.map((w) => w.id === id ? { ...w, visible: !w.visible } : w);
    saveMutation.mutate(newLayout);
  };

  const moveWidget = (id: string, direction: "up" | "down") => {
    const sorted = [...layout].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((w) => w.id === id);
    if (direction === "up" && idx > 0) {
      const temp = sorted[idx].order;
      sorted[idx] = { ...sorted[idx], order: sorted[idx - 1].order };
      sorted[idx - 1] = { ...sorted[idx - 1], order: temp };
    } else if (direction === "down" && idx < sorted.length - 1) {
      const temp = sorted[idx].order;
      sorted[idx] = { ...sorted[idx], order: sorted[idx + 1].order };
      sorted[idx + 1] = { ...sorted[idx + 1], order: temp };
    }
    saveMutation.mutate(sorted);
  };

  const isVisible = (id: string) => {
    const w = layout.find((w) => w.id === id);
    return w ? w.visible : true;
  };

  const renderWidget = (id: string) => {
    switch (id) {
      case "kpi-stats":
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" key={id}>
            <KpiCard label="Active Pipelines" value={stats?.activePipelines ?? 0} icon={GitBranch} accent="text-primary" loading={statsLoading} />
            <KpiCard label="Success Rate" value={`${stats?.successRate ?? 0}%`} icon={TrendingUp} loading={statsLoading} />
            <KpiCard label="Avg Build Time" value={stats ? `${Math.floor(stats.avgBuildTime / 60)}m ${stats.avgBuildTime % 60}s` : "--"} icon={Clock} loading={statsLoading} />
            <KpiCard label="Online Agents" value={`${stats?.activeAgents ?? 0}/${stats?.totalAgents ?? 0}`} icon={Bot} accent="text-emerald-400" loading={statsLoading} />
          </div>
        );
      case "recent-pipelines":
        return (
          <Card key={id} className="border border-border/50 bg-card/80 backdrop-blur-sm mb-6">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                Recent Pipelines
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pipelinesLoading ? (
                <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : pipelines && pipelines.length > 0 ? (
                pipelines.slice(0, 6).map((pl) => <PipelineRow key={pl.id} pipeline={pl} />)
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">No pipelines yet.</div>
              )}
            </CardContent>
          </Card>
        );
      case "activity-feed":
        return (
          <Card key={id} className="border border-border/50 bg-card/80 backdrop-blur-sm mb-6">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[420px] overflow-y-auto overscroll-contain">
              {activityLoading ? (
                <div className="p-4 space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : activity && activity.length > 0 ? (
                activity.map((ev) => <ActivityItem key={ev.id} event={ev} />)
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">No activity yet.</div>
              )}
            </CardContent>
          </Card>
        );
      case "agent-status":
        return <div key={id} className="mb-6"><AgentStatusWidget agents={agents} /></div>;
      case "deployment-summary":
        return (
          <div key={id} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border border-border/50 bg-card/80 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Deployments</span>
              </div>
              <span className="text-lg font-bold tabular-nums text-foreground" data-testid="text-total-deployments">
                {statsLoading ? <Skeleton className="h-6 w-10 inline-block" /> : stats?.totalDeployments ?? 0}
              </span>
            </Card>
            <Card className="border border-border/50 bg-card/80 p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Failed Today</span>
              </div>
              <span className="text-lg font-bold tabular-nums text-red-400" data-testid="text-failed-today">
                {statsLoading ? <Skeleton className="h-6 w-10 inline-block" /> : stats?.failedToday ?? 0}
              </span>
            </Card>
            <Card className="border border-border/50 bg-card/80 p-4">
              <div className="flex items-center gap-2 mb-1">
                <GitBranch className="h-3.5 w-3.5 text-accent" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Pipelines</span>
              </div>
              <span className="text-lg font-bold tabular-nums text-foreground" data-testid="text-total-pipelines">
                {statsLoading ? <Skeleton className="h-6 w-10 inline-block" /> : stats?.totalPipelines ?? 0}
              </span>
            </Card>
            <Card className="border border-border/50 bg-card/80 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">OpenClaw</span>
              </div>
              <span className="text-lg font-bold tabular-nums text-foreground">
                {statsLoading ? <Skeleton className="h-6 w-10 inline-block" /> : stats?.activeAgents ?? 0} active
              </span>
            </Card>
          </div>
        );
      case "quick-actions":
        return <div key={id} className="mb-6"><QuickActionsWidget /></div>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="Dashboard" subtitle="Workflow orchestration overview">
      {/* Onboarding Wizard */}
      {user && !user.onboarding.completed && showOnboarding && (
        <OnboardingWizard
          onboarding={user.onboarding}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      {/* Customize Button */}
      <div className="flex justify-end mb-4">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-border/40 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCustomize(!showCustomize)}
            data-testid="button-customize-dashboard"
          >
            <Sliders className="h-3.5 w-3.5 mr-1.5" />
            Customize
          </Button>

          {showCustomize && (
            <div className="absolute right-0 top-full mt-1 w-64 rounded-md border border-border/50 bg-card shadow-lg z-50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Widget Visibility & Order
              </div>
              <div className="space-y-1.5">
                {sortedLayout.map((w, idx) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 p-1.5 rounded bg-muted/10 border border-border/20"
                  >
                    <Switch
                      checked={w.visible}
                      onCheckedChange={() => toggleWidget(w.id)}
                      className="scale-75"
                      data-testid={`toggle-widget-${w.id}`}
                    />
                    <span className="text-[10px] text-foreground flex-1">{widgetNames[w.id] || w.id}</span>
                    <button
                      onClick={() => moveWidget(w.id, "up")}
                      disabled={idx === 0}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      data-testid={`move-up-${w.id}`}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveWidget(w.id, "down")}
                      disabled={idx === sortedLayout.length - 1}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      data-testid={`move-down-${w.id}`}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Render widgets in order */}
      {sortedLayout.filter((w) => w.visible).map((w) => renderWidget(w.id))}
    </DashboardLayout>
  );
}

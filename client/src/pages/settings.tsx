import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DashboardSettings, SubscriptionTier } from "@shared/schema";
import { PRICING_TIERS } from "@shared/schema";
import {
  Settings,
  Palette,
  Bell,
  Radio,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  CreditCard,
  ArrowUpRight,
} from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

function GeneralTab({ settings }: { settings: DashboardSettings }) {
  const mutation = useMutation({
    mutationFn: (data: Partial<DashboardSettings>) =>
      apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3 px-6 pt-5">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          General Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="dashboard-name" className="text-xs text-muted-foreground">
            Dashboard Name
          </Label>
          <Input
            id="dashboard-name"
            data-testid="input-dashboard-name"
            defaultValue={settings.dashboardName}
            onBlur={(e) => mutation.mutate({ dashboardName: e.target.value })}
            className="bg-background/50 border-border/50 text-xs h-9"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pipeline-timeout" className="text-xs text-muted-foreground">
            Default Pipeline Timeout (seconds)
          </Label>
          <Input
            id="pipeline-timeout"
            data-testid="input-pipeline-timeout"
            type="number"
            defaultValue={settings.defaultPipelineTimeout}
            onBlur={(e) =>
              mutation.mutate({ defaultPipelineTimeout: parseInt(e.target.value) || 300 })
            }
            className="bg-background/50 border-border/50 text-xs h-9"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground">
            Auto-Refresh Interval (seconds)
          </Label>
          <Input
            id="auto-refresh"
            data-testid="input-auto-refresh"
            type="number"
            defaultValue={settings.autoRefreshInterval}
            onBlur={(e) =>
              mutation.mutate({ autoRefreshInterval: parseInt(e.target.value) || 5 })
            }
            className="bg-background/50 border-border/50 text-xs h-9"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AppearanceTab({ settings }: { settings: DashboardSettings }) {
  const mutation = useMutation({
    mutationFn: (data: Partial<DashboardSettings>) =>
      apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const handleThemeChange = (theme: "dark" | "light" | "system") => {
    mutation.mutate({ theme });
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const accentColors = [
    { value: "teal", label: "Teal", color: "bg-teal-400" },
    { value: "purple", label: "Purple", color: "bg-purple-400" },
    { value: "pink", label: "Pink", color: "bg-pink-400" },
    { value: "amber", label: "Amber", color: "bg-amber-400" },
    { value: "green", label: "Green", color: "bg-green-400" },
  ] as const;

  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3 px-6 pt-5">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Palette className="h-4 w-4 text-accent" />
          Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-5">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Theme</Label>
          <Select
            defaultValue={settings.theme}
            onValueChange={(v) => handleThemeChange(v as "dark" | "light" | "system")}
          >
            <SelectTrigger className="bg-background/50 border-border/50 text-xs h-9" data-testid="select-theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Accent Color</Label>
          <div className="flex gap-3" data-testid="accent-color-picker">
            {accentColors.map((c) => (
              <button
                key={c.value}
                data-testid={`accent-${c.value}`}
                onClick={() => mutation.mutate({ accentColor: c.value })}
                className={`w-8 h-8 rounded-full ${c.color} transition-all ${
                  settings.accentColor === c.value
                    ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                    : "opacity-60 hover:opacity-100"
                }`}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-foreground">Compact Mode</Label>
            <p className="text-[10px] text-muted-foreground">Reduce spacing throughout the UI</p>
          </div>
          <Switch
            data-testid="switch-compact-mode"
            checked={settings.compactMode}
            onCheckedChange={(checked) => mutation.mutate({ compactMode: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsTab({ settings }: { settings: DashboardSettings }) {
  const mutation = useMutation({
    mutationFn: (data: Partial<DashboardSettings>) =>
      apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3 px-6 pt-5">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-foreground">Pipeline Notifications</Label>
            <p className="text-[10px] text-muted-foreground">Get notified on pipeline status changes</p>
          </div>
          <Switch
            data-testid="switch-pipeline-notifications"
            checked={settings.pipelineNotifications}
            onCheckedChange={(checked) => mutation.mutate({ pipelineNotifications: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-foreground">Deployment Notifications</Label>
            <p className="text-[10px] text-muted-foreground">Get notified on deployment events</p>
          </div>
          <Switch
            data-testid="switch-deployment-notifications"
            checked={settings.deploymentNotifications}
            onCheckedChange={(checked) => mutation.mutate({ deploymentNotifications: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-foreground">Agent Status Notifications</Label>
            <p className="text-[10px] text-muted-foreground">Get notified when agents go online/offline</p>
          </div>
          <Switch
            data-testid="switch-agent-notifications"
            checked={settings.agentStatusNotifications}
            onCheckedChange={(checked) => mutation.mutate({ agentStatusNotifications: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-foreground">Sound Effects</Label>
            <p className="text-[10px] text-muted-foreground">Play sounds for notifications</p>
          </div>
          <Switch
            data-testid="switch-sound-effects"
            checked={settings.soundEffects}
            onCheckedChange={(checked) => mutation.mutate({ soundEffects: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function GatewayTab({ settings }: { settings: DashboardSettings }) {
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "testing" | "connected" | "failed"
  >("idle");

  const mutation = useMutation({
    mutationFn: (data: Partial<DashboardSettings>) =>
      apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      setConnectionStatus("testing");
      const res = await apiRequest("POST", "/api/openclaw/test-connection");
      return res.json();
    },
    onSuccess: (data: { connected: boolean }) => {
      setConnectionStatus(data.connected ? "connected" : "failed");
    },
    onError: () => {
      setConnectionStatus("failed");
    },
  });

  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3 px-6 pt-5">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          OpenClaw Gateway
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="gateway-url" className="text-xs text-muted-foreground">
            Gateway URL
          </Label>
          <Input
            id="gateway-url"
            data-testid="input-gateway-url"
            defaultValue={settings.gatewayUrl}
            onBlur={(e) => mutation.mutate({ gatewayUrl: e.target.value })}
            className="bg-background/50 border-border/50 text-xs h-9"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gateway-port" className="text-xs text-muted-foreground">
            Gateway Port
          </Label>
          <Input
            id="gateway-port"
            data-testid="input-gateway-port"
            type="number"
            defaultValue={settings.gatewayPort}
            onBlur={(e) =>
              mutation.mutate({ gatewayPort: parseInt(e.target.value) || 18789 })
            }
            className="bg-background/50 border-border/50 text-xs h-9"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-foreground">Auto-Reconnect</Label>
            <p className="text-[10px] text-muted-foreground">
              Automatically reconnect on disconnect
            </p>
          </div>
          <Switch
            data-testid="switch-auto-reconnect"
            checked={settings.autoReconnect}
            onCheckedChange={(checked) => mutation.mutate({ autoReconnect: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="heartbeat-interval" className="text-xs text-muted-foreground">
            Heartbeat Interval (seconds)
          </Label>
          <Input
            id="heartbeat-interval"
            data-testid="input-heartbeat-interval"
            type="number"
            defaultValue={settings.heartbeatInterval}
            onBlur={(e) =>
              mutation.mutate({ heartbeatInterval: parseInt(e.target.value) || 30 })
            }
            className="bg-background/50 border-border/50 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            data-testid="btn-test-connection"
            onClick={() => testConnection.mutate()}
            disabled={connectionStatus === "testing"}
            className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-xs h-8"
          >
            {connectionStatus === "testing" ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : null}
            Test Connection
          </Button>

          <div className="flex items-center gap-2 text-xs" data-testid="connection-status">
            {connectionStatus === "connected" && (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Connected</span>
              </>
            )}
            {connectionStatus === "failed" && (
              <>
                <WifiOff className="h-3.5 w-3.5 text-red-400" />
                <span className="text-red-400">Connection Failed</span>
              </>
            )}
            {connectionStatus === "idle" && (
              <span className="text-muted-foreground">Not tested</span>
            )}
            {connectionStatus === "testing" && (
              <span className="text-muted-foreground">Testing...</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SubscriptionData {
  tier: SubscriptionTier;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface UsageData {
  tier: SubscriptionTier;
  limits: {
    pipelines: number;
    agents: number;
    workflows: number;
    teamMembers: number;
    buildsPerMonth: number;
    logRetentionDays: number;
  };
  usage: {
    pipelines: number;
    agents: number;
    workflows: number;
    buildsThisMonth: number;
  };
}

function UsageBar({ label, used, limit, testId }: { label: string; used: number; limit: number; testId: string }) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isWarning = !isUnlimited && pct >= 80;

  return (
    <div className="space-y-1.5" data-testid={testId}>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={isWarning ? "text-amber-400 font-semibold" : "text-foreground"}>
          {used} / {isUnlimited ? "∞" : limit}
        </span>
      </div>
      <Progress
        value={isUnlimited ? 0 : pct}
        className="h-1.5"
      />
    </div>
  );
}

function BillingTab() {
  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
  });

  const { data: usage, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["/api/usage"],
  });

  const upgradeMutation = useMutation({
    mutationFn: (tier: SubscriptionTier) =>
      apiRequest("POST", "/api/subscription/upgrade", { tier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
    },
  });

  if (subLoading || usageLoading || !subscription || !usage) {
    return (
      <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-5 w-5 animate-spin mr-2 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading billing info...</span>
        </CardContent>
      </Card>
    );
  }

  const currentTier = PRICING_TIERS.find((t) => t.id === subscription.tier);
  const tierIndex = PRICING_TIERS.findIndex((t) => t.id === subscription.tier);

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3 px-6 pt-5">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground" data-testid="billing-current-tier">
                  {currentTier?.name || subscription.tier}
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {subscription.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current period ends {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => (window.location.hash = "#/pricing")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              data-testid="billing-upgrade-btn"
            >
              Upgrade Plan
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3 px-6 pt-5">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          <UsageBar
            label="Pipelines"
            used={usage.usage.pipelines}
            limit={usage.limits.pipelines}
            testId="usage-pipelines"
          />
          <UsageBar
            label="Agents"
            used={usage.usage.agents}
            limit={usage.limits.agents}
            testId="usage-agents"
          />
          <UsageBar
            label="Workflows"
            used={usage.usage.workflows}
            limit={usage.limits.workflows}
            testId="usage-workflows"
          />
          <UsageBar
            label="Builds This Month"
            used={usage.usage.buildsThisMonth}
            limit={usage.limits.buildsPerMonth}
            testId="usage-builds"
          />
        </CardContent>
      </Card>

      {/* Quick Upgrade */}
      {tierIndex < PRICING_TIERS.length - 1 && (
        <Card className="border border-primary/30 bg-card/80 backdrop-blur-sm">
          <CardContent className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Upgrade to {PRICING_TIERS[tierIndex + 1].name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Unlock more pipelines, agents, and builds
                </p>
              </div>
              <Button
                size="sm"
                className="text-xs"
                data-testid="billing-quick-upgrade"
                disabled={upgradeMutation.isPending}
                onClick={() => upgradeMutation.mutate(PRICING_TIERS[tierIndex + 1].id)}
              >
                {upgradeMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useQuery<DashboardSettings>({
    queryKey: ["/api/settings"],
  });

  if (isLoading || !settings) {
    return (
      <DashboardLayout title="Settings" subtitle="Configure your dashboard">
        <div className="flex items-center justify-center h-64 text-xs text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading settings...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings" subtitle="Configure your dashboard">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-card/80 border border-border/50 mb-6" data-testid="settings-tabs">
          <TabsTrigger value="general" data-testid="tab-general" className="text-xs">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance" data-testid="tab-appearance" className="text-xs">
            <Palette className="h-3.5 w-3.5 mr-1.5" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications" className="text-xs">
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="gateway" data-testid="tab-gateway" className="text-xs">
            <Radio className="h-3.5 w-3.5 mr-1.5" />
            Gateway
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing" className="text-xs">
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab settings={settings} />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceTab settings={settings} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab settings={settings} />
        </TabsContent>
        <TabsContent value="gateway">
          <GatewayTab settings={settings} />
        </TabsContent>
        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OpenClawConfig, ApiKey } from "@shared/schema";
import {
  Terminal,
  Zap,
  Wifi,
  WifiOff,
  Shield,
  Brain,
  Settings,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plug,
  RefreshCw,
  Save,
  Copy,
  Loader2,
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ClipboardCopy,
  Unplug,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface GatewayStatus {
  connected: boolean;
  gatewayUrl: string;
  model: string;
  latency: number;
  lastHeartbeat: string | null;
  error: string | null;
  reconnectAttempts: number;
}

function LatencyBadge({ latency }: { latency: number }) {
  if (latency <= 0) return null;
  const color = latency < 100 ? "text-emerald-400 border-emerald-400/30" : latency < 500 ? "text-amber-400 border-amber-400/30" : "text-red-400 border-red-400/30";
  return (
    <Badge variant="outline" className={`text-[9px] ${color}`} data-testid="latency-badge">
      <Activity className="h-2.5 w-2.5 mr-1" />
      {latency}ms
    </Badge>
  );
}

export default function OpenClawPage() {
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<OpenClawConfig>({
    queryKey: ["/api/openclaw/config"],
  });

  // Poll live gateway status every 5s while on this page
  const { data: gatewayStatus } = useQuery<GatewayStatus>({
    queryKey: ["/api/openclaw/status"],
    refetchInterval: 5000,
  });

  // Local form state — initialized from server data
  const [gatewayUrl, setGatewayUrl] = useState<string | null>(null);
  const [gatewayPort, setGatewayPort] = useState<string | null>(null);
  const [heartbeatInterval, setHeartbeatInterval] = useState<string | null>(null);

  const effectiveUrl = gatewayUrl ?? config?.gatewayUrl ?? "http://localhost";
  const effectivePort = gatewayPort ?? String(config?.gatewayPort ?? 18789);
  const effectiveHeartbeat = heartbeatInterval ?? String(config?.heartbeatInterval ?? 30);

  // Save gateway config
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/openclaw/config", {
        gatewayUrl: effectiveUrl,
        gatewayPort: parseInt(effectivePort),
        heartbeatInterval: parseInt(effectiveHeartbeat),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openclaw/config"] });
      toast({ title: "Configuration saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Test connection (also starts WebSocket bridge)
  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/openclaw/test-connection");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/openclaw/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/openclaw/status"] });
      if (data.connected) {
        toast({ title: "Connected", description: `${data.message} (${data.latency})` });
      } else {
        toast({ title: "Connection failed", description: data.message, variant: "destructive" });
      }
    },
  });

  // Disconnect bridge
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/openclaw/disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openclaw/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/openclaw/status"] });
      toast({ title: "Disconnected" });
    },
  });

  // Toggle auto-reconnect
  const toggleAutoReconnect = useMutation({
    mutationFn: async (value: boolean) => {
      const res = await apiRequest("PATCH", "/api/openclaw/config", { autoReconnect: value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openclaw/config"] });
    },
  });

  // Toggle security tools
  const toggleSecurity = useMutation({
    mutationFn: async ({ tool, value }: { tool: string; value: boolean }) => {
      const res = await apiRequest("PATCH", "/api/openclaw/config", {
        securityTools: { [tool]: value },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openclaw/config"] });
    },
  });

  // Copy setup commands
  const copySetup = () => {
    const commands = `# Install OpenClaw\ncurl -fsSL https://get.openclaw.ai | bash\n\n# Start gateway\nopenclaw start\n\n# Configure workspace\ncd ~/.openclaw/workspace\nvim AGENTS.md`;
    navigator.clipboard.writeText(commands).then(() => {
      toast({ title: "Copied to clipboard" });
    }).catch(() => {
      toast({ title: "Copy failed", description: "Use Ctrl+C manually", variant: "destructive" });
    });
  };

  const connected = gatewayStatus?.connected ?? config?.connected ?? false;
  const latency = gatewayStatus?.latency ?? 0;
  const lastHeartbeat = gatewayStatus?.lastHeartbeat ?? null;
  const statusError = gatewayStatus?.error ?? null;

  if (isLoading) {
    return (
      <DashboardLayout title="OpenClaw" subtitle="Agent framework connection and settings">
        <Skeleton className="h-20 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="OpenClaw" subtitle="Agent framework connection and settings">
      {/* Connection status banner */}
      <div
        className={`rounded-lg border p-4 mb-6 ${
          connected
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-red-500/30 bg-red-500/5"
        }`}
        data-testid="connection-banner"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {connected ? (
              <Wifi className="h-5 w-5 text-emerald-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-400" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {connected ? "Gateway Connected" : "Gateway Disconnected"}
                </span>
                {connected && <LatencyBadge latency={latency} />}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {connected
                  ? `${config?.gatewayUrl}:${config?.gatewayPort} · Model: ${config?.model}`
                  : statusError
                    ? `Error: ${statusError}`
                    : "Click Test to check your OpenClaw gateway connection."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 glow-success pulse-live" />
            )}
            {connected && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                data-testid="button-disconnect"
              >
                {disconnectMutation.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Unplug className="h-3 w-3 mr-1.5" />
                )}
                Disconnect
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-border/40"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              data-testid="button-test-connection"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1.5" />
              )}
              {connected ? "Reconnect" : "Test"}
            </Button>
          </div>
        </div>
        {/* Live status details */}
        {connected && lastHeartbeat && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/20">
            <span className="text-[9px] text-muted-foreground" data-testid="last-heartbeat">
              Last heartbeat: {formatDistanceToNow(new Date(lastHeartbeat), { addSuffix: true })}
            </span>
            {(gatewayStatus?.reconnectAttempts ?? 0) > 0 && (
              <span className="text-[9px] text-amber-400">
                Reconnect attempts: {gatewayStatus?.reconnectAttempts}
              </span>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="gateway" className="space-y-4">
        <TabsList className="bg-muted/30 border border-border/40 p-0.5">
          <TabsTrigger value="gateway" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Plug className="h-3.5 w-3.5 mr-1.5" />
            Gateway
          </TabsTrigger>
          <TabsTrigger value="models" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Brain className="h-3.5 w-3.5 mr-1.5" />
            Models
          </TabsTrigger>
          <TabsTrigger value="skills" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="files" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Config Files
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Key className="h-3.5 w-3.5 mr-1.5" />
            API Keys
          </TabsTrigger>
        </TabsList>

        {/* Gateway Tab */}
        <TabsContent value="gateway">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-border/50 bg-card/80">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  Gateway Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Gateway URL
                  </label>
                  <Input
                    value={effectiveUrl}
                    onChange={(e) => setGatewayUrl(e.target.value)}
                    className="h-8 text-xs bg-muted/20 border-border/40 font-mono"
                    data-testid="input-gateway-url"
                  />
                  <p className="text-[9px] text-muted-foreground">Default: http://localhost</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Port
                  </label>
                  <Input
                    value={effectivePort}
                    onChange={(e) => setGatewayPort(e.target.value)}
                    className="h-8 text-xs bg-muted/20 border-border/40 font-mono"
                    data-testid="input-gateway-port"
                  />
                  <p className="text-[9px] text-muted-foreground">Default OpenClaw gateway port: 18789</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Heartbeat Interval
                  </label>
                  <Input
                    value={effectiveHeartbeat}
                    onChange={(e) => setHeartbeatInterval(e.target.value)}
                    className="h-8 text-xs bg-muted/20 border-border/40"
                    data-testid="input-heartbeat"
                  />
                  <p className="text-[9px] text-muted-foreground">Minutes between agent check-ins via HEARTBEAT.md</p>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Auto-reconnect
                    </span>
                    <p className="text-[9px] text-muted-foreground">
                      Automatically retry on connection loss
                    </p>
                  </div>
                  <Switch
                    checked={config?.autoReconnect ?? true}
                    onCheckedChange={(v) => toggleAutoReconnect.mutate(v)}
                    data-testid="switch-auto-reconnect"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-gateway"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 mr-1.5" />
                  )}
                  Save Configuration
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border/50 bg-card/80">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Settings className="h-4 w-4 text-accent" />
                  Quick Connect
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Connect your ZeroClaw dashboard to an OpenClaw instance
                </p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="bg-muted/20 rounded-md p-3 border border-border/30 font-mono text-[10px] text-muted-foreground space-y-1.5">
                  <div className="text-primary/70"># Install OpenClaw</div>
                  <div>curl -fsSL https://get.openclaw.ai | bash</div>
                  <div className="text-primary/70 mt-2"># Start gateway</div>
                  <div>openclaw start</div>
                  <div className="text-primary/70 mt-2"># Configure workspace</div>
                  <div>cd ~/.openclaw/workspace</div>
                  <div>vim AGENTS.md</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-xs border-border/40 text-muted-foreground"
                  onClick={copySetup}
                  data-testid="button-copy-setup"
                >
                  <Copy className="h-3 w-3 mr-1.5" />
                  Copy Setup Commands
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models">
          <Card className="border border-border/50 bg-card/80">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Brain className="h-4 w-4 text-accent" />
                Model Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Primary Model
                </span>
                <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{config?.model}</span>
                  <Badge variant="outline" className="text-[8px] ml-auto border-primary/30 text-primary">
                    Active
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Fallback Chain
                </span>
                <p className="text-[9px] text-muted-foreground mb-2">
                  If the primary model fails, these are tried in order
                </p>
                {config?.fallbackModels.map((model, i) => (
                  <div
                    key={model}
                    className="flex items-center gap-2 p-2.5 rounded-md bg-muted/20 border border-border/30"
                  >
                    <span className="text-[9px] text-muted-foreground tabular-nums w-4">{i + 1}.</span>
                    <span className="text-xs text-foreground">{model}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border/30">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
                  Supported Providers
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["Anthropic", "OpenAI", "Google", "DeepSeek", "Ollama", "OpenRouter"].map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="text-[9px] border-border/40 text-muted-foreground"
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills">
          <Card className="border border-border/50 bg-card/80">
            <CardHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Installed Skills
              </CardTitle>
              <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                {config?.skills.length ?? 0} installed
              </Badge>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {config?.skills && config.skills.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {config.skills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-3 p-3 rounded-md bg-muted/20 border border-border/30 hover:border-primary/30 transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-xs font-medium text-foreground">{skill}</span>
                        <p className="text-[9px] text-muted-foreground">~/.openclaw/workspace/skills/{skill}/</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No skills installed yet. Connect to your OpenClaw gateway to load skills.
                </div>
              )}
              <p className="text-[9px] text-muted-foreground mt-3">
                700+ skills available on ClawHub. Skills install without restarting.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Files Tab */}
        <TabsContent value="files">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "AGENTS.md", desc: "Agent names, roles, and task instructions", icon: Terminal },
              { name: "SOUL.md", desc: "Core principles: be helpful, have opinions, respect privacy", icon: Brain },
              { name: "IDENTITY.md", desc: "Agent personality, name, emoji, and avatar", icon: Zap },
              { name: "USER.md", desc: "Your profile: timezone, pronouns, context", icon: Settings },
              { name: "HEARTBEAT.md", desc: "Proactive task instructions (runs every 30min)", icon: RefreshCw },
              { name: "TOOLS.md", desc: "Tool usage conventions and restrictions", icon: Shield },
            ].map((file) => (
              <Card
                key={file.name}
                className="border border-border/50 bg-card/80 hover:border-primary/30 transition-colors cursor-pointer"
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <file.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold font-mono text-foreground">
                      {file.name}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{file.desc}</p>
                    <span className="text-[9px] text-primary/60 font-mono">
                      ~/.openclaw/workspace/{file.name}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="border border-border/50 bg-card/80">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Security Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {[
                {
                  key: "secureClaw",
                  name: "SecureClaw",
                  desc: "Open-source security auditing — 55 automated checks mapped to OWASP, MITRE ATLAS",
                },
                {
                  key: "clawBands",
                  name: "ClawBands",
                  desc: "Security middleware — intercepts tool calls and requires explicit approval",
                },
                {
                  key: "aquaman",
                  name: "Aquaman",
                  desc: "Credential isolation proxy — API keys never enter the agent process",
                },
              ].map((tool) => {
                const isActive = config?.securityTools?.[tool.key as keyof typeof config.securityTools] ?? false;
                return (
                  <div
                    key={tool.name}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/20 border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      {isActive ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                      <div>
                        <span className="text-xs font-semibold text-foreground">{tool.name}</span>
                        <p className="text-[9px] text-muted-foreground">{tool.desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(v) => toggleSecurity.mutate({ tool: tool.key, value: v })}
                      data-testid={`switch-${tool.key}`}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
        {/* API Keys Tab */}
        <TabsContent value="apikeys">
          <ApiKeysPanel />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

// ---- API Keys Panel ----

function ApiKeysPanel() {
  const { toast } = useToast();
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: authStatus } = useQuery<{ enabled: boolean; keyCount: number }>({
    queryKey: ["/api/auth/status"],
  });

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/auth/keys"],
  });

  const toggleAuth = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("POST", "/api/auth/toggle", { enabled });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      toast({
        title: data.enabled ? "Authentication enabled" : "Authentication disabled",
        description: data.enabled
          ? "API requests now require a valid API key"
          : "API endpoints are open (development mode)",
      });
    },
  });

  const createKey = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/keys", { name: newKeyName });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      setShowNewKey(data.rawKey);
      setNewKeyName("");
      toast({ title: "API key created", description: "Copy your key now — it won't be shown again" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/auth/keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      toast({ title: "API key revoked" });
    },
  });

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      toast({ title: "Copied to clipboard" });
    }).catch(() => {
      toast({ title: "Copy failed", variant: "destructive" });
    });
  };

  return (
    <div className="space-y-4">
      {/* Auth toggle */}
      <Card className="border border-border/50 bg-card/80">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="h-4 w-4 text-primary" />
            <div>
              <span className="text-xs font-semibold text-foreground">API Authentication</span>
              <p className="text-[9px] text-muted-foreground">
                {authStatus?.enabled
                  ? "All API requests require a valid key in the Authorization header"
                  : "Development mode — API is open, no authentication required"}
              </p>
            </div>
          </div>
          <Switch
            checked={authStatus?.enabled ?? false}
            onCheckedChange={(v) => toggleAuth.mutate(v)}
            data-testid="switch-auth-toggle"
          />
        </CardContent>
      </Card>

      {/* New key reveal */}
      {showNewKey && (
        <Card className="border border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">New API Key Created</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Copy this key now — it won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 rounded bg-background border border-border/40 text-[11px] font-mono text-primary break-all">
                {showNewKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
                onClick={() => copyKey(showNewKey)}
                data-testid="button-copy-new-key"
              >
                <ClipboardCopy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] text-muted-foreground mt-2"
              onClick={() => setShowNewKey(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Key list */}
      <Card className="border border-border/50 bg-card/80">
        <CardHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              API Keys
              <Badge variant="outline" className="text-[9px] border-border/40 text-muted-foreground">
                {apiKeys?.length ?? 0}
              </Badge>
            </CardTitle>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-primary/40 text-primary hover:bg-primary/10"
                  data-testid="button-create-api-key"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm bg-card border-border/50">
                <DialogHeader>
                  <DialogTitle className="text-sm font-semibold text-foreground">Create API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Key Name
                    </label>
                    <Input
                      placeholder="e.g. CI Server, Dev Machine"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="h-8 text-xs bg-muted/20 border-border/40"
                      data-testid="input-api-key-name"
                    />
                  </div>
                  <Button
                    className="w-full text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => {
                      createKey.mutate();
                      setCreateOpen(false);
                    }}
                    disabled={!newKeyName || createKey.isPending}
                    data-testid="button-confirm-create-key"
                  >
                    {createKey.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Key className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Generate Key
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : apiKeys && apiKeys.length > 0 ? (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-muted/20 border border-border/30"
                  data-testid={`api-key-item-${key.id}`}
                >
                  <Key className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{key.name}</span>
                      <code className="text-[9px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                        {key.prefix}
                      </code>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[9px] text-muted-foreground">
                      <span>Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}</span>
                      {key.lastUsed && (
                        <span>Last used {formatDistanceToNow(new Date(key.lastUsed), { addSuffix: true })}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                    onClick={() => deleteKey.mutate(key.id)}
                    data-testid={`button-delete-key-${key.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Key className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">No API keys yet. Create one to get started.</p>
            </div>
          )}

          {/* Usage example */}
          <div className="mt-4 p-3 rounded-md bg-background border border-border/30">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
              Usage
            </span>
            <code className="text-[10px] font-mono text-muted-foreground block">
              curl -H "Authorization: Bearer oc_your_key_here" \
            </code>
            <code className="text-[10px] font-mono text-primary block pl-4">
              http://localhost:5000/api/pipelines
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

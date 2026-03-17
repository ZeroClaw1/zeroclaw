import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket, usePipelineLogs } from "@/hooks/use-websocket";
import type { Pipeline, PipelineStep, PipelineArtifact, PipelineTemplate, WorkflowStatus } from "@shared/schema";
import {
  GitBranch,
  Clock,
  User,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Ban,
  Plus,
  RefreshCw,
  Terminal,
  Trash2,
  StopCircle,
  RotateCcw,
  Wifi,
  WifiOff,
  Filter,
  FileText,
  ExternalLink,
  ScrollText,
  Package,
  Shield,
  Code,
  Container,
  Rocket,
  Bot,
  Variable,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const stepStatusIcon: Record<string, React.ElementType> = {
  success: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  pending: Circle,
  cancelled: Ban,
};

const stepStatusColor: Record<string, string> = {
  success: "text-emerald-400",
  failed: "text-red-400",
  running: "text-blue-400 animate-spin",
  pending: "text-muted-foreground",
  cancelled: "text-gray-400",
};

function StepRow({
  step,
  logs,
  isExpanded,
  onToggle,
}: {
  step: PipelineStep;
  logs: string[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = stepStatusIcon[step.status] || Circle;
  const color = stepStatusColor[step.status] || "text-muted-foreground";
  const hasLogs = logs.length > 0 || (step.logs && step.logs.length > 0);

  return (
    <div>
      <div
        className={`flex items-center gap-3 px-3 py-2 border-b border-border/20 last:border-0 ${
          hasLogs ? "cursor-pointer hover:bg-muted/10" : ""
        }`}
        onClick={hasLogs ? onToggle : undefined}
        data-testid={`step-row-${step.id}`}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
        <span className="text-[11px] text-foreground flex-1">{step.name}</span>
        <Badge
          variant="outline"
          className="text-[9px] border-border/40 text-muted-foreground uppercase tracking-wider"
        >
          {step.type}
        </Badge>
        <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
          {step.duration > 0 ? `${step.duration}s` : step.status === "running" ? "..." : "--"}
        </span>
        {hasLogs && (
          <Terminal
            className={`h-3 w-3 transition-colors ${
              isExpanded ? "text-primary" : "text-muted-foreground/40"
            }`}
          />
        )}
      </div>
      {isExpanded && hasLogs && (
        <StreamingLogViewer
          logs={logs.length > 0 ? logs : step.logs || []}
          isLive={step.status === "running"}
        />
      )}
    </div>
  );
}

function StreamingLogViewer({ logs, isLive }: { logs: string[]; isLive: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-background/80 border-x border-b border-border/20">
      <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
        <Terminal className="h-3 w-3 text-primary" />
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
          Output
        </span>
        {isLive && (
          <span className="flex items-center gap-1 ml-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[8px] uppercase text-emerald-400 tracking-wider">Live</span>
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        className="font-mono text-[10px] px-3 pb-2 max-h-48 overflow-y-auto space-y-0"
      >
        {logs.map((line, i) => (
          <div
            key={i}
            className={`leading-relaxed ${
              line.startsWith("FAIL") || line.startsWith("ERROR") || line.includes("error")
                ? "text-red-400"
                : line.startsWith("✓") || line.includes("successfully") || line.includes("passed")
                ? "text-emerald-400/80"
                : line.startsWith("$")
                ? "text-primary/70"
                : line.startsWith("⚠")
                ? "text-yellow-400"
                : "text-muted-foreground"
            }`}
          >
            <span className="text-primary/30 mr-2 select-none">
              {String(i + 1).padStart(2, "0")}
            </span>
            {line}
          </div>
        ))}
        {isLive && logs.length === 0 && (
          <div className="text-muted-foreground/50 animate-pulse">Waiting for output...</div>
        )}
      </div>
    </div>
  );
}

function EnvVarsSection({ envVars }: { envVars: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(envVars);
  if (entries.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        className="flex items-center gap-1.5 w-full text-left"
        onClick={() => setExpanded(!expanded)}
        data-testid="toggle-env-vars"
      >
        <Variable className="h-3 w-3 text-primary" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex-1">
          Environment Variables ({entries.length})
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted/20 border border-border/30"
              data-testid={`env-var-${key}`}
            >
              <span className="text-[9px] font-mono font-semibold text-primary">{key}</span>
              <span className="text-[9px] text-muted-foreground">=</span>
              <span className="text-[9px] font-mono text-foreground">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const templateIconMap: Record<string, React.ElementType> = {
  code: Code,
  container: Container,
  rocket: Rocket,
  shield: Shield,
  bot: Bot,
};

function CreatePipelineDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"template" | "custom">("template");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("main");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState([
    { name: "Install", type: "build" as const },
    { name: "Lint", type: "lint" as const },
    { name: "Test", type: "test" as const },
    { name: "Build", type: "build" as const },
    { name: "Deploy", type: "deploy" as const },
  ]);
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);
  const { toast } = useToast();

  const { data: templates } = useQuery<PipelineTemplate[]>({
    queryKey: ["/api/pipeline-templates"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const envObj: Record<string, string> = {};
      envVars.forEach((v) => { if (v.key) envObj[v.key] = v.value; });
      const res = await apiRequest("POST", "/api/pipelines", {
        name,
        branch,
        description,
        steps,
        envVars: envObj,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      setOpen(false);
      resetForm();
      toast({ title: "Pipeline created", description: `"${data.name}" is now running` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setBranch("main");
    setDescription("");
    setSteps([
      { name: "Install", type: "build" as const },
      { name: "Lint", type: "lint" as const },
      { name: "Test", type: "test" as const },
      { name: "Build", type: "build" as const },
      { name: "Deploy", type: "deploy" as const },
    ]);
    setEnvVars([]);
    setMode("template");
  };

  const applyTemplate = (t: PipelineTemplate) => {
    setName(t.name);
    setDescription(t.description);
    setBranch(t.branch);
    setSteps(t.steps.map((s) => ({ name: s.name, type: s.type as any })));
    const vars = Object.entries(t.envVars).map(([key, value]) => ({ key, value }));
    setEnvVars(vars);
    setMode("custom");
  };

  const addStep = () => {
    setSteps([...steps, { name: "", type: "build" }]);
  };

  const removeStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, field: "name" | "type", value: string) => {
    const newSteps = [...steps];
    newSteps[idx] = { ...newSteps[idx], [field]: value };
    setSteps(newSteps as any);
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: "", value: "" }]);
  };

  const removeEnvVar = (idx: number) => {
    setEnvVars(envVars.filter((_, i) => i !== idx));
  };

  const updateEnvVar = (idx: number, field: "key" | "value", value: string) => {
    const newVars = [...envVars];
    newVars[idx] = { ...newVars[idx], [field]: field === "key" ? value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") : value };
    setEnvVars(newVars);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-primary/40 text-primary hover:bg-primary/10"
          data-testid="button-new-pipeline"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Pipeline
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border/50 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">
            Create Pipeline
          </DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-1 p-0.5 rounded-md bg-muted/30 border border-border/30 mt-1">
          <button
            className={`flex-1 text-[10px] py-1.5 rounded transition-all ${mode === "template" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMode("template")}
            data-testid="tab-template"
          >
            From Template
          </button>
          <button
            className={`flex-1 text-[10px] py-1.5 rounded transition-all ${mode === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMode("custom")}
            data-testid="tab-custom"
          >
            Custom
          </button>
        </div>

        {mode === "template" ? (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {templates?.map((t) => {
              const TIcon = templateIconMap[t.icon] || Code;
              return (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="p-3 rounded-md border border-border/40 bg-muted/10 hover:border-primary/60 hover:bg-primary/5 hover:shadow-[0_0_12px_hsl(173_80%_40%/0.15)] transition-all text-left group"
                  data-testid={`template-${t.id}`}
                >
                  <TIcon className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-[11px] font-semibold text-foreground">{t.name}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {t.steps.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[7px] px-1 py-0 border-border/30 text-muted-foreground">
                        {s.type}
                      </Badge>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Pipeline Name
              </Label>
              <Input
                placeholder="e.g. my-app-deploy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs bg-muted/20 border-border/40"
                data-testid="input-pipeline-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Branch
              </Label>
              <Input
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="h-8 text-xs bg-muted/20 border-border/40 font-mono"
                data-testid="input-pipeline-branch"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Description
              </Label>
              <Input
                placeholder="What does this pipeline do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8 text-xs bg-muted/20 border-border/40"
                data-testid="input-pipeline-desc"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Steps
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addStep}
                  className="text-[10px] text-primary h-6 px-2"
                  data-testid="button-add-step"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={step.name}
                      onChange={(e) => updateStep(i, "name", e.target.value)}
                      placeholder="Step name"
                      className="h-7 text-[11px] bg-muted/20 border-border/40 flex-1"
                    />
                    <Select
                      value={step.type}
                      onValueChange={(v) => updateStep(i, "type", v)}
                    >
                      <SelectTrigger className="h-7 w-24 text-[10px] bg-muted/20 border-border/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="build">Build</SelectItem>
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="lint">Lint</SelectItem>
                        <SelectItem value="deploy">Deploy</SelectItem>
                        <SelectItem value="scan">Scan</SelectItem>
                        <SelectItem value="openclaw">OpenClaw</SelectItem>
                        <SelectItem value="notify">Notify</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(i)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Environment Variables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Variable className="h-3 w-3" />
                  Environment Variables
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addEnvVar}
                  className="text-[10px] text-primary h-6 px-2"
                  data-testid="button-add-env-var"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {envVars.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {envVars.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={v.key}
                        onChange={(e) => updateEnvVar(i, "key", e.target.value)}
                        placeholder="KEY_NAME"
                        className="h-7 text-[11px] bg-muted/20 border-border/40 flex-1 font-mono"
                        data-testid={`input-env-key-${i}`}
                      />
                      <Input
                        value={v.value}
                        onChange={(e) => updateEnvVar(i, "value", e.target.value)}
                        placeholder="value"
                        className="h-7 text-[11px] bg-muted/20 border-border/40 flex-1 font-mono"
                        data-testid={`input-env-val-${i}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEnvVar(i)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                        data-testid={`button-remove-env-${i}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              className="w-full text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => createMutation.mutate()}
              disabled={!name || !branch || createMutation.isPending}
              data-testid="button-create-pipeline"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Create & Run Pipeline
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function PipelinesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState("");
  const { toast } = useToast();

  // WebSocket connection for live updates
  const { connected } = useWebSocket();

  // Streaming logs for selected pipeline
  const streamLogs = usePipelineLogs(selectedId);

  const { data: pipelines, isLoading } = useQuery<Pipeline[]>({
    queryKey: ["/api/pipelines"],
  });

  // Client-side filtering
  const filteredPipelines = pipelines?.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (branchFilter && !p.branch.toLowerCase().includes(branchFilter.toLowerCase())) return false;
    return true;
  });

  const selectedPipeline = pipelines?.find((p) => p.id === selectedId) || null;

  const { data: artifacts } = useQuery<PipelineArtifact[]>({
    queryKey: [`/api/pipelines/${selectedId}/artifacts`],
    enabled: !!selectedId,
  });

  // Auto-expand running steps
  useEffect(() => {
    if (selectedPipeline) {
      const runningStep = selectedPipeline.steps.find((s) => s.status === "running");
      if (runningStep) {
        setExpandedSteps((prev) => new Set([...prev, runningStep.id]));
      }
    }
  }, [selectedPipeline]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pipelines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      setSelectedId(null);
      toast({ title: "Pipeline deleted" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/pipelines/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Pipeline cancelled" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rerunMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/pipelines/${id}/rerun`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      setSelectedId(data.id);
      toast({ title: "Pipeline rerun started", description: `"${data.name}" is now running` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  return (
    <DashboardLayout title="Pipelines" subtitle="CI/CD pipeline status and history">
      <div className="flex items-center gap-4 mb-4">
        <CreatePipelineDialog />
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-border/40 text-muted-foreground hover:text-foreground"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          data-testid="button-refresh-pipelines"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${refreshMutation.isPending ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              className="h-7 w-28 text-[10px] bg-muted/20 border-border/40"
              data-testid="select-status-filter"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Branch..."
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-7 w-28 text-[10px] bg-muted/20 border-border/40 font-mono"
            data-testid="input-branch-filter"
          />
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {connected ? (
            <>
              <Wifi className="h-3 w-3 text-emerald-400" />
              <span className="text-[9px] text-emerald-400 uppercase tracking-wider">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                Polling
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline List */}
        <div className="lg:col-span-2">
          <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                All Pipelines
                {filteredPipelines && (
                  <Badge
                    variant="outline"
                    className="text-[9px] border-border/40 text-muted-foreground ml-auto"
                  >
                    {filteredPipelines.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredPipelines && filteredPipelines.length > 0 ? (
                filteredPipelines.map((pl) => {
                  const completedSteps = pl.steps.filter((s) => s.status === "success").length;
                  const runningSteps = pl.steps.filter((s) => s.status === "running").length;
                  const progress =
                    pl.steps.length > 0
                      ? ((completedSteps + runningSteps * 0.5) / pl.steps.length) * 100
                      : 0;
                  const isSelected = selectedId === pl.id;

                  return (
                    <div
                      key={pl.id}
                      className={`flex items-center gap-4 px-4 py-3 border-b border-border/30 last:border-0 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/5 border-l-2 border-l-primary"
                          : "hover:bg-muted/20"
                      }`}
                      onClick={() => {
                        setSelectedId(pl.id);
                        setExpandedSteps(new Set());
                      }}
                      data-testid={`pipeline-item-${pl.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{pl.name}</span>
                          <WorkflowStatusBadge status={pl.status} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {pl.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[9px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-2.5 w-2.5" />
                            {pl.branch}
                          </span>
                          <span className="font-mono">{pl.commit}</span>
                          <span className="flex items-center gap-1">
                            <User className="h-2.5 w-2.5" />
                            {pl.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDistanceToNow(new Date(pl.startedAt), { addSuffix: true })}
                          </span>
                          {pl.envVars && Object.keys(pl.envVars).length > 0 && (
                            <span className="flex items-center gap-1 text-primary/70">
                              <Variable className="h-2.5 w-2.5" />
                              {Object.keys(pl.envVars).length} vars
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-20">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                pl.status === "running"
                                  ? "bg-gradient-to-r from-primary to-accent animate-pulse"
                                  : pl.status === "failed"
                                  ? "bg-red-500"
                                  : "bg-gradient-to-r from-primary to-accent"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 transition-colors ${
                            isSelected ? "text-primary" : "text-muted-foreground/40"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <GitBranch className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground">
                    No pipelines yet. Create your first one.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Detail */}
        <div>
          {selectedPipeline ? (
            <Card className="border border-border/50 bg-card/80 backdrop-blur-sm sticky top-0">
              <CardHeader className="px-4 pt-4 pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xs font-semibold text-foreground">
                      {selectedPipeline.name}
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {selectedPipeline.description}
                    </p>
                  </div>
                  <WorkflowStatusBadge status={selectedPipeline.status} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2 rounded bg-muted/20 border border-border/30">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">
                      Duration
                    </span>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {selectedPipeline.status === "running"
                        ? "Running..."
                        : selectedPipeline.duration > 0
                        ? `${selectedPipeline.duration}s`
                        : "--"}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-muted/20 border border-border/30">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">
                      Commit
                    </span>
                    <span className="text-sm font-bold font-mono text-primary">
                      {selectedPipeline.commit}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                  Steps
                </div>
                <div className="border border-border/30 rounded-md overflow-hidden">
                  {selectedPipeline.steps.map((step) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      logs={streamLogs.get(step.id) || []}
                      isExpanded={expandedSteps.has(step.id)}
                      onToggle={() => toggleStep(step.id)}
                    />
                  ))}
                </div>

                {/* Env Vars */}
                {selectedPipeline.envVars && Object.keys(selectedPipeline.envVars).length > 0 && (
                  <EnvVarsSection envVars={selectedPipeline.envVars} />
                )}

                {/* Artifacts */}
                {artifacts && artifacts.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                      Artifacts
                    </div>
                    <div className="space-y-2">
                      {artifacts.map((art) => {
                        const iconMap: Record<string, React.ElementType> = {
                          report: FileText,
                          log: ScrollText,
                          url: ExternalLink,
                          binary: Package,
                        };
                        const ArtIcon = iconMap[art.type] || FileText;

                        let parsed: Record<string, unknown> | null = null;
                        if (art.type === "report") {
                          try { parsed = JSON.parse(art.content); } catch {}
                        }

                        return (
                          <div
                            key={art.id}
                            className="p-2 rounded bg-muted/20 border border-border/30"
                            data-testid={`artifact-${art.id}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <ArtIcon className="h-3 w-3 text-primary" />
                              <span className="text-[10px] font-semibold text-foreground">{art.name}</span>
                              <Badge variant="outline" className="text-[8px] ml-auto">
                                {art.type}
                              </Badge>
                            </div>
                            {art.type === "report" && parsed ? (
                              <div className="flex gap-3 text-[9px] text-muted-foreground">
                                {parsed.passed !== undefined && (
                                  <span className="text-emerald-400">
                                    {String(parsed.passed)} passed
                                  </span>
                                )}
                                {parsed.failed !== undefined && Number(parsed.failed) > 0 && (
                                  <span className="text-red-400">
                                    {String(parsed.failed)} failed
                                  </span>
                                )}
                                {parsed.vulnerabilities !== undefined && (
                                  <span>
                                    {String(parsed.vulnerabilities)} vulnerabilities
                                  </span>
                                )}
                                {parsed.packages_scanned !== undefined && (
                                  <span>
                                    {String(parsed.packages_scanned)} packages scanned
                                  </span>
                                )}
                              </div>
                            ) : art.type === "url" ? (
                              <a
                                href={art.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-primary hover:underline flex items-center gap-1"
                                data-testid={`artifact-link-${art.id}`}
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                                {art.content}
                              </a>
                            ) : (
                              <pre className="text-[9px] text-muted-foreground font-mono whitespace-pre-wrap max-h-20 overflow-y-auto">
                                {art.content}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  {selectedPipeline.status === "running" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                      onClick={() => cancelMutation.mutate(selectedPipeline.id)}
                      disabled={cancelMutation.isPending}
                      data-testid="button-cancel-pipeline"
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      ) : (
                        <StopCircle className="h-3 w-3 mr-1.5" />
                      )}
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => rerunMutation.mutate(selectedPipeline.id)}
                      disabled={rerunMutation.isPending}
                      data-testid="button-rerun-pipeline"
                    >
                      {rerunMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3 mr-1.5" />
                      )}
                      Rerun
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => deleteMutation.mutate(selectedPipeline.id)}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-pipeline"
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <GitBranch className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground">
                  Select a pipeline to view details
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

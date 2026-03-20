import { useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import type {
  ContextWindow,
  SubAgent,
  SharedWorkspaceFile,
  AgentMemoryEntry,
  ContextHandoff,
  OrchestrationStats,
  ObsidianVaultConfig,
  VaultNote,
  ContextSession,
  SkillMarketplaceItem,
} from "@shared/schema";
import {
  Brain,
  RefreshCw,
  Loader2,
  Search,
  Folder,
  FileText,
  Link2,
  ArrowRight,
  Wifi,
  WifiOff,
  Settings2,
  Hash,
  ChevronRight,
  Store,
  Plug,
  Network,
  BookOpen,
  Tag,
  Clock,
  Zap,
  Activity,
  GitBranch,
  Database,
  CheckCircle,
  AlertTriangle,
  Cpu,
  MemoryStick,
  ArrowLeftRight,
  Plus,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Bot,
  Layers,
  HardDrive,
  Sparkles,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ─── Styling constants ───────────────────────────────────────────────────────

const trustColors: Record<string, string> = {
  canonical: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  working: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  stale: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  contested: "bg-red-500/15 text-red-400 border-red-500/30",
};

const trustNodeColors: Record<string, string> = {
  canonical: "#22c55e",
  working: "#3b82f6",
  stale: "#f59e0b",
  contested: "#ef4444",
};

const subagentStatusColors: Record<string, string> = {
  spawning: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  running: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const healthColors: Record<string, string> = {
  healthy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  overflow: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const fileTypeColors: Record<string, string> = {
  data: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  config: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  result: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  log: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const memoryTypeColors: Record<string, string> = {
  fact: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  preference: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  project: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  conversation: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const handoffTypeColors: Record<string, string> = {
  delegation: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  result: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  file_share: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  context_summary: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SubagentRow({ agent }: { agent: SubAgent }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/orchestrator/subagents/${agent.id}/status`, {
        status: "cancelled",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/subagents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/stats"] });
      toast({ title: "Subagent cancelled" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <>
      <TableRow
        className="border-border/20 cursor-pointer hover:bg-muted/10 transition-colors"
        onClick={() => setExpanded((p) => !p)}
        data-testid={`subagent-row-${agent.id}`}
      >
        <TableCell className="text-[10px] font-medium text-foreground">
          <div className="flex items-center gap-1.5">
            <Bot className="h-3 w-3 text-cyan-400 shrink-0" />
            {agent.agentName}
          </div>
        </TableCell>
        <TableCell className="text-[10px] text-muted-foreground max-w-[160px]">
          <span className="truncate block">{agent.objective}</span>
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={`text-[8px] ${subagentStatusColors[agent.status] ?? ""} ${
              agent.status === "running" ? "animate-pulse" : ""
            }`}
          >
            {agent.status}
          </Badge>
        </TableCell>
        <TableCell className="text-[9px] text-muted-foreground font-mono">{agent.model}</TableCell>
        <TableCell className="text-[9px] text-muted-foreground">
          {formatTokens(agent.inputTokens)} / {formatTokens(agent.outputTokens)}
        </TableCell>
        <TableCell className="text-[9px] text-muted-foreground">
          {agent.duration > 0 ? formatDuration(agent.duration) : "—"}
        </TableCell>
        <TableCell className="text-[9px] text-muted-foreground">
          {agent.workspaceFiles.length}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            {(agent.status === "running" || agent.status === "spawning") && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[9px] px-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  cancelMutation.mutate();
                }}
                disabled={cancelMutation.isPending}
                data-testid={`cancel-subagent-${agent.id}`}
              >
                Cancel
              </Button>
            )}
            {expanded ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="border-border/10 bg-muted/5">
          <TableCell colSpan={8} className="py-3 px-4">
            <div className="space-y-3">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                  Full Objective
                </p>
                <p className="text-[10px] text-foreground leading-relaxed">{agent.objective}</p>
              </div>
              {agent.result && (
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-emerald-400 mb-1">
                    Result
                  </p>
                  <p className="text-[10px] text-foreground leading-relaxed whitespace-pre-wrap">
                    {agent.result}
                  </p>
                </div>
              )}
              {agent.error && (
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-red-400 mb-1">Error</p>
                  <p className="text-[10px] text-red-300 font-mono">{agent.error}</p>
                </div>
              )}
              {agent.workspaceFiles.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                    Workspace Files
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {agent.workspaceFiles.map((f) => (
                      <Badge
                        key={f}
                        variant="outline"
                        className="text-[8px] border-border/40 text-muted-foreground font-mono"
                      >
                        <FileText className="h-2.5 w-2.5 mr-0.5" />
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 text-[9px] text-muted-foreground">
                <span>Spawned: {new Date(agent.spawnedAt).toLocaleString()}</span>
                {agent.completedAt && (
                  <span>Completed: {new Date(agent.completedAt).toLocaleString()}</span>
                )}
                <span>Parent: {agent.parentAgentId}</span>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ContextWindowCard({
  window: cw,
}: {
  window: ContextWindow;
}) {
  const { toast } = useToast();
  const [compressionEnabled, setCompressionEnabled] = useState(cw.compressionEnabled);
  const [threshold, setThreshold] = useState([cw.autoSummarizeThreshold]);

  const utilization = cw.maxTokens > 0 ? (cw.usedTokens / cw.maxTokens) * 100 : 0;
  const reservedPct = cw.maxTokens > 0 ? (cw.reservedTokens / cw.maxTokens) * 100 : 0;

  const barColor =
    utilization >= 80 ? "bg-red-500" : utilization >= 60 ? "bg-amber-500" : "bg-teal-500";

  const updateMutation = useMutation({
    mutationFn: async (data: {
      compressionEnabled?: boolean;
      autoSummarizeThreshold?: number;
    }) => {
      const res = await apiRequest("PATCH", `/api/orchestrator/context-windows/${cw.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/context-windows"] });
      toast({ title: "Context window updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const compressMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/orchestrator/context-windows/${cw.id}`, {
        compressionEnabled: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/context-windows"] });
      toast({ title: "Compression triggered", description: `${cw.agentName} context compressed` });
    },
  });

  return (
    <Card
      className="border border-border/50 bg-card/80"
      data-testid={`context-window-${cw.id}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-foreground">{cw.agentName}</span>
          </div>
          <Badge
            variant="outline"
            className={`text-[8px] ${healthColors[cw.healthStatus] ?? ""}`}
          >
            {cw.healthStatus}
          </Badge>
        </div>

        {/* Token counts */}
        <div className="flex items-baseline justify-between text-[9px] text-muted-foreground">
          <span>
            <span className="text-foreground font-medium">{formatTokens(cw.usedTokens)}</span>{" "}
            used
          </span>
          <span>
            <span className="text-purple-400 font-medium">{formatTokens(cw.reservedTokens)}</span>{" "}
            reserved
          </span>
          <span>
            <span className="text-foreground font-medium">{formatTokens(cw.maxTokens)}</span> max
          </span>
        </div>

        {/* Stacked bar: used (teal) | reserved (purple) | free (dark) */}
        <div className="h-2.5 rounded-full overflow-hidden bg-muted/30 flex">
          <div
            className={`h-full ${barColor} transition-all`}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
          <div
            className="h-full bg-purple-500/60 transition-all"
            style={{ width: `${Math.min(reservedPct, 100 - Math.min(utilization, 100))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[8px] text-muted-foreground">
          <span>{utilization.toFixed(1)}% utilized</span>
          {cw.lastCompressedAt && (
            <span>Compressed {formatRelative(cw.lastCompressedAt)}</span>
          )}
        </div>

        {/* Compression toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] text-muted-foreground">Auto-Compress</span>
          </div>
          <Switch
            checked={compressionEnabled}
            onCheckedChange={(v) => {
              setCompressionEnabled(v);
              updateMutation.mutate({ compressionEnabled: v });
            }}
            className="scale-75"
            data-testid={`compression-toggle-${cw.id}`}
          />
        </div>

        {/* Auto-summarize threshold */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span>Auto-summarize at</span>
            <span className="text-foreground">{threshold[0]}%</span>
          </div>
          <Slider
            value={threshold}
            onValueChange={(v) => {
              setThreshold(v);
              updateMutation.mutate({ autoSummarizeThreshold: v[0] });
            }}
            min={50}
            max={100}
            step={5}
            className="h-1"
            data-testid={`threshold-slider-${cw.id}`}
          />
        </div>

        {/* Compress Now */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[9px] w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
          onClick={() => compressMutation.mutate()}
          disabled={compressMutation.isPending}
          data-testid={`compress-now-${cw.id}`}
        >
          {compressMutation.isPending ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Compress Now
        </Button>
      </CardContent>
    </Card>
  );
}

function MemoryEntryCard({ entry, onDelete }: { entry: AgentMemoryEntry; onDelete: () => void }) {
  const confidencePct = Math.round(entry.confidence * 100);
  const confidenceColor =
    entry.confidence >= 0.8
      ? "bg-emerald-500"
      : entry.confidence >= 0.5
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <Card
      className="border border-border/50 bg-card/80"
      data-testid={`memory-entry-${entry.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={`text-[8px] ${memoryTypeColors[entry.memoryType] ?? ""}`}
            >
              {entry.memoryType}
            </Badge>
            <span className="text-[9px] text-muted-foreground font-mono">{entry.agentId}</span>
          </div>
          <button
            className="text-muted-foreground hover:text-red-400 transition-colors"
            onClick={onDelete}
            data-testid={`delete-memory-${entry.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        <p className="text-[10px] text-foreground leading-relaxed">{entry.content}</p>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          <span>Source: {entry.source}</span>
          <span>·</span>
          <span>{entry.accessCount}x accessed</span>
          {entry.expiresAt && (
            <>
              <span>·</span>
              <span>Expires {formatRelative(entry.expiresAt)}</span>
            </>
          )}
        </div>
        {/* Confidence bar */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[8px] text-muted-foreground">
            <span>Confidence</span>
            <span className={confidencePct >= 80 ? "text-emerald-400" : confidencePct >= 50 ? "text-amber-400" : "text-red-400"}>
              {confidencePct}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
            <div
              className={`h-full ${confidenceColor} transition-all`}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ContextPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // ── Main tab + vault sub-tab ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");
  const [vaultSubTab, setVaultSubTab] = useState("overview");

  // ── Vault state ───────────────────────────────────────────────────────────
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteSearch, setNoteSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [connectVaultPath, setConnectVaultPath] = useState("");
  const [connectSyncMethod, setConnectSyncMethod] = useState<string>("local");
  const [tokenBudget, setTokenBudget] = useState<number[]>([32000]);
  const [retrievalStrategy, setRetrievalStrategy] = useState("");

  // ── Subagents state ───────────────────────────────────────────────────────
  const [spawnDialogOpen, setSpawnDialogOpen] = useState(false);
  const [spawnParentId, setSpawnParentId] = useState("");
  const [spawnName, setSpawnName] = useState("");
  const [spawnObjective, setSpawnObjective] = useState("");
  const [spawnModel, setSpawnModel] = useState("claude-sonnet-4-6");

  // ── Workspace state ───────────────────────────────────────────────────────
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadPath, setUploadPath] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState<"data" | "config" | "result" | "intermediate" | "log">("data");
  const [uploadCreatedBy, setUploadCreatedBy] = useState("");

  // ── Memory state ──────────────────────────────────────────────────────────
  const [memoryAgentFilter, setMemoryAgentFilter] = useState<string>("all");
  const [memoryTypeFilter, setMemoryTypeFilter] = useState<string>("all");
  const [addMemoryDialogOpen, setAddMemoryDialogOpen] = useState(false);
  const [memoryAgentId, setMemoryAgentId] = useState("");
  const [memoryType, setMemoryType] = useState<"fact" | "preference" | "project" | "conversation">("fact");
  const [memoryContent, setMemoryContent] = useState("");
  const [memorySource, setMemorySource] = useState("");

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: stats, isLoading: statsLoading } = useQuery<OrchestrationStats>({
    queryKey: ["/api/orchestrator/stats"],
    refetchInterval: 5000,
  });

  const { data: subagents, isLoading: subagentsLoading } = useQuery<SubAgent[]>({
    queryKey: ["/api/orchestrator/subagents"],
    refetchInterval: 5000,
  });

  const { data: contextWindows, isLoading: windowsLoading } = useQuery<ContextWindow[]>({
    queryKey: ["/api/orchestrator/context-windows"],
    refetchInterval: 10000,
  });

  const { data: workspaceFiles, isLoading: workspaceLoading } = useQuery<SharedWorkspaceFile[]>({
    queryKey: ["/api/orchestrator/workspace"],
    refetchInterval: 10000,
  });

  const { data: memoryEntries, isLoading: memoryLoading } = useQuery<AgentMemoryEntry[]>({
    queryKey: ["/api/orchestrator/memory", memoryAgentFilter],
    queryFn: async () => {
      const url =
        memoryAgentFilter !== "all"
          ? `/api/orchestrator/memory?agentId=${memoryAgentFilter}`
          : "/api/orchestrator/memory";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: handoffs, isLoading: handoffsLoading } = useQuery<ContextHandoff[]>({
    queryKey: ["/api/orchestrator/handoffs"],
    refetchInterval: 5000,
  });

  // Vault queries
  const { data: vaultConfig, isLoading: configLoading } = useQuery<ObsidianVaultConfig | null>({
    queryKey: ["/api/context/vault"],
    refetchInterval: 10000,
  });

  const { data: notes, isLoading: notesLoading } = useQuery<VaultNote[]>({
    queryKey: ["/api/context/notes"],
    enabled: !!vaultConfig?.connected,
  });

  const { data: sessions } = useQuery<ContextSession[]>({
    queryKey: ["/api/context/sessions"],
    enabled: !!vaultConfig?.connected,
  });

  const { data: graphData } = useQuery<{ nodes: Node[]; edges: Edge[] }>({
    queryKey: ["/api/context/graph"],
    enabled: !!vaultConfig?.connected,
  });

  const { data: skills } = useQuery<SkillMarketplaceItem[]>({
    queryKey: ["/api/marketplace/skills"],
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const spawnMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/orchestrator/subagents", {
        parentAgentId: spawnParentId,
        agentName: spawnName,
        objective: spawnObjective,
        model: spawnModel,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/subagents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/stats"] });
      setSpawnDialogOpen(false);
      setSpawnParentId("");
      setSpawnName("");
      setSpawnObjective("");
      setSpawnModel("claude-sonnet-4-6");
      toast({ title: "Subagent spawned", description: `${spawnName} is starting up` });
    },
    onError: (err: Error) => {
      toast({ title: "Error spawning subagent", description: err.message, variant: "destructive" });
    },
  });

  const createWorkspaceFileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/orchestrator/workspace", {
        path: uploadPath,
        name: uploadName,
        type: uploadType,
        createdBy: uploadCreatedBy,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/workspace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/stats"] });
      setUploadDialogOpen(false);
      setUploadPath("");
      setUploadName("");
      setUploadCreatedBy("");
      toast({ title: "File entry created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteWorkspaceFileMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/orchestrator/workspace/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/workspace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/stats"] });
      toast({ title: "File removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addMemoryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/orchestrator/memory", {
        agentId: memoryAgentId,
        memoryType,
        content: memoryContent,
        source: memorySource,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/memory", memoryAgentFilter] });
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/stats"] });
      setAddMemoryDialogOpen(false);
      setMemoryAgentId("");
      setMemoryContent("");
      setMemorySource("");
      toast({ title: "Memory entry added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMemoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/orchestrator/memory/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/memory", memoryAgentFilter] });
      queryClient.invalidateQueries({ queryKey: ["/api/orchestrator/stats"] });
      toast({ title: "Memory entry deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Vault mutations
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/context/vault/sync");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/context/vault"] });
      toast({ title: "Vault synced", description: "Notes are up to date" });
    },
  });

  const connectMutation = useMutation({
    mutationFn: async ({ vaultPath, syncMethod }: { vaultPath: string; syncMethod: string }) => {
      const res = await apiRequest("POST", "/api/marketplace/skills/skill-013/install-obsidian", {
        vaultPath,
        syncMethod,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/context/vault"] });
      queryClient.invalidateQueries({ queryKey: ["/api/context/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/context/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/context/graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/skills"] });
      setConnectVaultPath("");
      toast({ title: "Vault connected", description: "Obsidian vault is now linked" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", "/api/context/vault", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/context/vault"] });
      toast({ title: "Settings updated" });
    },
  });

  // ─── Derived data ─────────────────────────────────────────────────────────

  const obsidianSkill = skills?.find((s) => s.id === "skill-013");
  const isInstalled = obsidianSkill?.installed ?? false;
  const isConnected = vaultConfig?.connected ?? false;

  const folders = useMemo(() => {
    if (!notes) return [];
    const set = new Set(notes.map((n) => n.folder));
    return Array.from(set).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    return notes.filter((n) => {
      if (folderFilter && n.folder !== folderFilter) return false;
      if (
        noteSearch &&
        !n.title.toLowerCase().includes(noteSearch.toLowerCase()) &&
        !n.tags.some((t) => t.includes(noteSearch.toLowerCase()))
      )
        return false;
      return true;
    });
  }, [notes, folderFilter, noteSearch]);

  const selectedNote = useMemo(
    () => notes?.find((n) => n.id === selectedNoteId),
    [notes, selectedNoteId]
  );

  const styledNodes = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes.map((node) => ({
      ...node,
      style: {
        background: `${trustNodeColors[node.data.trustState as string] || "#3b82f6"}20`,
        border: `2px solid ${trustNodeColors[node.data.trustState as string] || "#3b82f6"}`,
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: node.data.isStructureNote ? "12px" : "10px",
        fontWeight: node.data.isStructureNote ? 700 : 500,
        color: "#e2e8f0",
        width: node.data.isStructureNote ? 180 : 140,
        fontFamily: "'JetBrains Mono', monospace",
      },
    }));
  }, [graphData?.nodes]);

  const styledEdges = useMemo(() => {
    if (!graphData?.edges) return [];
    return graphData.edges.map((edge) => ({
      ...edge,
      style: { stroke: "hsl(173 80% 40% / 0.4)", strokeWidth: 1.5 },
    }));
  }, [graphData?.edges]);

  const graphStats = useMemo(() => {
    if (!notes) return { nodes: 0, edges: 0, avgConnections: "0", orphans: 0 };
    const totalEdges = notes.reduce((sum, n) => sum + n.links.length, 0) / 2;
    const avgConnections =
      notes.length > 0
        ? (
            notes.reduce((sum, n) => sum + n.links.length + n.backlinks.length, 0) / notes.length
          ).toFixed(1)
        : "0";
    const orphans = notes.filter((n) => n.links.length === 0 && n.backlinks.length === 0).length;
    return { nodes: notes.length, edges: Math.round(totalEdges), avgConnections, orphans };
  }, [notes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNoteId(node.id);
      setVaultSubTab("notes");
    },
    []
  );

  // Unique agent IDs from subagents for filters
  const agentIds = useMemo(() => {
    const ids = new Set<string>();
    subagents?.forEach((a) => ids.add(a.parentAgentId));
    memoryEntries?.forEach((m) => ids.add(m.agentId));
    return Array.from(ids);
  }, [subagents, memoryEntries]);

  // Filtered memory entries
  const filteredMemory = useMemo(() => {
    if (!memoryEntries) return [];
    return memoryEntries.filter((m) => {
      if (memoryTypeFilter !== "all" && m.memoryType !== memoryTypeFilter) return false;
      return true;
    });
  }, [memoryEntries, memoryTypeFilter]);

  // Recent handoffs (last 5)
  const recentHandoffs = useMemo(() => {
    if (!handoffs) return [];
    return [...handoffs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
  }, [handoffs]);

  // Active subagents for overview
  const activeSubagents = useMemo(
    () => subagents?.filter((a) => a.status === "running" || a.status === "spawning") ?? [],
    [subagents]
  );

  // Context health summary
  const windowHealthSummary = useMemo(() => {
    if (!contextWindows) return { healthy: 0, warning: 0, critical: 0, overflow: 0 };
    return contextWindows.reduce(
      (acc, w) => {
        acc[w.healthStatus] = (acc[w.healthStatus] ?? 0) + 1;
        return acc;
      },
      { healthy: 0, warning: 0, critical: 0, overflow: 0 } as Record<string, number>
    );
  }, [contextWindows]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Context Orchestrator" subtitle="Multi-agent context management">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Brain className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Context Orchestrator</h1>
            <p className="text-[10px] text-muted-foreground">
              Agent lifecycle · Context windows · Shared memory
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <Badge
              variant="outline"
              className={`text-[9px] ${
                stats.activeSubAgents > 0
                  ? "bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse"
                  : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
              }`}
            >
              <Activity className="h-2.5 w-2.5 mr-1" />
              {stats.activeSubAgents} active
            </Badge>
          )}
          <button
            className="text-[10px] text-primary hover:underline"
            onClick={() => setLocation("/marketplace")}
            data-testid="link-marketplace"
          >
            Marketplace
          </button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/20 border border-border/30 mb-4">
          <TabsTrigger value="overview" className="text-[10px]" data-testid="tab-overview">
            <Sparkles className="h-3 w-3 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="subagents" className="text-[10px]" data-testid="tab-subagents">
            <Bot className="h-3 w-3 mr-1.5" />
            Subagents
          </TabsTrigger>
          <TabsTrigger value="context-windows" className="text-[10px]" data-testid="tab-context-windows">
            <Cpu className="h-3 w-3 mr-1.5" />
            Context Windows
          </TabsTrigger>
          <TabsTrigger value="workspace" className="text-[10px]" data-testid="tab-workspace">
            <HardDrive className="h-3 w-3 mr-1.5" />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="memory" className="text-[10px]" data-testid="tab-memory">
            <MemoryStick className="h-3 w-3 mr-1.5" />
            Memory
          </TabsTrigger>
          <TabsTrigger value="vault" className="text-[10px]" data-testid="tab-vault">
            <Brain className="h-3 w-3 mr-1.5" />
            Vault
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW                                                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview">
          <div className="space-y-5">
            {/* Stats row */}
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="border border-border/50 bg-card/80">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot className="h-3 w-3 text-blue-400" />
                      <p className="text-[10px] text-muted-foreground">Active Subagents</p>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {stats?.activeSubAgents ?? 0}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      of {stats?.totalSubAgentsSpawned ?? 0} total
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-border/50 bg-card/80">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="h-3 w-3 text-amber-400" />
                      <p className="text-[10px] text-muted-foreground">Total Tokens Used</p>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {formatTokens(stats?.totalTokensUsed ?? 0)}
                    </p>
                    <p className="text-[9px] text-muted-foreground">across all agents</p>
                  </CardContent>
                </Card>
                <Card className="border border-border/50 bg-card/80">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <RefreshCw className="h-3 w-3 text-emerald-400" />
                      <p className="text-[10px] text-muted-foreground">Tokens Saved</p>
                    </div>
                    <p className="text-xl font-bold text-emerald-400">
                      {formatTokens(stats?.totalTokensSaved ?? 0)}
                    </p>
                    <p className="text-[9px] text-muted-foreground">via compression</p>
                  </CardContent>
                </Card>
                <Card className="border border-border/50 bg-card/80">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Activity className="h-3 w-3 text-cyan-400" />
                      <p className="text-[10px] text-muted-foreground">Context Utilization</p>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {(stats?.avgContextUtilization ?? 0).toFixed(1)}%
                    </p>
                    <p className="text-[9px] text-muted-foreground">avg across windows</p>
                  </CardContent>
                </Card>
                <Card className="border border-border/50 bg-card/80">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <HardDrive className="h-3 w-3 text-purple-400" />
                      <p className="text-[10px] text-muted-foreground">Workspace Files</p>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {stats?.totalWorkspaceFiles ?? 0}
                    </p>
                    <p className="text-[9px] text-muted-foreground">shared files</p>
                  </CardContent>
                </Card>
                <Card className="border border-border/50 bg-card/80">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MemoryStick className="h-3 w-3 text-teal-400" />
                      <p className="text-[10px] text-muted-foreground">Memory Entries</p>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {stats?.totalMemoryEntries ?? 0}
                    </p>
                    <p className="text-[9px] text-muted-foreground">stored memories</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Active Operations */}
              <Card className="border border-border/50 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-blue-400" />
                    Active Operations
                    {activeSubagents.length > 0 && (
                      <Badge className="text-[8px] bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse ml-auto">
                        {activeSubagents.length} running
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {subagentsLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : activeSubagents.length === 0 ? (
                    <div className="flex flex-col items-center py-6 gap-2">
                      <Bot className="h-6 w-6 text-muted-foreground/30" />
                      <p className="text-[10px] text-muted-foreground">No active operations</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeSubagents.map((agent) => (
                        <div
                          key={agent.id}
                          className="p-2.5 rounded-lg border border-border/30 bg-blue-500/5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
                              <span className="text-[10px] font-medium text-foreground">
                                {agent.agentName}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[8px] ${subagentStatusColors[agent.status] ?? ""}`}
                            >
                              {agent.status}
                            </Badge>
                          </div>
                          <p className="text-[9px] text-muted-foreground truncate">
                            {agent.objective}
                          </p>
                          <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                            <span className="font-mono">{agent.model}</span>
                            <span>
                              {formatTokens(agent.inputTokens + agent.outputTokens)} tokens
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Handoffs timeline */}
              <Card className="border border-border/50 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <ArrowLeftRight className="h-3.5 w-3.5 text-teal-400" />
                    Recent Handoffs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {handoffsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : recentHandoffs.length === 0 ? (
                    <div className="flex flex-col items-center py-6 gap-2">
                      <ArrowLeftRight className="h-6 w-6 text-muted-foreground/30" />
                      <p className="text-[10px] text-muted-foreground">No handoffs yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentHandoffs.map((handoff) => (
                        <div
                          key={handoff.id}
                          className="flex items-center gap-2 p-2 rounded border border-border/20 hover:bg-muted/10 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[80px]">
                              {handoff.fromAgentId}
                            </span>
                            <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0" />
                            <span className="text-[9px] text-foreground font-mono truncate max-w-[80px]">
                              {handoff.toAgentId}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-[7px] ${handoffTypeColors[handoff.handoffType] ?? ""}`}
                            >
                              {handoff.handoffType}
                            </Badge>
                            {handoff.tokensSaved > 0 && (
                              <span className="text-[8px] text-emerald-400">
                                -{formatTokens(handoff.tokensSaved)}
                              </span>
                            )}
                            {handoff.success ? (
                              <CheckCircle className="h-2.5 w-2.5 text-emerald-400" />
                            ) : (
                              <AlertTriangle className="h-2.5 w-2.5 text-red-400" />
                            )}
                          </div>
                          <span className="text-[8px] text-muted-foreground shrink-0">
                            {formatRelative(handoff.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Context window health summary */}
            <Card className="border border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                  Context Window Health
                  <button
                    className="ml-auto text-[9px] text-primary hover:underline"
                    onClick={() => setActiveTab("context-windows")}
                  >
                    View all
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-4 gap-3">
                  {(["healthy", "warning", "critical", "overflow"] as const).map((status) => (
                    <div key={status} className="text-center">
                      <div
                        className={`text-lg font-bold ${
                          status === "healthy"
                            ? "text-emerald-400"
                            : status === "warning"
                              ? "text-amber-400"
                              : status === "critical"
                                ? "text-red-400"
                                : "text-purple-400"
                        }`}
                      >
                        {windowHealthSummary[status] ?? 0}
                      </div>
                      <div className="text-[9px] text-muted-foreground capitalize">{status}</div>
                    </div>
                  ))}
                </div>
                {contextWindows && contextWindows.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {contextWindows.slice(0, 4).map((cw) => {
                      const pct = cw.maxTokens > 0 ? (cw.usedTokens / cw.maxTokens) * 100 : 0;
                      return (
                        <div key={cw.id} className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground w-28 truncate shrink-0">
                            {cw.agentName}
                          </span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                pct >= 80
                                  ? "bg-red-500"
                                  : pct >= 60
                                    ? "bg-amber-500"
                                    : "bg-teal-500"
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[8px] text-muted-foreground w-10 text-right shrink-0">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: SUBAGENTS                                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="subagents">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-medium text-foreground">
                  Subagents ({subagents?.length ?? 0})
                </span>
              </div>
              <Dialog open={spawnDialogOpen} onOpenChange={setSpawnDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-cyan-600 hover:bg-cyan-700 text-white"
                    data-testid="button-spawn-subagent"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Spawn Subagent
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border border-border/50 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-sm flex items-center gap-2">
                      <Bot className="h-4 w-4 text-cyan-400" />
                      Spawn Subagent
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">
                        Parent Agent
                      </label>
                      <Select value={spawnParentId} onValueChange={setSpawnParentId}>
                        <SelectTrigger
                          className="h-8 text-xs bg-muted/20 border-border/40"
                          data-testid="select-parent-agent"
                        >
                          <SelectValue placeholder="Select parent agent..." />
                        </SelectTrigger>
                        <SelectContent>
                          {agentIds.map((id) => (
                            <SelectItem key={id} value={id}>
                              {id}
                            </SelectItem>
                          ))}
                          <SelectItem value="orchestrator">orchestrator</SelectItem>
                          <SelectItem value="main-agent">main-agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">
                        Agent Name
                      </label>
                      <Input
                        placeholder="research-agent-01"
                        value={spawnName}
                        onChange={(e) => setSpawnName(e.target.value)}
                        className="h-8 text-xs bg-muted/20 border-border/40"
                        data-testid="input-spawn-name"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">
                        Objective
                      </label>
                      <Textarea
                        placeholder="Describe what this subagent should do..."
                        value={spawnObjective}
                        onChange={(e) => setSpawnObjective(e.target.value)}
                        className="text-xs bg-muted/20 border-border/40 min-h-[80px] resize-none"
                        data-testid="textarea-spawn-objective"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Model</label>
                      <Select value={spawnModel} onValueChange={setSpawnModel}>
                        <SelectTrigger
                          className="h-8 text-xs bg-muted/20 border-border/40"
                          data-testid="select-spawn-model"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4.6</SelectItem>
                          <SelectItem value="claude-opus-4-5">Claude Opus 4.5</SelectItem>
                          <SelectItem value="claude-haiku-3-5">Claude Haiku 3.5</SelectItem>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                      onClick={() => spawnMutation.mutate()}
                      disabled={
                        !spawnParentId ||
                        !spawnName ||
                        !spawnObjective ||
                        spawnMutation.isPending
                      }
                      data-testid="button-confirm-spawn"
                    >
                      {spawnMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Bot className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Spawn Subagent
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Table */}
            <Card className="border border-border/50 bg-card/80">
              <CardContent className="p-0">
                {subagentsLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30">
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Name
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Objective
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Status
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Model
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Tokens In/Out
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Duration
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Files
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subagents && subagents.length > 0 ? (
                        subagents.map((agent) => (
                          <SubagentRow key={agent.id} agent={agent} />
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center text-[10px] text-muted-foreground py-8"
                          >
                            <Bot className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                            No subagents yet. Spawn one to get started.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: CONTEXT WINDOWS                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="context-windows">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-medium text-foreground">
                  Context Windows ({contextWindows?.length ?? 0})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(["healthy", "warning", "critical", "overflow"] as const).map((status) => {
                  const count = windowHealthSummary[status] ?? 0;
                  if (count === 0) return null;
                  return (
                    <Badge
                      key={status}
                      variant="outline"
                      className={`text-[8px] ${healthColors[status]}`}
                    >
                      {count} {status}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {windowsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52 w-full" />)}
              </div>
            ) : contextWindows && contextWindows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {contextWindows.map((cw) => (
                  <ContextWindowCard key={cw.id} window={cw} />
                ))}
              </div>
            ) : (
              <Card className="border border-border/50 bg-card/80">
                <CardContent className="flex flex-col items-center py-12 gap-3">
                  <Cpu className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-[10px] text-muted-foreground">
                    No context windows registered yet
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: WORKSPACE                                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="workspace">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-medium text-foreground">
                  Shared Workspace ({workspaceFiles?.length ?? 0} files)
                </span>
              </div>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-purple-600 hover:bg-purple-700 text-white"
                    data-testid="button-upload-file"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add File Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border border-border/50 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-sm flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-purple-400" />
                      Add File Entry
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">
                        File Name
                      </label>
                      <Input
                        placeholder="output.json"
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        className="h-8 text-xs bg-muted/20 border-border/40"
                        data-testid="input-upload-name"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">
                        File Path
                      </label>
                      <Input
                        placeholder="/home/user/workspace/output.json"
                        value={uploadPath}
                        onChange={(e) => setUploadPath(e.target.value)}
                        className="h-8 text-xs bg-muted/20 border-border/40 font-mono"
                        data-testid="input-upload-path"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Type</label>
                      <Select
                        value={uploadType}
                        onValueChange={(v) =>
                          setUploadType(v as typeof uploadType)
                        }
                      >
                        <SelectTrigger
                          className="h-8 text-xs bg-muted/20 border-border/40"
                          data-testid="select-upload-type"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="data">Data</SelectItem>
                          <SelectItem value="config">Config</SelectItem>
                          <SelectItem value="result">Result</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="log">Log</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">
                        Created By
                      </label>
                      <Input
                        placeholder="agent-id or user"
                        value={uploadCreatedBy}
                        onChange={(e) => setUploadCreatedBy(e.target.value)}
                        className="h-8 text-xs bg-muted/20 border-border/40"
                        data-testid="input-upload-created-by"
                      />
                    </div>
                    <Button
                      className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => createWorkspaceFileMutation.mutate()}
                      disabled={
                        !uploadName || !uploadPath || createWorkspaceFileMutation.isPending
                      }
                      data-testid="button-confirm-upload"
                    >
                      {createWorkspaceFileMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Add Entry
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* File table */}
            <Card className="border border-border/50 bg-card/80">
              <CardContent className="p-0">
                {workspaceLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30">
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Name
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Path
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Type
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Size
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Created By
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Accesses
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Updated
                        </TableHead>
                        <TableHead className="text-[9px] h-8 font-medium text-muted-foreground">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workspaceFiles && workspaceFiles.length > 0 ? (
                        workspaceFiles.map((file) => {
                          const FileIcon =
                            file.type === "data"
                              ? Database
                              : file.type === "config"
                                ? Settings2
                                : file.type === "result"
                                  ? CheckCircle
                                  : file.type === "intermediate"
                                    ? GitBranch
                                    : FileText;
                          return (
                            <TableRow
                              key={file.id}
                              className="border-border/20"
                              data-testid={`workspace-file-${file.id}`}
                            >
                              <TableCell className="text-[10px] font-medium text-foreground">
                                <div className="flex items-center gap-1.5">
                                  <FileIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                  {file.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-[9px] text-muted-foreground font-mono max-w-[160px]">
                                <span className="truncate block">{file.path}</span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[8px] ${fileTypeColors[file.type] ?? ""}`}
                                >
                                  {file.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-[9px] text-muted-foreground">
                                {formatBytes(file.size)}
                              </TableCell>
                              <TableCell className="text-[9px] text-muted-foreground font-mono">
                                {file.createdBy}
                              </TableCell>
                              <TableCell className="text-[9px] text-muted-foreground text-center">
                                {file.accessCount}
                              </TableCell>
                              <TableCell className="text-[9px] text-muted-foreground">
                                {formatRelative(file.updatedAt)}
                              </TableCell>
                              <TableCell>
                                <button
                                  className="text-muted-foreground hover:text-red-400 transition-colors"
                                  onClick={() => deleteWorkspaceFileMutation.mutate(file.id)}
                                  disabled={deleteWorkspaceFileMutation.isPending}
                                  data-testid={`delete-file-${file.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center text-[10px] text-muted-foreground py-8"
                          >
                            <HardDrive className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                            No shared workspace files yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: MEMORY                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="memory">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MemoryStick className="h-4 w-4 text-teal-400" />
                <span className="text-xs font-medium text-foreground">
                  Agent Memory ({filteredMemory.length} entries)
                </span>
              </div>
              <Dialog open={addMemoryDialogOpen} onOpenChange={setAddMemoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-teal-600 hover:bg-teal-700 text-white"
                    data-testid="button-add-memory"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Memory
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border border-border/50 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-sm flex items-center gap-2">
                      <MemoryStick className="h-4 w-4 text-teal-400" />
                      Add Memory Entry
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">
                        Agent ID
                      </label>
                      <Input
                        placeholder="agent-id"
                        value={memoryAgentId}
                        onChange={(e) => setMemoryAgentId(e.target.value)}
                        className="h-8 text-xs bg-muted/20 border-border/40"
                        data-testid="input-memory-agent-id"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Type</label>
                      <Select
                        value={memoryType}
                        onValueChange={(v) => setMemoryType(v as typeof memoryType)}
                      >
                        <SelectTrigger
                          className="h-8 text-xs bg-muted/20 border-border/40"
                          data-testid="select-memory-type"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fact">Fact</SelectItem>
                          <SelectItem value="preference">Preference</SelectItem>
                          <SelectItem value="project">Project</SelectItem>
                          <SelectItem value="conversation">Conversation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">
                        Content
                      </label>
                      <Textarea
                        placeholder="Memory content..."
                        value={memoryContent}
                        onChange={(e) => setMemoryContent(e.target.value)}
                        className="text-xs bg-muted/20 border-border/40 min-h-[80px] resize-none"
                        data-testid="textarea-memory-content"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">
                        Source
                      </label>
                      <Input
                        placeholder="conversation-id or task name"
                        value={memorySource}
                        onChange={(e) => setMemorySource(e.target.value)}
                        className="h-8 text-xs bg-muted/20 border-border/40"
                        data-testid="input-memory-source"
                      />
                    </div>
                    <Button
                      className="w-full text-xs bg-teal-600 hover:bg-teal-700 text-white"
                      onClick={() => addMemoryMutation.mutate()}
                      disabled={
                        !memoryAgentId ||
                        !memoryContent ||
                        addMemoryMutation.isPending
                      }
                      data-testid="button-confirm-add-memory"
                    >
                      {addMemoryMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Add Memory
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-muted-foreground">Agent:</label>
                <Select value={memoryAgentFilter} onValueChange={setMemoryAgentFilter}>
                  <SelectTrigger
                    className="h-7 text-[10px] bg-muted/20 border-border/40 w-36"
                    data-testid="select-memory-agent-filter"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agentIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Memory type tabs */}
              <div className="flex items-center gap-1 bg-muted/20 border border-border/30 rounded-md p-0.5">
                {(["all", "fact", "preference", "project", "conversation"] as const).map(
                  (type) => (
                    <button
                      key={type}
                      className={`px-2 py-1 rounded text-[9px] capitalize transition-colors ${
                        memoryTypeFilter === type
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setMemoryTypeFilter(type)}
                      data-testid={`memory-type-filter-${type}`}
                    >
                      {type}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Memory cards */}
            {memoryLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
              </div>
            ) : filteredMemory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredMemory.map((entry) => (
                  <MemoryEntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={() => deleteMemoryMutation.mutate(entry.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border border-border/50 bg-card/80">
                <CardContent className="flex flex-col items-center py-12 gap-3">
                  <MemoryStick className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-[10px] text-muted-foreground">No memory entries found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB 6: VAULT (Obsidian)                                           */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="vault">
          {/* Header row with status */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-muted-foreground">
                Obsidian Vault v{obsidianSkill?.version ?? "1.0.0"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Wifi className="h-2.5 w-2.5 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/30">
                  <WifiOff className="h-2.5 w-2.5 mr-1" />
                  Disconnected
                </Badge>
              )}
            </div>
            <button
              className="text-[10px] text-primary hover:underline ml-auto"
              onClick={() => setLocation("/marketplace")}
              data-testid="link-back-marketplace"
            >
              View in Marketplace
            </button>
          </div>

          {/* Not installed state */}
          {!isInstalled && !isConnected && !configLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <Brain className="h-12 w-12 text-cyan-400" />
              </div>
              <div className="text-center max-w-md">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Obsidian Vault Not Installed
                </h2>
                <p className="text-xs text-muted-foreground mb-6">
                  Connect your Obsidian vault for Zettelkasten-based context management. Search,
                  retrieve, and feed notes to your agents.
                </p>
              </div>
              <Card className="w-full max-w-md border border-border/50 bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Plug className="h-4 w-4 text-cyan-400" />
                    Connect Vault
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">
                      Vault Path
                    </label>
                    <Input
                      placeholder="/path/to/your/vault"
                      value={connectVaultPath}
                      onChange={(e) => setConnectVaultPath(e.target.value)}
                      className="h-8 text-xs bg-muted/20 border-border/40"
                      data-testid="input-vault-path"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">
                      Sync Method
                    </label>
                    <Select value={connectSyncMethod} onValueChange={setConnectSyncMethod}>
                      <SelectTrigger
                        className="h-8 text-xs bg-muted/20 border-border/40"
                        data-testid="select-sync-method"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="obsidian-sync">Obsidian Sync</SelectItem>
                        <SelectItem value="github">GitHub</SelectItem>
                        <SelectItem value="icloud">iCloud</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                    onClick={() => {
                      if (connectVaultPath) {
                        connectMutation.mutate({
                          vaultPath: connectVaultPath,
                          syncMethod: connectSyncMethod,
                        });
                      }
                    }}
                    disabled={!connectVaultPath || connectMutation.isPending}
                    data-testid="button-connect-vault"
                  >
                    {connectMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Plug className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Connect & Install
                  </Button>
                  <div className="text-center">
                    <button
                      className="text-[10px] text-primary hover:underline"
                      onClick={() => setLocation("/marketplace")}
                      data-testid="link-marketplace-vault"
                    >
                      Or browse the Marketplace
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Vault loaded — sub-tabs */}
          {(isInstalled || isConnected) && (
            <Tabs value={vaultSubTab} onValueChange={setVaultSubTab}>
              <TabsList className="bg-muted/20 border border-border/30 mb-4">
                <TabsTrigger value="overview" className="text-[10px]" data-testid="vault-tab-overview">
                  <BookOpen className="h-3 w-3 mr-1.5" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-[10px]" data-testid="vault-tab-notes">
                  <FileText className="h-3 w-3 mr-1.5" />
                  Notes Browser
                </TabsTrigger>
                <TabsTrigger value="graph" className="text-[10px]" data-testid="vault-tab-graph">
                  <Network className="h-3 w-3 mr-1.5" />
                  Knowledge Graph
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-[10px]" data-testid="vault-tab-settings">
                  <Settings2 className="h-3 w-3 mr-1.5" />
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* ── Vault Overview ── */}
              <TabsContent value="overview">
                <div className="space-y-4">
                  {/* Connection card */}
                  <Card className="border border-border/50 bg-card/80">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                            <Brain className="h-5 w-5 text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground">
                              {vaultConfig?.vaultPath}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Sync: {vaultConfig?.syncMethod} · Last synced:{" "}
                              {vaultConfig?.lastSynced
                                ? new Date(vaultConfig.lastSynced).toLocaleString()
                                : "Never"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] border-primary/40 text-primary hover:bg-primary/10"
                            onClick={() => syncMutation.mutate()}
                            disabled={syncMutation.isPending}
                            data-testid="button-sync-vault"
                          >
                            {syncMutation.isPending ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-1" />
                            )}
                            Sync Now
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={() => setVaultSubTab("settings")}
                            data-testid="button-goto-settings"
                          >
                            <Settings2 className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="border border-border/50 bg-card/80">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-muted-foreground">Total Notes</p>
                        <p className="text-lg font-bold text-foreground">
                          {vaultConfig?.totalNotes ?? 0}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border border-border/50 bg-card/80">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-muted-foreground">Total Links</p>
                        <p className="text-lg font-bold text-foreground">
                          {vaultConfig?.totalLinks ?? 0}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border border-border/50 bg-card/80">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-muted-foreground">Token Budget</p>
                        <p className="text-lg font-bold text-foreground">
                          {((vaultConfig?.tokenBudget ?? 0) / 1000).toFixed(0)}K
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border border-border/50 bg-card/80">
                      <CardContent className="p-3">
                        <p className="text-[10px] text-muted-foreground">Active Sessions</p>
                        <p className="text-lg font-bold text-foreground">
                          {sessions?.filter((s) => s.status === "active").length ?? 0}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent notes quick list */}
                  <Card className="border border-border/50 bg-card/80">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        Recent Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-1.5">
                        {notes?.slice(0, 5).map((note) => (
                          <button
                            key={note.id}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 transition-colors text-left"
                            onClick={() => {
                              setSelectedNoteId(note.id);
                              setVaultSubTab("notes");
                            }}
                            data-testid={`overview-note-${note.id}`}
                          >
                            <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-[10px] text-foreground truncate flex-1">
                              {note.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[8px] ${trustColors[note.trustState]}`}
                            >
                              {note.trustState}
                            </Badge>
                            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ── Notes Browser ── */}
              <TabsContent value="notes">
                <div className="flex gap-4" style={{ minHeight: "500px" }}>
                  {/* Folder tree */}
                  <div className="w-48 shrink-0 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
                      Folders
                    </p>
                    <button
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] transition-colors ${
                        folderFilter === null
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                      }`}
                      onClick={() => setFolderFilter(null)}
                      data-testid="folder-all"
                    >
                      <Folder className="h-3 w-3" />
                      All Notes ({notes?.length ?? 0})
                    </button>
                    {folders.map((folder) => (
                      <button
                        key={folder}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] transition-colors ${
                          folderFilter === folder
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                        }`}
                        onClick={() => setFolderFilter(folder)}
                        data-testid={`folder-${folder}`}
                      >
                        <Folder className="h-3 w-3" />
                        {folder} ({notes?.filter((n) => n.folder === folder).length ?? 0})
                      </button>
                    ))}
                  </div>

                  {/* Note list + detail */}
                  <div className="flex-1 flex gap-4">
                    {/* Note list */}
                    <div className="flex-1 space-y-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search notes..."
                          value={noteSearch}
                          onChange={(e) => setNoteSearch(e.target.value)}
                          className="h-8 text-xs bg-muted/20 border-border/40 pl-8"
                          data-testid="input-note-search"
                        />
                      </div>

                      {notesLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-[460px] overflow-y-auto">
                          {filteredNotes.map((note) => (
                            <button
                              key={note.id}
                              className={`w-full text-left p-3 rounded border transition-all ${
                                selectedNoteId === note.id
                                  ? "border-primary/50 bg-primary/5"
                                  : "border-border/30 bg-card/60 hover:border-primary/30 hover:bg-card/80"
                              }`}
                              onClick={() => setSelectedNoteId(note.id)}
                              data-testid={`note-item-${note.id}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-3 w-3 text-primary shrink-0" />
                                <span className="text-[11px] font-medium text-foreground truncate">
                                  {note.title}
                                </span>
                                {note.isStructureNote && (
                                  <Badge className="text-[7px] bg-purple-500/15 text-purple-400 border-purple-500/30">
                                    Hub
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                  <Folder className="h-2.5 w-2.5" />
                                  {note.folder}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Link2 className="h-2.5 w-2.5" />
                                  {note.links.length}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Hash className="h-2.5 w-2.5" />
                                  {note.wordCount}w
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[7px] ml-auto ${trustColors[note.trustState]}`}
                                >
                                  {note.trustState}
                                </Badge>
                              </div>
                              {note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {note.tags.slice(0, 4).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="text-[7px] border-border/40 text-muted-foreground px-1 py-0"
                                    >
                                      #{tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </button>
                          ))}
                          {filteredNotes.length === 0 && (
                            <div className="text-center py-8">
                              <FileText className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                              <p className="text-[10px] text-muted-foreground">
                                No notes match your search.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Note detail panel */}
                    {selectedNote && (
                      <div className="w-72 shrink-0">
                        <Card className="border border-border/50 bg-card/80 sticky top-0">
                          <CardContent className="p-4 space-y-3">
                            <div>
                              <h3 className="text-xs font-semibold text-foreground mb-1">
                                {selectedNote.title}
                              </h3>
                              <p className="text-[9px] text-muted-foreground">{selectedNote.path}</p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <Badge
                                variant="outline"
                                className={`text-[8px] ${trustColors[selectedNote.trustState]}`}
                              >
                                {selectedNote.trustState}
                              </Badge>
                              {selectedNote.isStructureNote && (
                                <Badge className="text-[8px] bg-purple-500/15 text-purple-400 border-purple-500/30">
                                  Structure Note
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[9px]">
                              <div>
                                <p className="text-muted-foreground">Words</p>
                                <p className="text-foreground font-medium">
                                  {selectedNote.wordCount}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Modified</p>
                                <p className="text-foreground font-medium">
                                  {new Date(selectedNote.lastModified).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {/* Tags */}
                            <div>
                              <p className="text-[9px] text-muted-foreground mb-1 flex items-center gap-1">
                                <Tag className="h-2.5 w-2.5" />
                                Tags
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {selectedNote.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-[8px] border-border/40 text-muted-foreground"
                                  >
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {/* Links */}
                            <div>
                              <p className="text-[9px] text-muted-foreground mb-1 flex items-center gap-1">
                                <Link2 className="h-2.5 w-2.5" />
                                Links ({selectedNote.links.length})
                              </p>
                              <div className="space-y-0.5">
                                {selectedNote.links.map((linkId) => {
                                  const linked = notes?.find((n) => n.id === linkId);
                                  return linked ? (
                                    <button
                                      key={linkId}
                                      className="w-full text-left text-[9px] text-primary hover:underline flex items-center gap-1 py-0.5"
                                      onClick={() => setSelectedNoteId(linkId)}
                                      data-testid={`link-to-${linkId}`}
                                    >
                                      <ArrowRight className="h-2.5 w-2.5" />
                                      {linked.title}
                                    </button>
                                  ) : null;
                                })}
                              </div>
                            </div>
                            {/* Backlinks */}
                            <div>
                              <p className="text-[9px] text-muted-foreground mb-1 flex items-center gap-1">
                                <Link2 className="h-2.5 w-2.5 rotate-180" />
                                Backlinks ({selectedNote.backlinks.length})
                              </p>
                              <div className="space-y-0.5">
                                {selectedNote.backlinks.map((linkId) => {
                                  const linked = notes?.find((n) => n.id === linkId);
                                  return linked ? (
                                    <button
                                      key={linkId}
                                      className="w-full text-left text-[9px] text-cyan-400 hover:underline flex items-center gap-1 py-0.5"
                                      onClick={() => setSelectedNoteId(linkId)}
                                      data-testid={`backlink-to-${linkId}`}
                                    >
                                      <ArrowRight className="h-2.5 w-2.5 rotate-180" />
                                      {linked.title}
                                    </button>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* ── Knowledge Graph ── */}
              <TabsContent value="graph">
                <div className="relative">
                  {/* Stats overlay */}
                  <div className="absolute top-3 left-3 z-10 flex gap-2">
                    <Badge className="text-[8px] bg-card/90 text-foreground border border-border/50 backdrop-blur-sm">
                      {graphStats.nodes} nodes
                    </Badge>
                    <Badge className="text-[8px] bg-card/90 text-foreground border border-border/50 backdrop-blur-sm">
                      {graphStats.edges} edges
                    </Badge>
                    <Badge className="text-[8px] bg-card/90 text-foreground border border-border/50 backdrop-blur-sm">
                      ~{graphStats.avgConnections} avg
                    </Badge>
                    <Badge className="text-[8px] bg-card/90 text-foreground border border-border/50 backdrop-blur-sm">
                      {graphStats.orphans} orphans
                    </Badge>
                  </div>
                  {/* Legend */}
                  <div className="absolute top-3 right-3 z-10 flex gap-2">
                    {Object.entries(trustNodeColors).map(([state, color]) => (
                      <div key={state} className="flex items-center gap-1">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ background: color }}
                        />
                        <span className="text-[8px] text-muted-foreground capitalize">{state}</span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="h-[500px] border border-border/50 rounded-lg bg-card/40"
                    data-testid="knowledge-graph"
                  >
                    <ReactFlow
                      nodes={styledNodes}
                      edges={styledEdges}
                      onNodeClick={onNodeClick}
                      fitView
                      proOptions={{ hideAttribution: true }}
                    >
                      <Background color="hsl(173 80% 40% / 0.05)" gap={20} />
                      <Controls className="!bg-card !border-border/50" />
                    </ReactFlow>
                  </div>
                </div>
              </TabsContent>

              {/* ── Vault Settings ── */}
              <TabsContent value="settings">
                <div className="space-y-6 max-w-2xl">
                  {/* Token Budget */}
                  <Card className="border border-border/50 bg-card/80">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        Token Budget
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>1K</span>
                        <span className="text-foreground font-medium">
                          {(tokenBudget[0] / 1000).toFixed(0)}K tokens
                        </span>
                        <span>200K</span>
                      </div>
                      <Slider
                        value={tokenBudget}
                        onValueChange={setTokenBudget}
                        min={1000}
                        max={200000}
                        step={1000}
                        data-testid="slider-token-budget"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px]"
                        onClick={() => updateConfigMutation.mutate({ tokenBudget: tokenBudget[0] })}
                        disabled={updateConfigMutation.isPending}
                        data-testid="button-save-token-budget"
                      >
                        Save
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Retrieval Strategy */}
                  <Card className="border border-border/50 bg-card/80">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-primary" />
                        Retrieval Strategy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Select
                        value={retrievalStrategy || vaultConfig?.retrievalStrategy || "zettelkasten"}
                        onValueChange={(v) => {
                          setRetrievalStrategy(v);
                          updateConfigMutation.mutate({ retrievalStrategy: v });
                        }}
                      >
                        <SelectTrigger
                          className="h-8 text-xs bg-muted/20 border-border/40"
                          data-testid="select-retrieval-strategy"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zettelkasten">
                            Zettelkasten — Follow links from structure notes
                          </SelectItem>
                          <SelectItem value="recent">
                            Recent — Prioritize recently modified notes
                          </SelectItem>
                          <SelectItem value="relevant">
                            Relevant — Semantic similarity search
                          </SelectItem>
                          <SelectItem value="manual">
                            Manual — Explicitly selected notes only
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[9px] text-muted-foreground">
                        {(retrievalStrategy || vaultConfig?.retrievalStrategy) === "zettelkasten" &&
                          "Traverses the Zettelkasten link graph starting from structure notes. Best for well-connected vaults."}
                        {(retrievalStrategy || vaultConfig?.retrievalStrategy) === "recent" &&
                          "Prioritizes recently modified notes. Good for active projects with frequently updated notes."}
                        {(retrievalStrategy || vaultConfig?.retrievalStrategy) === "relevant" &&
                          "Uses semantic similarity to find the most relevant notes. Best for large, diverse vaults."}
                        {(retrievalStrategy || vaultConfig?.retrievalStrategy) === "manual" &&
                          "Only includes notes you explicitly select. Maximum control over context."}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Folder Configuration */}
                  <Card className="border border-border/50 bg-card/80">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Folder className="h-3.5 w-3.5 text-primary" />
                        Folder Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Include Folders</p>
                        <div className="flex flex-wrap gap-1">
                          {vaultConfig?.includeFolders.map((f) => (
                            <Badge
                              key={f}
                              variant="outline"
                              className="text-[9px] border-emerald-500/30 text-emerald-400"
                            >
                              <Folder className="h-2.5 w-2.5 mr-0.5" />
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Exclude Folders</p>
                        <div className="flex flex-wrap gap-1">
                          {vaultConfig?.excludeFolders.map((f) => (
                            <Badge
                              key={f}
                              variant="outline"
                              className="text-[9px] border-red-500/30 text-red-400"
                            >
                              <Folder className="h-2.5 w-2.5 mr-0.5" />
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Agent Context Sessions */}
                  <Card className="border border-border/50 bg-card/80">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        Agent Context Sessions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/30">
                            <TableHead className="text-[9px] h-7">Agent</TableHead>
                            <TableHead className="text-[9px] h-7">Notes</TableHead>
                            <TableHead className="text-[9px] h-7">Tokens</TableHead>
                            <TableHead className="text-[9px] h-7">Hits</TableHead>
                            <TableHead className="text-[9px] h-7">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessions?.map((s) => (
                            <TableRow key={s.id} className="border-border/20">
                              <TableCell className="text-[10px]">{s.agentId}</TableCell>
                              <TableCell className="text-[10px]">{s.notesLoaded}</TableCell>
                              <TableCell className="text-[10px]">
                                {s.tokensUsed.toLocaleString()} / {s.tokenBudget.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-[10px]">{s.retrievalHits}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[8px] ${
                                    s.status === "active"
                                      ? "text-emerald-400 border-emerald-500/30"
                                      : s.status === "idle"
                                        ? "text-amber-400 border-amber-500/30"
                                        : "text-muted-foreground border-border/40"
                                  }`}
                                >
                                  {s.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!sessions || sessions.length === 0) && (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center text-[10px] text-muted-foreground py-4"
                              >
                                No active sessions
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

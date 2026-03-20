import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClaudeCodeConfig, CodingTask, ClaudeAuthMethod } from "@shared/schema";
import {
  Code2,
  Settings2,
  ListTodo,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Terminal,
  Key,
  Shield,
  Info,
  ExternalLink,
  MessageSquareReply,
  FileCode2,
  Send,
  X,
} from "lucide-react";

const AVAILABLE_TOOLS = ["Read", "Edit", "Bash", "Write", "Grep", "Glob", "WebFetch"];
const MODEL_OPTIONS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { value: "claude-haiku-4-20250514", label: "Claude Haiku 4" },
];

function statusBadge(status: CodingTask["status"]) {
  switch (status) {
    case "queued":
      return <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10"><Clock className="h-3 w-3 mr-1" />Queued</Badge>;
    case "running":
      return <Badge variant="outline" className="border-teal-500/50 text-teal-400 bg-teal-500/10 animate-pulse"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
    case "completed":
      return <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
    case "failed":
      return <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-500/10"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="border-gray-500/50 text-gray-400 bg-gray-500/10">Cancelled</Badge>;
  }
}

function ConfigTab() {
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [oauthTokenInput, setOauthTokenInput] = useState("");
  const [hasEditedKey, setHasEditedKey] = useState(false);
  const [hasEditedToken, setHasEditedToken] = useState(false);

  const { data: config, isLoading } = useQuery<ClaudeCodeConfig | null>({
    queryKey: ["/api/claude-code/config"],
  });

  const updateConfig = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", "/api/claude-code/config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/claude-code/config"] });
      toast({ title: "Configuration updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/claude-code/test");
      return res.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/claude-code/config"] });
      toast({
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const currentTools = config?.allowedTools ?? ["Read", "Edit", "Bash", "Write"];

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${
              config?.status === "connected" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" :
              config?.status === "error" ? "bg-red-500" : "bg-gray-500"
            }`} />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <span>Status: <span className={
              config?.status === "connected" ? "text-emerald-400" :
              config?.status === "error" ? "text-red-400" : "text-gray-400"
            }>{config?.status ?? "disconnected"}</span></span>
            {config?.totalTasks != null && <span>Tasks: {config.totalTasks}</span>}
            {config?.totalTokensUsed != null && <span>Tokens used: {config.totalTokensUsed.toLocaleString()}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Auth Method Selector */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono">Authentication Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`relative flex flex-col items-start gap-2 rounded-lg border p-4 transition-all ${
                (config?.authMethod ?? "api_key") === "api_key"
                  ? "border-primary/60 bg-primary/5 shadow-[0_0_12px_rgba(var(--primary),0.1)]"
                  : "border-border/50 bg-card/30 hover:border-border"
              }`}
              onClick={() => updateConfig.mutate({ authMethod: "api_key" })}
              data-testid="claude-code-auth-api-key"
            >
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono font-medium">API Key</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/40 text-emerald-400">Recommended</Badge>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                Pay-as-you-go via console.anthropic.com. Works with all third-party tools.
              </p>
            </button>
            <button
              className={`relative flex flex-col items-start gap-2 rounded-lg border p-4 transition-all ${
                config?.authMethod === "oauth_token"
                  ? "border-primary/60 bg-primary/5 shadow-[0_0_12px_rgba(var(--primary),0.1)]"
                  : "border-border/50 bg-card/30 hover:border-border"
              }`}
              onClick={() => updateConfig.mutate({ authMethod: "oauth_token" })}
              data-testid="claude-code-auth-oauth"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-mono font-medium">OAuth Token</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-400">Pro/Max</Badge>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                Use your Pro/Max plan subscription token. May have usage limits.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Credential Input — API Key */}
      {(config?.authMethod ?? "api_key") === "api_key" && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Key className="h-3.5 w-3.5 text-primary" />
              API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="sk-ant-api03-..."
                  value={hasEditedKey ? apiKeyInput : (config?.apiKey ?? "")}
                  onChange={(e) => { setApiKeyInput(e.target.value); setHasEditedKey(true); }}
                  className="font-mono text-xs pr-10 bg-background/50"
                  data-testid="claude-code-api-key-input"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setShowKey(!showKey)}
                  data-testid="claude-code-toggle-key-visibility"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-mono"
                disabled={!hasEditedKey || !apiKeyInput || updateConfig.isPending}
                onClick={() => {
                  updateConfig.mutate({ apiKey: apiKeyInput });
                  setHasEditedKey(false);
                }}
                data-testid="claude-code-save-key"
              >
                {updateConfig.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-mono"
                disabled={testConnection.isPending || !config?.apiKey}
                onClick={() => testConnection.mutate()}
                data-testid="claude-code-test-connection"
              >
                {testConnection.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
              </Button>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/60" />
              <span>Get your API key from{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  console.anthropic.com<ExternalLink className="h-2.5 w-2.5" />
                </a>. You pay per token used.
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Credential Input — OAuth Token */}
      {config?.authMethod === "oauth_token" && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-purple-400" />
              OAuth Token
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="CLAUDE_CODE_OAUTH_TOKEN..."
                  value={hasEditedToken ? oauthTokenInput : (config?.oauthToken ?? "")}
                  onChange={(e) => { setOauthTokenInput(e.target.value); setHasEditedToken(true); }}
                  className="font-mono text-xs pr-10 bg-background/50"
                  data-testid="claude-code-oauth-token-input"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setShowKey(!showKey)}
                  data-testid="claude-code-toggle-token-visibility"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-mono"
                disabled={!hasEditedToken || !oauthTokenInput || updateConfig.isPending}
                onClick={() => {
                  updateConfig.mutate({ oauthToken: oauthTokenInput });
                  setHasEditedToken(false);
                }}
                data-testid="claude-code-save-token"
              >
                {updateConfig.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-mono"
                disabled={testConnection.isPending || !config?.oauthToken}
                onClick={() => testConnection.mutate()}
                data-testid="claude-code-test-oauth-connection"
              >
                {testConnection.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
              </Button>
            </div>
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="text-[10px] font-mono text-amber-400/90 leading-relaxed">
                <span className="font-bold">Note:</span> OAuth tokens from Pro/Max plans use your subscription's included usage instead of pay-per-token billing. Usage is shared across Claude web, Claude Code CLI, and ZeroClaw. Token can be found in your Claude Code CLI config or exported as CLAUDE_CODE_OAUTH_TOKEN.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model & Token Settings */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono">Model Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-mono text-muted-foreground">Model</Label>
            <Select
              value={config?.model ?? "claude-sonnet-4-20250514"}
              onValueChange={(val) => updateConfig.mutate({ model: val })}
              data-testid="claude-code-model-select"
            >
              <SelectTrigger className="font-mono text-xs" data-testid="claude-code-model-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="font-mono text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono text-muted-foreground">Max Tokens</Label>
              <span className="text-xs font-mono text-muted-foreground">{config?.maxTokens ?? 8192}</span>
            </div>
            <Slider
              value={[config?.maxTokens ?? 8192]}
              min={256}
              max={128000}
              step={256}
              onValueCommit={(val) => updateConfig.mutate({ maxTokens: val[0] })}
              data-testid="claude-code-max-tokens-slider"
            />
          </div>
        </CardContent>
      </Card>

      {/* Obsidian Context Toggle */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono">Context Bridge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-mono">Use Obsidian Context</Label>
              <p className="text-[10px] text-muted-foreground font-mono">Pull relevant vault notes into coding task context</p>
            </div>
            <Switch
              checked={config?.useObsidianContext ?? false}
              onCheckedChange={(val) => updateConfig.mutate({ useObsidianContext: val })}
              data-testid="claude-code-obsidian-toggle"
            />
          </div>
        </CardContent>
      </Card>

      {/* Allowed Tools */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono">Allowed Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AVAILABLE_TOOLS.map((tool) => (
              <div key={tool} className="flex items-center space-x-2">
                <Checkbox
                  id={`tool-${tool}`}
                  checked={currentTools.includes(tool)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...currentTools, tool]
                      : currentTools.filter(t => t !== tool);
                    updateConfig.mutate({ allowedTools: next });
                  }}
                  data-testid={`claude-code-tool-${tool.toLowerCase()}`}
                />
                <Label htmlFor={`tool-${tool}`} className="text-xs font-mono">{tool}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom System Prompt */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono">Custom System Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Optional: Add custom instructions for Claude Code..."
            value={config?.systemPrompt ?? ""}
            onChange={(e) => updateConfig.mutate({ systemPrompt: e.target.value })}
            className="font-mono text-xs min-h-[100px] bg-background/50 resize-y"
            data-testid="claude-code-system-prompt"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Extracted File type ----
interface ExtractedFile {
  filename: string;
  language: string;
  content: string;
  size: number;
}

function TasksTab() {
  const { toast } = useToast();
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPrompt, setTaskPrompt] = useState("");

  // --- New state for Reply ---
  const [replyingTaskId, setReplyingTaskId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // --- New state for extracted files ---
  const [extractedFiles, setExtractedFiles] = useState<Record<string, ExtractedFile[]>>({});
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  const { data: tasks, isLoading } = useQuery<CodingTask[]>({
    queryKey: ["/api/claude-code/tasks"],
    refetchInterval: 3000,
  });

  const submitTask = useMutation({
    mutationFn: async (data: { title: string; prompt: string }) => {
      const res = await apiRequest("POST", "/api/claude-code/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/claude-code/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/claude-code/config"] });
      setNewTaskOpen(false);
      setTaskTitle("");
      setTaskPrompt("");
      toast({ title: "Task submitted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/claude-code/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/claude-code/tasks"] });
      toast({ title: "Task deleted" });
    },
  });

  // --- Reply mutation ---
  const replyToTask = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const res = await apiRequest("POST", `/api/claude-code/tasks/${id}/reply`, { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/claude-code/tasks"] });
      setReplyingTaskId(null);
      setReplyText("");
      toast({ title: "Reply sent" });
    },
    onError: (err: Error) => {
      toast({ title: "Reply failed", description: err.message, variant: "destructive" });
    },
  });

  // --- Extract files mutation ---
  const extractFiles = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/claude-code/tasks/${id}/extract-files`);
      return res.json() as Promise<{ files: ExtractedFile[] }>;
    },
    onSuccess: (data, id) => {
      setExtractedFiles((prev) => ({ ...prev, [id]: data.files }));
      toast({ title: `Extracted ${data.files.length} file(s)` });
    },
    onError: (err: Error) => {
      toast({ title: "Extraction failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Task Button */}
      <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="font-mono text-xs gap-2" data-testid="claude-code-new-task">
            <Plus className="h-3.5 w-3.5" />
            New Task
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              Submit Coding Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-mono">Title</Label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Refactor authentication module"
                className="font-mono text-xs"
                data-testid="claude-code-task-title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono">Prompt</Label>
              <Textarea
                value={taskPrompt}
                onChange={(e) => setTaskPrompt(e.target.value)}
                placeholder="Describe the coding task in detail..."
                className="font-mono text-xs min-h-[200px] bg-[hsl(var(--background))]/80 resize-y"
                data-testid="claude-code-task-prompt"
              />
            </div>
            <Button
              onClick={() => submitTask.mutate({ title: taskTitle, prompt: taskPrompt })}
              disabled={!taskTitle.trim() || !taskPrompt.trim() || submitTask.isPending}
              className="w-full font-mono text-xs gap-2"
              data-testid="claude-code-submit-task"
            >
              {submitTask.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Submit Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task List */}
      {(!tasks || tasks.length === 0) ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Terminal className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-mono text-muted-foreground">No tasks yet</p>
            <p className="text-xs font-mono text-muted-foreground/60 mt-1">Submit a coding task to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isExpanded = expandedTask === task.id;
            const isCompleted = task.status === "completed";
            const hasCodeBlocks = task.response?.includes("```");
            const isReplying = replyingTaskId === task.id;
            const taskExtractedFiles = extractedFiles[task.id];

            return (
              <Card key={task.id} className="border-border/50 bg-card/50 overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  data-testid={`claude-code-task-${task.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium truncate">{task.title}</span>
                      {statusBadge(task.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted-foreground">
                      <span>{task.model.split("-").slice(0, 2).join(" ")}</span>
                      <span>{new Date(task.createdAt).toLocaleString()}</span>
                      {task.tokensUsed > 0 && <span>{task.tokensUsed} tokens</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Reply button — only on completed tasks */}
                    {isCompleted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] font-mono text-muted-foreground hover:text-primary gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isReplying) {
                            setReplyingTaskId(null);
                            setReplyText("");
                          } else {
                            setReplyingTaskId(task.id);
                            setExpandedTask(task.id);
                          }
                        }}
                        data-testid={`claude-code-reply-${task.id}`}
                      >
                        <MessageSquareReply className="h-3 w-3" />
                        Reply
                      </Button>
                    )}

                    {/* Extract Files button — only on completed tasks with code blocks */}
                    {isCompleted && hasCodeBlocks && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] font-mono text-muted-foreground hover:text-accent gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          extractFiles.mutate(task.id);
                          setExpandedTask(task.id);
                        }}
                        disabled={extractFiles.isPending && extractFiles.variables === task.id}
                        data-testid={`claude-code-extract-${task.id}`}
                      >
                        {extractFiles.isPending && extractFiles.variables === task.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <FileCode2 className="h-3 w-3" />
                        )}
                        Extract Files
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteTask.mutate(task.id); }}
                      data-testid={`claude-code-delete-task-${task.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border/30">
                    {/* Prompt Section */}
                    <div className="px-4 py-3 bg-background/30">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Prompt</p>
                      <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap">{task.prompt}</pre>
                    </div>

                    {/* Response Section */}
                    {task.response && (
                      <div className="px-4 py-3 bg-[hsl(160,30%,6%)] border-t border-border/20">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-500/70 mb-2">Response</p>
                        <pre className="text-xs font-mono text-emerald-300/90 whitespace-pre-wrap leading-relaxed">{task.response}</pre>
                      </div>
                    )}

                    {/* Error Section */}
                    {task.error && (
                      <div className="px-4 py-3 bg-red-950/20 border-t border-border/20">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-red-500/70 mb-2">Error</p>
                        <pre className="text-xs font-mono text-red-400 whitespace-pre-wrap">{task.error}</pre>
                      </div>
                    )}

                    {/* Context Notes */}
                    {task.contextNotes.length > 0 && (
                      <div className="px-4 py-2 border-t border-border/20">
                        <p className="text-[10px] font-mono text-muted-foreground">
                          Context notes: {task.contextNotes.join(", ")}
                        </p>
                      </div>
                    )}

                    {/* ---- Extracted Files Section ---- */}
                    {taskExtractedFiles && taskExtractedFiles.length > 0 && (
                      <div className="border-t border-border/20 px-4 py-3 bg-background/20">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-accent/70 mb-3 flex items-center gap-1.5">
                          <FileCode2 className="h-3 w-3" />
                          Extracted Files ({taskExtractedFiles.length})
                        </p>
                        <div className="space-y-2">
                          {taskExtractedFiles.map((file, idx) => {
                            const fileKey = `${task.id}-${idx}`;
                            const isFileExpanded = expandedFiles[fileKey];
                            return (
                              <div
                                key={fileKey}
                                className="rounded-lg border border-border/40 bg-card/60 overflow-hidden"
                              >
                                {/* File header */}
                                <div
                                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/20 transition-colors"
                                  onClick={() =>
                                    setExpandedFiles((prev) => ({
                                      ...prev,
                                      [fileKey]: !prev[fileKey],
                                    }))
                                  }
                                >
                                  <FileCode2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-xs font-mono flex-1 truncate">{file.filename}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0 border-accent/30 text-accent/80 font-mono"
                                  >
                                    {file.language || "text"}
                                  </Badge>
                                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                    {file.size != null
                                      ? file.size < 1024
                                        ? `${file.size}B`
                                        : `${(file.size / 1024).toFixed(1)}KB`
                                      : ""}
                                  </span>
                                  {isFileExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  )}
                                </div>
                                {/* Collapsible code preview */}
                                {isFileExpanded && (
                                  <div className="border-t border-border/30 bg-[hsl(160,30%,5%)] px-3 py-3">
                                    <pre className="text-[11px] font-mono text-emerald-300/85 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">
                                      {file.content}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ---- Reply Section ---- */}
                    {isReplying && (
                      <div className="border-t border-primary/20 px-4 py-3 bg-primary/5">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-primary/70 mb-3 flex items-center gap-1.5">
                          <MessageSquareReply className="h-3 w-3" />
                          Follow-up Reply
                        </p>
                        <div className="space-y-2">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Ask a follow-up question or request changes..."
                            className="font-mono text-xs min-h-[80px] bg-background/60 resize-y border-primary/20 focus-visible:ring-primary/30"
                            data-testid={`claude-code-reply-textarea-${task.id}`}
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground h-7"
                              onClick={() => {
                                setReplyingTaskId(null);
                                setReplyText("");
                              }}
                              data-testid={`claude-code-reply-cancel-${task.id}`}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs h-7 gap-1.5"
                              disabled={
                                !replyText.trim() ||
                                (replyToTask.isPending && replyToTask.variables?.id === task.id)
                              }
                              onClick={() =>
                                replyToTask.mutate({ id: task.id, message: replyText })
                              }
                              data-testid={`claude-code-reply-submit-${task.id}`}
                            >
                              {replyToTask.isPending && replyToTask.variables?.id === task.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Send Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ClaudeCodePage() {
  return (
    <DashboardLayout title="Claude Code" subtitle="AI-powered programming backend">
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Code2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-mono tracking-tight">Claude Code</h2>
            <p className="text-xs font-mono text-muted-foreground">Delegate programming tasks to Claude Code</p>
          </div>
        </div>

        <Tabs defaultValue="config" className="w-full">
          <TabsList className="font-mono" data-testid="claude-code-tabs">
            <TabsTrigger value="config" className="gap-2 text-xs" data-testid="claude-code-tab-config">
              <Settings2 className="h-3.5 w-3.5" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2 text-xs" data-testid="claude-code-tab-tasks">
              <ListTodo className="h-3.5 w-3.5" />
              Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-4">
            <ConfigTab />
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <TasksTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

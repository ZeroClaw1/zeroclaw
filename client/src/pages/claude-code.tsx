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
import type { ClaudeCodeConfig, CodingTask } from "@shared/schema";
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
  const [hasEditedKey, setHasEditedKey] = useState(false);

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

      {/* API Key */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono">API Key</CardTitle>
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
              {testConnection.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

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

function TasksTab() {
  const { toast } = useToast();
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPrompt, setTaskPrompt] = useState("");

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
            return (
              <Card key={task.id} className="border-border/50 bg-card/50 overflow-hidden">
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

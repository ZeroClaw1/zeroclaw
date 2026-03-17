import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentStatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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
import type { Agent, AgentTask, Pipeline } from "@shared/schema";
import {
  Bot,
  Clock,
  CheckCircle2,
  Wifi,
  Plus,
  RefreshCw,
  Zap,
  Brain,
  HardDrive,
  Trash2,
  Loader2,
  ListTodo,
  AlertCircle,
  CircleDot,
  PlayCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function ConnectAgentDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [model, setModel] = useState("Claude Sonnet 4.5");
  const [gatewayUrl, setGatewayUrl] = useState("http://localhost:18789");
  const [skills, setSkills] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/agents", {
        name,
        model,
        gatewayUrl,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      setOpen(false);
      setName("");
      setModel("Claude Sonnet 4.5");
      setGatewayUrl("http://localhost:18789");
      setSkills("");
      toast({ title: "Agent registered", description: `"${data.name}" added. Ping to connect.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-primary/40 text-primary hover:bg-primary/10"
          data-testid="button-add-agent"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Connect Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Connect Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Agent Name</Label>
            <Input
              placeholder="e.g. DevBot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/40"
              data-testid="input-agent-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Model</Label>
            <Input
              placeholder="Claude Sonnet 4.5"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/40"
              data-testid="input-agent-model"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Gateway URL</Label>
            <Input
              placeholder="http://localhost:18789"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/40 font-mono"
              data-testid="input-agent-url"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Skills (comma-separated)</Label>
            <Input
              placeholder="github, slack, deploy-skill"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/40"
              data-testid="input-agent-skills"
            />
          </div>
          <Button
            className="w-full text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => createMutation.mutate()}
            disabled={!name || !model || !gatewayUrl || createMutation.isPending}
            data-testid="button-create-agent"
          >
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
            Register Agent
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const priorityColors: Record<string, string> = {
  critical: "border-red-400/40 text-red-400",
  high: "border-amber-400/40 text-amber-400",
  medium: "border-yellow-400/40 text-yellow-400",
  low: "border-emerald-400/40 text-emerald-400",
};

const taskStatusColors: Record<string, string> = {
  queued: "text-muted-foreground",
  running: "text-blue-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

function AssignTaskDialog({ agentId }: { agentId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [pipelineId, setPipelineId] = useState("");
  const { toast } = useToast();

  const { data: pipelines } = useQuery<Pipeline[]>({
    queryKey: ["/api/pipelines"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { agentId: string; title: string; description: string; priority: string; pipelineId?: string }) => {
      const res = await apiRequest("POST", "/api/agent-tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${agentId}/tasks`] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setPipelineId("");
      toast({ title: "Task assigned" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign task", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-[10px] border-accent/30 text-accent hover:bg-accent/10 h-7"
          data-testid={`button-assign-task-${agentId}`}
        >
          <ListTodo className="h-3 w-3 mr-1" />
          Assign Task
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50" data-testid="dialog-assign-task">
        <DialogHeader>
          <DialogTitle className="text-sm">Assign Task</DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground">
            Create a new task for this agent.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Review PR #42"
              className="h-8 text-xs bg-background/50"
              data-testid="input-task-title"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="h-8 text-xs bg-background/50"
              data-testid="input-task-description"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-task-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Pipeline (optional)</Label>
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-task-pipeline">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {pipelines?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            size="sm"
            className="text-[11px] h-7"
            onClick={() => createMutation.mutate({
              agentId,
              title,
              description,
              priority,
              ...(pipelineId && pipelineId !== "none" ? { pipelineId } : {}),
            })}
            disabled={!title || createMutation.isPending}
            data-testid="button-create-task"
          >
            {createMutation.isPending ? "Assigning..." : "Assign Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const { toast } = useToast();

  const { data: tasks } = useQuery<AgentTask[]>({
    queryKey: [`/api/agents/${agent.id}/tasks`],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/agent-tasks/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${agent.id}/tasks`] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/agent-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${agent.id}/tasks`] });
    },
  });

  const pingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/agents/${agent.id}/ping`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: `Pinged ${agent.name}`, description: `Status: ${data.status}` });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/agents/${agent.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      toast({ title: "Agent removed", description: `"${agent.name}" disconnected` });
    },
  });

  return (
    <Card
      className={`border bg-card/80 backdrop-blur-sm transition-all hover:border-primary/30 ${
        agent.status === "online"
          ? "border-emerald-500/20"
          : agent.status === "busy"
          ? "border-amber-500/20"
          : agent.status === "error"
          ? "border-red-500/20"
          : "border-border/50"
      }`}
      data-testid={`card-agent-${agent.id}`}
    >
      <CardHeader className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              agent.status === "online" ? "bg-emerald-500/10" :
              agent.status === "busy" ? "bg-amber-500/10" :
              "bg-muted/30"
            }`}>
              <Bot className={`h-4 w-4 ${
                agent.status === "online" ? "text-emerald-400" :
                agent.status === "busy" ? "text-amber-400" :
                "text-muted-foreground"
              }`} />
            </div>
            <div>
              <CardTitle className="text-xs font-semibold text-foreground">
                {agent.name}
              </CardTitle>
              <p className="text-[9px] text-muted-foreground font-mono">
                {agent.gatewayUrl}
              </p>
            </div>
          </div>
          <AgentStatusBadge status={agent.status} />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* Model */}
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-3 w-3 text-accent" />
          <span className="text-[10px] text-muted-foreground">Model:</span>
          <span className="text-[10px] text-foreground font-medium">{agent.model}</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 rounded bg-muted/20 border border-border/30 text-center">
            <CheckCircle2 className="h-3 w-3 text-primary mx-auto mb-1" />
            <span className="text-sm font-bold tabular-nums text-foreground block">{agent.tasksCompleted}</span>
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground">Tasks</span>
          </div>
          <div className="p-2 rounded bg-muted/20 border border-border/30 text-center">
            <Clock className="h-3 w-3 text-primary mx-auto mb-1" />
            <span className="text-sm font-bold tabular-nums text-foreground block">{agent.uptime}h</span>
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground">Uptime</span>
          </div>
          <div className="p-2 rounded bg-muted/20 border border-border/30 text-center">
            <HardDrive className="h-3 w-3 text-primary mx-auto mb-1" />
            <span className="text-sm font-bold tabular-nums text-foreground block">{agent.memoryUsage}%</span>
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground">Memory</span>
          </div>
        </div>

        {/* Memory bar */}
        {agent.memoryUsage > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-muted-foreground">Memory</span>
              <span className="text-[9px] text-muted-foreground tabular-nums">{agent.memoryUsage}%</span>
            </div>
            <Progress value={agent.memoryUsage} className="h-1.5 bg-muted" />
          </div>
        )}

        {/* Skills */}
        <div className="mb-3">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1.5">Skills</span>
          <div className="flex flex-wrap gap-1">
            {agent.skills.length > 0 ? agent.skills.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="text-[8px] py-0 px-1.5 border-border/40 text-muted-foreground"
              >
                {skill}
              </Badge>
            )) : (
              <span className="text-[9px] text-muted-foreground/60">No skills configured</span>
            )}
          </div>
        </div>

        {/* Last heartbeat */}
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mb-3">
          <Wifi className="h-2.5 w-2.5" />
          Last heartbeat:{" "}
          {formatDistanceToNow(new Date(agent.lastHeartbeat), { addSuffix: true })}
        </div>

        {/* Task Queue */}
        <div className="mb-3">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1.5">
            Task Queue {tasks && tasks.length > 0 && `(${tasks.length})`}
          </span>
          {tasks && tasks.length > 0 ? (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-1.5 rounded bg-muted/10 border border-border/20"
                  data-testid={`task-${task.id}`}
                >
                  <CircleDot className={`h-2.5 w-2.5 shrink-0 ${taskStatusColors[task.status] || ""}`} />
                  <span className="text-[9px] text-foreground truncate flex-1">{task.title}</span>
                  <Badge variant="outline" className={`text-[7px] px-1 py-0 shrink-0 ${priorityColors[task.priority] || ""}`}>
                    {task.priority}
                  </Badge>
                  {task.status === "queued" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 text-primary/60 hover:text-primary shrink-0"
                      onClick={() => updateTaskMutation.mutate({ id: task.id, status: "running" })}
                      data-testid={`button-start-task-${task.id}`}
                    >
                      <PlayCircle className="h-2.5 w-2.5" />
                    </Button>
                  )}
                  {task.status === "running" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 text-emerald-400/60 hover:text-emerald-400 shrink-0"
                      onClick={() => updateTaskMutation.mutate({ id: task.id, status: "completed" })}
                      data-testid={`button-complete-task-${task.id}`}
                    >
                      <CheckCircle2 className="h-2.5 w-2.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-red-400/40 hover:text-red-400 shrink-0"
                    onClick={() => deleteTaskMutation.mutate(task.id)}
                    data-testid={`button-delete-task-${task.id}`}
                  >
                    <Trash2 className="h-2 w-2" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[9px] text-muted-foreground/60">No tasks in queue</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-[10px] border-primary/30 text-primary hover:bg-primary/10 h-7"
            onClick={() => pingMutation.mutate()}
            disabled={pingMutation.isPending}
            data-testid={`button-ping-${agent.id}`}
          >
            {pingMutation.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Ping
          </Button>
          <AssignTaskDialog agentId={agent.id} />
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 px-2"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            data-testid={`button-delete-${agent.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentsPage() {
  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const onlineCount = agents?.filter((a) => a.status === "online" || a.status === "busy").length ?? 0;
  const totalCount = agents?.length ?? 0;

  const pingAllMutation = useMutation({
    mutationFn: async () => {
      if (!agents) return;
      await Promise.all(
        agents.map((a) => apiRequest("POST", `/api/agents/${a.id}/ping`).catch(() => null))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  return (
    <DashboardLayout
      title="Agents"
      subtitle={`${onlineCount} of ${totalCount} agents connected`}
    >
      <div className="flex gap-4 mb-4">
        <ConnectAgentDialog />
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-border/40 text-muted-foreground hover:text-foreground"
          onClick={() => pingAllMutation.mutate()}
          disabled={pingAllMutation.isPending}
          data-testid="button-refresh-agents"
        >
          {pingAllMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          Ping All
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : agents && agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <Card className="border border-border/50 bg-card/80">
          <CardContent className="p-12 text-center">
            <Bot className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">No agents registered. Connect your first one.</p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}

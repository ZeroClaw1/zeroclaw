import { useState, useCallback, useRef, useEffect } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Workflow, WorkflowNode, WorkflowEdge } from "@shared/schema";
import {
  Plus, Play, Clock, TrendingUp, Zap, GitBranch, Terminal, Trash2, Loader2,
  Save, MousePointerClick, Cpu, ChevronDown, Unlink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type EdgeProps,
  Position,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  BaseEdge,
  getBezierPath,
} from "reactflow";
import "reactflow/dist/style.css";
import { useToast } from "@/hooks/use-toast";

// ============================================================
// Available Models
// ============================================================
const AVAILABLE_MODELS = [
  { value: "default", label: "Default (from config)" },
  { value: "claude-opus-4.6", label: "Claude Opus 4.6" },
  { value: "claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { value: "claude-haiku", label: "Claude Haiku" },
  { value: "gpt-5.2-codex", label: "GPT-5.2 Codex" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "llama-4-maverick", label: "Llama 4 Maverick" },
  { value: "deepseek-r2", label: "DeepSeek R2" },
] as const;

function getModelLabel(value: string): string {
  return AVAILABLE_MODELS.find((m) => m.value === value)?.label || value;
}

// ============================================================
// Custom interactive node components with handles + model
// ============================================================

interface NodeData {
  label: string;
  model?: string;
  onRename: (id: string, newLabel: string) => void;
  onModelChange: (id: string, model: string) => void;
}

function EditableLabel({ label, nodeId, onRename }: { label: string; nodeId: string; onRename: (id: string, newLabel: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onRename(nodeId, value);
            setEditing(false);
          }
          if (e.key === "Escape") {
            setValue(label);
            setEditing(false);
          }
          e.stopPropagation();
        }}
        onBlur={() => {
          onRename(nodeId, value);
          setEditing(false);
        }}
        className="bg-transparent border-b border-current text-current text-[10px] font-semibold w-full text-center outline-none"
        style={{ minWidth: 40 }}
        data-testid={`input-rename-${nodeId}`}
      />
    );
  }

  return (
    <span
      className="cursor-text"
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="Double-click to rename"
    >
      {label}
    </span>
  );
}

function ModelSelector({ model, nodeId, onModelChange }: { model: string; nodeId: string; onModelChange: (id: string, m: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded text-[8px] bg-black/20 hover:bg-black/40 transition-colors border border-white/5 hover:border-white/15 text-current opacity-70 hover:opacity-100 mx-auto"
          onClick={(e) => e.stopPropagation()}
          data-testid={`button-model-${nodeId}`}
          title="Set AI model for this block"
        >
          <Cpu className="h-2 w-2 flex-shrink-0" />
          <span className="truncate max-w-[70px]">{model === "default" ? "Model" : getModelLabel(model)}</span>
          <ChevronDown className="h-2 w-2 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-1 bg-card border-border/50"
        align="center"
        side="bottom"
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => e.stopPropagation()}
      >
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground px-2 py-1.5 font-semibold">AI Model</div>
        {AVAILABLE_MODELS.map((m) => (
          <button
            key={m.value}
            className={`w-full text-left px-2 py-1.5 text-[11px] rounded-sm hover:bg-muted/50 transition-colors flex items-center gap-2 ${model === m.value ? "bg-primary/10 text-primary" : "text-foreground"}`}
            onClick={(e) => {
              e.stopPropagation();
              onModelChange(nodeId, m.value);
            }}
            data-testid={`model-option-${m.value}`}
          >
            {model === m.value && <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />}
            <span className={model === m.value ? "" : "ml-3"}>{m.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function TriggerNode({ data, id, selected }: { data: NodeData; id: string; selected: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-lg border-2 ${selected ? "border-white ring-2 ring-white/20" : "border-primary/60"} bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider min-w-[100px] text-center shadow-md transition-all`}>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-primary/80 !border-primary" />
      <div className="flex items-center justify-center gap-1.5">
        <Play className="h-3 w-3 flex-shrink-0" />
        <EditableLabel label={data.label} nodeId={id} onRename={data.onRename} />
      </div>
      <ModelSelector model={data.model || "default"} nodeId={id} onModelChange={data.onModelChange} />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-primary/80 !border-primary" />
    </div>
  );
}

function StepNode({ data, id, selected }: { data: NodeData; id: string; selected: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-md border ${selected ? "border-white ring-2 ring-white/20" : "border-border"} bg-card text-foreground text-[10px] font-medium min-w-[100px] text-center shadow-sm hover:border-primary/40 transition-all`}>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-muted-foreground/80 !border-muted-foreground" />
      <div className="flex items-center justify-center gap-1.5">
        <GitBranch className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <EditableLabel label={data.label} nodeId={id} onRename={data.onRename} />
      </div>
      <ModelSelector model={data.model || "default"} nodeId={id} onModelChange={data.onModelChange} />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-muted-foreground/80 !border-muted-foreground" />
    </div>
  );
}

function OpenClawNode({ data, id, selected }: { data: NodeData; id: string; selected: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-lg border-2 ${selected ? "border-white ring-2 ring-white/20" : "border-accent/60"} bg-accent/10 text-accent text-[10px] font-semibold min-w-[100px] text-center shadow-md glow-accent transition-all`}>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-accent/80 !border-accent" />
      <div className="flex items-center justify-center gap-1.5">
        <Zap className="h-3 w-3 flex-shrink-0" />
        <EditableLabel label={data.label} nodeId={id} onRename={data.onRename} />
      </div>
      <ModelSelector model={data.model || "default"} nodeId={id} onModelChange={data.onModelChange} />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-accent/80 !border-accent" />
    </div>
  );
}

function DeployNode({ data, id, selected }: { data: NodeData; id: string; selected: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-lg border-2 ${selected ? "border-white ring-2 ring-white/20" : "border-emerald-500/60"} bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider min-w-[100px] text-center shadow-md transition-all`}>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-emerald-400/80 !border-emerald-500" />
      <div className="flex items-center justify-center gap-1.5">
        <Terminal className="h-3 w-3 flex-shrink-0" />
        <EditableLabel label={data.label} nodeId={id} onRename={data.onRename} />
      </div>
      <ModelSelector model={data.model || "default"} nodeId={id} onModelChange={data.onModelChange} />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-emerald-400/80 !border-emerald-500" />
    </div>
  );
}

// ============================================================
// Custom selectable edge with delete button
// ============================================================
function SelectableEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  style = {}, markerEnd, selected, animated,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const baseStroke = animated ? "hsl(173 80% 50%)" : "hsl(225 20% 30%)";
  const selectedStroke = "hsl(173 80% 60%)";

  return (
    <>
      {/* Invisible fat hitbox for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? selectedStroke : baseStroke,
          strokeWidth: selected ? 3 : 2,
          filter: selected ? "drop-shadow(0 0 4px hsl(173 80% 50% / 0.6))" : "none",
          transition: "stroke 0.15s, stroke-width 0.15s, filter 0.15s",
        }}
      />
      {selected && (
        <foreignObject
          width={20}
          height={20}
          x={labelX - 10}
          y={labelY - 10}
          className="overflow-visible"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/90 hover:bg-red-500 cursor-pointer shadow-lg border border-red-400/50 transition-colors"
            title="Remove connection"
            data-testid={`edge-delete-${id}`}
          >
            <Unlink className="h-2.5 w-2.5 text-white" />
          </div>
        </foreignObject>
      )}
    </>
  );
}

const nodeTypes = {
  trigger: TriggerNode,
  step: StepNode,
  openclaw: OpenClawNode,
  deploy: DeployNode,
};

const edgeTypes = {
  default: SelectableEdge,
};

// ============================================================
// Block type definitions for the "Add Block" palette
// ============================================================
const BLOCK_TYPES = [
  { type: "trigger", label: "Trigger", icon: Play, color: "text-primary", desc: "Entry point (git push, PR, cron)" },
  { type: "step", label: "Step", icon: GitBranch, color: "text-foreground", desc: "Build, test, lint, or custom step" },
  { type: "openclaw", label: "OpenClaw", icon: Zap, color: "text-accent", desc: "AI agent review / action" },
  { type: "deploy", label: "Deploy", icon: Terminal, color: "text-emerald-400", desc: "Deploy to environment" },
] as const;

// ============================================================
// Create Workflow Dialog
// ============================================================
function CreateWorkflowDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("push to main");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      const nodes = [
        { id: "n1", type: "trigger", label: trigger.includes("push") ? "Git Push" : trigger.includes("PR") || trigger.includes("pull") ? "PR Opened" : "Trigger", position: { x: 0, y: 150 }, data: { model: "default" } },
        { id: "n2", type: "step", label: "Build", position: { x: 250, y: 80 }, data: { model: "default" } },
        { id: "n3", type: "step", label: "Test", position: { x: 250, y: 220 }, data: { model: "default" } },
        { id: "n4", type: "openclaw", label: "OpenClaw Review", position: { x: 500, y: 150 }, data: { model: "default" } },
        { id: "n5", type: "deploy", label: "Deploy", position: { x: 750, y: 150 }, data: { model: "default" } },
      ];
      const edges = [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n1", target: "n3" },
        { id: "e3", source: "n2", target: "n4" },
        { id: "e4", source: "n3", target: "n4" },
        { id: "e5", source: "n4", target: "n5", animated: true },
      ];
      const res = await apiRequest("POST", "/api/workflows", { name, description, trigger, nodes, edges });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      setOpen(false);
      setName("");
      setDescription("");
      setTrigger("push to main");
      toast({ title: "Workflow created", description: `"${data.name}" is ready` });
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
          data-testid="button-new-workflow"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Create Workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</Label>
            <Input
              placeholder="e.g. Full Stack Deploy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/40"
              data-testid="input-workflow-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</Label>
            <Input
              placeholder="What does this workflow do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/40"
              data-testid="input-workflow-desc"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Trigger</Label>
            <Input
              placeholder="e.g. push to main, pull request, cron: daily"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/40"
              data-testid="input-workflow-trigger"
            />
          </div>
          <Button
            className="w-full text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => createMutation.mutate()}
            disabled={!name || !trigger || createMutation.isPending}
            data-testid="button-create-workflow"
          >
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
            Create Workflow
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Interactive Workflow Editor (inside ReactFlowProvider)
// ============================================================
function WorkflowEditor({ workflow, onRunWorkflow, runPending }: {
  workflow: Workflow;
  onRunWorkflow: () => void;
  runPending: boolean;
}) {
  const { toast } = useToast();
  const nodeIdCounter = useRef(100);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Convert workflow data to React Flow format
  const toFlowNodes = useCallback((wfNodes: WorkflowNode[], onRename: (id: string, l: string) => void, onModelChange: (id: string, m: string) => void): Node[] =>
    wfNodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { label: n.label, model: n.data?.model || "default", onRename, onModelChange },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    })),
    []
  );

  const toFlowEdges = useCallback((wfEdges: WorkflowEdge[]): Edge[] =>
    wfEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "default",
      animated: e.animated || false,
      style: {
        stroke: e.animated ? "hsl(173 80% 50%)" : "hsl(225 20% 30%)",
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: e.animated ? "hsl(173 80% 50%)" : "hsl(225 20% 30%)",
      },
    })),
    []
  );

  const handleRename = useCallback((nodeId: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleModelChange = useCallback((nodeId: string, model: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, model } } : n
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  const [nodes, setNodes] = useState<Node[]>(() =>
    toFlowNodes(workflow.nodes, handleRename, handleModelChange)
  );
  const [edges, setEdges] = useState<Edge[]>(() =>
    toFlowEdges(workflow.edges)
  );

  // Reset when selecting a different workflow
  useEffect(() => {
    setNodes(toFlowNodes(workflow.nodes, handleRename, handleModelChange));
    setEdges(toFlowEdges(workflow.edges));
    setHasUnsavedChanges(false);
    const maxId = workflow.nodes.reduce((max, n) => {
      const num = parseInt(n.id.replace(/\D/g, ""), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    nodeIdCounter.current = maxId + 1;
  }, [workflow.id]);

  // Node changes (position, selection, removal)
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    const hasMoved = changes.some((c) => c.type === "position" && c.dragging === false);
    const hasRemoved = changes.some((c) => c.type === "remove");
    if (hasMoved || hasRemoved) setHasUnsavedChanges(true);
  }, []);

  // Edge changes (selection, removal)
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    const hasRemoved = changes.some((c) => c.type === "remove");
    if (hasRemoved) setHasUnsavedChanges(true);
  }, []);

  // Connect nodes by dragging from handle to handle
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const edgeId = `e-${connection.source}-${connection.target}`;
    setEdges((eds) =>
      addEdge(
        {
          ...connection,
          id: edgeId,
          type: "default",
          animated: false,
          style: { stroke: "hsl(225 20% 30%)", strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: "hsl(225 20% 30%)",
          },
        },
        eds
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  // Click the delete icon on a selected edge
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    // Check if clicking the delete button inside the edge
    const target = _event.target as HTMLElement;
    const isDeleteButton = target.closest('[data-testid^="edge-delete-"]');
    if (isDeleteButton) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      setHasUnsavedChanges(true);
    }
  }, []);

  // Add a new block at a calculated position
  const addBlock = useCallback((type: string, defaultLabel: string) => {
    const id = `n${++nodeIdCounter.current}`;
    const existingX = nodes.map((n) => n.position.x);
    const maxX = existingX.length > 0 ? Math.max(...existingX) : 0;
    const yPositions = nodes.map((n) => n.position.y);
    const avgY = yPositions.length > 0
      ? yPositions.reduce((a, b) => a + b, 0) / yPositions.length
      : 150;

    const newNode: Node = {
      id,
      type,
      position: { x: maxX + 200, y: avgY + (Math.random() * 80 - 40) },
      data: { label: defaultLabel, model: "default", onRename: handleRename, onModelChange: handleModelChange },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
    setNodes((nds) => [...nds, newNode]);
    setHasUnsavedChanges(true);
    toast({ title: "Block added", description: `"${defaultLabel}" — drag to position, then connect` });
  }, [nodes, handleRename, handleModelChange, toast]);

  // Delete selected nodes/edges
  const deleteSelected = useCallback(() => {
    let didDelete = false;

    // First: delete selected edges
    setEdges((eds) => {
      const remaining = eds.filter((e) => !e.selected);
      if (remaining.length < eds.length) didDelete = true;
      return remaining;
    });

    // Then: delete selected nodes + their connected edges
    setNodes((nds) => {
      const selectedIds = nds.filter((n) => n.selected).map((n) => n.id);
      if (selectedIds.length === 0) {
        if (didDelete) setHasUnsavedChanges(true);
        return nds;
      }
      setEdges((eds) => eds.filter((e) => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)));
      didDelete = true;
      return nds.filter((n) => !n.selected);
    });

    if (didDelete) setHasUnsavedChanges(true);
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const wfNodes: WorkflowNode[] = nodes.map((n) => ({
        id: n.id,
        type: n.type || "step",
        label: n.data.label,
        position: n.position,
        data: { model: n.data.model || "default" },
      }));
      const wfEdges: WorkflowEdge[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.animated || false,
      }));
      const res = await apiRequest("PATCH", `/api/workflows/${workflow.id}`, {
        nodes: wfNodes,
        edges: wfEdges,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      setHasUnsavedChanges(false);
      toast({ title: "Workflow saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  // Delete workflow
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/workflows/${workflow.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      toast({ title: "Workflow deleted" });
    },
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        deleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChanges) saveMutation.mutate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, hasUnsavedChanges, saveMutation]);

  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardHeader className="px-4 pt-3 pb-2">
        {/* Top row: workflow name + action buttons */}
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xs font-semibold text-foreground">
              {workflow.name}
            </CardTitle>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {workflow.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
              {workflow.totalRuns} runs
            </Badge>
            <Button
              size="sm"
              className="text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground h-7 px-3"
              onClick={onRunWorkflow}
              disabled={runPending}
              data-testid="button-run-workflow"
            >
              {runPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
              Run
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 px-3"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-workflow"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Toolbar row: add blocks + delete + save */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
          {/* Add Block dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2.5 border-primary/40 text-primary hover:bg-primary/10"
                data-testid="button-add-block"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Block
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-card border-border/50 w-56">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">Block Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {BLOCK_TYPES.map((bt) => (
                <DropdownMenuItem
                  key={bt.type}
                  onClick={() => addBlock(bt.type, bt.label)}
                  className="text-xs cursor-pointer"
                  data-testid={`menu-add-${bt.type}`}
                >
                  <bt.icon className={`h-3.5 w-3.5 mr-2 ${bt.color}`} />
                  <div>
                    <div className="font-medium">{bt.label}</div>
                    <div className="text-[9px] text-muted-foreground">{bt.desc}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete selected */}
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-7 px-2.5 border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={deleteSelected}
            data-testid="button-delete-selected"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete Selected
          </Button>

          <div className="flex-1" />

          {/* Hint */}
          <span className="text-[9px] text-muted-foreground hidden sm:inline-flex items-center gap-1">
            <MousePointerClick className="h-3 w-3" />
            Click edge to select · Click <Unlink className="h-2.5 w-2.5 inline" /> to disconnect
          </span>

          {/* Save button */}
          <Button
            size="sm"
            className={`text-[10px] h-7 px-3 ${
              hasUnsavedChanges
                ? "bg-amber-500 hover:bg-amber-600 text-black"
                : "bg-muted/30 hover:bg-muted/50 text-muted-foreground"
            }`}
            onClick={() => saveMutation.mutate()}
            disabled={!hasUnsavedChanges || saveMutation.isPending}
            data-testid="button-save-workflow"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Save className="h-3 w-3 mr-1" />
            )}
            {hasUnsavedChanges ? "Save" : "Saved"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="h-[420px] w-full" style={{ background: "hsl(225 28% 7%)" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            edgesUpdatable={true}
            selectNodesOnDrag={false}
            deleteKeyCode={null}
            defaultEdgeOptions={{
              type: "default",
              style: { stroke: "hsl(225 20% 30%)", strokeWidth: 2 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 16,
                height: 16,
                color: "hsl(225 20% 30%)",
              },
            }}
            connectionLineStyle={{ stroke: "hsl(173 80% 50%)", strokeWidth: 2 }}
            className="[&_.react-flow__controls]:bg-card [&_.react-flow__controls]:border-border/50 [&_.react-flow__controls-button]:bg-card [&_.react-flow__controls-button]:border-border/50 [&_.react-flow__controls-button]:text-foreground [&_.react-flow__controls-button:hover]:bg-muted"
          >
            <Background color="hsl(225 20% 18%)" gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main Workflows Page
// ============================================================
export default function WorkflowsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: workflows, isLoading } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
  });

  const selectedWorkflow = workflows?.find((w) => w.id === selectedId) || workflows?.[0] || null;

  const runMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/workflows/${id}/run`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      toast({ title: "Workflow triggered", description: `Pipeline "${data.pipeline.name}" started` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <DashboardLayout title="Workflows" subtitle="Visual pipeline orchestration">
      <div className="flex gap-4 mb-4">
        <CreateWorkflowDialog />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-[500px] w-full" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Workflow List */}
          <div className="space-y-3">
            {workflows && workflows.length > 0 ? (
              workflows.map((wf) => (
                <Card
                  key={wf.id}
                  className={`cursor-pointer border transition-all ${
                    selectedWorkflow?.id === wf.id
                      ? "border-primary/50 bg-primary/5 glow-primary"
                      : "border-border/50 bg-card/80 hover:border-primary/30"
                  }`}
                  onClick={() => setSelectedId(wf.id)}
                  data-testid={`card-workflow-${wf.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-semibold text-foreground">{wf.name}</span>
                      <WorkflowStatusBadge status={wf.status} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                      {wf.description}
                    </p>
                    <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Play className="h-2.5 w-2.5" />
                        {wf.trigger}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[9px] text-muted-foreground">
                      {wf.lastRun && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDistanceToNow(new Date(wf.lastRun), { addSuffix: true })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-2.5 w-2.5" />
                        {wf.successRate}% pass
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No workflows yet. Create your first one.
              </div>
            )}
          </div>

          {/* Workflow Editor */}
          <div className="lg:col-span-3">
            {selectedWorkflow ? (
              <>
                <ReactFlowProvider>
                  <WorkflowEditor
                    key={selectedWorkflow.id}
                    workflow={selectedWorkflow}
                    onRunWorkflow={() => runMutation.mutate(selectedWorkflow.id)}
                    runPending={runMutation.isPending}
                  />
                </ReactFlowProvider>

                {/* Node legend */}
                <div className="flex items-center gap-4 mt-3 px-1">
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    <div className="w-3 h-3 rounded border-2 border-primary/60 bg-primary/10" />
                    Trigger
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    <div className="w-3 h-3 rounded border border-border bg-card" />
                    Step
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    <div className="w-3 h-3 rounded border-2 border-accent/60 bg-accent/10" />
                    OpenClaw
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    <div className="w-3 h-3 rounded border-2 border-emerald-500/60 bg-emerald-500/10" />
                    Deploy
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground ml-2 pl-2 border-l border-border/30">
                    <Cpu className="h-2.5 w-2.5" />
                    Click "Model" on any block to set which AI model to use
                  </div>
                </div>
              </>
            ) : (
              <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-16 text-center">
                  <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground">Create a workflow to get started</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

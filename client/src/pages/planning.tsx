import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Plan, PlanTemplate, Workflow } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  FileText,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Clock,
  ChevronRight,
  MoreVertical,
  Rocket,
  Workflow as WorkflowIcon,
  Bold,
  Italic,
  Heading1,
  List,
  ListChecks,
  Code,
  Minus,
  Archive,
  ClipboardList,
  RefreshCw,
  Copy,
  Save,
  Brain,
} from "lucide-react";

// ---- Status helpers ----
const planStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "text-muted-foreground border-border/40", icon: FileText },
  ready: { label: "Ready", color: "text-blue-400 border-blue-400/30", icon: CheckCircle2 },
  in_progress: { label: "In Progress", color: "text-primary border-primary/30", icon: Loader2 },
  completed: { label: "Completed", color: "text-emerald-400 border-emerald-400/30", icon: CheckCircle2 },
  archived: { label: "Archived", color: "text-gray-500 border-gray-500/30", icon: Archive },
};

const phaseStatusIcon: Record<string, { icon: React.ElementType; color: string }> = {
  running: { icon: Loader2, color: "text-blue-400 animate-spin" },
  success: { icon: CheckCircle2, color: "text-emerald-400" },
  failed: { icon: XCircle, color: "text-red-400" },
  pending: { icon: Clock, color: "text-muted-foreground" },
  cancelled: { icon: Circle, color: "text-gray-500" },
};

// ---- Markdown toolbar ----
function MarkdownToolbar({
  textareaRef,
  onInsert,
  onAnalyze,
  isAnalyzing,
  analyzeDisabled,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsert: (text: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analyzeDisabled: boolean;
}) {
  const wrapSelection = (prefix: string, suffix: string = prefix) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const selected = text.substring(start, end);
    const newText =
      text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    onInsert(newText);
    // Reset cursor
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const insertAtLine = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const text = ta.value;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    onInsert(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const tools = [
    { icon: Bold, label: "Bold", action: () => wrapSelection("**") },
    { icon: Italic, label: "Italic", action: () => wrapSelection("_") },
    { icon: Heading1, label: "Heading 1", action: () => insertAtLine("# ") },
    { icon: List, label: "Bullet List", action: () => insertAtLine("- ") },
    { icon: ListChecks, label: "Task", action: () => insertAtLine("- [ ] ") },
    { icon: Code, label: "Code Block", action: () => wrapSelection("\n```\n", "\n```\n") },
    { icon: Minus, label: "Divider", action: () => insertAtLine("\n---\n") },
  ];

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/40 bg-card/40">
      {tools.map((tool) => (
        <Tooltip key={tool.label}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-primary/10"
              onClick={tool.action}
              data-testid={`toolbar-${tool.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <tool.icon className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">
            {tool.label}
          </TooltipContent>
        </Tooltip>
      ))}
      <div className="ml-auto flex items-center gap-2">
        <Separator orientation="vertical" className="h-4 bg-border/40" />
        <Button
          size="sm"
          className="text-[11px] h-7 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={onAnalyze}
          disabled={isAnalyzing || analyzeDisabled}
          data-testid="button-analyze-plan"
        >
          {isAnalyzing ? (
            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
          ) : (
            <Brain className="h-3 w-3 mr-1.5" />
          )}
          Analyze with AI
        </Button>
      </div>
    </div>
  );
}

// ---- Plan List Panel (Left) ----
function PlanListPanel({
  plans,
  selectedPlanId,
  onSelect,
  onCreateFromTemplate,
  templates,
  isLoading,
}: {
  plans: Plan[];
  selectedPlanId: string | null;
  onSelect: (id: string) => void;
  onCreateFromTemplate: (templateId: string, title: string) => void;
  templates: PlanTemplate[];
  isLoading: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    onCreateFromTemplate(selectedTemplate, newTitle.trim());
    setNewTitle("");
    setSelectedTemplate("");
    setCreateOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Plans</span>
          <Badge variant="outline" className="text-[9px] border-border/40 text-muted-foreground">
            {plans.length}
          </Badge>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
              data-testid="create-plan-btn"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/60">
            <DialogHeader>
              <DialogTitle className="text-sm">Create Plan</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1.5 block">Title</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="My Project Plan"
                  className="text-xs bg-background"
                  data-testid="plan-title-input"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1.5 block">Template</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="text-xs bg-background" data-testid="template-select">
                    <SelectValue placeholder="Blank (no template)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">Blank</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                size="sm"
                className="text-xs"
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                data-testid="confirm-create-plan"
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-xs text-muted-foreground">No plans yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Create a plan from a template to get started
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {plans.map((plan) => {
              const statusCfg = planStatusConfig[plan.status] || planStatusConfig.draft;
              const StatusIcon = statusCfg.icon;
              const isActive = plan.id === selectedPlanId;
              return (
                <button
                  key={plan.id}
                  onClick={() => onSelect(plan.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md border transition-all duration-200 ${
                    isActive
                      ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                      : "bg-transparent border-transparent hover:bg-card/60 hover:border-border/30"
                  }`}
                  data-testid={`plan-item-${plan.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-foreground block truncate">
                        {plan.title}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusIcon
                          className={`h-3 w-3 shrink-0 ${statusCfg.color.split(" ")[0]}`}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {statusCfg.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">
                          · {plan.phases.length} phases
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 mt-0.5 transition-colors ${
                        isActive ? "text-primary" : "text-muted-foreground/30"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ---- Phase Panel (Right) ----
function PhasePanel({
  plan,
  workflows,
  onAssignWorkflow,
  onLaunchPhase,
  launchingPhaseId,
}: {
  plan: Plan;
  workflows: Workflow[];
  onAssignWorkflow: (phaseId: string, workflowId: string | undefined) => void;
  onLaunchPhase: (phaseId: string) => void;
  launchingPhaseId: string | null;
}) {
  if (plan.phases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <Brain className="h-6 w-6 text-primary/40 mb-2" />
        <p className="text-xs text-muted-foreground">No phases yet</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1 leading-relaxed max-w-[200px]">
          Write your plan in the editor, then click
          <span className="text-primary"> Analyze with AI</span> to
          auto-generate phases
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-3">
        {plan.phases.map((phase, idx) => {
          const pStatus = phase.pipelineStatus
            ? phaseStatusIcon[phase.pipelineStatus] || phaseStatusIcon.pending
            : null;

          return (
            <Card
              key={phase.id}
              className="border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden"
              data-testid={`phase-card-${phase.id}`}
            >
              <CardContent className="p-3">
                {/* Phase header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center h-5 w-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <span className="text-xs font-medium text-foreground truncate flex-1">
                    {phase.title}
                  </span>
                  {pStatus && (
                    <pStatus.icon className={`h-3.5 w-3.5 shrink-0 ${pStatus.color}`} />
                  )}
                </div>

                {/* Tasks */}
                {phase.tasks.length > 0 && (
                  <div className="mb-2.5 ml-7">
                    {phase.tasks.slice(0, 4).map((task, ti) => (
                      <div
                        key={ti}
                        className="flex items-start gap-1.5 py-0.5"
                      >
                        <div className="h-3 w-3 mt-0.5 rounded-sm border border-border/40 shrink-0" />
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {task}
                        </span>
                      </div>
                    ))}
                    {phase.tasks.length > 4 && (
                      <span className="text-[9px] text-muted-foreground/50 ml-4.5">
                        +{phase.tasks.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                <Separator className="mb-2.5 bg-border/20" />

                {/* Workflow selector */}
                <div className="flex flex-col gap-1.5 mb-2">
                  <label className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
                    <WorkflowIcon className="h-3 w-3" />
                    Workflow
                  </label>
                  <Select
                    value={phase.workflowId || "none"}
                    onValueChange={(v) =>
                      onAssignWorkflow(phase.id, v === "none" ? undefined : v)
                    }
                  >
                    <SelectTrigger
                      className="h-7 text-[11px] bg-background border-border/40"
                      data-testid={`workflow-select-${phase.id}`}
                    >
                      <SelectValue placeholder="Select workflow..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {workflows.map((wf) => (
                        <SelectItem key={wf.id} value={wf.id}>
                          {wf.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pipeline status or launch */}
                {phase.pipelineId ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/50 border border-border/20">
                    {pStatus && (
                      <pStatus.icon className={`h-3 w-3 ${pStatus.color}`} />
                    )}
                    <span className="text-[10px] text-muted-foreground flex-1">
                      Pipeline{" "}
                      <span className="text-foreground font-medium">
                        {phase.pipelineStatus || "pending"}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[8px] border-border/30 text-muted-foreground/60"
                    >
                      {phase.pipelineId.slice(0, 8)}
                    </Badge>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-[11px] border-border/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
                    disabled={!phase.workflowId || launchingPhaseId === phase.id}
                    onClick={() => onLaunchPhase(phase.id)}
                    data-testid={`launch-phase-${phase.id}`}
                  >
                    {launchingPhaseId === phase.id ? (
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    ) : (
                      <Rocket className="h-3 w-3 mr-1.5" />
                    )}
                    Launch Pipeline
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ---- Main Planning Page ----
export default function PlanningPage() {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [launchingPhaseId, setLaunchingPhaseId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Queries ----
  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: templates = [] } = useQuery<PlanTemplate[]>({
    queryKey: ["/api/plans/templates"],
  });

  const { data: workflows = [] } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
  });

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // Sync editor when selected plan changes
  useEffect(() => {
    if (selectedPlan) {
      setEditorContent(selectedPlan.markdown);
      setEditorTitle(selectedPlan.title);
      setIsDirty(false);
    }
  }, [selectedPlan?.id, selectedPlan?.updatedAt]);

  // ---- Mutations ----
  const createPlanMutation = useMutation({
    mutationFn: async ({ title, template }: { title: string; template: string }) => {
      const res = await apiRequest("POST", "/api/plans", { title, template: template || undefined });
      return res.json();
    },
    onSuccess: (plan: Plan) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setSelectedPlanId(plan.id);
      toast({ title: "Plan created", description: plan.title });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/plans/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsDirty(false);
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      if (selectedPlanId) setSelectedPlanId(null);
      toast({ title: "Plan deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const launchPhaseMutation = useMutation({
    mutationFn: async ({ planId, phaseId }: { planId: string; phaseId: string }) => {
      const res = await apiRequest("POST", `/api/plans/${planId}/phases/${phaseId}/launch`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      setLaunchingPhaseId(null);
      toast({ title: "Pipeline launched", description: "Check the Pipelines tab for details" });
    },
    onError: (err: Error) => {
      setLaunchingPhaseId(null);
      toast({ title: "Launch failed", description: err.message, variant: "destructive" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (planId: string) => {
      // Save current content first
      await apiRequest("PATCH", `/api/plans/${planId}`, {
        title: editorTitle,
        markdown: editorContent,
      });
      // Then analyze
      const res = await apiRequest("POST", `/api/plans/${planId}/analyze`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsDirty(false);
      toast({
        title: "Plan analyzed",
        description: `${data.phases.length} phases identified (${data.source === "openclaw" ? "ZeroClaw AI" : "Built-in analyzer"})`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  // ---- Handlers ----
  const handleSave = useCallback(() => {
    if (!selectedPlanId || !isDirty) return;
    updatePlanMutation.mutate({
      id: selectedPlanId,
      data: { title: editorTitle, markdown: editorContent },
    });
  }, [selectedPlanId, editorContent, editorTitle, isDirty]);

  // Auto-save with debounce
  const handleEditorChange = (newContent: string) => {
    setEditorContent(newContent);
    setIsDirty(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (!selectedPlanId) return;
      updatePlanMutation.mutate({
        id: selectedPlanId,
        data: { title: editorTitle, markdown: newContent },
      });
    }, 1500);
  };

  const handleTitleChange = (newTitle: string) => {
    setEditorTitle(newTitle);
    setIsDirty(true);
  };

  const handleAssignWorkflow = (phaseId: string, workflowId: string | undefined) => {
    if (!selectedPlan) return;
    const updatedPhases = selectedPlan.phases.map((p) =>
      p.id === phaseId ? { ...p, workflowId } : p
    );
    updatePlanMutation.mutate({
      id: selectedPlan.id,
      data: { phases: updatedPhases },
    });
  };

  const handleLaunchPhase = (phaseId: string) => {
    if (!selectedPlanId) return;
    setLaunchingPhaseId(phaseId);
    launchPhaseMutation.mutate({ planId: selectedPlanId, phaseId });
  };

  const handleStatusChange = (status: string) => {
    if (!selectedPlanId) return;
    updatePlanMutation.mutate({ id: selectedPlanId, data: { status } });
  };

  return (
    <DashboardLayout title="Planning" subtitle="Create plans, assign workflows, and launch pipelines">
      <div className="flex gap-4 h-[calc(100vh-8rem)]" data-testid="planning-page">
        {/* Left Panel — Plan List */}
        <div className="w-64 shrink-0 border border-border/30 rounded-lg bg-card/40 backdrop-blur-sm overflow-hidden">
          <PlanListPanel
            plans={plans}
            selectedPlanId={selectedPlanId}
            onSelect={setSelectedPlanId}
            onCreateFromTemplate={(templateId, title) =>
              createPlanMutation.mutate({ title, template: templateId })
            }
            templates={templates}
            isLoading={plansLoading}
          />
        </div>

        {/* Center Panel — Editor */}
        <div className="flex-1 min-w-0 border border-border/30 rounded-lg bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col">
          {selectedPlan ? (
            <>
              {/* Editor header */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40">
                <Input
                  value={editorTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-sm font-semibold bg-transparent border-none shadow-none h-7 px-0 focus-visible:ring-0"
                  data-testid="plan-title-edit"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  {isDirty && (
                    <span className="text-[9px] text-primary/60 uppercase tracking-wider">
                      unsaved
                    </span>
                  )}
                  <Select value={selectedPlan.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-6 w-[100px] text-[10px] bg-background/50 border-border/30" data-testid="plan-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                    onClick={handleSave}
                    disabled={!isDirty || updatePlanMutation.isPending}
                    data-testid="save-plan-btn"
                  >
                    {updatePlanMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        data-testid="plan-menu-btn"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(editorContent);
                          toast({ title: "Copied to clipboard" });
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-2" />
                        Copy Markdown
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs text-red-400 focus:text-red-400"
                        onClick={() => selectedPlanId && deletePlanMutation.mutate(selectedPlanId)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete Plan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Toolbar */}
              <MarkdownToolbar
                textareaRef={textareaRef}
                onInsert={(text) => {
                  setEditorContent(text);
                  setIsDirty(true);
                  handleEditorChange(text);
                }}
                onAnalyze={() => selectedPlanId && analyzeMutation.mutate(selectedPlanId)}
                isAnalyzing={analyzeMutation.isPending}
                analyzeDisabled={!editorContent.trim()}
              />

              {/* Textarea editor */}
              <div className="flex-1 overflow-hidden">
                <Textarea
                  ref={textareaRef}
                  value={editorContent}
                  onChange={(e) => handleEditorChange(e.target.value)}
                  className="h-full w-full resize-none border-none bg-transparent text-xs leading-relaxed font-mono p-4 focus-visible:ring-0 rounded-none"
                  placeholder="Describe your project plan here...&#10;&#10;Write freely — ZeroClaw will analyze your plan and break it into phases automatically.&#10;&#10;Example:&#10;I want to build a mobile app with user auth, a REST API, push notifications, and deploy to App Store and Play Store."
                  data-testid="plan-editor"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Plan your project</p>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                Select a plan from the list or create a new one from a template.
                Write your plan in markdown, define phases, assign workflows, and
                launch pipelines directly from here.
              </p>
            </div>
          )}
        </div>

        {/* Right Panel — Phases */}
        <div className="w-72 shrink-0 border border-border/30 rounded-lg bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-3 py-3 border-b border-border/40">
            <Rocket className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Phases</span>
            {selectedPlan && (
              <Badge variant="outline" className="text-[9px] border-border/40 text-muted-foreground ml-auto">
                {selectedPlan.phases.length}
              </Badge>
            )}
          </div>
          {selectedPlan ? (
            <PhasePanel
              plan={selectedPlan}
              workflows={workflows}
              onAssignWorkflow={handleAssignWorkflow}
              onLaunchPhase={handleLaunchPhase}
              launchingPhaseId={launchingPhaseId}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <Rocket className="h-6 w-6 text-muted-foreground/20 mb-2" />
              <p className="text-[10px] text-muted-foreground/50">
                Select a plan to see its phases
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

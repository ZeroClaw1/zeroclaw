import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import type { WebhookConfig, Workflow } from "@shared/schema";
import {
  Webhook,
  Plus,
  Trash2,
  Play,
  GitBranch,
  Clock,
  Zap,
  Copy,
  Check,
  Link,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const eventColors: Record<string, string> = {
  push: "border-emerald-400/40 text-emerald-400",
  pull_request: "border-blue-400/40 text-blue-400",
  release: "border-purple-400/40 text-purple-400",
  workflow_dispatch: "border-amber-400/40 text-amber-400",
};

function AddWebhookDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [event, setEvent] = useState<WebhookConfig["event"]>("push");
  const [branch, setBranch] = useState("main");
  const [workflowId, setWorkflowId] = useState("");
  const { toast } = useToast();

  const { data: workflows } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; event: string; branch: string; workflowId: string }) => {
      const res = await apiRequest("POST", "/api/webhooks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      setOpen(false);
      setName("");
      setEvent("push");
      setBranch("main");
      setWorkflowId("");
      toast({ title: "Webhook created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create webhook", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-[11px] h-7" data-testid="button-add-webhook">
          <Plus className="h-3 w-3" /> Add Webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50" data-testid="dialog-add-webhook">
        <DialogHeader>
          <DialogTitle className="text-sm">Add Webhook</DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground">
            Configure a webhook to trigger workflows from GitHub events.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] text-muted-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Deploy on Push"
              className="h-8 text-xs bg-background/50"
              data-testid="input-webhook-name"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Event Type</Label>
            <Select value={event} onValueChange={(v) => setEvent(v as WebhookConfig["event"])}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-webhook-event">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="push">push</SelectItem>
                <SelectItem value="pull_request">pull_request</SelectItem>
                <SelectItem value="release">release</SelectItem>
                <SelectItem value="workflow_dispatch">workflow_dispatch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Branch Pattern</Label>
            <Input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main, *, feat/*"
              className="h-8 text-xs font-mono bg-background/50"
              data-testid="input-webhook-branch"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Workflow</Label>
            <Select value={workflowId} onValueChange={setWorkflowId}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-webhook-workflow">
                <SelectValue placeholder="Select a workflow" />
              </SelectTrigger>
              <SelectContent>
                {workflows?.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            size="sm"
            className="text-[11px] h-7"
            onClick={() => createMutation.mutate({ name, event, branch, workflowId })}
            disabled={!name || !workflowId || createMutation.isPending}
            data-testid="button-create-webhook"
          >
            {createMutation.isPending ? "Creating..." : "Create Webhook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WebhooksPage() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: webhooks, isLoading } = useQuery<WebhookConfig[]>({
    queryKey: ["/api/webhooks"],
  });

  const { data: workflows } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiRequest("PATCH", `/api/webhooks/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Webhook deleted" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (wh: WebhookConfig) => {
      const res = await apiRequest("POST", "/api/webhooks/github", {
        ref: `refs/heads/${wh.branch === "*" ? "main" : wh.branch}`,
        head_commit: { id: "abc1234567890" },
      });
      return res.json();
    },
    onSuccess: (data: { matchedCount: number }) => {
      toast({
        title: "Webhook test sent",
        description: `${data.matchedCount} workflow(s) triggered`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
    },
  });

  const webhookUrl = `${window.location.origin}/api/webhooks/github`;

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWorkflowName = (id: string) =>
    workflows?.find((w) => w.id === id)?.name || id;

  return (
    <DashboardLayout title="Webhooks" subtitle="Configure webhook triggers for automated pipeline execution">
      <div className="space-y-4">
        {/* Webhook URL Section */}
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <Link className="h-3.5 w-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-muted-foreground block">GitHub Webhook Endpoint</span>
                <code className="text-[11px] font-mono text-foreground break-all" data-testid="text-webhook-url">
                  POST {webhookUrl}
                </code>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[10px] shrink-0"
                onClick={handleCopyUrl}
                data-testid="button-copy-webhook-url"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            <span className="text-[11px] text-muted-foreground">
              {webhooks?.length || 0} webhook{(webhooks?.length || 0) !== 1 ? "s" : ""} configured
            </span>
          </div>
          <AddWebhookDialog />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : !webhooks || webhooks.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Webhook className="h-8 w-8 mb-2 opacity-40" />
                <span className="text-[11px]">No webhooks configured</span>
                <span className="text-[9px] mt-1">Add a webhook to trigger workflows from GitHub events</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh) => (
              <Card
                key={wh.id}
                className={`bg-card/80 backdrop-blur-sm border-border/50 ${!wh.enabled ? "opacity-50" : ""}`}
                data-testid={`webhook-card-${wh.id}`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px] font-semibold text-foreground">{wh.name}</span>
                        <Badge variant="outline" className={`text-[9px] ${eventColors[wh.event] || ""}`}>
                          {wh.event}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          <code className="font-mono">{wh.branch}</code>
                        </span>
                        <span className="flex items-center gap-1">
                          → {getWorkflowName(wh.workflowId)}
                        </span>
                        {wh.lastTriggered && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(wh.lastTriggered), { addSuffix: true })}
                          </span>
                        )}
                        <span className="text-[9px]">
                          {wh.triggerCount} trigger{wh.triggerCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={wh.enabled}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: wh.id, enabled: checked })}
                        data-testid={`switch-webhook-${wh.id}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-primary/60 hover:text-primary"
                        onClick={() => testMutation.mutate(wh)}
                        disabled={!wh.enabled || testMutation.isPending}
                        data-testid={`button-test-webhook-${wh.id}`}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-400/60 hover:text-red-400"
                        onClick={() => deleteMutation.mutate(wh.id)}
                        data-testid={`button-delete-webhook-${wh.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

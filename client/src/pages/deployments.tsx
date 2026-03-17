import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowStatusBadge } from "@/components/status-badge";
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
import type { Deployment, Pipeline } from "@shared/schema";
import {
  Rocket,
  ExternalLink,
  Clock,
  User,
  Globe,
  Server,
  Code,
  RefreshCw,
  Plus,
  Loader2,
  Undo2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const envConfig: Record<string, { color: string; icon: React.ElementType }> = {
  production: { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: Globe },
  staging: { color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Server },
  development: { color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Code },
};

function DeployDialog() {
  const [open, setOpen] = useState(false);
  const [pipelineId, setPipelineId] = useState("");
  const [environment, setEnvironment] = useState<"production" | "staging" | "development">("staging");
  const [version, setVersion] = useState("");
  const [url, setUrl] = useState("");
  const { toast } = useToast();

  const { data: pipelines } = useQuery<Pipeline[]>({
    queryKey: ["/api/pipelines"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/deployments", {
        pipelineId,
        environment,
        version,
        url: url || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      setOpen(false);
      setPipelineId("");
      setVersion("");
      setUrl("");
      toast({ title: "Deployment started", description: `Deploying v${data.version} to ${data.environment}` });
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
          data-testid="button-new-deploy"
        >
          <Rocket className="h-3.5 w-3.5 mr-1.5" />
          Deploy Now
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Trigger Deployment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline</Label>
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/40" data-testid="select-deploy-pipeline">
                <SelectValue placeholder="Select a pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Environment</Label>
            <Select value={environment} onValueChange={(v: any) => setEnvironment(v)}>
              <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/40" data-testid="select-deploy-env">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Version</Label>
            <Input
              placeholder="e.g. 2.5.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/40 font-mono"
              data-testid="input-deploy-version"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">URL (optional)</Label>
            <Input
              placeholder="https://myapp.dev"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/40 font-mono"
              data-testid="input-deploy-url"
            />
          </div>
          <Button
            className="w-full text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => createMutation.mutate()}
            disabled={!pipelineId || !version || createMutation.isPending}
            data-testid="button-create-deploy"
          >
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5 mr-1.5" />}
            Start Deployment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DeploymentsPage() {
  const [rollbackTarget, setRollbackTarget] = useState<Deployment | null>(null);
  const { toast } = useToast();

  const { data: deployments, isLoading } = useQuery<Deployment[]>({
    queryKey: ["/api/deployments"],
  });

  const rollbackMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/deployments/${id}/rollback`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      setRollbackTarget(null);
      toast({ title: "Rollback initiated", description: `Rolling back to ${data.version} in ${data.environment}` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <DashboardLayout title="Deployments" subtitle="Deployment history and status">
      <div className="flex gap-4 mb-4">
        <DeployDialog />
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-border/40 text-muted-foreground hover:text-foreground"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/deployments"] })}
          data-testid="button-refresh-deploys"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Environment summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(["production", "staging", "development"] as const).map((env) => {
          const envDeps = deployments?.filter((d) => d.environment === env) || [];
          const latest = envDeps[0];
          const config = envConfig[env];
          const EnvIcon = config.icon;

          return (
            <Card key={env} className="border border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <EnvIcon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground capitalize">{env}</span>
                  </div>
                  <Badge variant="outline" className={`text-[9px] uppercase tracking-wider border ${config.color}`}>
                    {envDeps.length} deploy{envDeps.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : latest ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{latest.version}</span>
                      <WorkflowStatusBadge status={latest.status} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {latest.pipelineName} · {formatDistanceToNow(new Date(latest.deployedAt), { addSuffix: true })}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No deployments</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Deployment table */}
      <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Deployment History
            {deployments && (
              <Badge variant="outline" className="text-[9px] border-border/40 text-muted-foreground ml-auto">
                {deployments.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border/40 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
            <div className="col-span-3">Pipeline</div>
            <div className="col-span-2">Environment</div>
            <div className="col-span-1">Version</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Deployed By</div>
            <div className="col-span-2">Time</div>
            <div className="col-span-1">Actions</div>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : deployments && deployments.length > 0 ? (
            deployments.map((dep) => {
              const config = envConfig[dep.environment];
              return (
                <div
                  key={dep.id}
                  className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors items-center"
                  data-testid={`deploy-row-${dep.id}`}
                >
                  <div className="col-span-3">
                    <span className="text-xs font-medium text-foreground">{dep.pipelineName}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[9px] uppercase tracking-wider border ${config.color}`}>
                      {dep.environment}
                    </Badge>
                    {dep.isRollback && (
                      <Badge variant="outline" className="text-[8px] border-purple-500/30 text-purple-400 flex items-center gap-0.5">
                        <Undo2 className="h-2 w-2" />
                        Rollback
                      </Badge>
                    )}
                  </div>
                  <div className="col-span-1">
                    <span className="text-[11px] font-mono text-primary">{dep.version}</span>
                  </div>
                  <div className="col-span-1">
                    <WorkflowStatusBadge status={dep.status} />
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-foreground">{dep.deployedBy}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(dep.deployedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center gap-1 justify-end">
                    {dep.url && (
                      <a
                        href={dep.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                        data-testid={`deploy-link-${dep.id}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {!dep.isRollback && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-purple-400"
                        onClick={() => setRollbackTarget(dep)}
                        data-testid={`button-rollback-${dep.id}`}
                      >
                        <Undo2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No deployments yet. Deploy from a successful pipeline.
            </div>
          )}
        </CardContent>
      </Card>
      {/* Rollback Confirmation Dialog */}
      <Dialog open={!!rollbackTarget} onOpenChange={(v) => { if (!v) setRollbackTarget(null); }}>
        <DialogContent className="max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Undo2 className="h-4 w-4 text-purple-400" />
              Confirm Rollback
            </DialogTitle>
          </DialogHeader>
          {rollbackTarget && (
            <div className="space-y-4 mt-2">
              <p className="text-xs text-muted-foreground">
                Rollback to <span className="font-mono text-primary font-semibold">v{rollbackTarget.version}</span> in{" "}
                <span className="font-semibold text-foreground capitalize">{rollbackTarget.environment}</span>?
              </p>
              <p className="text-[10px] text-muted-foreground">
                This will create a new deployment with the configuration from this version.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setRollbackTarget(null)}
                  data-testid="button-cancel-rollback"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => rollbackMutation.mutate(rollbackTarget.id)}
                  disabled={rollbackMutation.isPending}
                  data-testid="button-confirm-rollback"
                >
                  {rollbackMutation.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : (
                    <Undo2 className="h-3 w-3 mr-1.5" />
                  )}
                  Rollback
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

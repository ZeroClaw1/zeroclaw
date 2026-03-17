import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AuditLogEntry } from "@shared/schema";
import {
  ScrollText,
  Search,
  Trash2,
  Loader2,
  GitBranch,
  Bot,
  Workflow,
  Rocket,
  KeyRound,
  Webhook,
  Settings,
  Package,
  ClipboardList,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const actionColors: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  update: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  delete: "bg-red-500/15 text-red-400 border-red-500/30",
  execute: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  rollback: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  install: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  configure: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const resourceIcons: Record<string, React.ElementType> = {
  pipeline: GitBranch,
  agent: Bot,
  workflow: Workflow,
  deployment: Rocket,
  secret: KeyRound,
  webhook: Webhook,
  setting: Settings,
  skill: Package,
  plan: ClipboardList,
};

const resourceTypes = ["all", "pipeline", "agent", "workflow", "deployment", "secret", "webhook", "setting", "skill", "plan"] as const;
const actionTypes = ["all", "create", "update", "delete", "execute", "rollback", "install", "configure"] as const;

export default function AuditLogPage() {
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const { toast } = useToast();

  const queryParams = new URLSearchParams();
  if (resourceFilter !== "all") queryParams.set("resource", resourceFilter);
  if (actionFilter !== "all") queryParams.set("action", actionFilter);
  const qs = queryParams.toString();

  const { data: entries, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/audit-log", resourceFilter, actionFilter],
    queryFn: async () => {
      const res = await fetch(`/api/audit-log${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch audit log");
      return res.json();
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/audit-log");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-log"] });
      setConfirmClear(false);
      toast({ title: "Audit log cleared" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = entries?.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.resourceName.toLowerCase().includes(q) ||
      e.details.toLowerCase().includes(q) ||
      e.user.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout title="Audit Log" subtitle="Track all dashboard actions">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="h-8 w-40 text-xs bg-muted/20 border-border/40" data-testid="select-audit-resource">
            <SelectValue placeholder="Resource type" />
          </SelectTrigger>
          <SelectContent>
            {resourceTypes.map((r) => (
              <SelectItem key={r} value={r}>
                {r === "all" ? "All Resources" : r.charAt(0).toUpperCase() + r.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-8 w-40 text-xs bg-muted/20 border-border/40" data-testid="select-audit-action">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            {actionTypes.map((a) => (
              <SelectItem key={a} value={a}>
                {a === "all" ? "All Actions" : a.charAt(0).toUpperCase() + a.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-muted/20 border-border/40 pl-8"
            data-testid="input-audit-search"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 ml-auto"
          onClick={() => setConfirmClear(true)}
          data-testid="button-clear-audit-log"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Clear Log
        </Button>
      </div>

      {/* Audit log table */}
      <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            Event History
            {filtered && (
              <Badge variant="outline" className="text-[9px] border-border/40 text-muted-foreground ml-auto">
                {filtered.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border/40 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
            <div className="col-span-2">Timestamp</div>
            <div className="col-span-1">Action</div>
            <div className="col-span-2">Resource</div>
            <div className="col-span-2">Name</div>
            <div className="col-span-4">Details</div>
            <div className="col-span-1">User</div>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered && filtered.length > 0 ? (
            filtered.map((entry) => {
              const ResourceIcon = resourceIcons[entry.resource] || ScrollText;
              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors items-center"
                  data-testid={`audit-row-${entry.id}`}
                >
                  <div className="col-span-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] text-muted-foreground cursor-default">
                          {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px]">
                        {format(new Date(entry.timestamp), "PPpp")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="col-span-1">
                    <Badge
                      variant="outline"
                      className={`text-[8px] uppercase tracking-wider border ${actionColors[entry.action] || ""}`}
                    >
                      {entry.action}
                    </Badge>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <ResourceIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-foreground capitalize">{entry.resource}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-foreground font-medium truncate block">{entry.resourceName}</span>
                  </div>
                  <div className="col-span-4">
                    <span className="text-[10px] text-muted-foreground truncate block">{entry.details}</span>
                  </div>
                  <div className="col-span-1">
                    <span className="text-[10px] text-foreground">{entry.user}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No audit log entries found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clear confirmation dialog */}
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-400" />
              Clear Audit Log
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Are you sure you want to clear the entire audit log? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setConfirmClear(false)}
                data-testid="button-cancel-clear"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white"
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
                data-testid="button-confirm-clear"
              >
                {clearMutation.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 mr-1.5" />
                )}
                Clear All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

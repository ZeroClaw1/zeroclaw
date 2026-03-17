import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkflowStatus, AgentStatus } from "@shared/schema";

const workflowStatusConfig: Record<WorkflowStatus, { label: string; className: string }> = {
  running: { label: "Running", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  success: { label: "Success", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  failed: { label: "Failed", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  pending: { label: "Pending", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  cancelled: { label: "Cancelled", className: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
};

const agentStatusConfig: Record<AgentStatus, { label: string; className: string; dotColor: string }> = {
  online: { label: "Online", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-400" },
  offline: { label: "Offline", className: "bg-gray-500/15 text-gray-400 border-gray-500/30", dotColor: "bg-gray-400" },
  busy: { label: "Busy", className: "bg-amber-500/15 text-amber-400 border-amber-500/30", dotColor: "bg-amber-400" },
  error: { label: "Error", className: "bg-red-500/15 text-red-400 border-red-500/30", dotColor: "bg-red-400" },
};

export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  const config = workflowStatusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 border",
        config.className,
        status === "running" && "pulse-live"
      )}
    >
      {status === "running" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-pulse" />
      )}
      {config.label}
    </Badge>
  );
}

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const config = agentStatusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 border",
        config.className
      )}
    >
      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5", config.dotColor, status === "online" && "animate-pulse")} />
      {config.label}
    </Badge>
  );
}

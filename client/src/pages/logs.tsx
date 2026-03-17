import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useWebSocket, type WSMessage } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import type { ActivityEvent } from "@shared/schema";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Terminal,
  Trash2,
  Pause,
  Play,
  ArrowDownToLine,
  Lock,
  Unlock,
} from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "success" | "error" | "warning" | "openclaw" | "info";
  category: string;
  message: string;
}

const MAX_LINES = 500;

const levelColors: Record<LogEntry["level"], string> = {
  success: "text-teal-400",
  error: "text-red-400",
  warning: "text-yellow-400",
  openclaw: "text-purple-400",
  info: "text-gray-400",
};

const categoryFilters = ["All", "Pipelines", "Agents", "Deployments", "OpenClaw", "Errors"] as const;
type CategoryFilter = (typeof categoryFilters)[number];

function formatTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function classifyEvent(event: string, data: any): { level: LogEntry["level"]; category: string } {
  if (event.startsWith("pipeline:")) {
    if (data?.status === "failed" || data?.status === "error") {
      return { level: "error", category: "Pipelines" };
    }
    if (data?.status === "success") {
      return { level: "success", category: "Pipelines" };
    }
    if (data?.status === "pending" || data?.status === "running") {
      return { level: "warning", category: "Pipelines" };
    }
    return { level: "info", category: "Pipelines" };
  }
  if (event.startsWith("agent:")) {
    return { level: "info", category: "Agents" };
  }
  if (event.startsWith("deployment:")) {
    if (data?.status === "failed") return { level: "error", category: "Deployments" };
    if (data?.status === "success") return { level: "success", category: "Deployments" };
    return { level: "info", category: "Deployments" };
  }
  if (event.startsWith("gateway:") || event.startsWith("openclaw:")) {
    if (event.includes("error")) return { level: "error", category: "OpenClaw" };
    return { level: "openclaw", category: "OpenClaw" };
  }
  if (event === "notification") {
    if (data?.type === "error") return { level: "error", category: "Errors" };
    if (data?.type === "warning") return { level: "warning", category: "Errors" };
    return { level: "info", category: "Pipelines" };
  }
  if (event === "connected") {
    return { level: "openclaw", category: "OpenClaw" };
  }
  return { level: "info", category: "Pipelines" };
}

function activityToLogEntry(ev: ActivityEvent): LogEntry {
  let level: LogEntry["level"] = "info";
  if (ev.status === "success") level = "success";
  else if (ev.status === "failed") level = "error";
  else if (ev.status === "running" || ev.status === "pending") level = "warning";
  if (ev.type === "openclaw") level = "openclaw";

  const categoryMap: Record<string, string> = {
    pipeline: "Pipelines",
    deployment: "Deployments",
    agent: "Agents",
    openclaw: "OpenClaw",
  };

  return {
    id: ev.id,
    timestamp: ev.timestamp,
    level,
    category: categoryMap[ev.type] || "Pipelines",
    message: ev.message,
  };
}

function formatWSMessage(event: string, data: any): string {
  switch (event) {
    case "connected":
      return "WebSocket connection established";
    case "pipeline:status":
      return `Pipeline "${data?.name || data?.pipelineId || "unknown"}" → ${data?.status || "updated"}`;
    case "pipeline:step":
      return `Step "${data?.stepName || data?.stepId || "unknown"}" → ${data?.status || "updated"} (${data?.pipelineName || data?.pipelineId || ""})`;
    case "pipeline:log":
      return `[${data?.stepId || "step"}] ${data?.line || ""}`;
    case "notification":
      return `${data?.title || "Notification"}: ${data?.message || ""}`;
    case "gateway:health":
      return `Gateway health: ${data?.status || "unknown"} (${data?.latency || ""})`;
    case "gateway:response":
      return `Gateway response received: ${JSON.stringify(data?.response || {}).slice(0, 100)}`;
    case "gateway:error":
      return `Gateway error: ${data?.message || "unknown error"}`;
    default:
      return `[${event}] ${JSON.stringify(data).slice(0, 150)}`;
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>("All");
  const [paused, setPaused] = useState(false);
  const [scrollLock, setScrollLock] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Seed from activity on mount
  const { data: activity } = useQuery<ActivityEvent[]>({
    queryKey: ["/api/activity"],
  });

  useEffect(() => {
    if (activity && activity.length > 0 && logs.length === 0) {
      const seedLogs = activity.slice(0, 20).reverse().map(activityToLogEntry);
      setLogs(seedLogs);
    }
  }, [activity]);

  const handleWSMessage = useCallback((msg: WSMessage) => {
    if (pausedRef.current) return;

    const { level, category } = classifyEvent(msg.event, msg.data);
    const message = formatWSMessage(msg.event, msg.data);

    const entry: LogEntry = {
      id: `ws-${++counterRef.current}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
    };

    setLogs((prev) => {
      const next = [...prev, entry];
      if (next.length > MAX_LINES) {
        return next.slice(next.length - MAX_LINES);
      }
      return next;
    });
  }, []);

  useWebSocket(handleWSMessage);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!scrollLock && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, scrollLock]);

  const filteredLogs =
    filter === "All"
      ? logs
      : filter === "Errors"
        ? logs.filter((l) => l.level === "error")
        : logs.filter((l) => l.category === filter);

  const clearLogs = () => setLogs([]);

  return (
    <DashboardLayout title="Logs" subtitle="Real-time system event terminal">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1" data-testid="log-filters">
          {categoryFilters.map((cat) => (
            <Button
              key={cat}
              data-testid={`filter-${cat.toLowerCase()}`}
              variant={filter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(cat)}
              className={`text-[10px] h-7 px-2.5 ${
                filter === cat
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-card/50 border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="flex-1" />

        <Button
          data-testid="btn-scroll-lock"
          variant="outline"
          size="sm"
          onClick={() => setScrollLock(!scrollLock)}
          className="text-[10px] h-7 px-2.5 bg-card/50 border-border/50 text-muted-foreground hover:text-foreground"
        >
          {scrollLock ? (
            <Lock className="h-3 w-3 mr-1.5" />
          ) : (
            <Unlock className="h-3 w-3 mr-1.5" />
          )}
          {scrollLock ? "Scroll Locked" : "Auto-Scroll"}
        </Button>

        <Button
          data-testid="btn-pause-logs"
          variant="outline"
          size="sm"
          onClick={() => setPaused(!paused)}
          className={`text-[10px] h-7 px-2.5 border-border/50 ${
            paused
              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
              : "bg-card/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          {paused ? (
            <Play className="h-3 w-3 mr-1.5" />
          ) : (
            <Pause className="h-3 w-3 mr-1.5" />
          )}
          {paused ? "Resume" : "Pause"}
        </Button>

        <Button
          data-testid="btn-clear-logs"
          variant="outline"
          size="sm"
          onClick={clearLogs}
          className="text-[10px] h-7 px-2.5 bg-card/50 border-border/50 text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="h-3 w-3 mr-1.5" />
          Clear
        </Button>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        data-testid="log-terminal"
        className="flex-1 bg-black/80 backdrop-blur-sm border border-border/30 rounded-lg overflow-y-auto font-mono text-[11px] leading-relaxed"
        style={{ height: "calc(100vh - 220px)" }}
      >
        {/* Terminal header bar */}
        <div className="sticky top-0 z-10 bg-black/95 border-b border-border/20 px-4 py-2 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Event Stream
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
            {filteredLogs.length} lines
          </span>
          {paused && (
            <span className="text-[10px] text-yellow-400 animate-pulse">PAUSED</span>
          )}
        </div>

        <div className="p-4 space-y-0.5">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-xs">
              <Terminal className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>Waiting for events...</p>
              <p className="text-[10px] mt-1">Real-time events will appear here</p>
            </div>
          ) : (
            filteredLogs.map((entry) => (
              <div key={entry.id} className="flex gap-2 hover:bg-white/5 px-1 -mx-1 rounded" data-testid="log-entry">
                <span className="text-muted-foreground/60 shrink-0 tabular-nums select-none">
                  {formatTime(entry.timestamp)}
                </span>
                <span className={`${levelColors[entry.level]} whitespace-pre-wrap break-all`}>
                  {entry.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

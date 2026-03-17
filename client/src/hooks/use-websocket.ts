import { useEffect, useRef, useCallback, useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface WSMessage {
  event: string;
  data: any;
}

type WSListener = (msg: WSMessage) => void;

/**
 * Singleton WebSocket connection shared across all hook consumers.
 * Reconnects automatically on disconnect.
 */
let globalWs: WebSocket | null = null;
let globalListeners: Set<WSListener> = new Set();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getWsUrl(): string {
  const portPlaceholder = "__PORT_5000__";
  const isLocal = portPlaceholder.startsWith("__");

  if (isLocal) {
    // Dev mode — connect to same host on ws://
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/ws`;
  }

  // Deployed mode — replace __PORT_5000__ with actual proxy path
  // The deploy replaces __PORT_5000__ with something like /port/5000
  // We need to construct the WS URL from the API_BASE
  const apiBase = portPlaceholder;
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${apiBase}/ws`;
}

function connectGlobal() {
  if (globalWs && (globalWs.readyState === WebSocket.CONNECTING || globalWs.readyState === WebSocket.OPEN)) {
    return;
  }

  try {
    globalWs = new WebSocket(getWsUrl());

    globalWs.onmessage = (ev) => {
      try {
        const msg: WSMessage = JSON.parse(ev.data);
        globalListeners.forEach((fn) => fn(msg));
      } catch {}
    };

    globalWs.onclose = () => {
      // Reconnect after 3s
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectGlobal, 3000);
    };

    globalWs.onerror = () => {
      globalWs?.close();
    };
  } catch {
    // Retry on connection failure
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectGlobal, 3000);
  }
}

/**
 * Hook to subscribe to real-time WebSocket events.
 * Automatically handles pipeline/step status updates, log streaming, and notifications.
 */
export function useWebSocket(onMessage?: WSListener) {
  const { toast } = useToast();
  const listenerRef = useRef<WSListener | undefined>(onMessage);
  listenerRef.current = onMessage;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Start connection if not already running
    connectGlobal();

    const handler: WSListener = (msg) => {
      // Auto-handle standard events
      switch (msg.event) {
        case "connected":
          setConnected(true);
          break;

        case "pipeline:status":
          // Invalidate pipeline queries so the UI refreshes
          queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
          queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
          queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
          break;

        case "pipeline:step":
          queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
          break;

        case "notification": {
          const { type, title, message } = msg.data;
          toast({
            title,
            description: message,
            variant: type === "error" ? "destructive" : "default",
          });
          break;
        }
      }

      // Forward to custom handler
      listenerRef.current?.(msg);
    };

    globalListeners.add(handler);

    return () => {
      globalListeners.delete(handler);
    };
  }, [toast]);

  return { connected };
}

/**
 * Hook that collects streaming logs for a specific pipeline.
 * Returns a Map<string, string[]> mapping stepId → log lines.
 */
export function usePipelineLogs(pipelineId: string | null) {
  const [logs, setLogs] = useState<Map<string, string[]>>(new Map());

  const handleMessage = useCallback(
    (msg: WSMessage) => {
      if (!pipelineId) return;

      if (msg.event === "pipeline:log" && msg.data.pipelineId === pipelineId) {
        setLogs((prev) => {
          const next = new Map(prev);
          const stepId = msg.data.stepId as string;
          const existing = next.get(stepId) || [];
          next.set(stepId, [...existing, msg.data.line as string]);
          return next;
        });
      }

      // Reset logs when a new run starts for this pipeline
      if (msg.event === "pipeline:status" && msg.data.pipelineId === pipelineId && msg.data.status === "running") {
        setLogs(new Map());
      }
    },
    [pipelineId]
  );

  useWebSocket(handleMessage);

  // Clear logs when pipeline changes
  useEffect(() => {
    setLogs(new Map());
  }, [pipelineId]);

  return logs;
}

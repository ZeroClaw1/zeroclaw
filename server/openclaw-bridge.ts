import { WebSocket } from "ws";

export interface BridgeConnectionStatus {
  connected: boolean;
  latency: number;
  lastHeartbeat: string | null;
  error: string | null;
  gatewayUrl: string;
  reconnectAttempts: number;
}

interface BridgeConnection {
  ws: WebSocket | null;
  status: BridgeConnectionStatus;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  reconnectAttempts: number;
  maxReconnectDelay: number;
  heartbeatInterval: number;
  autoReconnect: boolean;
  gatewayUrl: string;
}

export class OpenClawBridge {
  private connections = new Map<string, BridgeConnection>();

  connect(userId: string, gatewayUrl: string, port: number, options?: { heartbeatInterval?: number; autoReconnect?: boolean }): void {
    // Disconnect existing connection if any
    this.disconnect(userId);

    const wsUrl = `ws://${gatewayUrl.replace(/^https?:\/\//, "")}:${port}`;
    const heartbeatInterval = (options?.heartbeatInterval ?? 30) * 1000;
    const autoReconnect = options?.autoReconnect ?? true;

    const conn: BridgeConnection = {
      ws: null,
      status: {
        connected: false,
        latency: 0,
        lastHeartbeat: null,
        error: null,
        gatewayUrl: `${gatewayUrl}:${port}`,
        reconnectAttempts: 0,
      },
      heartbeatTimer: null,
      reconnectTimer: null,
      reconnectAttempts: 0,
      maxReconnectDelay: 30000,
      heartbeatInterval,
      autoReconnect,
      gatewayUrl: wsUrl,
    };

    this.connections.set(userId, conn);
    this.openWebSocket(userId, conn);
  }

  private openWebSocket(userId: string, conn: BridgeConnection): void {
    try {
      const ws = new WebSocket(conn.gatewayUrl, {
        handshakeTimeout: 5000,
      });

      conn.ws = ws;

      ws.on("open", () => {
        conn.status.connected = true;
        conn.status.error = null;
        conn.status.reconnectAttempts = 0;
        conn.reconnectAttempts = 0;
        conn.status.lastHeartbeat = new Date().toISOString();

        // Start heartbeat
        this.startHeartbeat(userId, conn);
      });

      ws.on("message", () => {
        // Any message counts as activity
        conn.status.lastHeartbeat = new Date().toISOString();
      });

      ws.on("pong", () => {
        conn.status.lastHeartbeat = new Date().toISOString();
      });

      ws.on("close", () => {
        conn.status.connected = false;
        this.stopHeartbeat(conn);

        if (conn.autoReconnect && this.connections.has(userId)) {
          this.scheduleReconnect(userId, conn);
        }
      });

      ws.on("error", (err: Error) => {
        conn.status.connected = false;
        conn.status.error = err.message;
        this.stopHeartbeat(conn);

        // The 'close' event will fire after 'error', which handles reconnect
      });
    } catch (err: any) {
      conn.status.connected = false;
      conn.status.error = err.message ?? "Failed to create WebSocket";

      if (conn.autoReconnect && this.connections.has(userId)) {
        this.scheduleReconnect(userId, conn);
      }
    }
  }

  private scheduleReconnect(userId: string, conn: BridgeConnection): void {
    if (conn.reconnectTimer) {
      clearTimeout(conn.reconnectTimer);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, ... max 30s
    const delay = Math.min(1000 * Math.pow(2, conn.reconnectAttempts), conn.maxReconnectDelay);
    conn.reconnectAttempts++;
    conn.status.reconnectAttempts = conn.reconnectAttempts;

    conn.reconnectTimer = setTimeout(() => {
      if (this.connections.has(userId)) {
        this.openWebSocket(userId, conn);
      }
    }, delay);
  }

  private startHeartbeat(userId: string, conn: BridgeConnection): void {
    this.stopHeartbeat(conn);

    conn.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat(userId);
    }, conn.heartbeatInterval);
  }

  private stopHeartbeat(conn: BridgeConnection): void {
    if (conn.heartbeatTimer) {
      clearInterval(conn.heartbeatTimer);
      conn.heartbeatTimer = null;
    }
  }

  disconnect(userId: string): void {
    const conn = this.connections.get(userId);
    if (!conn) return;

    // Stop all timers
    this.stopHeartbeat(conn);
    if (conn.reconnectTimer) {
      clearTimeout(conn.reconnectTimer);
      conn.reconnectTimer = null;
    }

    // Disable auto-reconnect before closing to prevent reconnect on close event
    conn.autoReconnect = false;

    // Close WebSocket
    if (conn.ws) {
      try {
        conn.ws.close(1000, "User disconnected");
      } catch {
        // ignore close errors
      }
      conn.ws = null;
    }

    conn.status.connected = false;
    this.connections.delete(userId);
  }

  getStatus(userId: string): BridgeConnectionStatus {
    const conn = this.connections.get(userId);
    if (!conn) {
      return {
        connected: false,
        latency: 0,
        lastHeartbeat: null,
        error: null,
        gatewayUrl: "",
        reconnectAttempts: 0,
      };
    }
    return { ...conn.status };
  }

  sendHeartbeat(userId: string): void {
    const conn = this.connections.get(userId);
    if (!conn || !conn.ws || conn.ws.readyState !== WebSocket.OPEN) return;

    const start = Date.now();
    try {
      conn.ws.ping(() => {
        conn.status.latency = Date.now() - start;
        conn.status.lastHeartbeat = new Date().toISOString();
      });
    } catch {
      // ping failed — will be caught by error/close handlers
    }
  }

  sendCommand(userId: string, command: string, payload: any): { ok: boolean; error?: string } {
    const conn = this.connections.get(userId);
    if (!conn || !conn.ws || conn.ws.readyState !== WebSocket.OPEN) {
      return { ok: false, error: "Not connected to gateway" };
    }

    try {
      conn.ws.send(JSON.stringify({ command, payload }));
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Failed to send command" };
    }
  }

  /** Clean up all connections (for graceful shutdown) */
  disconnectAll(): void {
    for (const userId of Array.from(this.connections.keys())) {
      this.disconnect(userId);
    }
  }
}

// Singleton instance
export const openclawBridge = new OpenClawBridge();

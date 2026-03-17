import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket, type WSMessage } from "@/hooks/use-websocket";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Notification } from "@shared/schema";
import {
  Bell,
  GitBranch,
  Workflow,
  Bot,
  Rocket,
  Settings,
  CheckCheck,
  Trash2,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const typeIcon: Record<string, React.ElementType> = {
  pipeline: GitBranch,
  workflow: Workflow,
  agent: Bot,
  deployment: Rocket,
  system: Settings,
};

const typeColor: Record<string, string> = {
  pipeline: "text-primary",
  workflow: "text-purple-400",
  agent: "text-amber-400",
  deployment: "text-emerald-400",
  system: "text-muted-foreground",
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  // Listen for real-time notification:new events
  const handleWS = useCallback((msg: WSMessage) => {
    if (msg.event === "notification:new") {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    }
  }, []);
  useWebSocket(handleWS);

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/notifications");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          data-testid="button-notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white px-0.5"
              data-testid="notification-badge"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 bg-card border-border/50"
        data-testid="notification-popover"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Notifications
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[9px] text-muted-foreground hover:text-foreground"
              onClick={() => markAllReadMutation.mutate()}
              disabled={unreadCount === 0 || markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Read all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[9px] text-red-400/70 hover:text-red-400"
              onClick={() => clearAllMutation.mutate()}
              disabled={notifications.length === 0 || clearAllMutation.isPending}
              data-testid="button-clear-notifications"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <span className="text-[11px] text-muted-foreground">No notifications</span>
            </div>
          ) : (
            notifications.map((notif) => {
              const Icon = typeIcon[notif.type] || Settings;
              const color = typeColor[notif.type] || "text-muted-foreground";

              return (
                <div key={notif.id}>
                  <div
                    className={`flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted/10 ${
                      !notif.read ? "bg-primary/5" : ""
                    }`}
                    data-testid={`notification-item-${notif.id}`}
                  >
                    <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-foreground truncate">
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-muted-foreground/60 mt-1 block">
                        {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Separator className="bg-border/20" />
                </div>
              );
            })
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  GitBranch,
  Bot,
  Rocket,
  Settings,
  Workflow,
  Terminal,
  Zap,
  ClipboardList,
  Github,
  KeyRound,
  Webhook,
  Store,
  ScrollText,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { openclawLogoSm } from "@/lib/logo";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Workflows", icon: Workflow, href: "/workflows" },
  { label: "Pipelines", icon: GitBranch, href: "/pipelines" },
  { label: "Agents", icon: Bot, href: "/agents" },
  { label: "Deployments", icon: Rocket, href: "/deployments" },
  { label: "Planning", icon: ClipboardList, href: "/planning" },
  { label: "OpenClaw", icon: Terminal, href: "/openclaw" },
  { label: "Logs", icon: Terminal, href: "/logs" },
  { label: "GitHub", icon: Github, href: "/github" },
  { label: "Secrets", icon: KeyRound, href: "/secrets" },
  { label: "Webhooks", icon: Webhook, href: "/webhooks" },
  { label: "Marketplace", icon: Store, href: "/marketplace" },
];

function OpenClawLogo() {
  return (
    <img
      src={openclawLogoSm}
      alt="ZeroClaw"
      className="h-7 w-auto object-contain"
    />
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <OpenClawLogo />
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-primary/10 blur-md" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wide text-sidebar-foreground">
              ZeroClaw
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Dashboard
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground px-4">
            Navigation
          </SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? location === "/dashboard" || location === "/" || location === ""
                  : location.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    }
                  >
                    <Link href={item.href} className="flex items-center gap-3 px-4 py-2 text-xs">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                      {item.label === "OpenClaw" && (
                        <Zap className="h-3 w-3 ml-auto text-primary pulse-live" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground px-4">
            System
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-xs">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Link href="/audit-log" className="flex items-center gap-3 px-4 py-2 text-xs">
                  <ScrollText className="h-4 w-4" />
                  <span>Audit Log</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-2">
        {user && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-sidebar-foreground/80">
              <User className="h-3.5 w-3.5" />
              <span data-testid="sidebar-username">{user.username}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => logout()}
              data-testid="sidebar-logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-green-500 glow-success pulse-live" />
          <span>Gateway Connected</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

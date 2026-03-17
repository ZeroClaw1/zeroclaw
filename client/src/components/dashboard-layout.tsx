import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { NotificationCenter } from "@/components/notification-center";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center gap-4 px-6 py-4 border-b border-border shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <GlobalSearch />
              <NotificationCenter />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overscroll-contain p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

import { Link, useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { BarChart3, Users, CreditCard } from "lucide-react";

const adminNav = [
  { label: "Overview", icon: BarChart3, href: "/admin" },
  { label: "Users", icon: Users, href: "/admin/users" },
  { label: "Subscriptions", icon: CreditCard, href: "/admin/subscriptions" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const [location] = useLocation();

  return (
    <DashboardLayout title={title} subtitle={subtitle}>
      <div className="flex gap-2 mb-4" data-testid="admin-nav">
        {adminNav.map((item) => {
          const isActive = item.href === "/admin"
            ? location === "/admin"
            : location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-red-500/10 text-red-400 border border-red-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                data-testid={`admin-nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            </Link>
          );
        })}
      </div>
      {children}
    </DashboardLayout>
  );
}

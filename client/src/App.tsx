import React from "react";
import { Switch, Route, Router, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import WorkflowsPage from "@/pages/workflows";
import PipelinesPage from "@/pages/pipelines";
import AgentsPage from "@/pages/agents";
import DeploymentsPage from "@/pages/deployments";
import OpenClawPage from "@/pages/openclaw";
import PlanningPage from "@/pages/planning";
import SettingsPage from "@/pages/settings";
import LogsPage from "@/pages/logs";
import GitHubPage from "@/pages/github";
import SecretsPage from "@/pages/secrets";
import WebhooksPage from "@/pages/webhooks";
import MarketplacePage from "@/pages/marketplace";
import ContextPage from "@/pages/context";
import AuditLogPage from "@/pages/audit-log";
import AdminOverviewPage from "@/pages/admin/admin-overview";
import AdminUsersPage from "@/pages/admin/admin-users";
import AdminSubscriptionsPage from "@/pages/admin/admin-subscriptions";
import NotFound from "@/pages/not-found";
import { TermsPage, PrivacyPage } from "@/pages/legal";
import PricingPage from "@/pages/pricing";
import { Loader2 } from "lucide-react";

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <NotFound />;
  return <Component />;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/workflows" component={WorkflowsPage} />
      <Route path="/pipelines" component={PipelinesPage} />
      <Route path="/agents" component={AgentsPage} />
      <Route path="/deployments" component={DeploymentsPage} />
      <Route path="/openclaw" component={OpenClawPage} />
      <Route path="/planning" component={PlanningPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/logs" component={LogsPage} />
      <Route path="/github" component={GitHubPage} />
      <Route path="/secrets" component={SecretsPage} />
      <Route path="/webhooks" component={WebhooksPage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/context" component={ContextPage} />
      <Route path="/audit-log" component={AuditLogPage} />
      <Route path="/admin/users">{() => <AdminRoute component={AdminUsersPage} />}</Route>
      <Route path="/admin/subscriptions">{() => <AdminRoute component={AdminSubscriptionsPage} />}</Route>
      <Route path="/admin">{() => <AdminRoute component={AdminOverviewPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ThemeInitializer() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return null;
}

function AuthGate() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Redirect bare auth route to dashboard after login
  if (location === "/auth") {
    setLocation("/dashboard");
    return null;
  }

  return <AppRouter />;
}

function AppContent() {
  const [location] = useLocation();

  // Public routes — no auth required
  if (location === "/" || location === "/landing") {
    return <LandingPage />;
  }
  if (location === "/terms") {
    return <TermsPage />;
  }
  if (location === "/privacy") {
    return <PrivacyPage />;
  }
  if (location === "/pricing") {
    return <PricingPage />;
  }

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeInitializer />
        <Toaster />
        <Router>
          <AppContent />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SkillMarketplaceItem, Agent } from "@shared/schema";
import {
  Search,
  Star,
  Download,
  CheckCircle2,
  Loader2,
  Github,
  MessageSquare,
  Container,
  Database,
  Shield,
  ScrollText,
  Activity,
  Globe,
  Key,
  Webhook,
  TestTube,
  Bell,
  Package,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const categoryColors: Record<string, string> = {
  integration: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  devops: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  security: "bg-red-500/15 text-red-400 border-red-500/30",
  monitoring: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  utility: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const skillIconMap: Record<string, React.ElementType> = {
  "GitHub Integration": Github,
  "Slack Notifier": MessageSquare,
  "Docker Manager": Container,
  "Database Migrator": Database,
  "Security Scanner": Shield,
  "Log Aggregator": ScrollText,
  "Performance Monitor": Activity,
  "Terraform Provider": Globe,
  "Secrets Rotator": Key,
  "Webhook Relay": Webhook,
  "Test Runner": TestTube,
  "Deploy Notifier": Bell,
};

const categories = ["all", "integration", "devops", "security", "monitoring", "utility"] as const;

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [installTarget, setInstallTarget] = useState<SkillMarketplaceItem | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const { toast } = useToast();

  const { data: skills, isLoading } = useQuery<SkillMarketplaceItem[]>({
    queryKey: ["/api/marketplace/skills"],
  });

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const installMutation = useMutation({
    mutationFn: async ({ skillId, agentId }: { skillId: string; agentId: string }) => {
      const res = await apiRequest("POST", `/api/marketplace/skills/${skillId}/install`, { agentId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/skills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      setInstallTarget(null);
      setSelectedAgentId("");
      toast({ title: "Skill installed", description: "Skill has been installed on the agent" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: async ({ skillId, agentId }: { skillId: string; agentId: string }) => {
      const res = await apiRequest("POST", `/api/marketplace/skills/${skillId}/uninstall`, { agentId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/skills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({ title: "Skill uninstalled" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = skills?.filter((s) => {
    if (category !== "all" && s.category !== category) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <DashboardLayout title="Skill Marketplace" subtitle="Browse and install agent skills">
      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-muted/20 border-border/40 pl-8"
            data-testid="input-marketplace-search"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 p-0.5 rounded-md bg-muted/20 border border-border/30 mb-6 w-fit">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 text-[10px] rounded capitalize transition-all ${
              category === cat
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-category-${cat}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Skill Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border border-border/50 bg-card/80 h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((skill) => {
            const SkillIcon = skillIconMap[skill.name] || Package;
            return (
              <Card
                key={skill.id}
                className="border border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/40 hover:shadow-[0_0_16px_hsl(173_80%_40%/0.1)] transition-all group"
                data-testid={`skill-card-${skill.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-md bg-primary/10 border border-primary/20 group-hover:bg-primary/15 transition-colors">
                      <SkillIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-foreground truncate">{skill.name}</h3>
                        {skill.installed && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{skill.author} · v{skill.version}</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground mb-3 line-clamp-2">{skill.description}</p>

                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="outline" className={`text-[8px] uppercase tracking-wider border ${categoryColors[skill.category]}`}>
                      {skill.category}
                    </Badge>
                    <div className="flex items-center gap-0.5 text-[9px] text-amber-400">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      {skill.rating.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                      <Download className="h-2.5 w-2.5" />
                      {skill.downloads.toLocaleString()}
                    </div>
                  </div>

                  {skill.installed ? (
                    <div className="flex gap-2">
                      <Badge className="flex-1 justify-center text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Installed
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                        onClick={() => {
                          const agent = agents?.[0];
                          if (agent) uninstallMutation.mutate({ skillId: skill.id, agentId: agent.id });
                        }}
                        data-testid={`button-uninstall-${skill.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[10px] h-7 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => setInstallTarget(skill)}
                      data-testid={`button-install-${skill.id}`}
                    >
                      <Download className="h-3 w-3 mr-1.5" />
                      Install
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filtered?.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">No skills found matching your criteria.</p>
        </div>
      )}

      {/* Install Dialog with Agent Selector */}
      <Dialog open={!!installTarget} onOpenChange={(v) => { if (!v) { setInstallTarget(null); setSelectedAgentId(""); } }}>
        <DialogContent className="max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground">
              Install {installTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-[10px] text-muted-foreground">
              Select an agent to install this skill on:
            </p>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/40" data-testid="select-install-agent">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {agents?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => {
                if (installTarget && selectedAgentId) {
                  installMutation.mutate({ skillId: installTarget.id, agentId: selectedAgentId });
                }
              }}
              disabled={!selectedAgentId || installMutation.isPending}
              data-testid="button-confirm-install"
            >
              {installMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5" />
              )}
              Install Skill
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

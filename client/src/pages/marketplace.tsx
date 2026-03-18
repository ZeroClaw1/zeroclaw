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
import { useLocation } from "wouter";
import type { SkillMarketplaceItem } from "@shared/schema";
import {
  Search,
  Star,
  Download,
  CheckCircle2,
  Loader2,
  Package,
  Trash2,
  Brain,
  ArrowRight,
  Plug,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const categoryColors: Record<string, string> = {
  knowledge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

const skillIconMap: Record<string, React.ElementType> = {
  "Obsidian Vault": Brain,
};

const categories = ["all", "knowledge"] as const;

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [obsidianDialogOpen, setObsidianDialogOpen] = useState(false);
  const [obsidianVaultPath, setObsidianVaultPath] = useState("");
  const [obsidianSyncMethod, setObsidianSyncMethod] = useState("local");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: skills, isLoading } = useQuery<SkillMarketplaceItem[]>({
    queryKey: ["/api/marketplace/skills"],
  });



  const uninstallMutation = useMutation({
    mutationFn: async (skillId: string) => {
      const res = await apiRequest("POST", `/api/marketplace/skills/${skillId}/uninstall-obsidian`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/skills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/context/vault"] });
      toast({ title: "Skill uninstalled", description: "Obsidian Vault has been disconnected" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const obsidianInstallMutation = useMutation({
    mutationFn: async ({ vaultPath, syncMethod }: { vaultPath: string; syncMethod: string }) => {
      const res = await apiRequest("POST", "/api/marketplace/skills/skill-013/install-obsidian", { vaultPath, syncMethod });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/skills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/context/vault"] });
      setObsidianDialogOpen(false);
      setObsidianVaultPath("");
      toast({
        title: "Obsidian Vault installed",
        description: "Go to Context to manage your vault",
        action: (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => setLocation("/context")}
            data-testid="toast-goto-context"
          >
            Go to Context
          </Button>
        ),
      });
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
                    skill.id === "skill-013" ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-[10px] h-7 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
                          onClick={() => setLocation("/context")}
                          data-testid={`button-manage-${skill.id}`}
                        >
                          Manage <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                          onClick={() => uninstallMutation.mutate(skill.id)}
                          disabled={uninstallMutation.isPending}
                          data-testid={`button-uninstall-${skill.id}`}
                        >
                          {uninstallMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Badge className="flex-1 justify-center text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Installed
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                          onClick={() => uninstallMutation.mutate(skill.id)}
                          disabled={uninstallMutation.isPending}
                          data-testid={`button-uninstall-${skill.id}`}
                        >
                          {uninstallMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    )
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[10px] h-7 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => {
                        if (skill.id === "skill-013") {
                          setObsidianDialogOpen(true);
                        }
                      }}
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

      {/* Obsidian Vault Custom Install Dialog */}
      <Dialog open={obsidianDialogOpen} onOpenChange={(v) => { if (!v) { setObsidianDialogOpen(false); setObsidianVaultPath(""); } }}>
        <DialogContent className="max-w-sm bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Brain className="h-4 w-4 text-cyan-400" />
              Connect Obsidian Vault
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-[10px] text-muted-foreground">
              Connect your Obsidian vault for Zettelkasten-based context management.
            </p>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Vault Path</label>
              <Input
                placeholder="/path/to/your/vault"
                value={obsidianVaultPath}
                onChange={(e) => setObsidianVaultPath(e.target.value)}
                className="h-8 text-xs bg-muted/20 border-border/40"
                data-testid="input-obsidian-vault-path"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Sync Method</label>
              <Select value={obsidianSyncMethod} onValueChange={setObsidianSyncMethod}>
                <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/40" data-testid="select-obsidian-sync-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="obsidian-sync">Obsidian Sync</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="icloud">iCloud</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
              onClick={() => {
                if (obsidianVaultPath) {
                  obsidianInstallMutation.mutate({ vaultPath: obsidianVaultPath, syncMethod: obsidianSyncMethod });
                }
              }}
              disabled={!obsidianVaultPath || obsidianInstallMutation.isPending}
              data-testid="button-obsidian-connect-install"
            >
              {obsidianInstallMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plug className="h-3.5 w-3.5 mr-1.5" />
              )}
              Connect & Install
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

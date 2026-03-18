import { useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import type {
  ObsidianVaultConfig,
  VaultNote,
  ContextSession,
  SkillMarketplaceItem,
} from "@shared/schema";
import {
  Brain,
  RefreshCw,
  Loader2,
  Search,
  Folder,
  FileText,
  Link2,
  ArrowRight,
  Wifi,
  WifiOff,
  Settings2,
  Hash,
  ChevronRight,
  Store,
  Plug,
  Network,
  BookOpen,
  Tag,
  Clock,
  Zap,
} from "lucide-react";

// Trust state styling
const trustColors: Record<string, string> = {
  canonical: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  working: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  stale: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  contested: "bg-red-500/15 text-red-400 border-red-500/30",
};

const trustNodeColors: Record<string, string> = {
  canonical: "#22c55e",
  working: "#3b82f6",
  stale: "#f59e0b",
  contested: "#ef4444",
};

export default function ContextPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteSearch, setNoteSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [connectVaultPath, setConnectVaultPath] = useState("");
  const [connectSyncMethod, setConnectSyncMethod] = useState<string>("local");
  const [tokenBudget, setTokenBudget] = useState<number[]>([32000]);
  const [retrievalStrategy, setRetrievalStrategy] = useState("");

  // Queries
  const { data: vaultConfig, isLoading: configLoading } = useQuery<ObsidianVaultConfig | null>({
    queryKey: ["/api/context/vault"],
  });

  const { data: notes, isLoading: notesLoading } = useQuery<VaultNote[]>({
    queryKey: ["/api/context/notes"],
    enabled: !!vaultConfig?.connected,
  });

  const { data: sessions } = useQuery<ContextSession[]>({
    queryKey: ["/api/context/sessions"],
    enabled: !!vaultConfig?.connected,
  });

  const { data: graphData } = useQuery<{ nodes: Node[]; edges: Edge[] }>({
    queryKey: ["/api/context/graph"],
    enabled: !!vaultConfig?.connected,
  });

  const { data: skills } = useQuery<SkillMarketplaceItem[]>({
    queryKey: ["/api/marketplace/skills"],
  });

  const obsidianSkill = skills?.find((s) => s.id === "skill-013");
  const isInstalled = obsidianSkill?.installed ?? false;
  const isConnected = vaultConfig?.connected ?? false;

  // Mutations
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/context/vault/sync");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/context/vault"] });
      toast({ title: "Vault synced", description: "Notes are up to date" });
    },
  });

  const connectMutation = useMutation({
    mutationFn: async ({ vaultPath, syncMethod }: { vaultPath: string; syncMethod: string }) => {
      const res = await apiRequest("POST", "/api/marketplace/skills/skill-013/install-obsidian", { vaultPath, syncMethod });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/context/vault"] });
      queryClient.invalidateQueries({ queryKey: ["/api/context/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/context/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/context/graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/skills"] });
      setConnectVaultPath("");
      toast({ title: "Vault connected", description: "Obsidian vault is now linked" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", "/api/context/vault", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/context/vault"] });
      toast({ title: "Settings updated" });
    },
  });

  // Derived data
  const folders = useMemo(() => {
    if (!notes) return [];
    const set = new Set(notes.map((n) => n.folder));
    return Array.from(set).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    return notes.filter((n) => {
      if (folderFilter && n.folder !== folderFilter) return false;
      if (noteSearch && !n.title.toLowerCase().includes(noteSearch.toLowerCase()) && !n.tags.some((t) => t.includes(noteSearch.toLowerCase()))) return false;
      return true;
    });
  }, [notes, folderFilter, noteSearch]);

  const selectedNote = useMemo(() => notes?.find((n) => n.id === selectedNoteId), [notes, selectedNoteId]);

  // Graph nodes with styling
  const styledNodes = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes.map((node) => ({
      ...node,
      style: {
        background: `${trustNodeColors[node.data.trustState as string] || "#3b82f6"}20`,
        border: `2px solid ${trustNodeColors[node.data.trustState as string] || "#3b82f6"}`,
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: node.data.isStructureNote ? "12px" : "10px",
        fontWeight: node.data.isStructureNote ? 700 : 500,
        color: "#e2e8f0",
        width: node.data.isStructureNote ? 180 : 140,
        fontFamily: "'JetBrains Mono', monospace",
      },
    }));
  }, [graphData?.nodes]);

  const styledEdges = useMemo(() => {
    if (!graphData?.edges) return [];
    return graphData.edges.map((edge) => ({
      ...edge,
      style: { stroke: "hsl(173 80% 40% / 0.4)", strokeWidth: 1.5 },
    }));
  }, [graphData?.edges]);

  const graphStats = useMemo(() => {
    if (!notes) return { nodes: 0, edges: 0, avgConnections: 0, orphans: 0 };
    const totalEdges = notes.reduce((sum, n) => sum + n.links.length, 0) / 2;
    const avgConnections = notes.length > 0 ? (notes.reduce((sum, n) => sum + n.links.length + n.backlinks.length, 0) / notes.length).toFixed(1) : "0";
    const orphans = notes.filter((n) => n.links.length === 0 && n.backlinks.length === 0).length;
    return { nodes: notes.length, edges: Math.round(totalEdges), avgConnections, orphans };
  }, [notes]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNoteId(node.id);
    setActiveTab("notes");
  }, []);

  // Loading state
  if (configLoading) {
    return (
      <DashboardLayout title="Context Management" subtitle="Obsidian Vault integration">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Not installed state
  if (!isInstalled && !isConnected) {
    return (
      <DashboardLayout title="Context Management" subtitle="Obsidian Vault integration">
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <Brain className="h-12 w-12 text-cyan-400" />
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-2">Obsidian Vault Not Installed</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Connect your Obsidian vault for Zettelkasten-based context management. Search, retrieve, and feed notes to your agents.
            </p>
          </div>
          {/* Inline setup form */}
          <Card className="w-full max-w-md border border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plug className="h-4 w-4 text-cyan-400" />
                Connect Vault
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Vault Path</label>
                <Input
                  placeholder="/path/to/your/vault"
                  value={connectVaultPath}
                  onChange={(e) => setConnectVaultPath(e.target.value)}
                  className="h-8 text-xs bg-muted/20 border-border/40"
                  data-testid="input-vault-path"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Sync Method</label>
                <Select value={connectSyncMethod} onValueChange={setConnectSyncMethod}>
                  <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/40" data-testid="select-sync-method">
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
                  if (connectVaultPath) {
                    connectMutation.mutate({ vaultPath: connectVaultPath, syncMethod: connectSyncMethod });
                  }
                }}
                disabled={!connectVaultPath || connectMutation.isPending}
                data-testid="button-connect-vault"
              >
                {connectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plug className="h-3.5 w-3.5 mr-1.5" />}
                Connect & Install
              </Button>
              <div className="text-center">
                <button
                  className="text-[10px] text-primary hover:underline"
                  onClick={() => setLocation("/marketplace")}
                  data-testid="link-marketplace"
                >
                  Or browse the Marketplace
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Context Management" subtitle="Obsidian Vault integration">
      {/* Header row with status */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-cyan-400" />
          <span className="text-xs text-muted-foreground">Obsidian Vault v{obsidianSkill?.version ?? "1.0.0"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Wifi className="h-2.5 w-2.5 mr-1" />Connected
            </Badge>
          ) : (
            <Badge className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/30">
              <WifiOff className="h-2.5 w-2.5 mr-1" />Disconnected
            </Badge>
          )}
        </div>
        <button
          className="text-[10px] text-primary hover:underline ml-auto"
          onClick={() => setLocation("/marketplace")}
          data-testid="link-back-marketplace"
        >
          View in Marketplace
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/20 border border-border/30">
          <TabsTrigger value="overview" className="text-[10px]" data-testid="tab-overview">
            <BookOpen className="h-3 w-3 mr-1.5" />Overview
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-[10px]" data-testid="tab-notes">
            <FileText className="h-3 w-3 mr-1.5" />Notes Browser
          </TabsTrigger>
          <TabsTrigger value="graph" className="text-[10px]" data-testid="tab-graph">
            <Network className="h-3 w-3 mr-1.5" />Knowledge Graph
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-[10px]" data-testid="tab-settings">
            <Settings2 className="h-3 w-3 mr-1.5" />Settings
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: Vault Overview ===== */}
        <TabsContent value="overview">
          <div className="space-y-4 mt-4">
            {/* Connection status */}
            <Card className="border border-border/50 bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                      <Brain className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{vaultConfig?.vaultPath}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Sync: {vaultConfig?.syncMethod} · Last synced: {vaultConfig?.lastSynced ? new Date(vaultConfig.lastSynced).toLocaleString() : "Never"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                      data-testid="button-sync-vault"
                    >
                      {syncMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      Sync Now
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => setActiveTab("settings")}
                      data-testid="button-goto-settings"
                    >
                      <Settings2 className="h-3 w-3 mr-1" />Configure
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border border-border/50 bg-card/80">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground">Total Notes</p>
                  <p className="text-lg font-bold text-foreground">{vaultConfig?.totalNotes ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-card/80">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground">Total Links</p>
                  <p className="text-lg font-bold text-foreground">{vaultConfig?.totalLinks ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-card/80">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground">Token Budget</p>
                  <p className="text-lg font-bold text-foreground">{((vaultConfig?.tokenBudget ?? 0) / 1000).toFixed(0)}K</p>
                </CardContent>
              </Card>
              <Card className="border border-border/50 bg-card/80">
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground">Active Sessions</p>
                  <p className="text-lg font-bold text-foreground">{sessions?.filter((s) => s.status === "active").length ?? 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick note list */}
            <Card className="border border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Recent Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-1.5">
                  {notes?.slice(0, 5).map((note) => (
                    <button
                      key={note.id}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 transition-colors text-left"
                      onClick={() => { setSelectedNoteId(note.id); setActiveTab("notes"); }}
                      data-testid={`overview-note-${note.id}`}
                    >
                      <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-[10px] text-foreground truncate flex-1">{note.title}</span>
                      <Badge variant="outline" className={`text-[8px] ${trustColors[note.trustState]}`}>
                        {note.trustState}
                      </Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== TAB 2: Notes Browser ===== */}
        <TabsContent value="notes">
          <div className="flex gap-4 mt-4" style={{ minHeight: "500px" }}>
            {/* Folder tree */}
            <div className="w-48 shrink-0 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">Folders</p>
              <button
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] transition-colors ${
                  folderFilter === null ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                }`}
                onClick={() => setFolderFilter(null)}
                data-testid="folder-all"
              >
                <Folder className="h-3 w-3" />
                All Notes ({notes?.length ?? 0})
              </button>
              {folders.map((folder) => (
                <button
                  key={folder}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] transition-colors ${
                    folderFilter === folder ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                  }`}
                  onClick={() => setFolderFilter(folder)}
                  data-testid={`folder-${folder}`}
                >
                  <Folder className="h-3 w-3" />
                  {folder} ({notes?.filter((n) => n.folder === folder).length ?? 0})
                </button>
              ))}
            </div>

            {/* Note list + detail */}
            <div className="flex-1 flex gap-4">
              {/* Note list */}
              <div className="flex-1 space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search notes..."
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    className="h-8 text-xs bg-muted/20 border-border/40 pl-8"
                    data-testid="input-note-search"
                  />
                </div>

                {notesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[460px] overflow-y-auto">
                    {filteredNotes.map((note) => (
                      <button
                        key={note.id}
                        className={`w-full text-left p-3 rounded border transition-all ${
                          selectedNoteId === note.id
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/30 bg-card/60 hover:border-primary/30 hover:bg-card/80"
                        }`}
                        onClick={() => setSelectedNoteId(note.id)}
                        data-testid={`note-item-${note.id}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-3 w-3 text-primary shrink-0" />
                          <span className="text-[11px] font-medium text-foreground truncate">{note.title}</span>
                          {note.isStructureNote && (
                            <Badge className="text-[7px] bg-purple-500/15 text-purple-400 border-purple-500/30">Hub</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Folder className="h-2.5 w-2.5" />{note.folder}</span>
                          <span className="flex items-center gap-0.5"><Link2 className="h-2.5 w-2.5" />{note.links.length}</span>
                          <span className="flex items-center gap-0.5"><Hash className="h-2.5 w-2.5" />{note.wordCount}w</span>
                          <Badge variant="outline" className={`text-[7px] ml-auto ${trustColors[note.trustState]}`}>
                            {note.trustState}
                          </Badge>
                        </div>
                        {note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {note.tags.slice(0, 4).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[7px] border-border/40 text-muted-foreground px-1 py-0">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                    {filteredNotes.length === 0 && (
                      <div className="text-center py-8">
                        <FileText className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-[10px] text-muted-foreground">No notes match your search.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Note detail panel */}
              {selectedNote && (
                <div className="w-72 shrink-0">
                  <Card className="border border-border/50 bg-card/80 sticky top-0">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="text-xs font-semibold text-foreground mb-1">{selectedNote.title}</h3>
                        <p className="text-[9px] text-muted-foreground">{selectedNote.path}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className={`text-[8px] ${trustColors[selectedNote.trustState]}`}>
                          {selectedNote.trustState}
                        </Badge>
                        {selectedNote.isStructureNote && (
                          <Badge className="text-[8px] bg-purple-500/15 text-purple-400 border-purple-500/30">Structure Note</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[9px]">
                        <div>
                          <p className="text-muted-foreground">Words</p>
                          <p className="text-foreground font-medium">{selectedNote.wordCount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Modified</p>
                          <p className="text-foreground font-medium">{new Date(selectedNote.lastModified).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {/* Tags */}
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-1 flex items-center gap-1"><Tag className="h-2.5 w-2.5" />Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedNote.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[8px] border-border/40 text-muted-foreground">#{tag}</Badge>
                          ))}
                        </div>
                      </div>
                      {/* Links */}
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-1 flex items-center gap-1"><Link2 className="h-2.5 w-2.5" />Links ({selectedNote.links.length})</p>
                        <div className="space-y-0.5">
                          {selectedNote.links.map((linkId) => {
                            const linked = notes?.find((n) => n.id === linkId);
                            return linked ? (
                              <button
                                key={linkId}
                                className="w-full text-left text-[9px] text-primary hover:underline flex items-center gap-1 py-0.5"
                                onClick={() => setSelectedNoteId(linkId)}
                                data-testid={`link-to-${linkId}`}
                              >
                                <ArrowRight className="h-2.5 w-2.5" />{linked.title}
                              </button>
                            ) : null;
                          })}
                        </div>
                      </div>
                      {/* Backlinks */}
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-1 flex items-center gap-1"><Link2 className="h-2.5 w-2.5 rotate-180" />Backlinks ({selectedNote.backlinks.length})</p>
                        <div className="space-y-0.5">
                          {selectedNote.backlinks.map((linkId) => {
                            const linked = notes?.find((n) => n.id === linkId);
                            return linked ? (
                              <button
                                key={linkId}
                                className="w-full text-left text-[9px] text-cyan-400 hover:underline flex items-center gap-1 py-0.5"
                                onClick={() => setSelectedNoteId(linkId)}
                                data-testid={`backlink-to-${linkId}`}
                              >
                                <ArrowRight className="h-2.5 w-2.5 rotate-180" />{linked.title}
                              </button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== TAB 3: Knowledge Graph ===== */}
        <TabsContent value="graph">
          <div className="mt-4 relative">
            {/* Stats overlay */}
            <div className="absolute top-3 left-3 z-10 flex gap-2">
              <Badge className="text-[8px] bg-card/90 text-foreground border border-border/50 backdrop-blur-sm">
                {graphStats.nodes} nodes
              </Badge>
              <Badge className="text-[8px] bg-card/90 text-foreground border border-border/50 backdrop-blur-sm">
                {graphStats.edges} edges
              </Badge>
              <Badge className="text-[8px] bg-card/90 text-foreground border border-border/50 backdrop-blur-sm">
                ~{graphStats.avgConnections} avg
              </Badge>
              <Badge className="text-[8px] bg-card/90 text-foreground border border-border/50 backdrop-blur-sm">
                {graphStats.orphans} orphans
              </Badge>
            </div>
            {/* Legend */}
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              {Object.entries(trustNodeColors).map(([state, color]) => (
                <div key={state} className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                  <span className="text-[8px] text-muted-foreground capitalize">{state}</span>
                </div>
              ))}
            </div>
            <div className="h-[500px] border border-border/50 rounded-lg bg-card/40" data-testid="knowledge-graph">
              <ReactFlow
                nodes={styledNodes}
                edges={styledEdges}
                onNodeClick={onNodeClick}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background color="hsl(173 80% 40% / 0.05)" gap={20} />
                <Controls className="!bg-card !border-border/50" />
              </ReactFlow>
            </div>
          </div>
        </TabsContent>

        {/* ===== TAB 4: Context Settings ===== */}
        <TabsContent value="settings">
          <div className="space-y-6 mt-4 max-w-2xl">
            {/* Token Budget */}
            <Card className="border border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Token Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>1K</span>
                  <span className="text-foreground font-medium">{(tokenBudget[0] / 1000).toFixed(0)}K tokens</span>
                  <span>200K</span>
                </div>
                <Slider
                  value={tokenBudget}
                  onValueChange={setTokenBudget}
                  min={1000}
                  max={200000}
                  step={1000}
                  data-testid="slider-token-budget"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px]"
                  onClick={() => updateConfigMutation.mutate({ tokenBudget: tokenBudget[0] })}
                  disabled={updateConfigMutation.isPending}
                  data-testid="button-save-token-budget"
                >
                  Save
                </Button>
              </CardContent>
            </Card>

            {/* Retrieval Strategy */}
            <Card className="border border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-primary" />
                  Retrieval Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={retrievalStrategy || vaultConfig?.retrievalStrategy || "zettelkasten"}
                  onValueChange={(v) => {
                    setRetrievalStrategy(v);
                    updateConfigMutation.mutate({ retrievalStrategy: v as any });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/40" data-testid="select-retrieval-strategy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zettelkasten">Zettelkasten — Follow links from structure notes</SelectItem>
                    <SelectItem value="recent">Recent — Prioritize recently modified notes</SelectItem>
                    <SelectItem value="relevant">Relevant — Semantic similarity search</SelectItem>
                    <SelectItem value="manual">Manual — Explicitly selected notes only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-muted-foreground">
                  {(retrievalStrategy || vaultConfig?.retrievalStrategy) === "zettelkasten" && "Traverses the Zettelkasten link graph starting from structure notes. Best for well-connected vaults."}
                  {(retrievalStrategy || vaultConfig?.retrievalStrategy) === "recent" && "Prioritizes recently modified notes. Good for active projects with frequently updated notes."}
                  {(retrievalStrategy || vaultConfig?.retrievalStrategy) === "relevant" && "Uses semantic similarity to find the most relevant notes. Best for large, diverse vaults."}
                  {(retrievalStrategy || vaultConfig?.retrievalStrategy) === "manual" && "Only includes notes you explicitly select. Maximum control over context."}
                </p>
              </CardContent>
            </Card>

            {/* Include / Exclude Folders */}
            <Card className="border border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Folder className="h-3.5 w-3.5 text-primary" />
                  Folder Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Include Folders</p>
                  <div className="flex flex-wrap gap-1">
                    {vaultConfig?.includeFolders.map((f) => (
                      <Badge key={f} variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">
                        <Folder className="h-2.5 w-2.5 mr-0.5" />{f}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Exclude Folders</p>
                  <div className="flex flex-wrap gap-1">
                    {vaultConfig?.excludeFolders.map((f) => (
                      <Badge key={f} variant="outline" className="text-[9px] border-red-500/30 text-red-400">
                        <Folder className="h-2.5 w-2.5 mr-0.5" />{f}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent Context Sessions */}
            <Card className="border border-border/50 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Agent Context Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30">
                      <TableHead className="text-[9px] h-7">Agent</TableHead>
                      <TableHead className="text-[9px] h-7">Notes</TableHead>
                      <TableHead className="text-[9px] h-7">Tokens</TableHead>
                      <TableHead className="text-[9px] h-7">Hits</TableHead>
                      <TableHead className="text-[9px] h-7">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions?.map((s) => (
                      <TableRow key={s.id} className="border-border/20">
                        <TableCell className="text-[10px]">{s.agentId}</TableCell>
                        <TableCell className="text-[10px]">{s.notesLoaded}</TableCell>
                        <TableCell className="text-[10px]">{s.tokensUsed.toLocaleString()} / {s.tokenBudget.toLocaleString()}</TableCell>
                        <TableCell className="text-[10px]">{s.retrievalHits}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[8px] ${
                            s.status === "active" ? "text-emerald-400 border-emerald-500/30" :
                            s.status === "idle" ? "text-amber-400 border-amber-500/30" :
                            "text-muted-foreground border-border/40"
                          }`}>
                            {s.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!sessions || sessions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-[10px] text-muted-foreground py-4">
                          No active sessions
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

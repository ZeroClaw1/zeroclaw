import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Secret, Pipeline } from "@shared/schema";
import {
  KeyRound,
  Plus,
  Trash2,
  Eye,
  Copy,
  AlertTriangle,
  ShieldCheck,
  Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function AddSecretDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<"global" | "pipeline">("global");
  const [pipelineIds, setPipelineIds] = useState<string[]>([]);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: pipelines } = useQuery<Pipeline[]>({
    queryKey: ["/api/pipelines"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; value: string; scope: string; pipelineIds: string[] }) => {
      const res = await apiRequest("POST", "/api/secrets", data);
      return res.json();
    },
    onSuccess: (data: { secret: Secret; rawValue: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/secrets"] });
      setRevealedValue(data.rawValue);
      setShowRevealModal(true);
      setOpen(false);
      setName("");
      setValue("");
      setScope("global");
      setPipelineIds([]);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create secret", variant: "destructive" });
    },
  });

  const handleCopy = async () => {
    if (revealedValue) {
      await navigator.clipboard.writeText(revealedValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1.5 text-[11px] h-7" data-testid="button-add-secret">
            <Plus className="h-3 w-3" /> Add Secret
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card border-border/50" data-testid="dialog-add-secret">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Secret</DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground">
              Secrets are encrypted and can only be viewed once after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] text-muted-foreground">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                placeholder="GITHUB_TOKEN"
                className="h-8 text-xs font-mono bg-background/50"
                data-testid="input-secret-name"
              />
              <span className="text-[9px] text-muted-foreground">Uppercase letters, numbers, and underscores only</span>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Value</Label>
              <Input
                type="password"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter secret value"
                className="h-8 text-xs font-mono bg-background/50"
                data-testid="input-secret-value"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as "global" | "pipeline")}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-secret-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="pipeline">Pipeline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === "pipeline" && pipelines && (
              <div>
                <Label className="text-[10px] text-muted-foreground">Pipelines</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {pipelines.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-[10px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pipelineIds.includes(p.id)}
                        onChange={(e) =>
                          setPipelineIds(
                            e.target.checked
                              ? [...pipelineIds, p.id]
                              : pipelineIds.filter((id) => id !== p.id)
                          )
                        }
                        className="rounded"
                        data-testid={`checkbox-pipeline-${p.id}`}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              size="sm"
              className="text-[11px] h-7"
              onClick={() => createMutation.mutate({ name, value, scope, pipelineIds })}
              disabled={!name || !value || createMutation.isPending}
              data-testid="button-create-secret"
            >
              {createMutation.isPending ? "Creating..." : "Create Secret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time reveal modal */}
      <Dialog open={showRevealModal} onOpenChange={setShowRevealModal}>
        <DialogContent className="bg-card border-border/50" data-testid="dialog-reveal-secret">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Secret Created
            </DialogTitle>
            <DialogDescription className="text-[10px] text-amber-400/80">
              This is the only time the raw value will be shown. Copy it now!
            </DialogDescription>
          </DialogHeader>
          <div className="bg-background/80 rounded-md p-3 border border-border/50 flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-foreground break-all" data-testid="text-revealed-secret">
              {revealedValue}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0"
              onClick={handleCopy}
              data-testid="button-copy-secret"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              className="text-[11px] h-7"
              onClick={() => { setShowRevealModal(false); setRevealedValue(null); }}
              data-testid="button-close-reveal"
            >
              I've copied the secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SecretsPage() {
  const { toast } = useToast();
  const { data: secrets, isLoading } = useQuery<Secret[]>({
    queryKey: ["/api/secrets"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/secrets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/secrets"] });
      toast({ title: "Secret deleted" });
    },
  });

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  return (
    <DashboardLayout title="Secrets" subtitle="Manage encrypted secrets and environment variables">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-[11px] text-muted-foreground">
              {secrets?.length || 0} secret{(secrets?.length || 0) !== 1 ? "s" : ""} stored
            </span>
          </div>
          <AddSecretDialog />
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs">Secrets Vault</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !secrets || secrets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <KeyRound className="h-8 w-8 mb-2 opacity-40" />
                <span className="text-[11px]">No secrets configured</span>
                <span className="text-[9px] mt-1">Add a secret to get started</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-[9px] uppercase tracking-wider">Name</TableHead>
                    <TableHead className="text-[9px] uppercase tracking-wider">Masked Value</TableHead>
                    <TableHead className="text-[9px] uppercase tracking-wider">Scope</TableHead>
                    <TableHead className="text-[9px] uppercase tracking-wider">Pipelines</TableHead>
                    <TableHead className="text-[9px] uppercase tracking-wider">Created</TableHead>
                    <TableHead className="text-[9px] uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {secrets.map((secret) => (
                    <TableRow key={secret.id} className="border-border/20" data-testid={`secret-row-${secret.id}`}>
                      <TableCell>
                        <span className="text-[11px] font-mono font-semibold text-foreground">
                          {secret.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {secret.maskedValue}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            secret.scope === "global"
                              ? "border-primary/40 text-primary"
                              : "border-purple-400/40 text-purple-400"
                          }`}
                        >
                          {secret.scope === "global" ? "Global" : "Pipeline"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] text-muted-foreground">
                          {secret.pipelineIds.length === 0
                            ? "All"
                            : secret.pipelineIds.join(", ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(secret.createdAt), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-30 cursor-not-allowed"
                                  disabled
                                  data-testid={`button-view-secret-${secret.id}`}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-[10px]">Secrets are write-only</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-400/60 hover:text-red-400"
                            onClick={() => setDeleteConfirm(secret.id)}
                            data-testid={`button-delete-secret-${secret.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-card border-border/50" data-testid="dialog-delete-secret">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete Secret</DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground">
              This action cannot be undone. The secret will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] h-7"
              onClick={() => setDeleteConfirm(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="text-[11px] h-7"
              onClick={() => {
                if (deleteConfirm) deleteMutation.mutate(deleteConfirm);
                setDeleteConfirm(null);
              }}
              data-testid="button-confirm-delete"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

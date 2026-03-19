import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { Team, TeamMember, TeamInvite, TeamRole } from "@shared/schema";
import {
  Users,
  Plus,
  Mail,
  Trash2,
  Crown,
  Shield,
  Eye,
  UserPlus,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ---- Role badge helper ----
function RoleBadge({ role }: { role: TeamRole }) {
  const config: Record<TeamRole, { label: string; icon: React.ElementType; className: string }> = {
    owner: { label: "Owner", icon: Crown, className: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
    admin: { label: "Admin", icon: Shield, className: "border-primary/30 text-primary bg-primary/10" },
    member: { label: "Member", icon: Users, className: "border-border/40 text-muted-foreground" },
    viewer: { label: "Viewer", icon: Eye, className: "border-border/30 text-muted-foreground/70" },
  };
  const { label, icon: Icon, className } = config[role] || config.member;
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${className}`}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </Badge>
  );
}

// ---- Team response types (enriched with user info) ----
interface EnrichedMember extends TeamMember {
  email?: string;
  username?: string;
}

interface TeamDetailResponse {
  team: Team;
  members: EnrichedMember[];
}

interface EnrichedInvite extends TeamInvite {
  teamName?: string;
}

// ---- Create Team Form ----
function CreateTeamForm() {
  const [name, setName] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/teams", { name });
    },
    onSuccess: () => {
      toast({ title: "Team created", description: `"${name}" is ready.` });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/mine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setName("");
    },
    onError: (e: Error) => {
      toast({ title: "Failed to create team", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-sm max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Create a Team
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Teams let you collaborate with other users, share pipelines, and manage roles.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Team Name</Label>
          <Input
            placeholder="e.g. Acme Engineering"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-xs h-9 bg-background/50 border-border/50"
            data-testid="team-name-input"
            onKeyDown={(e) => e.key === "Enter" && name.length >= 2 && createMutation.mutate()}
          />
        </div>
        <Button
          className="w-full text-xs"
          disabled={name.length < 2 || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          data-testid="create-team-btn"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5 mr-1.5" />
          )}
          Create Team
        </Button>
      </CardContent>
    </Card>
  );
}

// ---- Invite Modal ----
function InviteModal({
  teamId,
  open,
  onClose,
}: {
  teamId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const { toast } = useToast();

  const inviteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/teams/${teamId}/invite`, { email, role });
    },
    onSuccess: () => {
      toast({ title: "Invite sent", description: `Invitation sent to ${email}.` });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/mine"] });
      setEmail("");
      setRole("member");
      onClose();
    },
    onError: (e: Error) => {
      toast({ title: "Invite failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm border-border/50 bg-card">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Invite Team Member
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
            <Input
              type="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-xs h-9 bg-background/50 border-border/50"
              data-testid="invite-email-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger
                className="text-xs h-9 bg-background/50 border-border/50"
                data-testid="invite-role-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin" className="text-xs">Admin — full access</SelectItem>
                <SelectItem value="member" className="text-xs">Member — standard access</SelectItem>
                <SelectItem value="viewer" className="text-xs">Viewer — read-only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClose} data-testid="invite-cancel-btn">
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs"
            disabled={!email || inviteMutation.isPending}
            onClick={() => inviteMutation.mutate()}
            data-testid="invite-send-btn"
          >
            {inviteMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5 mr-1.5" />
            )}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Team Overview ----
function TeamOverview({
  data,
  currentUserId,
}: {
  data: TeamDetailResponse;
  currentUserId: string;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const { toast } = useToast();

  const { team, members } = data;
  const isOwnerOrAdmin =
    team.ownerId === currentUserId ||
    members.find((m) => m.userId === currentUserId && m.role === "admin");

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/teams/${team.id}/members/${memberId}`);
    },
    onSuccess: () => {
      toast({ title: "Member removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/mine"] });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to remove member", description: e.message, variant: "destructive" });
    },
  });

  return (
    <>
      <div className="space-y-6">
        {/* Team header */}
        <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">{team.name}</h2>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    @{team.slug} · created {formatDistanceToNow(new Date(team.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              {isOwnerOrAdmin && (
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowInvite(true)}
                  data-testid="invite-member-btn"
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Invite
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Members list */}
        <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2 px-5 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              Members
              <Badge variant="outline" className="text-[9px] border-border/40 text-muted-foreground">
                {members.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border/20 bg-muted/10 hover:bg-muted/20 transition-colors"
                data-testid={`team-member-${member.id}`}
              >
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary uppercase">
                    {(member.username || member.email || "?")[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground truncate">
                      {member.username || member.email || member.userId}
                    </span>
                    <RoleBadge role={member.role} />
                  </div>
                  {member.email && (
                    <span className="text-[10px] text-muted-foreground">{member.email}</span>
                  )}
                </div>
                {/* Remove button — only owner/admin can remove, can't remove yourself if owner */}
                {isOwnerOrAdmin && member.userId !== team.ownerId && member.userId !== currentUserId && (
                  <button
                    className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                    onClick={() => removeMutation.mutate(member.id)}
                    disabled={removeMutation.isPending}
                    data-testid={`remove-member-${member.id}`}
                    aria-label="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <InviteModal
        teamId={team.id}
        open={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </>
  );
}

// ---- Pending Invites ----
function PendingInvites() {
  const { toast } = useToast();

  const { data: invites, isLoading } = useQuery<EnrichedInvite[]>({
    queryKey: ["/api/teams/invites"],
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/teams/invites/${id}/accept`);
    },
    onSuccess: () => {
      toast({ title: "Invite accepted", description: "You have joined the team." });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/mine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to accept", description: e.message, variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/teams/invites/${id}/decline`);
    },
    onSuccess: () => {
      toast({ title: "Invite declined" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/invites"] });
    },
  });

  if (isLoading) {
    return (
      <Card className="border border-border/50 bg-card/80">
        <CardContent className="p-5">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!invites || invites.length === 0) return null;

  return (
    <Card className="border border-primary/20 bg-primary/5 backdrop-blur-sm">
      <CardHeader className="pb-2 px-5 pt-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-primary" />
          Pending Invites
          <Badge className="text-[9px] bg-primary/20 text-primary border-0">{invites.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-2">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-card/50"
            data-testid={`pending-invite-${invite.id}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">
                Invited to{" "}
                <span className="text-primary font-semibold">{invite.teamName || invite.teamId}</span>
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <RoleBadge role={invite.role} />
                <span className="text-[10px] text-muted-foreground">
                  expires {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => declineMutation.mutate(invite.id)}
                disabled={declineMutation.isPending}
                data-testid={`decline-invite-${invite.id}`}
              >
                <X className="h-3 w-3 mr-1" />
                Decline
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => acceptMutation.mutate(invite.id)}
                disabled={acceptMutation.isPending}
                data-testid={`accept-invite-${invite.id}`}
              >
                <Check className="h-3 w-3 mr-1" />
                Accept
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---- Main Page ----
export default function TeamsPage() {
  const { user } = useAuth();

  const {
    data: teamData,
    isLoading: teamLoading,
    error: teamError,
  } = useQuery<TeamDetailResponse>({
    queryKey: ["/api/teams/mine"],
  });

  const hasTeam = !!teamData?.team;

  return (
    <DashboardLayout title="Teams" subtitle="Collaborate and manage your organization">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Pending invites — show at top */}
        <PendingInvites />

        {/* Loading state */}
        {teamLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {/* No team — show create form */}
        {!teamLoading && !hasTeam && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="inline-flex p-4 rounded-xl bg-primary/10 mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-sm font-bold mb-2">No Team Yet</h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Create a team to collaborate with colleagues, share pipelines and workflows,
                and manage roles and permissions.
              </p>
            </div>
            <CreateTeamForm />
          </div>
        )}

        {/* Has team — show overview */}
        {!teamLoading && hasTeam && user && (
          <TeamOverview data={teamData} currentUserId={user.id} />
        )}
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { AdminLayout } from "./admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Ban, CheckCircle, Shield, ShieldOff } from "lucide-react";
import type { SubscriptionTier } from "@shared/schema";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin";
  tier: SubscriptionTier;
  suspended: boolean;
  suspendedAt: string | null;
  createdAt: string;
}

const TIER_BADGE_COLORS: Record<string, string> = {
  free: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  pro: "bg-teal-500/10 text-teal-400 border-teal-500/30",
  team: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  enterprise: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const { user: currentUser } = useAuth();

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const tierMutation = useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/tier`, { tier });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: boolean }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/suspend`, { suspended });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "user" | "admin" }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  const filtered = users?.filter((u) => {
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
  }) ?? [];

  const isSelf = (userId: string) => currentUser?.id === userId;

  return (
    <AdminLayout title="User Management" subtitle="View and manage platform users">
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search users by email, username, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
                data-testid="admin-user-search"
              />
            </div>
            <Badge variant="outline" className="text-[10px]">
              {filtered.length} user{filtered.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="border border-border rounded-md overflow-hidden" data-testid="admin-users-table">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase tracking-wider">User</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider">Role</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider">Tier</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider">Joined</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((user) => (
                      <TableRow key={user.id} data-testid={`admin-user-row-${user.id}`}>
                        <TableCell>
                          <div>
                            <p className="text-xs font-medium">
                              {user.username}
                              {isSelf(user.id) && (
                                <span className="text-[10px] text-muted-foreground ml-1.5">(you)</span>
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.role === "admin" ? (
                            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
                              <Shield className="h-2.5 w-2.5 mr-1" />
                              Admin
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">User</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.tier}
                            onValueChange={(tier) => tierMutation.mutate({ userId: user.id, tier })}
                          >
                            <SelectTrigger className="h-6 w-28 text-[10px] border-0 bg-transparent p-0" data-testid={`admin-tier-select-${user.id}`}>
                              <SelectValue>
                                <Badge variant="outline" className={`text-[10px] ${TIER_BADGE_COLORS[user.tier]}`}>
                                  {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free" className="text-xs">Free</SelectItem>
                              <SelectItem value="pro" className="text-xs">Pro</SelectItem>
                              <SelectItem value="team" className="text-xs">Team</SelectItem>
                              <SelectItem value="enterprise" className="text-xs">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {user.suspended ? (
                            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
                              Suspended
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Role toggle — can't demote yourself */}
                            {!isSelf(user.id) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-6 px-2 text-[10px] ${user.role === "admin" ? "text-amber-400 hover:text-amber-300" : "text-blue-400 hover:text-blue-300"}`}
                                onClick={() =>
                                  roleMutation.mutate({
                                    userId: user.id,
                                    role: user.role === "admin" ? "user" : "admin",
                                  })
                                }
                                disabled={roleMutation.isPending}
                                data-testid={`admin-role-toggle-${user.id}`}
                              >
                                {user.role === "admin" ? (
                                  <><ShieldOff className="h-3 w-3 mr-1" />Demote</>
                                ) : (
                                  <><Shield className="h-3 w-3 mr-1" />Make Admin</>
                                )}
                              </Button>
                            )}

                            {/* Suspend toggle — can't suspend admins or yourself */}
                            {!isSelf(user.id) && user.role !== "admin" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-6 px-2 text-[10px] ${user.suspended ? "text-emerald-400 hover:text-emerald-300" : "text-red-400 hover:text-red-300"}`}
                                onClick={() => suspendMutation.mutate({ userId: user.id, suspended: !user.suspended })}
                                disabled={suspendMutation.isPending}
                                data-testid={`admin-suspend-${user.id}`}
                              >
                                {user.suspended ? (
                                  <><CheckCircle className="h-3 w-3 mr-1" />Unsuspend</>
                                ) : (
                                  <><Ban className="h-3 w-3 mr-1" />Suspend</>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

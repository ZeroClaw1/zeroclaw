import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GitHubRepo, GitHubWorkflowRun } from "@shared/schema";
import { useState } from "react";
import {
  GitBranch,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Play,
  AlertTriangle,
  Key,
  GitCommit,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function StatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === "completed") {
    if (conclusion === "success") {
      return (
        <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/30 text-[10px]" data-testid="badge-success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    }
    if (conclusion === "failure") {
      return (
        <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]" data-testid="badge-failure">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/30 text-[10px]" data-testid="badge-completed">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {conclusion || "Completed"}
      </Badge>
    );
  }
  if (status === "in_progress") {
    return (
      <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px]" data-testid="badge-in-progress">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        In Progress
      </Badge>
    );
  }
  if (status === "queued") {
    return (
      <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 text-[10px]" data-testid="badge-queued">
        <Clock className="h-3 w-3 mr-1" />
        Queued
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/30 text-[10px]">
      {status}
    </Badge>
  );
}

function EmptyState() {
  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="p-12 text-center">
        <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
        <h3 className="text-sm font-semibold text-foreground mb-2">
          GitHub Token Not Configured
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto mb-6">
          Set the <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">GITHUB_TOKEN</code> environment
          variable to enable GitHub Actions integration.
        </p>
        <Card className="border border-border/30 bg-background/50 max-w-lg mx-auto text-left">
          <CardContent className="p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground">How to create a Personal Access Token:</h4>
            <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Go to GitHub Settings &rarr; Developer Settings &rarr; Personal Access Tokens</li>
              <li>Click "Generate new token (classic)"</li>
              <li>Select the required scopes below</li>
              <li>Copy the token and set it as <code className="text-primary">GITHUB_TOKEN</code></li>
            </ol>
            <div className="pt-2">
              <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Required Scopes</h5>
              <div className="flex gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">repo</Badge>
                <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">workflow</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

function WorkflowRunsList({ owner, repo }: { owner: string; repo: string }) {
  const { data, isLoading } = useQuery<{ runs: GitHubWorkflowRun[]; message?: string }>({
    queryKey: [`/api/github/repos/${owner}/${repo}/runs`],
  });

  const dispatchMutation = useMutation({
    mutationFn: (workflowId: string) =>
      apiRequest("POST", `/api/github/repos/${owner}/${repo}/dispatch`, {
        workflow_id: workflowId,
        ref: "main",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/github/repos/${owner}/${repo}/runs`],
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  const runs = data?.runs || [];

  if (runs.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground">
        No workflow runs found for this repository.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/20">
      {runs.map((run) => (
        <div
          key={run.id}
          className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors"
          data-testid={`run-${run.id}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-foreground truncate">
                {run.name}
              </span>
              <StatusBadge status={run.status} conclusion={run.conclusion} />
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                {run.head_branch}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <GitCommit className="h-3 w-3" />
                {run.head_sha}
              </span>
              <span>
                {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              data-testid={`btn-trigger-${run.id}`}
              variant="outline"
              size="sm"
              onClick={() => dispatchMutation.mutate(String(run.id))}
              disabled={dispatchMutation.isPending}
              className="text-[10px] h-7 px-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            >
              <Play className="h-3 w-3 mr-1" />
              Trigger
            </Button>
            <a
              href={run.html_url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`link-run-${run.id}`}
            >
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function RepoCard({ repo }: { repo: GitHubRepo }) {
  const [expanded, setExpanded] = useState(false);
  const [owner, repoName] = repo.full_name.split("/");

  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid={`repo-card-${repo.name}`}
      >
        <div className="p-2 rounded-lg bg-primary/10">
          <GitBranch className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold text-foreground">{repo.full_name}</h3>
          <span className="text-[10px] text-muted-foreground">
            Default branch: {repo.default_branch}
          </span>
        </div>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          data-testid={`link-repo-${repo.name}`}
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </a>
      </div>
      {expanded && (
        <div className="border-t border-border/30">
          <div className="px-5 py-2 bg-muted/10 border-b border-border/20">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Workflow Runs
            </span>
          </div>
          <WorkflowRunsList owner={owner} repo={repoName} />
        </div>
      )}
    </Card>
  );
}

export default function GitHubPage() {
  const { data: ghStatus, isLoading: statusLoading } = useQuery<{
    configured: boolean;
    message: string;
  }>({
    queryKey: ["/api/github/status"],
  });

  const { data: reposData, isLoading: reposLoading } = useQuery<{
    repos: GitHubRepo[];
    message?: string;
  }>({
    queryKey: ["/api/github/repos"],
    enabled: ghStatus?.configured === true,
  });

  const isConfigured = ghStatus?.configured === true;

  return (
    <DashboardLayout title="GitHub Actions" subtitle="Monitor and trigger workflows">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Badge
          data-testid="github-status-badge"
          className={`text-[10px] ${
            isConfigured
              ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
          }`}
        >
          {statusLoading ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : isConfigured ? (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          ) : (
            <AlertTriangle className="h-3 w-3 mr-1" />
          )}
          {statusLoading
            ? "Checking..."
            : isConfigured
              ? "Connected"
              : "Not Configured"}
        </Badge>
      </div>

      {!isConfigured && !statusLoading ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {reposLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : reposData?.repos && reposData.repos.length > 0 ? (
            reposData.repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))
          ) : (
            <Card className="border border-border/50 bg-card/80">
              <CardContent className="p-8 text-center text-xs text-muted-foreground">
                No repositories found. Make sure your token has the correct scopes.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

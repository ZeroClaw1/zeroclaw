import { useState, useEffect, useCallback } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import type { Pipeline, Workflow, Agent, Deployment } from "@shared/schema";
import {
  Search,
  GitBranch,
  Workflow as WorkflowIcon,
  Bot,
  Rocket,
} from "lucide-react";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

interface SearchResults {
  pipelines: Pipeline[];
  workflows: Workflow[];
  agents: Agent[];
  deployments: Deployment[];
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    pipelines: [],
    workflows: [],
    agents: [],
    deployments: [],
  });
  const [, navigate] = useLocation();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ pipelines: [], workflows: [], agents: [], deployments: [] });
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/search?q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          setResults(await res.json());
        }
      } catch {
        // ignore
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      setQuery("");
      navigate(path);
    },
    [navigate]
  );

  const hasResults =
    results.pipelines.length > 0 ||
    results.workflows.length > 0 ||
    results.agents.length > 0 ||
    results.deployments.length > 0;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-2 text-muted-foreground hover:text-foreground px-2"
        onClick={() => setOpen(true)}
        data-testid="button-global-search"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-[10px] hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/40 bg-muted/30 px-1.5 font-mono text-[9px] text-muted-foreground">
          <span className="text-[9px]">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search pipelines, workflows, agents, deployments..."
          value={query}
          onValueChange={setQuery}
          data-testid="input-global-search"
        />
        <CommandList>
          {query.trim() && !hasResults && (
            <CommandEmpty>
              <span className="text-[11px] text-muted-foreground">
                No results for "{query}"
              </span>
            </CommandEmpty>
          )}

          {results.pipelines.length > 0 && (
            <CommandGroup heading="Pipelines">
              {results.pipelines.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`pipeline-${p.id}`}
                  onSelect={() => handleSelect("/pipelines")}
                  className="gap-2 text-xs"
                  data-testid={`search-result-pipeline-${p.id}`}
                >
                  <GitBranch className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-foreground">{p.name}</span>
                    <span className="text-[9px] text-muted-foreground ml-2">{p.branch}</span>
                  </div>
                  <span className={`text-[9px] uppercase tracking-wider ${
                    p.status === "success" ? "text-emerald-400" :
                    p.status === "failed" ? "text-red-400" :
                    p.status === "running" ? "text-blue-400" :
                    "text-muted-foreground"
                  }`}>
                    {p.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.pipelines.length > 0 && results.workflows.length > 0 && <CommandSeparator />}

          {results.workflows.length > 0 && (
            <CommandGroup heading="Workflows">
              {results.workflows.map((w) => (
                <CommandItem
                  key={w.id}
                  value={`workflow-${w.id}`}
                  onSelect={() => handleSelect("/workflows")}
                  className="gap-2 text-xs"
                  data-testid={`search-result-workflow-${w.id}`}
                >
                  <WorkflowIcon className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-foreground">{w.name}</span>
                  </div>
                  <span className={`text-[9px] uppercase tracking-wider ${
                    w.status === "success" ? "text-emerald-400" :
                    w.status === "failed" ? "text-red-400" :
                    w.status === "running" ? "text-blue-400" :
                    "text-muted-foreground"
                  }`}>
                    {w.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(results.pipelines.length > 0 || results.workflows.length > 0) && results.agents.length > 0 && <CommandSeparator />}

          {results.agents.length > 0 && (
            <CommandGroup heading="Agents">
              {results.agents.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`agent-${a.id}`}
                  onSelect={() => handleSelect("/agents")}
                  className="gap-2 text-xs"
                  data-testid={`search-result-agent-${a.id}`}
                >
                  <Bot className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-foreground">{a.name}</span>
                    <span className="text-[9px] text-muted-foreground ml-2">{a.model}</span>
                  </div>
                  <span className={`text-[9px] uppercase tracking-wider ${
                    a.status === "online" ? "text-emerald-400" :
                    a.status === "busy" ? "text-amber-400" :
                    "text-muted-foreground"
                  }`}>
                    {a.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(results.pipelines.length > 0 || results.workflows.length > 0 || results.agents.length > 0) && results.deployments.length > 0 && <CommandSeparator />}

          {results.deployments.length > 0 && (
            <CommandGroup heading="Deployments">
              {results.deployments.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`deployment-${d.id}`}
                  onSelect={() => handleSelect("/deployments")}
                  className="gap-2 text-xs"
                  data-testid={`search-result-deployment-${d.id}`}
                >
                  <Rocket className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-foreground">{d.pipelineName}</span>
                    <span className="text-[9px] text-muted-foreground ml-2">{d.environment}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{d.version}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { OpenCodeConfig, OpenCodeProvider } from "@shared/schema";
import {
  Loader2,
  Eye,
  EyeOff,
  Info,
  ExternalLink,
  Cpu,
} from "lucide-react";

const PROVIDERS: { value: OpenCodeProvider; label: string; description: string }[] = [
  { value: "openai", label: "OpenAI", description: "GPT-4o, GPT-4 Turbo, o1" },
  { value: "anthropic", label: "Anthropic", description: "Claude Opus, Sonnet, Haiku" },
  { value: "google", label: "Google Gemini", description: "Gemini 2.5 Pro, Flash" },
  { value: "openrouter", label: "OpenRouter", description: "Aggregate 200+ models" },
  { value: "ollama", label: "Ollama", description: "Local models (Llama, Mistral)" },
  { value: "custom", label: "Custom", description: "Any OpenAI-compatible endpoint" },
];

const PROVIDER_MODELS: Record<OpenCodeProvider, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "o1", label: "o1" },
    { value: "o3-mini", label: "o3-mini" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-haiku-4-20250514", label: "Claude Haiku 4" },
  ],
  google: [
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
  openrouter: [
    { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
    { value: "openai/gpt-4o", label: "GPT-4o" },
    { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "meta-llama/llama-3.3-70b", label: "Llama 3.3 70B" },
  ],
  ollama: [
    { value: "llama3.3", label: "Llama 3.3" },
    { value: "codellama", label: "Code Llama" },
    { value: "deepseek-coder-v2", label: "DeepSeek Coder V2" },
    { value: "qwen2.5-coder", label: "Qwen 2.5 Coder" },
  ],
  custom: [
    { value: "custom-model", label: "Custom Model" },
  ],
};

export function OpenCodeConfigPanel() {
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasEditedKey, setHasEditedKey] = useState(false);

  const { data: config, isLoading } = useQuery<OpenCodeConfig | null>({
    queryKey: ["/api/opencode/config"],
  });

  const updateConfig = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", "/api/opencode/config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opencode/config"] });
      toast({ title: "OpenCode configuration updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/opencode/test");
      return res.json();
    },
    onSuccess: (data: { success: boolean; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/opencode/config"] });
      toast({
        title: data.success ? "Connection successful" : "Connection failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const currentProvider: OpenCodeProvider = config?.provider ?? "openai";
  const models = PROVIDER_MODELS[currentProvider] ?? PROVIDER_MODELS.openai;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${
              config?.status === "connected" ? "bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.6)]" :
              config?.status === "error" ? "bg-red-500" : "bg-gray-500"
            }`} />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <span>Status: <span className={
              config?.status === "connected" ? "text-lime-400" :
              config?.status === "error" ? "text-red-400" : "text-gray-400"
            }>{config?.status ?? "disconnected"}</span></span>
            {config?.totalTasks != null && <span>Tasks: {config.totalTasks}</span>}
            {config?.totalTokensUsed != null && <span>Tokens: {config.totalTokensUsed.toLocaleString()}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Provider Selector */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-lime-400" />
            Provider
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 transition-all text-left ${
                  currentProvider === p.value
                    ? "border-lime-500/60 bg-lime-500/5 shadow-[0_0_12px_rgba(132,204,22,0.08)]"
                    : "border-border/50 bg-card/30 hover:border-border"
                }`}
                onClick={() => {
                  const firstModel = PROVIDER_MODELS[p.value]?.[0]?.value || "gpt-4o";
                  updateConfig.mutate({ provider: p.value, model: firstModel });
                }}
                data-testid={`opencode-provider-${p.value}`}
              >
                <span className="text-xs font-mono font-medium">{p.label}</span>
                <span className="text-[9px] font-mono text-muted-foreground leading-snug">{p.description}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Key */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            API Key
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-lime-500/40 text-lime-400">
              {PROVIDERS.find(p => p.value === currentProvider)?.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                placeholder={currentProvider === "ollama" ? "(optional for local)" : "Enter API key..."}
                value={hasEditedKey ? apiKeyInput : (config?.apiKey ?? "")}
                onChange={(e) => { setApiKeyInput(e.target.value); setHasEditedKey(true); }}
                className="font-mono text-xs pr-10 bg-background/50"
                data-testid="opencode-api-key-input"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setShowKey(!showKey)}
                data-testid="opencode-toggle-key-visibility"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-mono"
              disabled={!hasEditedKey || updateConfig.isPending}
              onClick={() => {
                updateConfig.mutate({ apiKey: apiKeyInput });
                setHasEditedKey(false);
              }}
              data-testid="opencode-save-key"
            >
              {updateConfig.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-mono"
              disabled={testConnection.isPending || !config?.apiKey}
              onClick={() => testConnection.mutate()}
              data-testid="opencode-test-connection"
            >
              {testConnection.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
            </Button>
          </div>
          {currentProvider === "ollama" && (
            <p className="text-[10px] font-mono text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/60" />
              Ollama runs locally. No API key needed if using default settings.
            </p>
          )}
          {currentProvider === "openrouter" && (
            <p className="text-[10px] font-mono text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/60" />
              <span>Get your key from{" "}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
                  className="text-lime-400 hover:underline inline-flex items-center gap-0.5">
                  openrouter.ai<ExternalLink className="h-2.5 w-2.5" />
                </a>
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Custom Base URL (for custom/ollama) */}
      {(currentProvider === "custom" || currentProvider === "ollama") && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono">Base URL</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder={currentProvider === "ollama" ? "http://localhost:11434/v1" : "https://your-api.example.com/v1"}
              value={config?.baseUrl ?? ""}
              onChange={(e) => updateConfig.mutate({ baseUrl: e.target.value })}
              className="font-mono text-xs bg-background/50"
              data-testid="opencode-base-url"
            />
          </CardContent>
        </Card>
      )}

      {/* Model & Token Settings */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono">Model Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-mono text-muted-foreground">Model</Label>
            <Select
              value={config?.model ?? models[0]?.value}
              onValueChange={(val) => updateConfig.mutate({ model: val })}
            >
              <SelectTrigger className="font-mono text-xs" data-testid="opencode-model-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="font-mono text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono text-muted-foreground">Max Tokens</Label>
              <span className="text-xs font-mono text-muted-foreground">{config?.maxTokens ?? 8192}</span>
            </div>
            <Slider
              value={[config?.maxTokens ?? 8192]}
              min={256}
              max={128000}
              step={256}
              onValueCommit={(val) => updateConfig.mutate({ maxTokens: val[0] })}
              data-testid="opencode-max-tokens-slider"
            />
          </div>
        </CardContent>
      </Card>

      {/* Obsidian Context Toggle */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono">Context Bridge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-mono">Use Obsidian Context</Label>
              <p className="text-[10px] text-muted-foreground font-mono">Pull relevant vault notes into coding task context</p>
            </div>
            <Switch
              checked={config?.useObsidianContext ?? false}
              onCheckedChange={(val) => updateConfig.mutate({ useObsidianContext: val })}
              data-testid="opencode-obsidian-toggle"
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom System Prompt */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono">Custom System Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Optional: Add custom instructions for OpenCode..."
            value={config?.systemPrompt ?? ""}
            onChange={(e) => updateConfig.mutate({ systemPrompt: e.target.value })}
            className="font-mono text-xs min-h-[100px] bg-background/50 resize-y"
            data-testid="opencode-system-prompt"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function OpenCodePage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <OpenCodeConfigPanel />
    </div>
  );
}

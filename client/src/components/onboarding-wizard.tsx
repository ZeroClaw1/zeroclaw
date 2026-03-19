import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OnboardingState } from "@shared/schema";
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Terminal,
  Code2,
  Bot,
  ExternalLink,
  Rocket,
} from "lucide-react";
import { useLocation } from "wouter";

interface OnboardingWizardProps {
  onboarding: OnboardingState;
  onComplete: () => void;
}

// 4 steps: 0-based index
const STEPS = [
  { key: "welcome", label: "Welcome" },
  { key: "openclaw", label: "OpenClaw" },
  { key: "claudeCode", label: "Claude Code" },
  { key: "firstAgent", label: "First Agent" },
] as const;

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-8" data-testid="onboarding-stepper">
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(173,80%,50%,0.4)]"
                    : isDone
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/30 text-muted-foreground"
                }`}
                data-testid={`onboarding-step-${i}`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`text-[9px] mt-1 ${
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-px mx-1 mt-[-12px] transition-colors ${
                  i < currentStep ? "bg-primary/50" : "bg-muted/30"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---- Step 1: Welcome ---- */
function WelcomeStep() {
  return (
    <div className="text-center space-y-5">
      <div className="inline-flex p-4 rounded-xl bg-primary/10 mb-1">
        <Rocket className="h-10 w-10 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-2">Welcome to ZeroClaw</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          ZeroClaw is an AI agent orchestrator — build pipelines, deploy agents, and automate
          intelligent workflows with Claude Code and OpenClaw.
        </p>
      </div>
      <p className="text-xs text-muted-foreground font-mono">
        Let&apos;s get you set up in 3 quick steps.
      </p>
    </div>
  );
}

/* ---- Step 2: Connect OpenClaw ---- */
function ConnectOpenClawStep({ onStepComplete }: { onStepComplete: () => void }) {
  const [, navigate] = useLocation();

  const handleGo = async () => {
    try {
      await apiRequest("POST", "/api/onboarding/step", { step: "openclawConnected" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      onStepComplete();
    } catch {
      // best-effort
    }
    navigate("/openclaw");
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-3">
          <Terminal className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Connect OpenClaw</h2>
        <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
          OpenClaw is the local gateway that connects your AI agents to ZeroClaw. Enter
          your gateway URL to enable real-time agent communication.
        </p>
      </div>

      <div className="max-w-sm mx-auto rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground space-y-2 font-mono">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Start your OpenClaw gateway locally</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Enter the gateway URL (default: localhost:18789)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Click Connect to establish the link</span>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleGo}
          className="text-xs gap-2"
          data-testid="onboarding-go-openclaw"
        >
          <Terminal className="h-3.5 w-3.5" />
          Go to OpenClaw Page
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Button>
      </div>
    </div>
  );
}

/* ---- Step 3: Configure Claude Code ---- */
function ConfigureClaudeCodeStep({ onStepComplete }: { onStepComplete: () => void }) {
  const [, navigate] = useLocation();

  const handleGo = async () => {
    try {
      await apiRequest("POST", "/api/onboarding/step", { step: "firstAgentCreated" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      onStepComplete();
    } catch {
      // best-effort
    }
    navigate("/claude-code");
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex p-3 rounded-xl bg-accent/20 mb-3">
          <Code2 className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Configure Claude Code</h2>
        <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
          Add your Anthropic API key to unlock Claude Code integration — run coding tasks,
          generate code, and leverage Obsidian vault context directly from ZeroClaw.
        </p>
      </div>

      <div className="max-w-sm mx-auto rounded-lg border border-accent/20 bg-accent/5 p-4 text-xs text-muted-foreground space-y-2 font-mono">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span>Get your API key from console.anthropic.com</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span>Paste it in the Claude Code settings page</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span>Choose your preferred Claude model</span>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleGo}
          variant="outline"
          className="text-xs gap-2 border-accent/30 hover:border-accent/60 hover:bg-accent/10"
          data-testid="onboarding-go-claude-code"
        >
          <Code2 className="h-3.5 w-3.5 text-accent" />
          Go to Claude Code Page
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Button>
      </div>
    </div>
  );
}

/* ---- Step 4: Create First Agent ---- */
function CreateFirstAgentStep({ onStepComplete }: { onStepComplete: () => void }) {
  const [, navigate] = useLocation();

  const handleGo = async () => {
    try {
      await apiRequest("POST", "/api/onboarding/step", { step: "firstPipelineRun" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      onStepComplete();
    } catch {
      // best-effort
    }
    navigate("/agents");
  };

  return (
    <div className="text-center space-y-5">
      <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-1">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold tracking-tight">Create Your First Agent</h2>
        <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
          Agents are the core workers in ZeroClaw. Connect an agent to your OpenClaw gateway,
          assign skills, and put it to work on pipelines and workflows.
        </p>
      </div>
      <div className="max-w-sm mx-auto rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground font-mono space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Name your agent and pick a model</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Point it at your gateway URL</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Assign skills from the marketplace</span>
        </div>
      </div>
      <div className="flex justify-center">
        <Button
          onClick={handleGo}
          className="text-xs gap-2"
          data-testid="onboarding-go-agents"
        >
          <Bot className="h-3.5 w-3.5" />
          Go to Agents Page
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Button>
      </div>
    </div>
  );
}

/* ---- Main Wizard ---- */
export function OnboardingWizard({ onboarding, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const totalSteps = STEPS.length;

  const goNext = () => {
    if (step < totalSteps - 1) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleSkip = async () => {
    if (step < totalSteps - 1) {
      // mark current step done via API (best-effort)
      const stepKeys: Record<number, string> = {
        1: "openclawConnected",
        2: "firstAgentCreated",
        3: "firstPipelineRun",
      };
      if (stepKeys[step]) {
        try {
          await apiRequest("POST", "/api/onboarding/step", { step: stepKeys[step] });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        } catch {
          // best-effort
        }
      }
      goNext();
    }
  };

  const handleGetStarted = async () => {
    try {
      await apiRequest("POST", "/api/onboarding/complete");
    } catch {
      // best-effort
    }
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    onComplete();
  };

  const handleDismiss = async () => {
    try {
      await apiRequest("POST", "/api/onboarding/complete");
    } catch {
      // best-effort
    }
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    onComplete();
  };

  const handleStepComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  const isFinalStep = step === totalSteps - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      data-testid="onboarding-wizard"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleDismiss}
      />

      {/* Card */}
      <motion.div
        className="relative w-full max-w-lg mx-4 rounded-xl border border-primary/20 bg-card shadow-[0_0_60px_hsl(173,80%,50%,0.08)] overflow-hidden"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent top line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        {/* Close button */}
        <button
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors z-10"
          onClick={handleDismiss}
          data-testid="onboarding-dismiss"
          aria-label="Dismiss onboarding"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-8 pt-10">
          {/* Step X of 4 label */}
          <div className="text-center mb-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </span>
          </div>

          {/* Step indicators */}
          <StepIndicator currentStep={step} />

          {/* Step content */}
          <div className="min-h-[280px] flex items-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="w-full"
              >
                {step === 0 && <WelcomeStep />}
                {step === 1 && (
                  <ConnectOpenClawStep onStepComplete={handleStepComplete} />
                )}
                {step === 2 && (
                  <ConfigureClaudeCodeStep onStepComplete={handleStepComplete} />
                )}
                {step === 3 && (
                  <CreateFirstAgentStep onStepComplete={handleStepComplete} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation row */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
            {/* Left: Back button */}
            <div>
              {step > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={goBack}
                  data-testid="onboarding-back"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Back
                </Button>
              )}
            </div>

            {/* Right: Skip / Next / Get Started */}
            <div className="flex items-center gap-2">
              {/* Skip on middle steps */}
              {step > 0 && !isFinalStep && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={handleSkip}
                  data-testid="onboarding-skip"
                >
                  Skip
                </Button>
              )}

              {/* Welcome step: Next */}
              {step === 0 && (
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={goNext}
                  data-testid="onboarding-next"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}

              {/* Middle steps: Next */}
              {step > 0 && !isFinalStep && (
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={goNext}
                  data-testid="onboarding-next"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}

              {/* Final step: Get Started */}
              {isFinalStep && (
                <Button
                  size="sm"
                  className="text-xs gap-1"
                  onClick={handleGetStarted}
                  data-testid="onboarding-get-started"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

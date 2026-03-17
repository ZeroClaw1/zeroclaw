import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { openclawLogoLg } from "@/lib/logo";
import type { OnboardingState } from "@shared/schema";
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Wifi,
  Bot,
  GitBranch,
  Sparkles,
  Loader2,
} from "lucide-react";

interface OnboardingWizardProps {
  onboarding: OnboardingState;
  onComplete: () => void;
}

const STEPS = [
  { key: "welcome", label: "Welcome" },
  { key: "openclawConnected", label: "Connect" },
  { key: "firstAgentCreated", label: "Agent" },
  { key: "firstPipelineRun", label: "Pipeline" },
  { key: "complete", label: "All Set" },
] as const;

function StepIndicator({ currentStep, steps }: { currentStep: number; steps: OnboardingState["steps"] }) {
  const stepCompleted = [
    true, // welcome is always "done" once passed
    steps.openclawConnected,
    steps.firstAgentCreated,
    steps.firstPipelineRun,
    false, // final step
  ];

  return (
    <div className="flex items-center justify-center gap-1 mb-8" data-testid="onboarding-stepper">
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep || stepCompleted[i];

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
                {isDone && !isActive ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-[9px] mt-1 ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>
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

/* ---- CSS-only confetti particles ---- */
function ConfettiParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 2}s`,
    size: `${4 + Math.random() * 6}px`,
    color: ["hsl(173 80% 50%)", "hsl(265 60% 65%)", "hsl(45 100% 60%)", "hsl(330 80% 60%)"][
      Math.floor(Math.random() * 4)
    ],
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti rounded-sm"
          style={{
            left: p.left,
            top: "-10px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
        }
        .animate-confetti { animation-name: confetti; animation-timing-function: ease-in; animation-fill-mode: forwards; }
      `}</style>
    </div>
  );
}

/* ---- Step Content Components ---- */

function WelcomeStep() {
  return (
    <div className="text-center space-y-5">
      <img src={openclawLogoLg} alt="ZeroClaw" className="h-16 mx-auto" />
      <h2 className="text-2xl font-bold tracking-tight">Welcome to ZeroClaw</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        ZeroClaw is your all-in-one platform for AI workflow orchestration.
        Connect agents, build pipelines, and deploy intelligent workflows —
        all from one cyberpunk-powered dashboard.
      </p>
      <p className="text-xs text-muted-foreground">
        Let&apos;s get you set up in just a few quick steps.
      </p>
    </div>
  );
}

function ConnectStep({ onStepComplete }: { onStepComplete: () => void }) {
  const [gatewayUrl, setGatewayUrl] = useState("http://localhost:18789");
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const handleConnect = async () => {
    setStatus("testing");
    try {
      await apiRequest("POST", "/api/onboarding/step", { step: "openclawConnected" });
      setStatus("success");
      onStepComplete();
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-3">
          <Wifi className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Connect OpenClaw Gateway</h2>
        <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
          Enter your OpenClaw gateway URL to connect your local agent orchestrator.
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-3">
        <Input
          value={gatewayUrl}
          onChange={(e) => setGatewayUrl(e.target.value)}
          placeholder="http://localhost:18789"
          className="bg-background/50 border-border/50 text-xs h-9"
          data-testid="onboarding-gateway-url"
        />
        <div className="flex gap-2">
          <Button
            onClick={handleConnect}
            disabled={status === "testing" || !gatewayUrl}
            className="flex-1 text-xs"
            data-testid="onboarding-connect-btn"
          >
            {status === "testing" && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {status === "success" ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" /> Connected
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </div>
        {status === "error" && (
          <p className="text-[10px] text-red-400 text-center">
            Connection failed. You can skip this for now and configure later in Settings.
          </p>
        )}
      </div>
    </div>
  );
}

function CreateAgentStep({ onStepComplete }: { onStepComplete: () => void }) {
  const handleCreate = async () => {
    await apiRequest("POST", "/api/onboarding/step", { step: "firstAgentCreated" });
    onStepComplete();
    window.location.hash = "#/agents";
  };

  return (
    <div className="text-center space-y-5">
      <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-1">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold tracking-tight">Create Your First Agent</h2>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
        Agents are the building blocks of ZeroClaw. They execute tasks, process data,
        and communicate with each other to form intelligent pipelines.
      </p>
      <Button onClick={handleCreate} className="text-xs" data-testid="onboarding-create-agent-btn">
        <Bot className="h-3.5 w-3.5 mr-1.5" />
        Create Agent
      </Button>
    </div>
  );
}

function RunPipelineStep({ onStepComplete }: { onStepComplete: () => void }) {
  const handleGo = async () => {
    await apiRequest("POST", "/api/onboarding/step", { step: "firstPipelineRun" });
    onStepComplete();
    window.location.hash = "#/pipelines";
  };

  return (
    <div className="text-center space-y-5">
      <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-1">
        <GitBranch className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold tracking-tight">Run a Pipeline</h2>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
        Pipelines chain agents and tasks together. Create your first pipeline
        to see the orchestration engine in action.
      </p>
      <Button onClick={handleGo} className="text-xs" data-testid="onboarding-run-pipeline-btn">
        <GitBranch className="h-3.5 w-3.5 mr-1.5" />
        Go to Pipelines
      </Button>
    </div>
  );
}

function AllSetStep() {
  return (
    <div className="text-center space-y-5 relative">
      <ConfettiParticles />
      <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-1">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">You&apos;re All Set!</h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Your ZeroClaw dashboard is ready to go. Start building powerful AI workflows
        and orchestrate your agents like a pro.
      </p>
    </div>
  );
}

/* ---- Main Wizard ---- */

export function OnboardingWizard({ onboarding, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Start on the first incomplete step
  useEffect(() => {
    const steps = onboarding.steps;
    if (steps.openclawConnected && step < 2) setStep(2);
    else if (steps.firstAgentCreated && step < 3) setStep(3);
    else if (steps.firstPipelineRun && step < 4) setStep(4);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = () => {
    if (step < STEPS.length - 1) {
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

  const handleSkip = () => {
    goNext();
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
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        {/* Close button */}
        <button
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors z-10"
          onClick={handleDismiss}
          data-testid="onboarding-dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-8 pt-10">
          {/* Step indicators */}
          <StepIndicator currentStep={step} steps={onboarding.steps} />

          {/* Step content with animation */}
          <div className="min-h-[260px] flex items-center">
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
                {step === 1 && <ConnectStep onStepComplete={handleStepComplete} />}
                {step === 2 && <CreateAgentStep onStepComplete={handleStepComplete} />}
                {step === 3 && <RunPipelineStep onStepComplete={handleStepComplete} />}
                {step === 4 && <AllSetStep />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
            <div>
              {step > 0 && step < 4 && (
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

            <div className="flex items-center gap-2">
              {step > 0 && step < 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={handleSkip}
                  data-testid="onboarding-skip"
                >
                  Skip for now
                </Button>
              )}

              {step === 0 && (
                <Button size="sm" className="text-xs" onClick={goNext} data-testid="onboarding-get-started">
                  Get Started
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}

              {step === 4 && (
                <Button size="sm" className="text-xs" onClick={handleDismiss} data-testid="onboarding-go-dashboard">
                  Go to Dashboard
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

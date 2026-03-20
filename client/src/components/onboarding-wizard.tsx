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
  Code2,
  Bot,
  ExternalLink,
  Rocket,
  Globe,
  GitBranch,
  LayoutDashboard,
} from "lucide-react";
import { useLocation } from "wouter";

interface OnboardingWizardProps {
  onboarding: OnboardingState;
  onComplete: () => void;
}

// ---- Intent Types ----
type Intent = "website" | "automate" | "cicd" | null;

interface StepDef {
  key: string;
  label: string;
}

const STEPS_BY_INTENT: Record<NonNullable<Intent>, StepDef[]> = {
  website: [
    { key: "welcome", label: "Welcome" },
    { key: "claude_code", label: "Claude Code" },
    { key: "planning", label: "Plan" },
    { key: "deploy", label: "Deploy" },
    { key: "allset", label: "Done" },
  ],
  automate: [
    { key: "welcome", label: "Welcome" },
    { key: "claude_code", label: "Claude Code" },
    { key: "agents", label: "Agents" },
    { key: "tasks", label: "Tasks" },
    { key: "allset", label: "Done" },
  ],
  cicd: [
    { key: "welcome", label: "Welcome" },
    { key: "github", label: "GitHub" },
    { key: "workflows", label: "Workflows" },
    { key: "webhooks", label: "Webhooks" },
    { key: "allset", label: "Done" },
  ],
};

// ---- Step Indicator ----
function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: StepDef[];
}) {
  return (
    <div
      className="flex items-center justify-center gap-1 mb-8"
      data-testid="onboarding-stepper"
    >
      {steps.map((step, i) => {
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
            {i < steps.length - 1 && (
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

// ---- Intent Card ----
function IntentCard({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
  testId,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <motion.button
      className={`relative w-full text-left rounded-xl border p-4 transition-all duration-200 overflow-hidden group ${
        selected
          ? "border-primary/70 bg-primary/8 shadow-[0_0_20px_hsl(173,80%,50%,0.15)]"
          : "border-border/50 bg-card/40 hover:border-primary/40 hover:bg-primary/5"
      }`}
      onClick={onClick}
      data-testid={testId}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Gradient border shine on hover */}
      <div
        className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
          selected ? "opacity-100" : ""
        }`}
        style={{
          background: selected
            ? "linear-gradient(135deg, hsl(173,80%,50%,0.06) 0%, transparent 60%)"
            : "linear-gradient(135deg, hsl(173,80%,50%,0.04) 0%, transparent 60%)",
        }}
      />
      {/* Top gradient border line */}
      {selected && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      )}

      <div className="flex items-start gap-3 relative z-10">
        <div
          className={`p-2 rounded-lg transition-colors ${
            selected ? "bg-primary/15" : "bg-muted/30 group-hover:bg-primary/10"
          }`}
        >
          <Icon
            className={`h-5 w-5 transition-colors ${
              selected ? "text-primary" : "text-muted-foreground group-hover:text-primary/80"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span
              className={`text-sm font-semibold tracking-tight ${
                selected ? "text-foreground" : "text-foreground/80"
              }`}
            >
              {title}
            </span>
            {selected && (
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="h-3 w-3 text-primary" />
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

// ---- Step 0: Welcome + Intent ----
function WelcomeIntentStep({
  selectedIntent,
  onIntentSelect,
}: {
  selectedIntent: Intent;
  onIntentSelect: (intent: Intent) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="inline-flex p-4 rounded-xl bg-primary/10 mb-1">
          <Rocket className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-2">
            Welcome to ZeroClaw
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            ZeroClaw orchestrates AI agents to build, deploy, and automate — all
            from one place.
          </p>
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          What do you want to do?
        </p>
      </div>

      <div className="space-y-2.5 max-w-sm mx-auto">
        <IntentCard
          icon={Globe}
          title="Build a Website"
          description="Let AI build and deploy your site"
          selected={selectedIntent === "website"}
          onClick={() => onIntentSelect("website")}
          testId="onboarding-intent-website"
        />
        <IntentCard
          icon={Bot}
          title="Automate Tasks"
          description="Set up agents to handle work for you"
          selected={selectedIntent === "automate"}
          onClick={() => onIntentSelect("automate")}
          testId="onboarding-intent-automate"
        />
        <IntentCard
          icon={GitBranch}
          title="CI/CD Pipeline"
          description="Continuous integration and deployment"
          selected={selectedIntent === "cicd"}
          onClick={() => onIntentSelect("cicd")}
          testId="onboarding-intent-cicd"
        />
      </div>
    </div>
  );
}

// ---- Reusable "Go There" Step ----
function GoThereStep({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  bullets,
  buttonLabel,
  buttonVariant,
  apiStep,
  destination,
  onStepComplete,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  bullets: string[];
  buttonLabel: string;
  buttonVariant?: "default" | "outline";
  apiStep?: string;
  destination: string;
  onStepComplete: () => void;
}) {
  const [, navigate] = useLocation();

  const handleGo = async () => {
    if (apiStep) {
      try {
        await apiRequest("POST", "/api/onboarding/step", { step: apiStep });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        onStepComplete();
      } catch {
        // best-effort
      }
    }
    navigate(destination);
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className={`inline-flex p-3 rounded-xl ${iconBg} mb-3`}>
          <Icon className={`h-8 w-8 ${iconColor}`} />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      <div
        className={`max-w-sm mx-auto rounded-lg border ${iconBg.replace("bg-", "border-").replace("/10", "/20")} ${iconBg} p-4 text-xs text-muted-foreground space-y-2 font-mono`}
      >
        {bullets.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${iconColor.replace("text-", "bg-")}`} />
            <span>{b}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleGo}
          variant={buttonVariant ?? "default"}
          className={`text-xs gap-2 ${
            buttonVariant === "outline"
              ? `${iconColor.replace("text-", "border-").replace("-400", "/30")} hover:bg-${iconBg}`
              : ""
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {buttonLabel}
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Button>
      </div>
    </div>
  );
}

// ---- Step: Configure Claude Code ----
function ClaudeCodeStep({ onStepComplete }: { onStepComplete: () => void }) {
  return (
    <GoThereStep
      icon={Code2}
      iconColor="text-accent"
      iconBg="bg-accent/10"
      title="Configure Claude Code"
      description="Add your Anthropic API key to unlock Claude Code integration — run coding tasks, generate code, and leverage Obsidian vault context directly from ZeroClaw."
      bullets={[
        "Get your API key from console.anthropic.com",
        "Paste it in the Claude Code settings page",
        "Choose your preferred Claude model",
      ]}
      buttonLabel="Go to Claude Code"
      buttonVariant="outline"
      apiStep="firstAgentCreated"
      destination="/claude-code"
      onStepComplete={onStepComplete}
    />
  );
}

// ---- Website path steps ----
function PlanningStep({ onStepComplete }: { onStepComplete: () => void }) {
  return (
    <GoThereStep
      icon={LayoutDashboard}
      iconColor="text-primary"
      iconBg="bg-primary/10"
      title="Create Your First Plan"
      description="Use the planning board to scope your website — describe what you want built and let AI generate the structure, pages, and components."
      bullets={[
        "Describe your site in plain language",
        "AI generates a step-by-step build plan",
        "Review and kick off the build",
      ]}
      buttonLabel="Go to Planning →"
      apiStep="openclawConnected"
      destination="/planning"
      onStepComplete={onStepComplete}
    />
  );
}

function DeployStep({ onStepComplete }: { onStepComplete: () => void }) {
  return (
    <GoThereStep
      icon={Rocket}
      iconColor="text-primary"
      iconBg="bg-primary/10"
      title="Deploy Your Site"
      description="Push your generated site to the world. ZeroClaw handles builds, static hosting, and CI/CD so you can ship instantly."
      bullets={[
        "Connect a domain or use a ZeroClaw subdomain",
        "One-click deploy from the deployments page",
        "Automatic preview URLs for every build",
      ]}
      buttonLabel="Go to Deployments →"
      apiStep="firstPipelineRun"
      destination="/deployments"
      onStepComplete={onStepComplete}
    />
  );
}

// ---- Automate path steps ----
function AgentsStep({ onStepComplete }: { onStepComplete: () => void }) {
  return (
    <GoThereStep
      icon={Bot}
      iconColor="text-primary"
      iconBg="bg-primary/10"
      title="Create Your First Agent"
      description="Agents are the core workers in ZeroClaw. Connect an agent to your OpenClaw gateway, assign skills, and put it to work on pipelines and workflows."
      bullets={[
        "Name your agent and pick a model",
        "Point it at your gateway URL",
        "Assign skills from the marketplace",
      ]}
      buttonLabel="Go to Agents →"
      apiStep="openclawConnected"
      destination="/agents"
      onStepComplete={onStepComplete}
    />
  );
}

function AgentTasksStep({ onStepComplete }: { onStepComplete: () => void }) {
  return (
    <GoThereStep
      icon={Bot}
      iconColor="text-primary"
      iconBg="bg-primary/10"
      title="Assign a Task"
      description="Give your agent something to do. Assign a task and watch it work autonomously — the task queue shows live progress and results."
      bullets={[
        "Open your agent and click New Task",
        "Describe what you want the agent to do",
        "Monitor progress in the task queue",
      ]}
      buttonLabel="Go to Agents →"
      apiStep="firstPipelineRun"
      destination="/agents"
      onStepComplete={onStepComplete}
    />
  );
}

// ---- CI/CD path steps ----
function GitHubStep({ onStepComplete }: { onStepComplete: () => void }) {
  return (
    <GoThereStep
      icon={GitBranch}
      iconColor="text-primary"
      iconBg="bg-primary/10"
      title="Connect GitHub"
      description="Link your GitHub account to enable repository access, push triggers, and automated deployments directly from your codebase."
      bullets={[
        "Authorize ZeroClaw on GitHub",
        "Select the repositories to connect",
        "Set default branch and access rules",
      ]}
      buttonLabel="Go to GitHub →"
      apiStep="openclawConnected"
      destination="/github"
      onStepComplete={onStepComplete}
    />
  );
}

function WorkflowsStep({ onStepComplete }: { onStepComplete: () => void }) {
  return (
    <GoThereStep
      icon={GitBranch}
      iconColor="text-primary"
      iconBg="bg-primary/10"
      title="Create a Workflow"
      description="Workflows define what happens when code is pushed or a webhook fires — lint, test, build, and deploy steps all in sequence."
      bullets={[
        "Pick a trigger (push, PR, or webhook)",
        "Chain steps with agent tasks",
        "Set environment variables and secrets",
      ]}
      buttonLabel="Go to Workflows →"
      apiStep="firstAgentCreated"
      destination="/workflows"
      onStepComplete={onStepComplete}
    />
  );
}

function WebhooksStep({ onStepComplete }: { onStepComplete: () => void }) {
  return (
    <GoThereStep
      icon={GitBranch}
      iconColor="text-primary"
      iconBg="bg-primary/10"
      title="Set Up Webhooks"
      description="Webhooks let external services trigger your workflows — GitHub, Slack, or any HTTP caller can kick off a pipeline."
      bullets={[
        "Copy your ZeroClaw webhook URL",
        "Paste it in your external service",
        "Map event types to workflow triggers",
      ]}
      buttonLabel="Go to Webhooks →"
      apiStep="firstPipelineRun"
      destination="/webhooks"
      onStepComplete={onStepComplete}
    />
  );
}

// ---- Finale: All Set ----
function AllSetStep() {
  return (
    <div className="text-center space-y-5">
      <motion.div
        className="inline-flex p-4 rounded-xl bg-primary/10 mb-1 relative"
        animate={{
          boxShadow: [
            "0 0 0px hsl(173,80%,50%,0)",
            "0 0 30px hsl(173,80%,50%,0.4)",
            "0 0 0px hsl(173,80%,50%,0)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkles className="h-10 w-10 text-primary" />
        {/* Particle sparks */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-primary"
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              x: Math.cos((i / 6) * Math.PI * 2) * 28,
              y: Math.sin((i / 6) * Math.PI * 2) * 28,
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.25,
              ease: "easeOut",
            }}
            style={{ top: "50%", left: "50%" }}
          />
        ))}
      </motion.div>

      <div>
        <h2 className="text-xl font-bold tracking-tight mb-2">
          You&apos;re All Set!
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Your ZeroClaw environment is configured and ready. Head to the
          dashboard to see everything in one place.
        </p>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-[11px] font-mono text-primary">
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        System online
      </div>
    </div>
  );
}

// ---- Step renderer ----
// Steps: 0=Welcome+Intent, 1-3=path steps, 4=AllSet
function renderStep(
  intent: NonNullable<Intent>,
  stepIndex: number,
  onStepComplete: () => void,
  selectedIntent: Intent,
  onIntentSelect: (i: Intent) => void
) {
  if (stepIndex === 0) {
    return (
      <WelcomeIntentStep
        selectedIntent={selectedIntent}
        onIntentSelect={onIntentSelect}
      />
    );
  }

  // Final "all set" step (index 4)
  const lastStep = STEPS_BY_INTENT[intent].length - 1;
  if (stepIndex === lastStep) {
    return <AllSetStep />;
  }

  if (intent === "website") {
    if (stepIndex === 1) return <ClaudeCodeStep onStepComplete={onStepComplete} />;
    if (stepIndex === 2) return <PlanningStep onStepComplete={onStepComplete} />;
    if (stepIndex === 3) return <DeployStep onStepComplete={onStepComplete} />;
  }

  if (intent === "automate") {
    if (stepIndex === 1) return <ClaudeCodeStep onStepComplete={onStepComplete} />;
    if (stepIndex === 2) return <AgentsStep onStepComplete={onStepComplete} />;
    if (stepIndex === 3) return <AgentTasksStep onStepComplete={onStepComplete} />;
  }

  if (intent === "cicd") {
    if (stepIndex === 1) return <GitHubStep onStepComplete={onStepComplete} />;
    if (stepIndex === 2) return <WorkflowsStep onStepComplete={onStepComplete} />;
    if (stepIndex === 3) return <WebhooksStep onStepComplete={onStepComplete} />;
  }

  return null;
}

/* ---- Main Wizard ---- */
export function OnboardingWizard({ onboarding, onComplete }: OnboardingWizardProps) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedIntent, setSelectedIntent] = useState<Intent>(null);

  // Default to "automate" if no intent is chosen yet (for step indicator display only)
  const activeIntent: NonNullable<Intent> = selectedIntent ?? "automate";
  const steps = STEPS_BY_INTENT[activeIntent];
  const totalSteps = steps.length;
  const isFinalStep = step === totalSteps - 1;

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
      goNext();
    }
  };

  const handleIntentSelect = (intent: Intent) => {
    setSelectedIntent(intent);
  };

  const handleGetStarted = async () => {
    try {
      await apiRequest("POST", "/api/onboarding/complete");
    } catch {
      // best-effort
    }
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    navigate("/");
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

  // On step 0, Next is only enabled when an intent is chosen
  const canGoNext = step === 0 ? selectedIntent !== null : true;

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
          {/* Step X of N label */}
          <div className="text-center mb-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </span>
          </div>

          {/* Step indicators — show intent-driven steps when intent is chosen */}
          {selectedIntent ? (
            <StepIndicator currentStep={step} steps={steps} />
          ) : (
            // Placeholder indicator before intent is chosen (shows 4 dots)
            <div
              className="flex items-center justify-center gap-2 mb-8"
              data-testid="onboarding-stepper"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === 0 ? "bg-primary w-8" : "bg-muted/30"
                  }`}
                  data-testid={`onboarding-step-${i}`}
                />
              ))}
            </div>
          )}

          {/* Step content */}
          <div className="min-h-[320px] flex items-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`${activeIntent}-${step}`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="w-full"
              >
                {renderStep(
                  activeIntent,
                  step,
                  handleStepComplete,
                  selectedIntent,
                  handleIntentSelect
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

              {/* Not final: Next */}
              {!isFinalStep && (
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={goNext}
                  disabled={!canGoNext}
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
                  Go to Dashboard
                  <LayoutDashboard className="h-3 w-3 opacity-70 ml-0.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

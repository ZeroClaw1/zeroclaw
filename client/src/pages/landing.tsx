import React, { useCallback, useRef, useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Background,
  Controls,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Play,
  GitBranch,
  Zap,
  GitPullRequest,
  Globe,
  Terminal,
  Server,
  Brain,
  Store,
  Activity,
  ArrowRight,
  Link as LinkIcon,
  PenTool,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { openclawLogoSm } from "@/lib/logo";
import { PRICING_TIERS } from "@shared/schema";
import { PricingCard } from "@/components/pricing-card";

/* ------------------------------------------------------------------ */
/*  Animated section wrapper                                          */
/* ------------------------------------------------------------------ */
function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Counter animation for stats                                       */
/* ------------------------------------------------------------------ */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Demo ReactFlow node types                                         */
/* ------------------------------------------------------------------ */
function DemoTriggerNode({ data }: { data: { label: string } }) {
  return (
    <div className="px-4 py-2.5 rounded-lg border-2 border-primary/60 bg-primary/10 text-primary text-xs font-semibold min-w-[120px] text-center shadow-lg shadow-primary/10">
      <Handle type="source" position={Position.Right} className="!w-3.5 !h-3.5 !bg-primary !border-primary" />
      <div className="flex items-center gap-2 justify-center">
        <Play className="h-3.5 w-3.5" />
        <span>{data.label}</span>
      </div>
    </div>
  );
}

function DemoProcessNode({ data }: { data: { label: string } }) {
  return (
    <div className="px-4 py-2.5 rounded-lg border-2 border-slate-400/60 bg-slate-400/10 text-slate-300 text-xs font-semibold min-w-[120px] text-center shadow-lg shadow-slate-400/10">
      <Handle type="target" position={Position.Left} className="!w-3.5 !h-3.5 !bg-slate-400 !border-slate-400" />
      <Handle type="source" position={Position.Right} className="!w-3.5 !h-3.5 !bg-slate-400 !border-slate-400" />
      <div className="flex items-center gap-2 justify-center">
        <GitBranch className="h-3.5 w-3.5" />
        <span>{data.label}</span>
      </div>
    </div>
  );
}

function DemoAINode({ data }: { data: { label: string } }) {
  return (
    <div className="px-4 py-2.5 rounded-lg border-2 border-accent/60 bg-accent/10 text-accent text-xs font-semibold min-w-[120px] text-center shadow-lg shadow-accent/10">
      <Handle type="target" position={Position.Left} className="!w-3.5 !h-3.5 !bg-accent !border-accent" />
      <Handle type="source" position={Position.Right} className="!w-3.5 !h-3.5 !bg-accent !border-accent" />
      <div className="flex items-center gap-2 justify-center">
        <Zap className="h-3.5 w-3.5" />
        <span>{data.label}</span>
      </div>
    </div>
  );
}

function DemoConditionNode({ data }: { data: { label: string } }) {
  return (
    <div className="px-4 py-2.5 rounded-lg border-2 border-yellow-500/60 bg-yellow-500/10 text-yellow-400 text-xs font-semibold min-w-[120px] text-center shadow-lg shadow-yellow-500/10">
      <Handle type="target" position={Position.Left} className="!w-3.5 !h-3.5 !bg-yellow-400 !border-yellow-400" />
      <Handle type="source" position={Position.Right} className="!w-3.5 !h-3.5 !bg-yellow-400 !border-yellow-400" />
      <div className="flex items-center gap-2 justify-center">
        <GitPullRequest className="h-3.5 w-3.5" />
        <span>{data.label}</span>
      </div>
    </div>
  );
}

function DemoApiNode({ data }: { data: { label: string } }) {
  return (
    <div className="px-4 py-2.5 rounded-lg border-2 border-blue-500/60 bg-blue-500/10 text-blue-400 text-xs font-semibold min-w-[120px] text-center shadow-lg shadow-blue-500/10">
      <Handle type="target" position={Position.Left} className="!w-3.5 !h-3.5 !bg-blue-400 !border-blue-400" />
      <Handle type="source" position={Position.Right} className="!w-3.5 !h-3.5 !bg-blue-400 !border-blue-400" />
      <div className="flex items-center gap-2 justify-center">
        <Globe className="h-3.5 w-3.5" />
        <span>{data.label}</span>
      </div>
    </div>
  );
}

function DemoDeployNode({ data }: { data: { label: string } }) {
  return (
    <div className="px-4 py-2.5 rounded-lg border-2 border-emerald-500/60 bg-emerald-500/10 text-emerald-400 text-xs font-semibold min-w-[120px] text-center shadow-lg shadow-emerald-500/10">
      <Handle type="target" position={Position.Left} className="!w-3.5 !h-3.5 !bg-emerald-400 !border-emerald-400" />
      <div className="flex items-center gap-2 justify-center">
        <Terminal className="h-3.5 w-3.5" />
        <span>{data.label}</span>
      </div>
    </div>
  );
}

const demoNodeTypes: NodeTypes = {
  trigger: DemoTriggerNode,
  process: DemoProcessNode,
  ai: DemoAINode,
  condition: DemoConditionNode,
  api: DemoApiNode,
  deploy: DemoDeployNode,
};

const initialNodes: Node[] = [
  { id: "1", type: "trigger", position: { x: 50, y: 200 }, data: { label: "On Push" } },
  { id: "2", type: "process", position: { x: 250, y: 120 }, data: { label: "Build & Test" } },
  { id: "3", type: "ai", position: { x: 460, y: 200 }, data: { label: "AI Review" } },
  { id: "4", type: "deploy", position: { x: 680, y: 200 }, data: { label: "Deploy Prod" } },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true, style: { stroke: "hsl(173 80% 50%)" } },
  { id: "e2-3", source: "2", target: "3", animated: true, style: { stroke: "hsl(265 60% 65%)" } },
  { id: "e3-4", source: "3", target: "4", animated: true, style: { stroke: "hsl(145 60% 45%)" } },
];

/* Palette items */
const paletteItems = [
  { type: "trigger", label: "Trigger", icon: Play, color: "text-primary border-primary/40 bg-primary/5" },
  { type: "process", label: "Process", icon: GitBranch, color: "text-slate-300 border-slate-400/60 bg-slate-400/10" },
  { type: "ai", label: "AI Agent", icon: Zap, color: "text-accent border-accent/40 bg-accent/5" },
  { type: "condition", label: "Condition", icon: GitPullRequest, color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/5" },
  { type: "api", label: "API Call", icon: Globe, color: "text-blue-400 border-blue-500/40 bg-blue-500/5" },
  { type: "deploy", label: "Deploy", icon: Terminal, color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/5" },
];

/* ------------------------------------------------------------------ */
/*  Interactive workflow demo                                         */
/* ------------------------------------------------------------------ */
let nodeId = 10;

function WorkflowDemo() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedPaletteItem, setSelectedPaletteItem] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: "hsl(173 80% 50%)" } }, eds),
      ),
    [setEdges],
  );

  // Click-to-place: select a palette item, then click the canvas to place it
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (!selectedPaletteItem || !reactFlowInstance) return;

      const item = paletteItems.find((p) => p.type === selectedPaletteItem);
      if (!item) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `dnd-${nodeId++}`,
        type: item.type,
        position,
        data: { label: item.label },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedPaletteItem(null);
    },
    [reactFlowInstance, selectedPaletteItem, setNodes],
  );

  return (
    <div className="flex gap-4 h-[500px] md:h-[600px]">
      {/* Palette */}
      <div className="w-40 shrink-0 flex flex-col gap-2 p-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-1">
          Click to add
        </p>
        {paletteItems.map((item) => (
          <div
            key={item.type}
            onClick={() => setSelectedPaletteItem(selectedPaletteItem === item.type ? null : item.type)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all hover:scale-105 ${item.color} ${
              selectedPaletteItem === item.type
                ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-105"
                : ""
            }`}
            data-testid={`palette-${item.type}`}
          >
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            <span>{item.label}</span>
          </div>
        ))}
        {selectedPaletteItem && (
          <p className="text-[9px] text-primary mt-1 animate-pulse font-medium">
            Click on canvas to place
          </p>
        )}
      </div>

      {/* Canvas */}
      <div className={`flex-1 rounded-xl border overflow-hidden transition-colors ${
        selectedPaletteItem ? "border-primary/50 bg-card/40" : "border-border/50 bg-card/30"
      }`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onPaneClick={onPaneClick}
          nodeTypes={demoNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          connectOnClick={true}
          className={`[&_.react-flow__background]:!bg-transparent ${selectedPaletteItem ? "cursor-crosshair" : ""}`}
        >
          <Background color="hsl(225 20% 18%)" gap={20} />
          <Controls
            className="!bg-card !border-border !shadow-lg [&_button]:!bg-card [&_button]:!border-border [&_button]:!text-muted-foreground [&_button:hover]:!bg-muted"
            showInteractive={false}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature card                                                      */
/* ------------------------------------------------------------------ */
const features = [
  {
    icon: GitBranch,
    title: "Visual Workflow Builder",
    desc: "Drag-and-drop interface to design complex AI agent pipelines. Connect triggers, conditions, and deployments visually.",
  },
  {
    icon: Server,
    title: "Bring Your Own Runtime",
    desc: "Connect your own OpenClaw instance. Your data stays on your infrastructure — we're just the control plane.",
  },
  {
    icon: Brain,
    title: "AI-Powered Planning",
    desc: "Write your goals in markdown, let ZeroClaw's AI break them down into executable phases and tasks.",
  },
  {
    icon: GitPullRequest,
    title: "CI/CD Integration",
    desc: "Native GitHub Actions integration. Auto-deploy pipelines on push, run tests, and monitor results.",
  },
  {
    icon: Store,
    title: "Agent Marketplace",
    desc: "Browse and install community-built agent skills. Publish your own and earn from every download.",
  },
  {
    icon: Activity,
    title: "Real-Time Monitoring",
    desc: "Live logs, execution traces, and performance metrics for every agent run.",
  },
];

/* (Pricing tiers imported from @shared/schema as PRICING_TIERS) */

/* ------------------------------------------------------------------ */
/*  Smooth-scroll helper                                              */
/* ------------------------------------------------------------------ */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

/* ------------------------------------------------------------------ */
/*  Navbar                                                            */
/* ------------------------------------------------------------------ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 bg-background/80 backdrop-blur-xl border-b ${
        scrolled ? "border-border/50 shadow-lg shadow-black/20" : "border-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left — logo */}
        <div className="flex items-center gap-3">
          <img src={openclawLogoSm} alt="ZeroClaw" className="h-7 w-auto object-contain" />
          <span className="text-sm font-bold tracking-wide text-foreground">ZeroClaw</span>
        </div>

        {/* Center — nav */}
        <div className="hidden md:flex items-center gap-8">
          {["features", "demo", "pricing"].map((section) => (
            <button
              key={section}
              onClick={() => scrollTo(section)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors capitalize"
              data-testid={`nav-${section}`}
            >
              {section}
            </button>
          ))}
        </div>

        {/* Right — CTAs */}
        <div className="flex items-center gap-3">
          <Link href="/auth">
            <Button variant="ghost" size="sm" className="text-xs" data-testid="nav-signin">
              Sign In
            </Button>
          </Link>
          <Link href="/auth">
            <Button size="sm" className="text-xs" data-testid="nav-get-started">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ================================================================== */
/*  LANDING PAGE                                                      */
/* ================================================================== */
export default function LandingPage() {
  const [landingYearly, setLandingYearly] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      {/* ---- Hero ---- */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 px-6">
        {/* Glow orbs */}
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[350px] h-[350px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              AI Agent Orchestration,
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Simplified.
              </span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Build, deploy, and monitor intelligent agent workflows with a visual editor.
              Connect your own OpenClaw runtime and orchestrate AI agents at scale.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <Link href="/auth">
                <Button
                  size="lg"
                  className="text-sm px-8 shadow-[0_0_30px_hsl(173,80%,50%,0.25)] hover:shadow-[0_0_40px_hsl(173,80%,50%,0.35)] transition-shadow"
                  data-testid="hero-cta-start"
                >
                  Start Building Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="text-sm px-8"
                onClick={() => scrollTo("demo")}
                data-testid="hero-cta-demo"
              >
                Watch Demo
              </Button>
            </div>
          </AnimatedSection>

          {/* Mini dashboard preview */}
          <AnimatedSection delay={0.45} className="mt-16">
            <div className="relative mx-auto max-w-3xl rounded-xl p-[1px] bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40">
              <div className="rounded-xl bg-card/80 backdrop-blur-sm border border-border/30 p-4 md:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                  <span className="text-[10px] text-muted-foreground ml-2 font-mono">
                    zeroclaw-dashboard
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Pipelines", val: "24 running", color: "text-primary" },
                    { label: "Agents", val: "8 active", color: "text-accent" },
                    { label: "Deployments", val: "99.9% uptime", color: "text-emerald-400" },
                    { label: "Workflows", val: "12 templates", color: "text-blue-400" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg bg-background/50 p-3 border border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      <p className={`text-sm font-semibold mt-1 ${stat.color}`}>{stat.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ---- Interactive Demo ---- */}
      <section id="demo" className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">
              Interactive Demo
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Visual Workflow Editor
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Design complex agent pipelines visually. Click to add blocks, click handles to connect. No code required.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/70 italic">
              Try it — click a block in the palette, then click the canvas to place it. Click handles to connect them.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="rounded-xl p-[1px] bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20">
              <div className="rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 p-3 md:p-4">
                <ReactFlowProvider>
                  <WorkflowDemo />
                </ReactFlowProvider>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ---- Features Grid ---- */}
      <section id="features" className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">
              Features
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Everything You Need to Orchestrate AI
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 0.1}>
                <div className="group relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_hsl(173,80%,50%,0.08)] h-full">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 transition-colors group-hover:bg-primary/15">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold mb-2">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ---- How It Works ---- */}
      <section className="py-24 md:py-32 px-6 border-y border-border/30">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">
              How It Works
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Three Steps to Production
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8 md:gap-4">
            {[
              {
                step: "01",
                icon: LinkIcon,
                title: "Connect",
                desc: "Link your OpenClaw runtime with one command",
              },
              {
                step: "02",
                icon: PenTool,
                title: "Design",
                desc: "Build workflows visually in the editor",
              },
              {
                step: "03",
                icon: Rocket,
                title: "Deploy",
                desc: "Push to production with CI/CD pipelines",
              },
            ].map((item, i) => (
              <AnimatedSection key={item.step} delay={i * 0.15}>
                <div className="relative text-center">
                  {/* Connecting line */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[1px] bg-gradient-to-r from-primary/30 to-transparent" />
                  )}
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-[10px] text-primary font-bold tracking-wider mb-1">
                    STEP {item.step}
                  </p>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Pricing ---- */}
      <section id="pricing" className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">
              Pricing
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Start Free, Scale as You Grow
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-sm">
              Simple, transparent pricing. No hidden fees.
            </p>
          </AnimatedSection>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={`text-xs transition-colors ${!landingYearly ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <button
              onClick={() => setLandingYearly(!landingYearly)}
              className={`relative w-12 h-6 rounded-full transition-colors ${landingYearly ? "bg-primary" : "bg-muted"}`}
              data-testid="landing-billing-toggle"
            >
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${landingYearly ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
            <span className={`text-xs transition-colors ${landingYearly ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
              Yearly
            </span>
            {landingYearly && (
              <span className="text-[10px] text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
                Save ~16%
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_TIERS.map((tier, i) => (
              <AnimatedSection key={tier.id} delay={i * 0.1}>
                <PricingCard tier={tier} yearly={landingYearly} compact />
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="text-center mt-10">
            <button
              onClick={() => (window.location.hash = "#/pricing")}
              className="text-xs text-primary hover:text-primary/80 transition-colors font-semibold inline-flex items-center gap-1"
              data-testid="landing-view-full-pricing"
            >
              View Full Pricing
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </AnimatedSection>
        </div>
      </section>

      {/* ---- Stats Bar ---- */}
      <section className="py-16 px-6 border-y border-border/30 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { target: 1200, suffix: "+", label: "Workflows Created" },
              { target: 50, suffix: "+", label: "Agent Skills" },
              { target: 99, suffix: ".9%", label: "Uptime" },
              { target: 500, suffix: "+", label: "Developers" },
            ].map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 0.1}>
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-primary">
                    {stat.suffix === ".9%" ? (
                      <>
                        <AnimatedCounter target={stat.target} />
                        {stat.suffix}
                      </>
                    ) : (
                      <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Final CTA ---- */}
      <section className="py-24 md:py-32 px-6">
        <AnimatedSection className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to Orchestrate?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join hundreds of developers building intelligent agent workflows with ZeroClaw.
            Start for free, no credit card required.
          </p>
          <Link href="/auth">
            <Button
              size="lg"
              className="text-sm px-10 shadow-[0_0_30px_hsl(173,80%,50%,0.25)] hover:shadow-[0_0_40px_hsl(173,80%,50%,0.35)] transition-shadow"
              data-testid="final-cta"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </AnimatedSection>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-border/30 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={openclawLogoSm} alt="ZeroClaw" className="h-6 w-auto" />
                <span className="text-sm font-bold">ZeroClaw</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI agent orchestration platform. Build, deploy, and monitor intelligent workflows at scale.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-3">
                Product
              </p>
              <ul className="space-y-2">
                {["Features", "Pricing", "Marketplace", "Changelog"].map((l) => (
                  <li key={l}>
                    <button
                      onClick={() => {
                        const id = l.toLowerCase();
                        if (document.getElementById(id)) scrollTo(id);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-3">
                Resources
              </p>
              <ul className="space-y-2">
                {["Documentation", "API Reference", "Tutorials", "Blog"].map((l) => (
                  <li key={l}>
                    <span className="text-xs text-muted-foreground">{l}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-3">
                Company
              </p>
              <ul className="space-y-2">
                {["About", "Careers", "Security"].map((l) => (
                  <li key={l}>
                    <span className="text-xs text-muted-foreground">{l}</span>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => window.location.hash = "#/terms"}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="footer-terms"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => window.location.hash = "#/privacy"}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="footer-privacy"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-border/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-muted-foreground">
              &copy; 2026 ZeroClaw. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

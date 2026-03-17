import { useState } from "react";
import { Link } from "wouter";
import { PRICING_TIERS } from "@shared/schema";
import { PricingCard } from "@/components/pricing-card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft } from "lucide-react";
import { openclawLogoSm } from "@/lib/logo";

const faqs = [
  {
    q: "Can I change plans later?",
    a: "Absolutely. You can upgrade or downgrade your plan at any time from the Settings page. Upgrades take effect immediately, and downgrades apply at the end of your current billing period. No penalties or hidden fees.",
  },
  {
    q: "What happens when I exceed my limits?",
    a: "We'll notify you when you're approaching your plan limits. Free-tier users will need to upgrade to continue creating resources. Paid plans have soft limits — we'll reach out to discuss upgrading rather than cutting you off mid-workflow.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes! Pro and Team plans include a 14-day free trial with full access to all features. No credit card required to start. You can cancel anytime during the trial.",
  },
  {
    q: "How does the BYOO (Bring Your Own OpenClaw) model work?",
    a: "ZeroClaw is a control plane — you connect your own OpenClaw runtime running on your infrastructure. Your data, models, and agent executions stay on your servers. We handle orchestration, monitoring, and the visual workflow editor. Think of it like a dashboard for your AI agents.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, Mastercard, Amex) and process payments securely through Stripe. Enterprise customers can also pay via invoice with NET-30 terms.",
  },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="pricing-page">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-3"
            data-testid="pricing-logo-home"
          >
            <img src={openclawLogoSm} alt="ZeroClaw" className="h-7 w-auto object-contain" />
            <span className="text-sm font-bold tracking-wide text-foreground">ZeroClaw</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              data-testid="pricing-back-home"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Home
            </button>
            <Link href="/auth">
              <Button size="sm" className="text-xs" data-testid="pricing-nav-get-started">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="pt-16 pb-8 px-6 text-center relative">
        <div className="absolute top-0 left-1/3 w-[350px] h-[350px] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
        <div className="absolute top-10 right-1/3 w-[300px] h-[300px] rounded-full bg-accent/8 blur-[120px] pointer-events-none" />

        <div className="relative">
          <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">
            Pricing
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Start Free, Scale as You Grow
          </h1>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Simple, transparent pricing. No hidden fees. Every plan includes a 14-day trial.
          </p>
        </div>
      </section>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 pb-12">
        <span
          className={`text-xs transition-colors ${!yearly ? "text-foreground font-semibold" : "text-muted-foreground"}`}
        >
          Monthly
        </span>
        <button
          onClick={() => setYearly(!yearly)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            yearly ? "bg-primary" : "bg-muted"
          }`}
          data-testid="billing-toggle"
        >
          <div
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              yearly ? "translate-x-6" : "translate-x-0.5"
            }`}
          />
        </button>
        <span
          className={`text-xs transition-colors ${yearly ? "text-foreground font-semibold" : "text-muted-foreground"}`}
        >
          Yearly
        </span>
        {yearly && (
          <span className="text-[10px] text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
            Save ~16%
          </span>
        )}
      </div>

      {/* Pricing cards */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.id} tier={tier} yearly={yearly} />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 border-t border-border/30">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-3">
              FAQ
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3" data-testid="pricing-faq">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border border-border/50 rounded-lg bg-card/50 px-5 data-[state=open]:border-primary/30 data-[state=open]:shadow-[0_0_20px_hsl(173,80%,50%,0.05)] transition-all"
              >
                <AccordionTrigger
                  className="text-xs font-semibold text-foreground py-4 hover:no-underline"
                  data-testid={`faq-trigger-${i}`}
                >
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-6 text-center border-t border-border/30">
        <h3 className="text-xl font-bold mb-3">Still have questions?</h3>
        <p className="text-xs text-muted-foreground mb-6">
          Our team is ready to help. Reach out and we'll get back to you within 24 hours.
        </p>
        <Link href="/auth">
          <Button size="lg" className="text-xs px-8" data-testid="pricing-bottom-cta">
            Get Started Free
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-muted-foreground">
            &copy; 2026 ZeroClaw. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

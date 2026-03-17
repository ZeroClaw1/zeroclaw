import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight } from "lucide-react";
import type { PricingTier } from "@shared/schema";

function formatPrice(cents: number, yearly: boolean): string {
  if (cents <= 0) return cents === 0 ? "Free" : "Custom";
  const monthly = yearly ? Math.round(cents / 12) : cents;
  return `$${(monthly / 100).toFixed(0)}`;
}

interface PricingCardProps {
  tier: PricingTier;
  yearly: boolean;
  /** If true, only show first 4 features (for landing page abbreviated view) */
  compact?: boolean;
}

export function PricingCard({ tier, yearly, compact }: PricingCardProps) {
  const price = formatPrice(yearly ? tier.yearlyPrice : tier.price, yearly);
  const isHighlighted = tier.highlighted;
  const displayFeatures = compact ? tier.features.slice(0, 4) : tier.features;

  const cta =
    tier.id === "free"
      ? "Get Started"
      : tier.id === "enterprise"
        ? "Contact Sales"
        : "Start Free Trial";

  return (
    <div
      className={`relative rounded-xl border p-6 h-full flex flex-col transition-all duration-300 ${
        isHighlighted
          ? "border-primary/50 bg-card shadow-[0_0_40px_hsl(173,80%,50%,0.1)]"
          : "border-border/50 bg-card/50 hover:border-border"
      }`}
      data-testid={`pricing-card-${tier.id}`}
    >
      {isHighlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
          Most Popular
        </div>
      )}

      <h3 className="text-sm font-bold mb-1">{tier.name}</h3>

      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-bold">{price}</span>
        {price !== "Free" && price !== "Custom" && (
          <span className="text-xs text-muted-foreground">
            /mo{yearly && tier.price > 0 ? " (billed yearly)" : ""}
          </span>
        )}
      </div>

      {yearly && tier.price > 0 && tier.yearlyPrice > 0 && (
        <p className="text-[10px] text-primary mb-4">
          Save {Math.round((1 - tier.yearlyPrice / (tier.price * 12)) * 100)}% with annual billing
        </p>
      )}
      {(!yearly || tier.price <= 0) && (
        <p className="text-[11px] text-muted-foreground mb-4">
          {tier.id === "free"
            ? "For individuals getting started"
            : tier.id === "enterprise"
              ? "For organizations at scale"
              : tier.id === "team"
                ? "For growing teams"
                : "For power users"}
        </p>
      )}

      <ul className="space-y-2.5 mb-6 flex-1">
        {displayFeatures.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
        {compact && tier.features.length > 4 && (
          <li className="text-[10px] text-muted-foreground/60 pl-5">
            +{tier.features.length - 4} more...
          </li>
        )}
      </ul>

      <Link href="/auth">
        <Button
          variant={isHighlighted ? "default" : "outline"}
          className="w-full text-xs"
          data-testid={`pricing-cta-${tier.id}`}
        >
          {cta}
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}

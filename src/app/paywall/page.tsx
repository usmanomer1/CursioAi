"use client";

import { PricingTable } from "@clerk/nextjs";
import { ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import { UserSync } from "@/components/user-sync";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useClerkAppearance } from "@/components/clerk-appearance";
import {
  TESTIMONIALS,
  TestimonialCard,
  TestimonialsMarquee,
} from "@/components/testimonials";

export default function PaywallPage() {
  const appearance = useClerkAppearance();

  // Two counter-scrolling columns for the desktop layout.
  const colA = TESTIMONIALS.filter((_, i) => i % 2 === 0);
  const colB = TESTIMONIALS.filter((_, i) => i % 2 === 1);

  return (
    <>
      <UserSync />
      <div className="relative min-h-screen overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_55%)]" />
        <div
          className="pointer-events-none absolute left-1/2 top-[-14rem] h-[26rem] w-[40rem] -translate-x-1/2 rounded-full opacity-20 blur-[110px]"
          style={{
            background:
              "radial-gradient(circle at 40% 50%, var(--color-brand-500), transparent 60%), radial-gradient(circle at 70% 50%, var(--color-accent-500), transparent 62%)",
          }}
        />

        <div className="absolute right-5 top-5 z-10">
          <ThemeToggle />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-12">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-6 flex justify-center">
              <Logo id="paywall" />
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-fg sm:text-5xl">
              Land your next role faster
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted">
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </span>
              Loved by candidates at top companies
            </div>
          </div>

          {/* Reviews beside the price — symmetric two-column layout */}
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_24rem]">
            {/* Desktop: two vertical counter-scrolling columns */}
            <div className="hidden h-[560px] gap-4 overflow-hidden lg:flex [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
              <div
                className="flex flex-col gap-4 hover:[animation-play-state:paused]"
                style={{ animation: "marquee-y 36s linear infinite" }}
              >
                {[...colA, ...colA].map((t, i) => (
                  <TestimonialCard key={i} t={t} index={i} className="w-full" />
                ))}
              </div>
              <div
                className="flex flex-col gap-4 hover:[animation-play-state:paused]"
                style={{ animation: "marquee-y 36s linear infinite reverse" }}
              >
                {[...colB, ...colB].map((t, i) => (
                  <TestimonialCard
                    key={i}
                    t={t}
                    index={i + 1}
                    className="w-full"
                  />
                ))}
              </div>
            </div>

            {/* The plan */}
            <div className="mx-auto w-full max-w-sm lg:mx-0">
              <PricingTable appearance={appearance} />
              <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-subtle">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Secure checkout
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-emerald-500" /> Cancel anytime
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Clerk
                  Billing
                </span>
              </div>
            </div>
          </div>

          {/* Mobile: horizontal carousel below the plan */}
          <div className="mt-12 lg:hidden">
            <TestimonialsMarquee />
          </div>
        </div>
      </div>
    </>
  );
}

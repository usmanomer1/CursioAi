"use client";

import { PricingTable } from "@clerk/nextjs";
import { Check, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { UserSync } from "@/components/user-sync";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useClerkAppearance } from "@/components/clerk-appearance";

const HIGHLIGHTS = [
  "Live jobs scored against your resume",
  "A tailored one-page resume per role",
  "AI coach with the job posting loaded",
  "Application tracker end to end",
];

export default function PaywallPage() {
  const appearance = useClerkAppearance();

  return (
    <>
      <UserSync />
      <div className="relative min-h-screen overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_60%)]" />
        <div
          className="pointer-events-none absolute left-1/2 top-[-12rem] h-[28rem] w-[44rem] -translate-x-1/2 rounded-full opacity-20 blur-[110px]"
          style={{
            background:
              "radial-gradient(circle at 40% 50%, var(--color-brand-500), transparent 60%), radial-gradient(circle at 70% 50%, var(--color-accent-500), transparent 62%)",
          }}
        />

        <div className="absolute right-5 top-5 z-10">
          <ThemeToggle />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 py-14">
          <div className="mb-10 flex justify-center">
            <Logo size="lg" id="paywall" />
          </div>

          <div className="mb-9 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-500">
              Cursio Pro
            </p>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-fg sm:text-5xl">
              Land your next role faster
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Everything you need to find the right jobs, tailor your resume for
              each one, and track the whole search.
            </p>
          </div>

          <div className="mx-auto mb-9 grid max-w-2xl gap-2.5 sm:grid-cols-2">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h}
                className="flex items-start gap-2.5 rounded-xl border border-line bg-surface/70 px-3.5 py-2.5 text-sm text-muted backdrop-blur"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {h}
              </div>
            ))}
          </div>

          <PricingTable appearance={appearance} />

          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-subtle">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secure checkout
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-emerald-500" /> Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Powered by Clerk Billing
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

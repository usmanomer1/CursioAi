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
          className="pointer-events-none absolute left-1/2 top-[-14rem] h-[26rem] w-[40rem] -translate-x-1/2 rounded-full opacity-20 blur-[110px]"
          style={{
            background:
              "radial-gradient(circle at 40% 50%, var(--color-brand-500), transparent 60%), radial-gradient(circle at 70% 50%, var(--color-accent-500), transparent 62%)",
          }}
        />

        <div className="absolute right-5 top-5 z-10">
          <ThemeToggle />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 py-9">
          <div className="mb-6 flex justify-center">
            <Logo id="paywall" />
          </div>

          <div className="mb-7 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-500">
              Cursio Pro
            </p>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-fg sm:text-4xl">
              Land your next role faster
            </h1>
            <p className="mx-auto mt-2.5 max-w-lg text-sm text-muted">
              Everything you need to find the right jobs, tailor your resume for
              each one, and track the whole search.
            </p>
          </div>

          {/* Pricing beside the value props so both sit above the fold */}
          <div className="grid items-start gap-8 md:grid-cols-[1fr_auto] md:gap-12">
            <ul className="space-y-2.5 md:pt-2">
              {HIGHLIGHTS.map((h) => (
                <li key={h} className="flex items-start gap-2.5 text-sm text-muted">
                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/12">
                    <Check className="h-3 w-3 text-emerald-500" />
                  </span>
                  {h}
                </li>
              ))}

              <li className="!mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-subtle">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secure
                  checkout
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-emerald-500" /> Cancel anytime
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Powered by
                  Clerk Billing
                </span>
              </li>
            </ul>

            {/* Single-plan instance: cap the width so the card doesn't stretch. */}
            <div className="w-full md:w-[22rem]">
              <PricingTable appearance={appearance} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

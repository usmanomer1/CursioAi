"use client";

import { PricingTable } from "@clerk/nextjs";
import { Sparkles, Shield, Zap } from "lucide-react";
import { UserSync } from "@/components/user-sync";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useClerkAppearance } from "@/components/clerk-appearance";

export default function PaywallPage() {
  const appearance = useClerkAppearance();

  return (
    <>
      <UserSync />
      <div className="relative mx-auto max-w-5xl px-6 py-12">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-brand-500">
            Cursio Pro
          </p>
          <h1 className="mb-4 text-4xl font-bold text-fg">
            Land your next role faster
          </h1>
          <p className="mx-auto max-w-2xl text-muted">
            AI resume optimization, real-time job matching, and a clean
            application tracker — everything you need in one place.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-6 text-sm text-muted">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" /> Secure checkout
          </span>
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-400" /> Cancel anytime
          </span>
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" /> Powered by Clerk
            Billing
          </span>
        </div>

        <PricingTable appearance={appearance} />
      </div>
    </>
  );
}

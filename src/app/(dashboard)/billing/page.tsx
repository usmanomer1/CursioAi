"use client";

import { PricingTable, useAuth } from "@clerk/nextjs";
import { Check, CreditCard, Lock, Sparkles } from "lucide-react";
import { useClerkAppearance } from "@/components/clerk-appearance";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PAID_PLAN } from "@/lib/billing";

const INCLUDED = [
  "Live job matching scored against your resume",
  "Tailored one-page ATS resume for any job",
  "Per-job AI coach with full context",
  "Application tracker from saved to offer",
];

export default function BillingPage() {
  const appearance = useClerkAppearance();
  const { isLoaded, has } = useAuth();
  const subscribed = isLoaded && has ? has({ plan: PAID_PLAN }) : false;

  return (
    <div className="mx-auto max-w-4xl p-5 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg">Billing</h1>
        <p className="mt-1 text-muted">
          Manage your Cursio plan and payment method.
        </p>
      </div>

      {/* Current status */}
      <Card className="mb-8 overflow-hidden">
        <div
          className={`flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5 ${
            subscribed
              ? "bg-gradient-to-r from-brand-500/8 to-transparent"
              : "bg-raised/40"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                subscribed
                  ? "bg-gradient-to-br from-brand-500 to-accent-500 shadow-lg shadow-brand-600/20"
                  : "bg-raised ring-1 ring-line-strong"
              }`}
            >
              {subscribed ? (
                <Sparkles className="h-5 w-5 text-white" />
              ) : (
                <Lock className="h-5 w-5 text-subtle" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                Current plan
              </p>
              <p className="flex items-center gap-2 text-lg font-semibold text-fg">
                {subscribed ? "Cursio Pro" : "No active plan"}
                {subscribed && <Badge variant="success">Active</Badge>}
              </p>
            </div>
          </div>
          {subscribed ? (
            <p className="flex items-center gap-2 text-xs text-subtle">
              <CreditCard className="h-3.5 w-3.5" />
              Manage payment via your account menu → Billing
            </p>
          ) : (
            <p className="text-xs text-subtle">
              Subscribe to unlock Cursio.
            </p>
          )}
        </div>

        <div className="px-6 py-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-subtle">
            {subscribed ? "Included in your plan" : "Locked without a plan"}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {INCLUDED.map((f) => (
              <div key={f} className="flex items-start gap-2.5 text-sm">
                {subscribed ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle" />
                )}
                <span className={subscribed ? "text-muted" : "text-subtle"}>
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <h2 className="mb-4 text-lg font-semibold text-fg">
        {subscribed ? "Change plan" : "Choose a plan"}
      </h2>
      {/* Single-plan instance: cap the width so the card doesn't stretch. */}
      <div className="w-full max-w-sm">
        <PricingTable appearance={appearance} />
      </div>
    </div>
  );
}

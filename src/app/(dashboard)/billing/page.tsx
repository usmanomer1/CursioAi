"use client";

import { PricingTable, useAuth } from "@clerk/nextjs";
import { Check, CreditCard, Sparkles } from "lucide-react";
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
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-gradient-to-r from-brand-500/8 to-transparent px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-lg shadow-brand-600/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtle">
                Current plan
              </p>
              <p className="flex items-center gap-2 text-lg font-semibold text-fg">
                {subscribed ? "Cursio Pro" : "Free"}
                {subscribed && <Badge variant="success">Active</Badge>}
              </p>
            </div>
          </div>
          <p className="flex items-center gap-2 text-xs text-subtle">
            <CreditCard className="h-3.5 w-3.5" />
            Manage payment via your account menu → Billing
          </p>
        </div>

        <div className="grid gap-2.5 px-6 py-5 sm:grid-cols-2">
          {INCLUDED.map((f) => (
            <div key={f} className="flex items-start gap-2.5 text-sm">
              <Check
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  subscribed ? "text-emerald-500" : "text-subtle"
                }`}
              />
              <span className={subscribed ? "text-muted" : "text-subtle"}>{f}</span>
            </div>
          ))}
        </div>
      </Card>

      <h2 className="mb-4 text-lg font-semibold text-fg">
        {subscribed ? "Change plan" : "Choose a plan"}
      </h2>
      <PricingTable appearance={appearance} />
    </div>
  );
}

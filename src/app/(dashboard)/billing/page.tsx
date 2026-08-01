"use client";

import { PricingTable } from "@clerk/nextjs";
import { useClerkAppearance } from "@/components/clerk-appearance";

export default function BillingPage() {
  const appearance = useClerkAppearance();

  return (
    <div className="mx-auto max-w-4xl p-5 sm:p-8">
      <h1 className="mb-1.5 text-2xl font-bold text-fg">Billing</h1>
      <p className="mb-8 text-muted">
        Manage your Cursio subscription. You can also manage your plan and
        payment method from your account menu (avatar → Manage account →
        Billing).
      </p>
      <PricingTable appearance={appearance} />
    </div>
  );
}

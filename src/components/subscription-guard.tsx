"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { CenteredSpinner } from "@/components/ui/spinner";
import { PAID_PLAN, isBillingEnforced } from "@/lib/billing";

const EXEMPT_PATHS = ["/paywall", "/billing"];

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, has } = useAuth();

  const isExempt = EXEMPT_PATHS.some((p) => pathname.startsWith(p));
  const enforced = isBillingEnforced();

  // Clerk is the source of truth for the subscription via has({ plan }).
  const subscribed = isLoaded && has ? has({ plan: PAID_PLAN }) : undefined;

  useEffect(() => {
    if (!enforced || isExempt) return;
    if (subscribed === false) router.replace("/paywall");
  }, [subscribed, enforced, isExempt, router]);

  if (!enforced || isExempt) {
    return <>{children}</>;
  }

  if (subscribed !== true) {
    return <CenteredSpinner />;
  }

  return <>{children}</>;
}

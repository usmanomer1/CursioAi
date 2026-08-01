"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { CenteredSpinner } from "@/components/ui/spinner";
import { PAID_PLAN, isBillingEnforced, isAdminEmail } from "@/lib/billing";

const EXEMPT_PATHS = ["/paywall", "/billing"];

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, has } = useAuth();
  const { user } = useUser();

  const isExempt = EXEMPT_PATHS.some((p) => pathname.startsWith(p));
  const enforced = isBillingEnforced();

  // Owner bypass — server-side enforcement has the matching allowlist.
  const admin = isAdminEmail(user?.primaryEmailAddress?.emailAddress);

  // Clerk is the source of truth for the subscription via has({ plan }).
  const subscribed = isLoaded && has ? has({ plan: PAID_PLAN }) : undefined;

  useEffect(() => {
    if (!enforced || isExempt || admin) return;
    if (subscribed === false) router.replace("/paywall");
  }, [subscribed, enforced, isExempt, admin, router]);

  if (!enforced || isExempt || admin) {
    return <>{children}</>;
  }

  if (subscribed !== true) {
    return <CenteredSpinner />;
  }

  return <>{children}</>;
}

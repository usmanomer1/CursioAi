/**
 * Clerk Billing configuration.
 *
 * PAID_PLAN is the slug of your paid plan as created in the Clerk Dashboard
 * (Subscription Plans). It's used with Clerk's `has({ plan })` to gate access.
 *
 * Billing enforcement is OFF by default so the app stays open in development.
 * Set NEXT_PUBLIC_BILLING_ENFORCED=true once a plan exists and you've tested
 * checkout, to turn the paywall on.
 */
export const PAID_PLAN =
  process.env.NEXT_PUBLIC_CLERK_PAID_PLAN ?? "pro";

export function isBillingEnforced(): boolean {
  return process.env.NEXT_PUBLIC_BILLING_ENFORCED === "true";
}

/**
 * Owner/admin emails that skip the client-side paywall. UX only — the real
 * enforcement is server-side in Convex (ADMIN_EMAILS there is matched against
 * the verified JWT email claim).
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

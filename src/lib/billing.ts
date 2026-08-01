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

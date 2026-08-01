/**
 * Server-side Clerk Billing entitlement check for Convex.
 *
 * Clerk encodes the user's active plan(s) in the session token's `pla` claim
 * (e.g. "u:pro" for a user on the "pro" plan). Because our Convex integration
 * uses the default session token (not a custom JWT template), that claim rides
 * along and is exposed on the identity via Convex's custom-claim passthrough
 * (UserIdentity's `[key: string]` index signature).
 *
 * Enforcement is OFF unless CLERK_BILLING_ENFORCED=true on the deployment, so
 * the app stays open until you've created a plan and tested checkout.
 */
export const PAID_PLAN = process.env.CLERK_PAID_PLAN ?? "pro";

function plaClaim(identity: unknown): string {
  const pla = (identity as { pla?: unknown } | null)?.pla;
  return typeof pla === "string" ? pla : "";
}

export function hasPaidPlan(identity: unknown): boolean {
  const plans = plaClaim(identity)
    .split(",")
    .map((p) => p.trim());
  return plans.includes(`u:${PAID_PLAN}`) || plans.includes(PAID_PLAN);
}

export function assertPaidPlan(identity: unknown): void {
  if (process.env.CLERK_BILLING_ENFORCED !== "true") return;
  if (!hasPaidPlan(identity)) {
    throw new Error("An active subscription is required to use this feature.");
  }
}

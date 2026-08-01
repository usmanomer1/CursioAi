import { createFrontendApiProxyHandlers } from "@clerk/nextjs/server";

/**
 * Same-origin proxy for Clerk's Frontend API and clerk-js assets.
 *
 * clerk-js loads itself (and talks to the Frontend API) through
 * `/__clerk/*` on our own domain, which this catch-all route forwards to
 * `https://clerk.cursio.ai` (derived from the publishable key). Without it,
 * those requests 404 and the sign-in UI never mounts.
 */
export const { GET, POST, PUT, DELETE, PATCH } =
  createFrontendApiProxyHandlers();

// Clerk + Convex integration. `domain` is your Clerk Frontend API URL and
// `applicationID` is the audience ("convex") that Clerk's Convex integration
// pre-maps for you — no hand-created JWT template required.
// https://clerk.com/docs/guides/development/integrations/databases/convex
export default {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL,
      applicationID: "convex",
    },
  ],
};

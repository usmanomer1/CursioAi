/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as agents_actions from "../agents/actions.js";
import type * as agents_jobAdvisor from "../agents/jobAdvisor.js";
import type * as applications from "../applications.js";
import type * as gating from "../gating.js";
import type * as jobChat from "../jobChat.js";
import type * as jobChatInternal from "../jobChatInternal.js";
import type * as jobs from "../jobs.js";
import type * as lib_ai_models from "../lib/ai/models.js";
import type * as lib_ai_openrouter from "../lib/ai/openrouter.js";
import type * as lib_ai_resumeOptimizer from "../lib/ai/resumeOptimizer.js";
import type * as lib_ai_scoring from "../lib/ai/scoring.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_billing from "../lib/billing.js";
import type * as lib_jsearch_client from "../lib/jsearch/client.js";
import type * as lib_jsearch_types from "../lib/jsearch/types.js";
import type * as lib_limits from "../lib/limits.js";
import type * as lib_pdf_jakesResumePdfkit from "../lib/pdf/jakesResumePdfkit.js";
import type * as lib_pdf_resumeLinks from "../lib/pdf/resumeLinks.js";
import type * as lib_pdf_resumePdf from "../lib/pdf/resumePdf.js";
import type * as lib_pdf_trimForOnePage from "../lib/pdf/trimForOnePage.js";
import type * as lib_validators from "../lib/validators.js";
import type * as migrations from "../migrations.js";
import type * as resume from "../resume.js";
import type * as resumeActions from "../resumeActions.js";
import type * as resumeInternal from "../resumeInternal.js";
import type * as resumeStorage from "../resumeStorage.js";
import type * as seedDemo from "../seedDemo.js";
import type * as users from "../users.js";
import type * as usersInternal from "../usersInternal.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  "agents/actions": typeof agents_actions;
  "agents/jobAdvisor": typeof agents_jobAdvisor;
  applications: typeof applications;
  gating: typeof gating;
  jobChat: typeof jobChat;
  jobChatInternal: typeof jobChatInternal;
  jobs: typeof jobs;
  "lib/ai/models": typeof lib_ai_models;
  "lib/ai/openrouter": typeof lib_ai_openrouter;
  "lib/ai/resumeOptimizer": typeof lib_ai_resumeOptimizer;
  "lib/ai/scoring": typeof lib_ai_scoring;
  "lib/auth": typeof lib_auth;
  "lib/billing": typeof lib_billing;
  "lib/jsearch/client": typeof lib_jsearch_client;
  "lib/jsearch/types": typeof lib_jsearch_types;
  "lib/limits": typeof lib_limits;
  "lib/pdf/jakesResumePdfkit": typeof lib_pdf_jakesResumePdfkit;
  "lib/pdf/resumeLinks": typeof lib_pdf_resumeLinks;
  "lib/pdf/resumePdf": typeof lib_pdf_resumePdf;
  "lib/pdf/trimForOnePage": typeof lib_pdf_trimForOnePage;
  "lib/validators": typeof lib_validators;
  migrations: typeof migrations;
  resume: typeof resume;
  resumeActions: typeof resumeActions;
  resumeInternal: typeof resumeInternal;
  resumeStorage: typeof resumeStorage;
  seedDemo: typeof seedDemo;
  users: typeof users;
  usersInternal: typeof usersInternal;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};

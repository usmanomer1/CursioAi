/**
 * Centralized model configuration. Single source of truth so the chat agent
 * and the JSON/scoring helpers never drift apart.
 *
 * Override per-deployment with the OPENROUTER_MODEL env var.
 */
export const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

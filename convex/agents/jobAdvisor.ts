"use node";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Agent } from "@convex-dev/agent";
import { components } from "../_generated/api";
import type { LanguageModel } from "ai";
import { DEFAULT_MODEL } from "../lib/ai/models";

function getLanguageModel(): LanguageModel {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");
  const openrouter = createOpenRouter({ apiKey });
  return openrouter(DEFAULT_MODEL);
}

let _agent: Agent | null = null;

export function getJobAdvisorAgent(): Agent {
  if (!_agent) {
    _agent = new Agent(components.agent, {
      name: "Job Advisor",
      languageModel: getLanguageModel() as never,
      instructions: `You are an expert career coach and job application advisor. You help candidates understand job postings, assess their fit, prepare for interviews, and optimize their applications.

You have access to:
- The full job description and requirements
- The candidate's resume
- AI match analysis (score, missing skills, strengths)

Be specific, actionable, and honest. When the candidate asks about gaps, suggest concrete ways to address them in applications or interviews. Keep responses concise unless asked for detail.`,
    });
  }
  return _agent;
}

export function buildJobContextPrompt(context: {
  title: string;
  company: string;
  description: string;
  matchScore?: number;
  missingSkills?: string[];
  resumeText?: string;
}): string {
  return `JOB CONTEXT:
Title: ${context.title}
Company: ${context.company}
Match Score: ${context.matchScore ?? "Not analyzed"}%
Missing Skills: ${context.missingSkills?.join(", ") || "None identified"}

JOB DESCRIPTION:
${context.description.slice(0, 3000)}

CANDIDATE RESUME:
${context.resumeText?.slice(0, 2000) || "No resume provided"}`;
}

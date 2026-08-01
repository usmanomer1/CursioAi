import { z } from "zod";

export const MATCH_LABELS = {
  STRONG: { min: 90, label: "STRONG MATCH" },
  GOOD: { min: 70, label: "GOOD MATCH" },
  FAIR: { min: 50, label: "FAIR MATCH" },
  WEAK: { min: 0, label: "WEAK MATCH" },
} as const;

export function calculateMatchLabel(score: number): string {
  if (score >= MATCH_LABELS.STRONG.min) return MATCH_LABELS.STRONG.label;
  if (score >= MATCH_LABELS.GOOD.min) return MATCH_LABELS.GOOD.label;
  if (score >= MATCH_LABELS.FAIR.min) return MATCH_LABELS.FAIR.label;
  return MATCH_LABELS.WEAK.label;
}

/** Loose schema for structured output — Anthropic rejects min/max on numbers. */
export const scoringResultGenerationSchema = z.object({
  score: z.number(),
  matchReasons: z.array(z.string()),
  missingSkills: z.array(z.string()),
  keyStrengths: z.array(z.string()),
  breakdown: z.object({
    skills: z.number(),
    experience: z.number(),
    education: z.number(),
    career: z.number(),
    company: z.number(),
    timing: z.number(),
  }),
});

export const scoringResultSchema = z.object({
  score: z.number().min(0).max(100),
  matchReasons: z.array(z.string()).min(1).max(4),
  missingSkills: z.array(z.string()).max(5),
  keyStrengths: z.array(z.string()).min(1).max(3),
  breakdown: z.object({
    skills: z.number().min(0).max(35),
    experience: z.number().min(0).max(25),
    education: z.number().min(0).max(15),
    career: z.number().min(0).max(10),
    company: z.number().min(0).max(10),
    timing: z.number().min(0).max(5),
  }),
});

export type ScoringResult = z.infer<typeof scoringResultSchema>;

export function buildResumeScoringPrompt(
  resumeText: string,
  jobDescription: string,
  jobTitle: string,
  companyName: string
): string {
  const truncatedResume = resumeText.slice(0, 2000);
  const truncatedJob = jobDescription.slice(0, 1500);

  return `You are an ATS optimization expert. Analyze this resume against the job description.

SCORING CRITERIA (Total: 100 points):
- Skills match (35%): Technical skills alignment with job requirements
- Experience relevance (25%): Years and type of experience vs requirements
- Education fit (15%): Education requirements and certifications
- Career progression (10%): Current role vs target role alignment
- Company fit (10%): Industry and company culture indicators
- Timing factors (5%): Application urgency and role recency

JOB TITLE: ${jobTitle}
COMPANY: ${companyName}

RESUME:
${truncatedResume}

JOB DESCRIPTION:
${truncatedJob}

Return a JSON object with:
- score (0-100)
- matchReasons (exactly 4 specific, data-driven reasons)
- missingSkills (up to 5 skills from the job not evident in resume)
- keyStrengths (exactly 3 strengths)
- breakdown with skills, experience, education, career, company, timing subscores`;
}

export function buildJobBatchMatchingPrompt(
  jobs: Array<Record<string, unknown>>,
  resumeText: string
): string {
  const truncatedResume = resumeText.slice(0, jobs.length > 5 ? 1000 : 2000);

  return `Analyze this resume against these job descriptions with enhanced data.

SCORING CRITERIA (Total: 100 points):
- Skills match (35%): Technical skills alignment with requirements
- Experience relevance (25%): Experience vs requirements and job complexity
- Education fit (15%): Education requirements
- Career progression (10%): Current role vs target role
- Company fit (10%): Company type and culture indicators
- Timing factors (5%): Application urgency and posting recency

Resume:
${truncatedResume}

Jobs to analyze:
${JSON.stringify(jobs, null, 2)}

Return a JSON object with a "matches" array. Each item MUST use the exact jobId string from the jobs list above.
Fields per match: jobId, score (0-100), matchLabel, matchReasons (3-5 strings), missingSkills, keyStrengths.
matchLabel: 90+ = "STRONG MATCH", 70-89 = "GOOD MATCH", 50-69 = "FAIR MATCH", <50 = "WEAK MATCH"`;
}

export const batchMatchGenerationSchema = z.object({
  matches: z.array(
    z.object({
      jobId: z.string(),
      score: z.number(),
      matchLabel: z.string(),
      matchReasons: z.array(z.string()),
      missingSkills: z.array(z.string()),
      keyStrengths: z.array(z.string()),
    })
  ),
});

export const batchMatchSchema = z.object({
  matches: z.array(
    z.object({
      jobId: z.string(),
      score: z.number().min(0).max(100),
      matchLabel: z.string(),
      matchReasons: z.array(z.string()),
      missingSkills: z.array(z.string()),
      keyStrengths: z.array(z.string()),
    })
  ),
});

export function fallbackScoringResult(): ScoringResult {
  return {
    score: 50,
    matchReasons: [
      "Unable to complete detailed analysis",
      "Basic qualifications appear to align",
      "Further review recommended",
      "Consider applying if interested in the role",
    ],
    missingSkills: [],
    keyStrengths: [
      "Professional experience",
      "Educational background",
      "Career trajectory",
    ],
    breakdown: {
      skills: 18,
      experience: 13,
      education: 8,
      career: 5,
      company: 5,
      timing: 1,
    },
  };
}

const BREAKDOWN_LIMITS = {
  skills: 35,
  experience: 25,
  education: 15,
  career: 10,
  company: 10,
  timing: 5,
} as const;

function clampBreakdown(
  breakdown: ScoringResult["breakdown"]
): ScoringResult["breakdown"] {
  return {
    skills: Math.max(0, Math.min(BREAKDOWN_LIMITS.skills, Math.round(breakdown.skills))),
    experience: Math.max(0, Math.min(BREAKDOWN_LIMITS.experience, Math.round(breakdown.experience))),
    education: Math.max(0, Math.min(BREAKDOWN_LIMITS.education, Math.round(breakdown.education))),
    career: Math.max(0, Math.min(BREAKDOWN_LIMITS.career, Math.round(breakdown.career))),
    company: Math.max(0, Math.min(BREAKDOWN_LIMITS.company, Math.round(breakdown.company))),
    timing: Math.max(0, Math.min(BREAKDOWN_LIMITS.timing, Math.round(breakdown.timing))),
  };
}

export function normalizeScoringResult(
  raw: z.infer<typeof scoringResultGenerationSchema>
): ScoringResult {
  const parsed = scoringResultSchema.safeParse(raw);
  if (!parsed.success) {
    const loose = scoringResultGenerationSchema.safeParse(raw);
    if (!loose.success) return fallbackScoringResult();
    return {
      ...loose.data,
      score: Math.max(0, Math.min(100, Math.round(loose.data.score))),
      matchReasons: loose.data.matchReasons.slice(0, 4),
      missingSkills: loose.data.missingSkills.slice(0, 5),
      keyStrengths: loose.data.keyStrengths.slice(0, 3),
      breakdown: clampBreakdown(loose.data.breakdown),
    };
  }
  return {
    ...parsed.data,
    score: Math.max(0, Math.min(100, Math.round(parsed.data.score))),
    breakdown: clampBreakdown(parsed.data.breakdown),
  };
}

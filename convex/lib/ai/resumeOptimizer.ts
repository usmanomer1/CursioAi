import { z } from "zod";
import type { ResumeLinks } from "../pdf/resumeLinks";

/** Structured resume — Jake's template layout (ported from joboticresumeprocessor) */
export const structuredResumeSchema = z.object({
  contact: z.object({
    name: z.string(),
    email: z.optional(z.string()),
    phone: z.optional(z.string()),
    linkedin: z.optional(z.string()),
    github: z.optional(z.string()),
    location: z.optional(z.string()),
  }),
  summary: z.optional(z.string()),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      location: z.optional(z.string()),
      startDate: z.optional(z.string()),
      endDate: z.optional(z.string()),
      bullets: z.array(z.string()),
    })
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      location: z.optional(z.string()),
      graduationDate: z.optional(z.string()),
      startDate: z.optional(z.string()),
      endDate: z.optional(z.string()),
      details: z.optional(z.array(z.string())),
    })
  ),
  projects: z.optional(
    z.array(
      z.object({
        name: z.string(),
        link: z.optional(z.string()),
        linkLabel: z.optional(z.string()),
        technologies: z.optional(z.string()),
        dates: z.optional(z.string()),
        bullets: z.array(z.string()),
      })
    )
  ),
  skills: z.object({
    categories: z.array(
      z.object({
        category: z.string(),
        items: z.string(),
      })
    ),
  }),
  optimization_summary: z.object({
    keywords_added: z.array(z.string()),
    changes_made: z.array(z.string()),
    ats_score_before: z.number(),
    ats_score_after: z.number(),
  }),
});

export type StructuredResume = z.infer<typeof structuredResumeSchema>;

export function buildCombinedOptimizePrompt(input: {
  resumeText: string;
  jobDescription: string;
  jobTitle: string;
  companyName: string;
  missingSkills: string[];
  additionalInstructions?: string;
  preservedLinks?: ResumeLinks;
}): string {
  const resume = input.resumeText.slice(0, 5000);
  const job = input.jobDescription.slice(0, 2500);

  const linksBlock = input.preservedLinks
    ? `
PRESERVED LINKS (keep exact URLs — do not replace with placeholder text):
${JSON.stringify(input.preservedLinks, null, 2)}
`
    : "";

  return `You are an elite ATS resume optimizer. Tailor this resume for the target job in ONE pass.

RULES:
- Never fabricate employers, degrees, dates, or achievements
- Rewrite bullets with strong action verbs and metrics where already implied
- Insert missing keywords naturally into existing bullets (not keyword stuffing)
- Preserve truth; only rephrase and emphasize relevant experience
- MUST fit on ONE page when rendered: concise summary (2-3 lines max), max 4 bullets per role, max 3 projects, prioritize relevant content for the target job
- Preserve ALL URLs from the resume and PRESERVED LINKS block (LinkedIn, GitHub, project links)
- contact must include github if present in the original
- skills.categories: group as { category, items } e.g. Languages, Frontend, Backend (comma-separated items string)
- experience layout: company + title + dates + location + bullets
- projects: include link and linkLabel (e.g. "Live") when a URL exists
- Score before/after on 0-100 ATS compatibility

TARGET JOB: ${input.jobTitle} at ${input.companyName}

MISSING SKILLS TO INCORPORATE (where truthful):
${input.missingSkills.join(", ") || "None specified"}
${linksBlock}
${input.additionalInstructions ? `USER INSTRUCTIONS: ${input.additionalInstructions}` : ""}

RESUME:
${resume}

JOB DESCRIPTION:
${job}

Return structured JSON with contact (name, email, phone, linkedin, github), summary, experience[], education[], projects[], skills.categories[], optimization_summary.`;
}

export function structuredResumeToPlainText(resume: StructuredResume): string {
  const lines: string[] = [];
  const c = resume.contact;
  lines.push(c.name);
  const contactLine = [c.email, c.phone, c.linkedin, c.github, c.location]
    .filter(Boolean)
    .join(" | ");
  if (contactLine) lines.push(contactLine);
  lines.push("");

  if (resume.summary) {
    lines.push("SUMMARY");
    lines.push(resume.summary);
    lines.push("");
  }

  if (resume.experience.length) {
    lines.push("EXPERIENCE");
    for (const exp of resume.experience) {
      lines.push(`${exp.company} — ${exp.title}`);
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      if (dates || exp.location) {
        lines.push([dates, exp.location].filter(Boolean).join(" | "));
      }
      for (const b of exp.bullets) lines.push(`• ${b}`);
      lines.push("");
    }
  }

  if (resume.education.length) {
    lines.push("EDUCATION");
    for (const ed of resume.education) {
      lines.push(`${ed.degree}, ${ed.institution}`);
      const dates =
        ed.graduationDate ??
        [ed.startDate, ed.endDate].filter(Boolean).join(" – ");
      if (dates) lines.push(dates);
      ed.details?.forEach((d) => lines.push(`• ${d}`));
      lines.push("");
    }
  }

  if (resume.projects?.length) {
    lines.push("PROJECTS");
    for (const p of resume.projects) {
      const linkBit = p.link ? ` | ${p.linkLabel ?? "Live"}` : "";
      lines.push(p.name + linkBit + (p.technologies ? ` (${p.technologies})` : ""));
      p.bullets.forEach((b) => lines.push(`• ${b}`));
      lines.push("");
    }
  }

  lines.push("TECHNICAL SKILLS");
  for (const cat of resume.skills.categories) {
    lines.push(`${cat.category}: ${cat.items}`);
  }

  return lines.join("\n").trim();
}

export function hashCacheKey(...parts: string[]): string {
  let hash = 0;
  const str = parts.join("|");
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `opt_${Math.abs(hash)}`;
}

/** Normalize legacy cached resumes that used skills.technical[] */
export function normalizeStructuredResume(raw: unknown): StructuredResume {
  const r = raw as Record<string, unknown>;
  const skills = r.skills as Record<string, unknown> | undefined;
  if (skills && !skills.categories && Array.isArray(skills.technical)) {
    return {
      ...(r as StructuredResume),
      skills: {
        categories: [
          {
            category: "Technical",
            items: (skills.technical as string[]).join(", "),
          },
          ...(Array.isArray(skills.other) && (skills.other as string[]).length
            ? [{ category: "Other", items: (skills.other as string[]).join(", ") }]
            : []),
        ],
      },
    } as StructuredResume;
  }
  return r as StructuredResume;
}

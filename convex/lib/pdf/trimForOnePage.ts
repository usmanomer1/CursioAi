import type { StructuredResume } from "../ai/resumeOptimizer";

/** Progressively tighten content so react-pdf stays on one letter page. */
export function trimResumeForOnePage(
  resume: StructuredResume,
  level: number
): StructuredResume {
  const maxSummaryChars = [400, 320, 260, 200, 160][level] ?? 140;
  const maxBulletsPerExp = [5, 4, 3, 2, 2][level] ?? 2;
  const maxBulletsPerProject = [4, 3, 2, 2, 1][level] ?? 1;
  const maxProjects = [6, 5, 4, 3, 2][level] ?? 2;
  const maxExp = [6, 5, 4, 4, 3][level] ?? 3;

  const summary = resume.summary?.slice(0, maxSummaryChars);

  const experience = resume.experience.slice(0, maxExp).map((exp) => ({
    ...exp,
    bullets: exp.bullets.slice(0, maxBulletsPerExp),
  }));

  const projects = resume.projects
    ?.slice(0, maxProjects)
    .map((p) => ({
      ...p,
      bullets: p.bullets.slice(0, maxBulletsPerProject),
    }));

  const education = resume.education.map((ed) => ({
    ...ed,
    details: ed.details?.slice(0, level >= 3 ? 2 : 4),
  }));

  return {
    ...resume,
    summary,
    experience,
    projects,
    education,
  };
}

import { v } from "convex/values";

export const resumeLinksValidator = v.object({
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  linkedin: v.optional(v.string()),
  github: v.optional(v.string()),
  projectLinks: v.optional(
    v.array(
      v.object({
        name: v.string(),
        url: v.string(),
        label: v.optional(v.string()),
      })
    )
  ),
});

export type ResumeLinks = {
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  projectLinks?: Array<{ name: string; url: string; label?: string }>;
};

type MergeableResume = {
  contact: {
    name: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    location?: string;
  };
  projects?: Array<{
    name: string;
    link?: string;
    linkLabel?: string;
    technologies?: string;
    dates?: string;
    bullets: string[];
  }>;
  [key: string]: unknown;
};

function normalizeUrl(url: string, prefix?: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("mailto:")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (prefix === "mailto") return `mailto:${trimmed}`;
  return `https://${trimmed.replace(/^\/\//, "")}`;
}

export function hrefForDisplay(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^mailto:/, "")
    .replace(/\/$/, "");
}

export function mergePreservedLinks<T extends MergeableResume>(
  resume: T,
  links?: ResumeLinks | null
): T {
  if (!links) return resume;

  const contact = { ...resume.contact };
  if (links.email && !contact.email) contact.email = links.email;
  if (links.phone && !contact.phone) contact.phone = links.phone;
  if (links.linkedin && !contact.linkedin) contact.linkedin = links.linkedin;
  if (links.github && !contact.github) contact.github = links.github;

  let projects = resume.projects;
  if (links.projectLinks?.length && projects?.length) {
    projects = projects.map((project) => {
      const match = links.projectLinks!.find(
        (pl) =>
          pl.name.toLowerCase() === project.name.toLowerCase() ||
          project.name.toLowerCase().includes(pl.name.toLowerCase()) ||
          pl.name.toLowerCase().includes(project.name.toLowerCase())
      );
      if (!match) return project;
      return {
        ...project,
        link: project.link ?? match.url,
        linkLabel: project.linkLabel ?? match.label ?? "Live",
      };
    });
  }

  return { ...resume, contact, projects };
}

export { normalizeUrl };

export interface JobResult {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo?: string;
  job_description: string;
  job_description_clean?: string;
  job_apply_link: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_is_remote: boolean;
  job_posted_at_datetime_utc?: string;
  job_employment_type?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  posted_days_ago?: number;
  location_display?: string;
  match_score?: number;
  match_label?: string;
  match_reasons?: string[];
  missing_skills?: string[];
  key_strengths?: string[];
}

export function jobLocation(job: {
  location_display?: string;
  job_city?: string;
  job_state?: string;
  job_is_remote?: boolean;
}): string {
  const base =
    job.location_display ||
    [job.job_city, job.job_state].filter(Boolean).join(", ");
  if (job.job_is_remote) return base ? `${base} · Remote` : "Remote";
  return base || "Location not specified";
}

export function formatPosted(job: {
  posted_days_ago?: number;
  job_posted_at_datetime_utc?: string;
}): string | null {
  if (typeof job.posted_days_ago === "number") {
    const d = job.posted_days_ago;
    if (d <= 0) return "Today";
    if (d === 1) return "Yesterday";
    if (d < 7) return `${d} days ago`;
    if (d < 30) return `${Math.floor(d / 7)}w ago`;
    return `${Math.floor(d / 30)}mo ago`;
  }
  if (job.job_posted_at_datetime_utc) {
    const date = new Date(job.job_posted_at_datetime_utc);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
  }
  return null;
}

export function formatSalary(job: {
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
}): string | null {
  const { job_min_salary: min, job_max_salary: max } = job;
  if (!min && !max) return null;
  const cur = job.job_salary_currency || "USD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
      notation: n >= 10000 ? "compact" : "standard",
    }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min || max)!);
}

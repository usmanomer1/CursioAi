"use node";

import type {
  JSearchJob,
  JSearchSearchResponse,
  TransformedJob,
} from "./types";

// OpenWebNinja JSearch (https://api.openwebninja.com/jsearch). Single
// `x-api-key` header; override the base URL only for testing/proxies.
const JSEARCH_BASE_URL =
  process.env.JSEARCH_BASE_URL ?? "https://api.openwebninja.com/jsearch";

function getHeaders(): Record<string, string> {
  const apiKey = process.env.JSEARCH_API_KEY ?? process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error("JSEARCH_API_KEY is not configured");
  return { "x-api-key": apiKey };
}

/** Message shown to the user when the upstream provider is unreachable. */
const PROVIDER_DOWN =
  "Job search is temporarily unavailable — our jobs provider is having an outage. Please try again in a few minutes.";

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: Error | undefined;
  let lastStatus: number | undefined;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, { headers: getHeaders() });
      if (response.status === 429 || response.status >= 500) {
        lastStatus = response.status;
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  // Exhausting retries on 5xx/429 leaves no thrown error behind, so say what
  // actually happened instead of surfacing an opaque "Server Error".
  if (lastStatus !== undefined) {
    throw new Error(
      lastStatus === 429
        ? "Job search is rate limited right now. Please try again in a minute."
        : PROVIDER_DOWN
    );
  }
  throw lastError ?? new Error(PROVIDER_DOWN);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRequirements(description: string): string[] {
  const requirements: string[] = [];
  const patterns = [
    /(?:required|must have|requirements?)[:.]?\s*([^.]+)/gi,
    /(?:experience with|proficiency in|knowledge of)\s+([^.]+)/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      requirements.push(match[1]?.trim() ?? "");
    }
  }
  return requirements.slice(0, 10);
}

export function transformJobResponse(job: JSearchJob): TransformedJob {
  const description = job.job_description ?? "";
  const cleanDescription = stripHtml(description);
  const postedAt = job.job_posted_at_datetime_utc
    ? new Date(job.job_posted_at_datetime_utc)
    : null;
  const postedDaysAgo = postedAt
    ? Math.floor((Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

  // OpenWebNinja sets job_is_remote to null and conveys remote via
  // work_arrangement, so fall back to that.
  const isRemote =
    job.job_is_remote === true ||
    (job.work_arrangement ?? "").toLowerCase() === "remote";

  return {
    job_id: job.job_id,
    employer_name: job.employer_name ?? "Unknown",
    employer_logo: job.employer_logo,
    job_title: job.job_title ?? "Untitled",
    job_description: description,
    job_description_clean: cleanDescription,
    job_apply_link: job.job_apply_link ?? "",
    job_city: job.job_city,
    job_state: job.job_state,
    job_country: job.job_country,
    job_is_remote: isRemote,
    job_posted_at_datetime_utc: job.job_posted_at_datetime_utc,
    job_employment_type:
      job.job_employment_type ?? job.job_employment_types?.[0],
    job_min_salary: job.job_min_salary,
    job_max_salary: job.job_max_salary,
    job_salary_currency: job.job_salary_currency,
    job_highlights: job.job_highlights,
    job_required_skills: job.job_required_skills ?? job.required_technologies,
    job_required_experience: job.job_required_experience,
    extracted_requirements: extractRequirements(cleanDescription),
    posted_days_ago: postedDaysAgo,
    location_display:
      job.job_location ??
      [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", "),
  };
}

export interface SearchParams {
  query: string;
  location?: string;
  numJobs?: number;
  datePosted?: string;
  remote?: boolean;
  employmentTypes?: string[];
  experienceLevel?: string[];
  radius?: number;
  country?: string;
}

export async function searchJobs(params: SearchParams): Promise<TransformedJob[]> {
  const numJobs = Math.min(params.numJobs ?? 20, 100);
  // Each page returns up to 10 results and costs one credit; cap at 20 pages.
  const numPages = Math.min(Math.ceil(numJobs / 10), 20);

  const searchParams = new URLSearchParams({
    query: params.location
      ? `${params.query} in ${params.location}`
      : params.query,
    num_pages: String(numPages),
    country: params.country ?? "us",
  });

  // "all" is the API default — omit it rather than sending it.
  if (params.datePosted && params.datePosted !== "all") {
    searchParams.set("date_posted", params.datePosted);
  }
  if (params.remote) searchParams.set("work_from_home", "true");
  if (params.radius) searchParams.set("radius", String(params.radius));
  if (params.employmentTypes?.length) {
    searchParams.set("employment_types", params.employmentTypes.join(","));
  }
  if (params.experienceLevel?.length) {
    searchParams.set("job_requirements", params.experienceLevel.join(","));
  }

  const url = `${JSEARCH_BASE_URL}/search-v2?${searchParams.toString()}`;
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    const body = await response.text();
    // Keep the upstream detail in the logs, but hand the user something they
    // can act on — a raw status dump reads as a bug in Cursio.
    console.error(`JSearch ${response.status} for ${url}: ${body.slice(0, 300)}`);
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Job search is misconfigured on our side. We've been notified — please try again later."
      );
    }
    throw new Error(PROVIDER_DOWN);
  }

  // OpenWebNinja nests results under data.jobs (with a cursor for pagination).
  const payload = (await response.json()) as JSearchSearchResponse;
  const jobs = (payload.data?.jobs ?? []).slice(0, numJobs);
  return jobs.map(transformJobResponse);
}

export function simplifyJobsForMatching(jobs: TransformedJob[]) {
  return jobs.map((job) => ({
    jobId: job.job_id,
    title: job.job_title,
    company: job.employer_name,
    description: (job.job_description_clean ?? "").slice(0, 500),
    requirements: job.extracted_requirements ?? [],
    location: {
      city: job.job_city,
      state: job.job_state,
      remote: job.job_is_remote,
    },
    metadata: {
      employmentType: job.job_employment_type,
      postedDaysAgo: job.posted_days_ago,
    },
  }));
}

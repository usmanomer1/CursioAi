"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useMutation, useAction, useQuery } from "convex/react";
import {
  Search,
  MapPin,
  Heart,
  ExternalLink,
  Sparkles,
  MessageCircle,
  Wand2,
  SlidersHorizontal,
  Building2,
  Briefcase,
  DollarSign,
  Clock,
  AlertCircle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { JobChatPanel } from "@/components/job-chat-panel";
import { TailorResumeDialog } from "@/components/tailor-resume-dialog";
import { ResizableSplit } from "@/components/resizable-split";
import { MatchBadge } from "@/components/match-badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  type JobResult,
  jobLocation,
  formatPosted,
  formatSalary,
} from "@/lib/types";

const EMPLOYMENT = [
  { v: "FULLTIME", l: "Full-time" },
  { v: "PARTTIME", l: "Part-time" },
  { v: "CONTRACTOR", l: "Contract" },
  { v: "INTERN", l: "Internship" },
];
const EXPERIENCE = [
  { v: "no_experience", l: "Entry level" },
  { v: "under_3_years_experience", l: "Under 3 yrs" },
  { v: "more_than_3_years_experience", l: "3+ yrs" },
];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-brand-500/50 bg-brand-500/15 text-brand-600 dark:text-brand-300"
          : "border-line-strong text-muted hover:border-line-strong hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}

export default function JobsPage() {
  const me = useQuery(api.users.getMe);
  const likedJobs = useQuery(api.jobs.getLikedJobs);
  const applications = useQuery(api.applications.list);

  const createSession = useMutation(api.jobs.createSearchSession);
  const searchAndMatch = useAction(api.actions.searchAndMatchJobs);
  const likeJob = useMutation(api.jobs.likeJob);
  const unlikeJob = useMutation(api.jobs.unlikeJob);
  const createApplication = useMutation(api.applications.create);

  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
  const [chatJob, setChatJob] = useState<JobResult | null>(null);
  const [tailorJob, setTailorJob] = useState<JobResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const [remote, setRemote] = useState(false);
  const [datePosted, setDatePosted] = useState("month");
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<string[]>([]);

  const resumeText = me?.primaryResume?.resumeText ?? "";
  const hasResume = resumeText.length >= 50;
  const likedIds = new Set(likedJobs?.map((j) => j.jobId) ?? []);
  const appliedIds = new Set(applications?.map((a) => a.jobId) ?? []);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const activeFilterCount =
    (remote ? 1 : 0) + employmentTypes.length + experienceLevel.length;

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      toast.error("Enter a job title or keywords");
      return;
    }
    if (useAI && !hasResume) {
      toast.error("Upload your resume first for AI matching");
      return;
    }

    setLoading(true);
    setSearched(true);
    setJobs([]);
    setSelectedJob(null);
    setShowFullDesc(false);

    const filters = {
      datePosted,
      remote: remote || undefined,
      employmentTypes: employmentTypes.length ? employmentTypes : undefined,
      experienceLevel: experienceLevel.length ? experienceLevel : undefined,
    };

    try {
      const sessionId = await createSession({
        query: query.trim(),
        location: location.trim() || undefined,
        resumeText,
        filters,
      });

      const result = await searchAndMatch({
        sessionId,
        query: query.trim(),
        location: location.trim() || undefined,
        resumeText,
        numJobs: 20,
        useAI,
        filters,
      });

      const found = result.jobs as JobResult[];
      setJobs(found);
      if (found.length > 0) setSelectedJob(found[0]);
      toast.success(`Found ${result.totalFound} jobs`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [
    query,
    location,
    resumeText,
    hasResume,
    useAI,
    remote,
    datePosted,
    employmentTypes,
    experienceLevel,
    createSession,
    searchAndMatch,
  ]);

  const toggleLike = async (job: JobResult) => {
    try {
      if (likedIds.has(job.job_id)) {
        await unlikeJob({ jobId: job.job_id });
        toast.success("Removed from saved");
      } else {
        await likeJob({
          jobId: job.job_id,
          cachedJobData: {
            job_title: job.job_title,
            employer_name: job.employer_name,
            employer_logo: job.employer_logo,
            job_city: job.job_city,
            job_state: job.job_state,
            job_country: job.job_country,
            job_is_remote: job.job_is_remote,
            job_apply_link: job.job_apply_link,
            job_description: job.job_description_clean ?? job.job_description,
            job_posted_at_datetime_utc: job.job_posted_at_datetime_utc,
            match_score: job.match_score,
            match_label: job.match_label,
            match_reasons: job.match_reasons,
            missing_skills: job.missing_skills,
            key_strengths: job.key_strengths,
          },
        });
        toast.success("Saved to your jobs");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const handleApply = async (job: JobResult) => {
    // Open the listing immediately, and record it in the tracker if new.
    window.open(job.job_apply_link, "_blank", "noopener,noreferrer");
    if (appliedIds.has(job.job_id)) return;
    try {
      await createApplication({
        jobId: job.job_id,
        jobTitle: job.job_title,
        companyName: job.employer_name,
        jobUrl: job.job_apply_link,
        status: "applied",
      });
      toast.success("Added to your applications");
    } catch {
      /* non-blocking */
    }
  };

  return (
    <>
      <ResizableSplit
        className="h-[calc(100vh-3.5rem)] md:h-screen"
        left={
          /* Search + list */
          <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-line p-4">
            <h1 className="mb-3 text-xl font-bold text-fg">Job Search</h1>

            {!hasResume && (
              <Link
                href="/resume"
                className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                Upload your resume to unlock AI match scoring →
              </Link>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Job title, keywords…"
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
                />
              </div>
              <div className="relative sm:w-44">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location"
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
                />
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Select
                value={datePosted}
                onChange={(e) => setDatePosted(e.target.value)}
                className="h-9 w-auto text-xs"
              >
                <option value="all">Any time</option>
                <option value="today">Today</option>
                <option value="3days">Last 3 days</option>
                <option value="week">Past week</option>
                <option value="month">Past month</option>
              </Select>
              <FilterChip active={remote} onClick={() => setRemote(!remote)}>
                Remote only
              </FilterChip>
              <button
                type="button"
                onClick={() => setShowFilters((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-xs text-muted hover:text-fg"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-fg">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="accent-brand-500"
                />
                <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                AI match
              </label>
              <Button onClick={() => void handleSearch()} loading={loading} size="sm">
                {!loading && <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>

            {showFilters && (
              <div className="mt-3 space-y-3 rounded-lg border border-line bg-surface p-3 [animation:var(--animate-fade-in)]">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-subtle">
                    Employment type
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {EMPLOYMENT.map((e) => (
                      <FilterChip
                        key={e.v}
                        active={employmentTypes.includes(e.v)}
                        onClick={() =>
                          toggle(employmentTypes, setEmploymentTypes, e.v)
                        }
                      >
                        {e.l}
                      </FilterChip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-subtle">
                    Experience
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {EXPERIENCE.map((e) => (
                      <FilterChip
                        key={e.v}
                        active={experienceLevel.includes(e.v)}
                        onClick={() =>
                          toggle(experienceLevel, setExperienceLevel, e.v)
                        }
                      >
                        {e.l}
                      </FilterChip>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            )}

            {!loading && jobs.length === 0 && (
              <div className="p-6">
                <EmptyState
                  icon={Search}
                  title={searched ? "No jobs found" : "Search for jobs"}
                  description={
                    searched
                      ? "Try broadening your filters or location."
                      : "Enter a title and location to see roles ranked against your resume."
                  }
                />
              </div>
            )}

            {!loading &&
              jobs.map((job) => (
                <button
                  key={job.job_id}
                  onClick={() => {
                    setSelectedJob(job);
                    setShowFullDesc(false);
                  }}
                  className={cn(
                    "block w-full border-b border-line p-4 text-left transition-colors hover:bg-raised/60",
                    selectedJob?.job_id === job.job_id &&
                      "bg-raised ring-1 ring-inset ring-brand-500/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">
                        {job.job_title}
                      </p>
                      <p className="truncate text-sm text-muted">
                        {job.employer_name}
                      </p>
                      <p className="mt-1 truncate text-xs text-subtle">
                        {jobLocation(job)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <MatchBadge score={job.match_score} label={job.match_label} />
                      {likedIds.has(job.job_id) && (
                        <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>

        }
        right={
          /* Detail */
          <div className="flex max-h-full w-full min-h-0 flex-col">
          {selectedJob ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-fg">
                      {selectedJob.job_title}
                    </h2>
                    <p className="flex items-center gap-1.5 text-muted">
                      <Building2 className="h-4 w-4" />
                      {selectedJob.employer_name}
                    </p>
                  </div>
                  <MatchBadge
                    score={selectedJob.match_score}
                    label={selectedJob.match_label}
                  />
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge variant="neutral">
                    <MapPin className="h-3 w-3" /> {jobLocation(selectedJob)}
                  </Badge>
                  {formatSalary(selectedJob) && (
                    <Badge variant="success">
                      <DollarSign className="h-3 w-3" />
                      {formatSalary(selectedJob)}
                    </Badge>
                  )}
                  {selectedJob.job_employment_type && (
                    <Badge variant="neutral">
                      <Briefcase className="h-3 w-3" />
                      {selectedJob.job_employment_type.toLowerCase()}
                    </Badge>
                  )}
                  {formatPosted(selectedJob) && (
                    <Badge variant="neutral">
                      <Clock className="h-3 w-3" /> {formatPosted(selectedJob)}
                    </Badge>
                  )}
                  {appliedIds.has(selectedJob.job_id) && (
                    <Badge variant="info">
                      <Check className="h-3 w-3" /> Applied
                    </Badge>
                  )}
                </div>

                {selectedJob.match_reasons &&
                  selectedJob.match_reasons.length > 0 && (
                    <div className="mb-4 rounded-xl border border-line bg-raised/60 p-4">
                      <p className="mb-2 text-sm font-medium text-fg">
                        Why this matches
                      </p>
                      <ul className="space-y-1.5">
                        {selectedJob.match_reasons.map((r, i) => (
                          <li
                            key={i}
                            className="flex gap-2 text-sm text-muted"
                          >
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {selectedJob.missing_skills &&
                  selectedJob.missing_skills.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-sm font-medium text-muted">
                        Skills to address
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.missing_skills.map((skill) => (
                          <Badge key={skill} variant="danger">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                <div>
                  <p className="mb-2 text-sm font-medium text-muted">
                    Description
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {(() => {
                      const desc =
                        selectedJob.job_description_clean ??
                        selectedJob.job_description;
                      return showFullDesc ? desc : desc.slice(0, 1200);
                    })()}
                  </p>
                  {(selectedJob.job_description_clean ??
                    selectedJob.job_description).length > 1200 && (
                    <button
                      onClick={() => setShowFullDesc((s) => !s)}
                      className="mt-2 text-sm font-medium text-brand-500 hover:text-brand-400"
                    >
                      {showFullDesc ? "Show less" : "Show full description"}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t border-line p-4">
                {/* Primary action — the differentiating feature */}
                <Button
                  variant="brand"
                  className="w-full"
                  onClick={() => setTailorJob(selectedJob)}
                >
                  <Wand2 className="h-4 w-4" />
                  Generate custom resume for this job
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant={
                      likedIds.has(selectedJob.job_id) ? "destructive" : "secondary"
                    }
                    size="sm"
                    className="flex-1"
                    onClick={() => void toggleLike(selectedJob)}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        likedIds.has(selectedJob.job_id) && "fill-current"
                      )}
                    />
                    {likedIds.has(selectedJob.job_id) ? "Saved" : "Save"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setChatJob(selectedJob)}
                  >
                    <MessageCircle className="h-4 w-4" /> Ask AI
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => void handleApply(selectedJob)}
                  >
                    <ExternalLink className="h-4 w-4" /> Apply
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="hidden flex-1 items-center justify-center p-6 text-sm text-subtle lg:flex">
              Select a job to view details
            </div>
          )}
          </div>
        }
      />

      {tailorJob && (
        <TailorResumeDialog
          job={tailorJob}
          onClose={() => setTailorJob(null)}
        />
      )}

      {chatJob && (
        <JobChatPanel
          job={chatJob}
          resumeText={resumeText || undefined}
          onClose={() => setChatJob(null)}
        />
      )}
    </>
  );
}

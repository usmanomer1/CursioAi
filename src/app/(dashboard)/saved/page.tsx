"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import {
  Bookmark,
  Building2,
  ExternalLink,
  Heart,
  MapPin,
  MessageCircle,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { JobChatPanel } from "@/components/job-chat-panel";
import { MatchBadge } from "@/components/match-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { jobLocation } from "@/lib/types";

type ChatJob = {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_description: string;
  match_score?: number;
  missing_skills?: string[];
};

export default function SavedJobsPage() {
  const likedJobs = useQuery(api.jobs.getLikedJobs);
  const applications = useQuery(api.applications.list);
  const unlikeJob = useMutation(api.jobs.unlikeJob);
  const createApplication = useMutation(api.applications.create);
  const [chatJob, setChatJob] = useState<ChatJob | null>(null);

  const appliedIds = new Set(applications?.map((a) => a.jobId) ?? []);
  const loading = likedJobs === undefined;

  const handleApply = async (jobId: string, data: NonNullable<typeof likedJobs>[number]["cachedJobData"]) => {
    if (!data) return;
    window.open(data.job_apply_link, "_blank", "noopener,noreferrer");
    if (appliedIds.has(jobId)) return;
    try {
      await createApplication({
        jobId,
        jobTitle: data.job_title,
        companyName: data.employer_name,
        jobUrl: data.job_apply_link,
        status: "applied",
      });
      toast.success("Added to your applications");
    } catch {
      /* non-blocking */
    }
  };

  return (
    <>
      <div className="mx-auto max-w-5xl p-5 sm:p-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-fg">Saved jobs</h1>
            <p className="text-muted">Roles you bookmarked to revisit.</p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/jobs">
              <Search className="h-4 w-4" /> Find more
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : !likedJobs.length ? (
          <EmptyState
            icon={Bookmark}
            title="No saved jobs yet"
            description="Tap the heart on any job in search to save it here for later."
            action={
              <Button asChild variant="brand">
                <Link href="/jobs">Search jobs</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {likedJobs.map((item) => {
              const job = item.cachedJobData;
              if (!job) return null;
              return (
                <Card key={item._id} className="flex flex-col p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">
                        {job.job_title}
                      </p>
                      <p className="flex items-center gap-1.5 truncate text-sm text-muted">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        {job.employer_name}
                      </p>
                    </div>
                    <MatchBadge score={job.match_score} label={job.match_label} />
                  </div>

                  <p className="mb-3 flex items-center gap-1.5 text-xs text-subtle">
                    <MapPin className="h-3.5 w-3.5" />
                    {jobLocation(job)}
                  </p>

                  {job.missing_skills && job.missing_skills.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {job.missing_skills.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] text-red-400"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await unlikeJob({ jobId: item.jobId });
                        toast.success("Removed");
                      }}
                      aria-label="Remove from saved"
                    >
                      <Heart className="h-4 w-4 fill-red-400 text-red-400" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        setChatJob({
                          job_id: item.jobId,
                          job_title: job.job_title,
                          employer_name: job.employer_name,
                          job_description: job.job_description,
                          match_score: job.match_score,
                          missing_skills: job.missing_skills,
                        })
                      }
                    >
                      <MessageCircle className="h-4 w-4" /> Ask AI
                    </Button>
                    <Button
                      variant="brand"
                      size="sm"
                      className="flex-1"
                      onClick={() => void handleApply(item.jobId, job)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      {appliedIds.has(item.jobId) ? "Applied" : "Apply"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {chatJob && (
        <JobChatPanel job={chatJob} onClose={() => setChatJob(null)} />
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  Loader2,
  MoonStar,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Requirement {
  keyword: string;
  kind: "skill" | "tool" | "qualification" | "responsibility";
  importance: "critical" | "preferred" | "nice_to_have";
  rationale: string;
  alreadyPresent: boolean;
}

const importanceVariant = {
  critical: "danger",
  preferred: "warning",
  nice_to_have: "neutral",
} as const;

const importanceLabel = {
  critical: "Critical",
  preferred: "Preferred",
  nice_to_have: "Nice to have",
} as const;

/**
 * The tailoring flow renders whatever stage the persistent tailorJobs record
 * is in — so closing this dialog (or the tab) never loses progress, and
 * reopening resumes exactly where the run left off. The heavy work happens in
 * scheduled Convex actions; a notification fires as each stage completes.
 */
export function TailorResumeDialog({
  job,
  onClose,
}: {
  job: {
    job_id: string;
    job_title: string;
    employer_name: string;
    job_description: string;
    job_description_clean?: string;
    job_apply_link?: string;
  };
  onClose: () => void;
}) {
  const tailorJob = useQuery(api.tailor.getForJob, { jobId: job.job_id });
  const start = useMutation(api.tailor.start);
  const choose = useMutation(api.tailor.choose);

  // When viewing a finished run, "Adjust selections" flips back to the picker.
  const [reSelecting, setReSelecting] = useState(false);
  const [kicked, setKicked] = useState(false);

  const description = job.job_description_clean ?? job.job_description;

  const kickOff = async (restart: boolean) => {
    try {
      await start({
        jobId: job.job_id,
        jobTitle: job.job_title,
        companyName: job.employer_name,
        jobDescription: description,
        jobUrl: job.job_apply_link,
        restart,
      });
      setReSelecting(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start tailoring");
      onClose();
    }
  };

  // No run exists yet for this job → start one (render-phase latch).
  if (tailorJob === null && !kicked) {
    setKicked(true);
    void kickOff(false);
  }

  const submitChoice = async (
    tailorJobId: Id<"tailorJobs">,
    selectedKeywords: string[],
    mode: "quick" | "full"
  ) => {
    try {
      await choose({ tailorJobId, selectedKeywords, mode });
      setReSelecting(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start generation");
    }
  };

  const status = tailorJob?.status;
  const showSelection =
    tailorJob &&
    (status === "awaiting_selection" ||
      (reSelecting && tailorJob.requirements?.length));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full flex-col overflow-hidden border-line bg-surface shadow-2xl sm:h-[min(86vh,780px)] sm:max-w-3xl sm:rounded-2xl sm:border [animation:var(--animate-slide-up)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500">
              <Wand2 className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-fg">Tailor resume</p>
              <p className="truncate text-xs text-subtle">
                {job.job_title} · {job.employer_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted hover:bg-raised hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body — driven by the persisted status */}
        {(tailorJob === undefined || (tailorJob === null && kicked)) && (
          <Centered>
            <Pulse />
            <p className="mt-5 font-medium text-fg">Starting…</p>
          </Centered>
        )}

        {status === "analyzing" && (
          <Progress
            title="Reading the job posting…"
            subtitle="Finding what an ATS will scan for."
            onClose={onClose}
          />
        )}

        {status === "generating" && !reSelecting && (
          <Progress
            title="Writing your resume…"
            subtitle="Tailoring content, then fitting it to one page."
            onClose={onClose}
          />
        )}

        {showSelection && (
          <SelectStep
            key={tailorJob!._id}
            requirements={(tailorJob!.requirements ?? []) as Requirement[]}
            initialSelected={tailorJob!.selectedKeywords}
            busy={status === "generating"}
            onCancelReselect={
              status === "done" ? () => setReSelecting(false) : undefined
            }
            onSubmit={(kw, mode) => void submitChoice(tailorJob!._id, kw, mode)}
          />
        )}

        {status === "done" && !reSelecting && (
          <ResultView
            tailorJob={tailorJob!}
            applyLink={job.job_apply_link ?? tailorJob!.jobUrl ?? undefined}
            onAdjust={() => setReSelecting(true)}
            onRestart={() => void kickOff(true)}
          />
        )}

        {status === "error" && !showSelection && (
          <Centered>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/25">
              <TriangleAlert className="h-6 w-6 text-red-500" />
            </div>
            <p className="mt-5 font-medium text-fg">Something went wrong</p>
            <p className="mt-1 max-w-sm text-sm text-subtle">
              {tailorJob?.errorMessage ?? "Please try again."}
            </p>
            <div className="mt-5 flex gap-2">
              {tailorJob?.requirements?.length ? (
                <Button variant="secondary" onClick={() => setReSelecting(true)}>
                  Back to selections
                </Button>
              ) : null}
              <Button variant="brand" onClick={() => void kickOff(true)}>
                <RotateCcw className="h-4 w-4" /> Try again
              </Button>
            </div>
          </Centered>
        )}
      </div>
    </div>
  );
}

/* ── pieces ────────────────────────────────────────────────────────────── */

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}

function Pulse() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <span className="absolute inset-0 animate-ping rounded-2xl bg-brand-500/20" />
      <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500">
        <Loader2 className="h-7 w-7 animate-spin text-white" />
      </span>
    </div>
  );
}

function Progress({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <Centered>
      <Pulse />
      <p className="mt-5 font-medium text-fg">{title}</p>
      <p className="mt-1 text-sm text-subtle">{subtitle}</p>

      <div className="mt-7 flex max-w-sm items-start gap-2.5 rounded-xl border border-line bg-raised/50 px-4 py-3 text-left">
        <MoonStar className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
        <p className="text-xs leading-relaxed text-muted">
          This keeps running in the background — you can close this window or
          leave the page. We&apos;ll notify you the moment it&apos;s ready.
        </p>
      </div>
      <Button variant="secondary" size="sm" className="mt-4" onClick={onClose}>
        Close &amp; continue in background
      </Button>
    </Centered>
  );
}

function SelectStep({
  requirements,
  initialSelected,
  busy,
  onSubmit,
  onCancelReselect,
}: {
  requirements: Requirement[];
  initialSelected?: string[];
  busy?: boolean;
  onSubmit: (keywords: string[], mode: "quick" | "full") => void;
  onCancelReselect?: () => void;
}) {
  const missing = requirements.filter((r) => !r.alreadyPresent);
  const present = requirements.filter((r) => r.alreadyPresent);

  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        initialSelected ??
          missing
            .filter((r) => r.importance !== "nice_to_have")
            .map((r) => r.keyword)
      )
  );

  const toggle = (kw: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="text-sm text-muted">
          Pick what to weave in. We only add what your experience can truthfully
          support — nothing is invented.
        </p>

        {missing.length > 0 && (
          <>
            <div className="mt-5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">
                Missing from your resume
              </h3>
              <button
                onClick={() =>
                  setSelected(
                    selected.size === missing.length
                      ? new Set()
                      : new Set(missing.map((r) => r.keyword))
                  )
                }
                className="text-xs font-medium text-brand-500 hover:text-brand-400"
              >
                {selected.size === missing.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="mt-2.5 space-y-2">
              {missing.map((r) => {
                const on = selected.has(r.keyword);
                return (
                  <button
                    key={r.keyword}
                    onClick={() => toggle(r.keyword)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                      on
                        ? "border-brand-500/50 bg-brand-500/8"
                        : "border-line hover:border-line-strong hover:bg-raised/50"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors",
                        on ? "border-brand-500 bg-brand-500" : "border-line-strong"
                      )}
                    >
                      {on && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-fg">{r.keyword}</span>
                        <Badge variant={importanceVariant[r.importance]}>
                          {importanceLabel[r.importance]}
                        </Badge>
                      </span>
                      <span className="mt-0.5 block text-xs text-subtle">
                        {r.rationale}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {present.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-semibold text-fg">Already covered</h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {present.map((r) => (
                <Badge key={r.keyword} variant="success">
                  <Check className="h-3 w-3" /> {r.keyword}
                </Badge>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="border-t border-line px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-subtle">
            {selected.size} selected · choose how much to rewrite
          </p>
          {onCancelReselect && (
            <button
              onClick={onCancelReselect}
              className="text-xs font-medium text-brand-500 hover:text-brand-400"
            >
              Back to result
            </button>
          )}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <button
            disabled={busy}
            onClick={() => onSubmit([...selected], "quick")}
            className="group rounded-xl border border-line p-3.5 text-left transition-colors hover:border-brand-500/50 hover:bg-raised/50 disabled:opacity-50"
          >
            <span className="flex items-center gap-2 font-medium text-fg">
              <Zap className="h-4 w-4 text-accent-500" /> Quick edit
            </span>
            <span className="mt-1 block text-xs text-subtle">
              Keeps your wording. Slots keywords in where they fit.
            </span>
          </button>
          <button
            disabled={busy}
            onClick={() => onSubmit([...selected], "full")}
            className="group rounded-xl border border-brand-500/40 bg-brand-500/8 p-3.5 text-left transition-colors hover:border-brand-500/70 disabled:opacity-50"
          >
            <span className="flex items-center gap-2 font-medium text-fg">
              <Sparkles className="h-4 w-4 text-brand-500" /> Full rewrite
            </span>
            <span className="mt-1 block text-xs text-subtle">
              Rewrites bullets and reorders for maximum impact.
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

interface DoneTailorJob {
  optimizedText?: string;
  changesSummary?: string[];
  keywordsAdded?: string[];
  scoreBefore?: number;
  scoreAfter?: number;
  pdfUrl: string | null;
  diffPdfUrl?: string | null;
  fileName?: string;
}

function ResultView({
  tailorJob,
  applyLink,
  onAdjust,
  onRestart,
}: {
  tailorJob: DoneTailorJob;
  applyLink?: string;
  onAdjust: () => void;
  onRestart: () => void;
}) {
  const hasDiffPdf = Boolean(tailorJob.diffPdfUrl);
  // Lead with the highlighted variant so additions are visible immediately.
  const [showAdditions, setShowAdditions] = useState(hasDiffPdf);
  const [tab, setTab] = useState<"pdf" | "changes">("pdf");

  const before = tailorJob.scoreBefore ?? 0;
  const after = tailorJob.scoreAfter ?? 0;
  const delta = after - before;
  const src =
    showAdditions && tailorJob.diffPdfUrl
      ? tailorJob.diffPdfUrl
      : tailorJob.pdfUrl;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-2.5">
        <span className="flex items-center gap-2 text-sm">
          <span className="text-subtle">ATS</span>
          <span className="font-semibold text-muted">{before}%</span>
          <ArrowRight className="h-3.5 w-3.5 text-subtle" />
          <span className="font-bold text-emerald-500">{after}%</span>
          {delta > 0 && <Badge variant="success">+{delta}</Badge>}
        </span>

        {tab === "pdf" && hasDiffPdf && (
          <button
            onClick={() => setShowAdditions((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              showAdditions
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-line text-subtle hover:text-fg"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                showAdditions ? "bg-emerald-500" : "bg-line-strong"
              )}
            />
            Highlight additions
          </button>
        )}

        <div className="ml-auto flex rounded-lg border border-line p-0.5">
          <button
            onClick={() => setTab("pdf")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              tab === "pdf" ? "bg-raised text-fg" : "text-subtle hover:text-fg"
            )}
          >
            Resume
          </button>
          <button
            onClick={() => setTab("changes")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              tab === "changes"
                ? "bg-raised text-fg"
                : "text-subtle hover:text-fg"
            )}
          >
            What changed
          </button>
        </div>
      </div>

      {tab === "pdf" ? (
        <div className="min-h-0 flex-1 bg-raised/40">
          {src ? (
            <iframe
              src={`${src}#toolbar=0&navpanes=0&view=FitH`}
              title="Tailored resume preview"
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-subtle">
              Preview unavailable — use Download PDF below.
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {(tailorJob.keywordsAdded?.length ?? 0) > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
                Keywords added
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tailorJob.keywordsAdded!.map((k) => (
                  <Badge key={k} variant="brand">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(tailorJob.changesSummary?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
                What changed
              </p>
              <ul className="space-y-2">
                {tailorJob.changesSummary!.map((c, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasDiffPdf && (
            <p className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3.5 py-2.5 text-xs text-muted">
              Tip: on the Resume tab, “Highlight additions” marks the
              new and rewritten lines in green directly on the PDF.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:pb-3.5">
        <Button variant="ghost" size="sm" onClick={onAdjust}>
          <ArrowLeft className="h-4 w-4" /> Adjust
        </Button>
        <Button variant="ghost" size="sm" onClick={onRestart} title="Start over">
          <RotateCcw className="h-4 w-4" />
        </Button>
        {tailorJob.pdfUrl && (
          <Button asChild variant="secondary" className="flex-1">
            <a
              href={tailorJob.pdfUrl}
              download={tailorJob.fileName}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </Button>
        )}
        {applyLink && (
          <Button asChild variant="brand" className="flex-1">
            <a href={applyLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Apply now
            </a>
          </Button>
        )}
      </div>
    </>
  );
}

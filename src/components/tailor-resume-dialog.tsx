"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { diffLines, diffStats, type DiffLine } from "@/lib/diff";

interface Requirement {
  keyword: string;
  kind: "skill" | "tool" | "qualification" | "responsibility";
  importance: "critical" | "preferred" | "nice_to_have";
  rationale: string;
  alreadyPresent: boolean;
}

interface Result {
  originalText: string;
  optimizedText: string;
  changesSummary: string[];
  keywordsAdded: string[];
  scoreBefore: number;
  scoreAfter: number;
  pdfUrl: string | null;
  fileName: string;
}

type Step = "analyzing" | "select" | "generating" | "result";

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
  const analyze = useAction(api.jobResume.analyzeJobRequirements);
  const generate = useAction(api.jobResume.generateResumeForJob);

  const [step, setStep] = useState<Step>("analyzing");
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<Result | null>(null);
  const [showDiff, setShowDiff] = useState(true);
  const [started, setStarted] = useState(false);

  const description = job.job_description_clean ?? job.job_description;

  // Kick off analysis once on mount (render-phase latch, no effect needed).
  if (!started) {
    setStarted(true);
    void (async () => {
      try {
        const res = await analyze({
          jobTitle: job.job_title,
          companyName: job.employer_name,
          jobDescription: description,
        });
        const reqs = res.requirements as Requirement[];
        setRequirements(reqs);
        // Pre-tick everything that's missing and matters.
        setSelected(
          new Set(
            reqs
              .filter((r) => !r.alreadyPresent && r.importance !== "nice_to_have")
              .map((r) => r.keyword)
          )
        );
        setStep("select");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not analyze this job");
        onClose();
      }
    })();
  }

  const runGenerate = async (mode: "quick" | "full") => {
    setStep("generating");
    try {
      const res = await generate({
        jobId: job.job_id,
        jobTitle: job.job_title,
        companyName: job.employer_name,
        jobDescription: description,
        jobUrl: job.job_apply_link,
        selectedKeywords: [...selected],
        mode,
      });
      setResult(res as Result);
      setStep("result");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
      setStep("select");
    }
  };

  const toggle = (kw: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });

  const missing = requirements.filter((r) => !r.alreadyPresent);
  const present = requirements.filter((r) => r.alreadyPresent);

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

        {/* Steps */}
        {step === "analyzing" && (
          <Centered>
            <Pulse />
            <p className="mt-5 font-medium text-fg">Reading the job posting…</p>
            <p className="mt-1 text-sm text-subtle">
              Finding what an ATS will scan for.
            </p>
          </Centered>
        )}

        {step === "select" && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <p className="text-sm text-muted">
                Pick what to weave in. We only add what your experience can
                truthfully support — nothing is invented.
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
                      {selected.size === missing.length
                        ? "Clear all"
                        : "Select all"}
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
                              on
                                ? "border-brand-500 bg-brand-500"
                                : "border-line-strong"
                            )}
                          >
                            {on && <Check className="h-3 w-3 text-white" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-fg">
                                {r.keyword}
                              </span>
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
                  <h3 className="mt-6 text-sm font-semibold text-fg">
                    Already covered
                  </h3>
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

            <div className="border-t border-line px-5 py-4">
              <p className="mb-3 text-xs font-medium text-subtle">
                {selected.size} selected · choose how much to rewrite
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <button
                  onClick={() => void runGenerate("quick")}
                  className="group rounded-xl border border-line p-3.5 text-left transition-colors hover:border-brand-500/50 hover:bg-raised/50"
                >
                  <span className="flex items-center gap-2 font-medium text-fg">
                    <Zap className="h-4 w-4 text-accent-500" /> Quick edit
                  </span>
                  <span className="mt-1 block text-xs text-subtle">
                    Keeps your wording. Slots keywords in where they fit.
                  </span>
                </button>
                <button
                  onClick={() => void runGenerate("full")}
                  className="group rounded-xl border border-brand-500/40 bg-brand-500/8 p-3.5 text-left transition-colors hover:border-brand-500/70"
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
        )}

        {step === "generating" && (
          <Centered>
            <Pulse />
            <p className="mt-5 font-medium text-fg">Writing your resume…</p>
            <p className="mt-1 text-sm text-subtle">
              Tailoring content, then fitting it to one page.
            </p>
          </Centered>
        )}

        {step === "result" && result && (
          <ResultView
            result={result}
            showDiff={showDiff}
            setShowDiff={setShowDiff}
            applyLink={job.job_apply_link}
            onBack={() => setStep("select")}
          />
        )}
      </div>
    </div>
  );
}

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

function ResultView({
  result,
  showDiff,
  setShowDiff,
  applyLink,
  onBack,
}: {
  result: Result;
  showDiff: boolean;
  setShowDiff: (v: boolean) => void;
  applyLink?: string;
  onBack: () => void;
}) {
  const lines: DiffLine[] = diffLines(result.originalText, result.optimizedText);
  const stats = diffStats(lines);
  const delta = result.scoreAfter - result.scoreBefore;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <span className="flex items-center gap-2 text-sm">
          <span className="text-subtle">ATS</span>
          <span className="font-semibold text-muted">{result.scoreBefore}%</span>
          <ArrowRight className="h-3.5 w-3.5 text-subtle" />
          <span className="font-bold text-emerald-500">{result.scoreAfter}%</span>
          {delta > 0 && (
            <Badge variant="success">+{delta}</Badge>
          )}
        </span>
        <span className="text-xs text-subtle">
          <span className="text-emerald-500">+{stats.added}</span> /{" "}
          <span className="text-red-500">−{stats.removed}</span> lines
        </span>
        <button
          onClick={() => setShowDiff(!showDiff)}
          className="ml-auto text-xs font-medium text-brand-500 hover:text-brand-400"
        >
          {showDiff ? "Show clean version" : "Show changes"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {result.keywordsAdded.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
              Keywords added
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.keywordsAdded.map((k) => (
                <Badge key={k} variant="brand">
                  {k}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-line">
          {showDiff ? (
            <div className="divide-y divide-line/50 font-mono text-xs">
              {lines.map((l, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2 px-3 py-1",
                    l.op === "added" &&
                      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                    l.op === "removed" &&
                      "bg-red-500/10 text-red-700/80 line-through dark:text-red-300/80",
                    l.op === "same" && "text-muted"
                  )}
                >
                  <span className="w-3 shrink-0 select-none opacity-60">
                    {l.op === "added" ? "+" : l.op === "removed" ? "−" : ""}
                  </span>
                  <span className="whitespace-pre-wrap break-words">
                    {l.text || " "}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap px-4 py-3 font-mono text-xs leading-relaxed text-muted">
              {result.optimizedText}
            </pre>
          )}
        </div>

        {result.changesSummary.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
              What changed
            </p>
            <ul className="space-y-1.5">
              {result.changesSummary.map((c, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {result.pdfUrl && (
          <Button asChild variant="secondary" className="flex-1">
            <a
              href={result.pdfUrl}
              download={result.fileName}
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
        {!applyLink && (
          <Button variant="brand" className="flex-1" disabled>
            <FileText className="h-4 w-4" /> No apply link
          </Button>
        )}
      </div>
    </>
  );
}

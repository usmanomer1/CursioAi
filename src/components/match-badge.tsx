import { cn } from "@/lib/utils";

export function matchTone(score: number) {
  if (score >= 90)
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (score >= 70)
    return "border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-300";
  if (score >= 50)
    return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "border-line-strong bg-raised text-muted";
}

/**
 * Renders the AI match score. A score of exactly 0 is a real signal (strongest
 * "no match") and is shown — only an absent (un-scored) value is hidden.
 */
export function MatchBadge({
  score,
  label,
  className,
}: {
  score?: number;
  label?: string;
  className?: string;
}) {
  if (score === undefined) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        matchTone(score),
        className
      )}
    >
      {label ?? `${score}%`}
    </span>
  );
}

export function MatchRing({ score }: { score?: number }) {
  if (score === undefined) return null;
  const tone =
    score >= 90
      ? "text-emerald-500"
      : score >= 70
        ? "text-brand-500"
        : score >= 50
          ? "text-amber-500"
          : "text-subtle";
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          strokeWidth="4"
          className="stroke-raised"
        />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("stroke-current transition-all", tone)}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center text-xs font-bold",
          tone
        )}
      >
        {score}
      </span>
    </div>
  );
}

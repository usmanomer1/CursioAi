import { Activity, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Match-quality tiers. The label is always derived from the score — model
 * wording varies ("Strong Match" vs "STRONG MATCH") and shouting caps read
 * poorly, so the badge owns its own vocabulary.
 */
function tierFor(score: number) {
  if (score >= 90)
    return {
      word: "Strong",
      icon: Flame,
      pill: cn(
        "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
        "bg-gradient-to-r from-emerald-500/15 to-teal-500/10",
        "shadow-[0_0_12px_-2px] shadow-emerald-500/30"
      ),
      icontone: "text-emerald-500",
      bar: "bg-emerald-500",
    };
  if (score >= 70)
    return {
      word: "Good",
      icon: TrendingUp,
      pill: cn(
        "border-brand-500/40 text-brand-700 dark:text-brand-300",
        "bg-gradient-to-r from-brand-500/15 to-accent-500/10"
      ),
      icontone: "text-brand-500",
      bar: "bg-brand-500",
    };
  if (score >= 50)
    return {
      word: "Fair",
      icon: Activity,
      pill: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      icontone: "text-amber-500",
      bar: "bg-amber-500",
    };
  return {
    word: "Weak",
    icon: TrendingDown,
    pill: "border-line-strong bg-raised text-subtle",
    icontone: "text-subtle",
    bar: "bg-line-strong",
  };
}

export function MatchBadge({
  score,
  className,
  size = "sm",
}: {
  score?: number;
  /** Ignored — kept for call-site compatibility; the label derives from score. */
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  // A score of exactly 0 is a real signal; only an absent value hides the badge.
  if (score === undefined) return null;
  const t = tierFor(score);
  const Icon = t.icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-sm",
        t.pill,
        className
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5", t.icontone)} />
      <span className="tabular-nums">{score}</span>
      <span className="font-medium opacity-80">{t.word}</span>
    </span>
  );
}

/** Larger presentation: score ring + tier word, for detail headers. */
export function MatchRing({ score }: { score?: number }) {
  if (score === undefined) return null;
  const t = tierFor(score);
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-2.5">
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
            className={cn("transition-all", t.icontone)}
            stroke="currentColor"
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums",
            t.icontone
          )}
        >
          {score}
        </span>
      </div>
      <div className="leading-tight">
        <p className={cn("text-sm font-semibold", t.icontone)}>{t.word} match</p>
        <p className="text-[11px] text-subtle">vs your resume</p>
      </div>
    </div>
  );
}

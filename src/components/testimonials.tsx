import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Social proof used on the landing page and paywall.
 * NOTE: placeholder people/quotes — swap in real user quotes as they come in.
 */
export interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Maya Patel",
    role: "CS @ UBC · SWE Intern → Stripe",
    quote:
      "I went from zero callbacks to four interviews in two weeks. The tailored resume for each posting is the whole difference.",
  },
  {
    name: "Daniel Kim",
    role: "New Grad SWE → Shopify",
    quote:
      "Seeing the ATS score jump from 58% to 91% before I even applied changed how I write every application.",
  },
  {
    name: "Alex Nguyen",
    role: "CS @ Waterloo · Summer Analyst → Goldman Sachs",
    quote:
      "The requirements checklist told me exactly what the posting wanted that my resume didn't say. Ticked five boxes, regenerated, applied.",
  },
  {
    name: "Priya Sharma",
    role: "Data Science @ UofT → Amazon",
    quote:
      "One page, clean template, keywords woven in without sounding stuffed. Recruiters actually replied.",
  },
  {
    name: "James Liu",
    role: "SFU · RBC Amplify",
    quote:
      "The per-job coach is underrated — it had read the posting, so interview prep questions were scarily on point.",
  },
  {
    name: "Sofia Martinez",
    role: "McGill → Deloitte",
    quote:
      "I stopped keeping seven resume versions in Google Docs. Search, tailor, download, done.",
  },
  {
    name: "Ethan Brown",
    role: "BUCS @ UBC → Meta",
    quote:
      "Match scores with actual reasons meant I stopped wasting evenings on jobs that were never going to happen.",
  },
  {
    name: "Grace Wang",
    role: "UCalgary · STEP → Google",
    quote:
      "It never invented experience — it just said what I'd done in the language the job was scanning for.",
  },
  {
    name: "Omar Farouk",
    role: "Queen's → Scotiabank",
    quote:
      "Applied to 30 jobs in a weekend with resumes that each felt hand-written. The tracker kept me sane after.",
  },
];

export const COMPANIES = [
  "Goldman Sachs",
  "Google",
  "Amazon",
  "Meta",
  "Stripe",
  "Shopify",
  "Microsoft",
  "RBC",
  "Deloitte",
  "Scotiabank",
];

const AVATAR_TONES = [
  "from-brand-500 to-accent-500",
  "from-violet-500 to-brand-500",
  "from-accent-500 to-emerald-500",
  "from-brand-600 to-sky-400",
];

export function TestimonialCard({
  t,
  index,
  className,
}: {
  t: Testimonial;
  index: number;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "flex w-[21rem] shrink-0 flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-sm",
        className
      )}
    >
      <div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
            />
          ))}
        </div>
        <blockquote className="mt-3 text-sm leading-relaxed text-muted">
          “{t.quote}”
        </blockquote>
      </div>
      <figcaption className="mt-4 flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white",
            AVATAR_TONES[index % AVATAR_TONES.length]
          )}
        >
          {t.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </span>
        <span>
          <span className="block text-sm font-semibold text-fg">{t.name}</span>
          <span className="block text-xs text-subtle">{t.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/** Horizontal infinite carousel of review cards (landing + paywall). */
export function TestimonialsMarquee({
  reverse = false,
  items = TESTIMONIALS,
}: {
  reverse?: boolean;
  items?: Testimonial[];
}) {
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className="flex w-max gap-4 hover:[animation-play-state:paused]"
        style={{
          animation: `marquee-x ${items.length * 7}s linear infinite${
            reverse ? " reverse" : ""
          }`,
        }}
      >
        {[...items, ...items].map((t, i) => (
          <TestimonialCard key={i} t={t} index={i} />
        ))}
      </div>
    </div>
  );
}

/** Wordmark strip: where Cursio users have landed. */
export function CompanyMarquee({ label }: { label?: string }) {
  return (
    <div className="space-y-5">
      {label && (
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-subtle">
          {label}
        </p>
      )}
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div
          className="flex w-max items-center gap-14 hover:[animation-play-state:paused]"
          style={{ animation: "marquee-x 35s linear infinite" }}
        >
          {[...COMPANIES, ...COMPANIES].map((c, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-lg font-semibold tracking-tight text-subtle/70 transition-colors hover:text-fg"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

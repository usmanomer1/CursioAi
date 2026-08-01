import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  Check,
  FileText,
  MessageSquare,
  ShieldCheck,
  Target,
  Wand2,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  CompanyMarquee,
  TestimonialsMarquee,
} from "@/components/testimonials";

const features = [
  {
    icon: Target,
    title: "Matched, not scraped",
    desc: "Every listing is scored 0–100 against your actual resume, with the reasons and the gaps spelled out.",
  },
  {
    icon: Wand2,
    title: "A resume per job",
    desc: "Pick the requirements you want addressed, then get a tailored one-page ATS resume — never invented, just sharpened.",
  },
  {
    icon: MessageSquare,
    title: "A coach that read the posting",
    desc: "Ask about fit, gaps or interview prep. It already has the job description and your resume loaded.",
  },
];

const steps = [
  { n: "01", title: "Upload your resume", desc: "We parse it once and keep it ready." },
  { n: "02", title: "Search real openings", desc: "Live roles, ranked against your experience." },
  { n: "03", title: "Tailor and apply", desc: "One-page resume per role, tracked end to end." },
];

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo id="nav" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="brand" size="sm">
              <Link href="/sign-up">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_65%)]" />
        <div
          className="pointer-events-none absolute left-1/2 top-[-14rem] h-[32rem] w-[52rem] -translate-x-1/2 rounded-full opacity-25 blur-[110px]"
          style={{
            background:
              "radial-gradient(circle at 35% 40%, var(--color-brand-500), transparent 60%), radial-gradient(circle at 70% 55%, var(--color-accent-500), transparent 62%)",
          }}
        />

        <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-20 text-center sm:pt-28">
          <h1 className="text-balance text-5xl font-bold leading-[1.06] tracking-tight text-fg sm:text-7xl">
            Stop rewriting your resume for every job.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Cursio scores live openings against your experience, then writes a
            tailored one-page resume for the ones worth chasing — and coaches
            you through the application.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="brand" size="lg" className="w-full sm:w-auto">
              <Link href="/sign-up">
                Start free <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
              <Link href="/sign-in">I have an account</Link>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-subtle">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" /> One-page ATS format
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Never invents experience
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" /> Cancel anytime
            </span>
          </div>
        </div>

        {/* Where users landed */}
        <div className="relative mx-auto max-w-4xl px-6 pb-16">
          <CompanyMarquee label="Cursio users have landed roles at" />
        </div>

        {/* Product peek */}
        <div className="relative mx-auto max-w-4xl px-6 pb-20">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 text-xs text-subtle">cursio.ai/jobs</span>
            </div>
            <div className="grid gap-px bg-line sm:grid-cols-[1.1fr_1fr]">
              <div className="space-y-2.5 bg-surface p-4">
                {[
                  { t: "Senior Frontend Engineer", c: "Linear", s: 92 },
                  { t: "Full Stack Engineer", c: "Vercel", s: 84 },
                  { t: "Product Engineer", c: "Notion", s: 67 },
                ].map((j) => (
                  <div
                    key={j.t}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{j.t}</p>
                      <p className="truncate text-xs text-subtle">{j.c}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        j.s >= 90
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : j.s >= 70
                            ? "border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {j.s}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <LogoMark className="h-4 w-4" id="peek" />
                  <span className="text-xs font-semibold text-fg">
                    Tailoring for Linear
                  </span>
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <p className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300">
                    + Led migration to TypeScript across 40+ components
                  </p>
                  <p className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300">
                    + Built design system used by 3 product teams
                  </p>
                  <p className="rounded px-2 py-1 text-subtle">
                    Shipped features for the web dashboard
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-subtle">ATS</span>
                  <span className="font-semibold text-muted">61%</span>
                  <ArrowRight className="h-3 w-3 text-subtle" />
                  <span className="font-bold text-emerald-500">89%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-4">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-line bg-surface p-6 transition-all hover:border-brand-500/40 hover:shadow-lg"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/15 to-accent-500/10 text-brand-500 ring-1 ring-brand-500/20">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-fg">{title}</h3>
              <p className="text-sm leading-relaxed text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-8 rounded-3xl border border-line bg-surface p-8 sm:grid-cols-3 sm:p-10">
          {steps.map((s) => (
            <div key={s.n}>
              <span className="font-mono text-xs font-bold text-brand-500">
                {s.n}
              </span>
              <h3 className="mt-2 font-semibold text-fg">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-fg">
            The job search, minus the grind
          </h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            From first search to signed offer — here&apos;s how it&apos;s going
            for people using Cursio.
          </p>
        </div>
        <TestimonialsMarquee />
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-brand-500/25 bg-gradient-to-br from-brand-500/10 via-surface to-accent-500/10 px-6 py-14 text-center">
          <LogoMark className="mx-auto mb-5 h-11 w-11" id="cta" />
          <h2 className="text-3xl font-bold tracking-tight text-fg">
            Your next role is worth a tailored resume
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Set it up in under two minutes.
          </p>
          <Button asChild variant="brand" size="lg" className="mt-7">
            <Link href="/sign-up">
              Get started <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-subtle sm:flex-row">
          <Logo size="sm" id="footer" />
          <div className="flex gap-5">
            <Link href="/sign-in" className="hover:text-fg">Sign in</Link>
            <Link href="/sign-up" className="hover:text-fg">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight } from "lucide-react";
import {
  ChatsCircle,
  Crosshair,
  FileArrowUp,
  MagicWand,
  MagnifyingGlass,
  PaperPlaneTilt,
} from "@phosphor-icons/react/dist/ssr";
import { Logo, LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  CompanyMarquee,
  TestimonialsMarquee,
} from "@/components/testimonials";

const GETS = [
  {
    icon: Crosshair,
    title: "Know which jobs are worth it",
    desc: "Every opening scored against your real experience, so you stop burning nights on roles that were never going to call.",
  },
  {
    icon: MagicWand,
    title: "A resume built for that one job",
    desc: "Written from your actual history, in the language that posting is scanning for. Nothing invented, ever.",
  },
  {
    icon: ChatsCircle,
    title: "Someone in your corner",
    desc: "A coach that already read the job description. Ask it what to say, what to fix, what they'll ask you.",
  },
];

const STEPS = [
  {
    icon: FileArrowUp,
    n: "01",
    title: "Drop in your resume",
    desc: "Once. We read it and remember it.",
  },
  {
    icon: MagnifyingGlass,
    n: "02",
    title: "See what actually fits",
    desc: "Live openings, ranked against you.",
  },
  {
    icon: PaperPlaneTilt,
    n: "03",
    title: "Send the right version",
    desc: "One page, built for that role, in a minute.",
  },
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

      {/* ── Hero: dark cinematic band ─────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-[#05070f]">
        <Image
          src="/landing/hero-ambient.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="pointer-events-none absolute inset-0 -z-10 object-cover opacity-45"
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#05070f]/70 via-[#05070f]/60 to-[#05070f]" />

        <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-24 text-center sm:pt-32">
          <h1 className="text-balance text-5xl font-bold leading-[1.04] tracking-tight text-white sm:text-7xl">
            Stop applying.
            <br />
            Start interviewing.
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-white/70">
            Employers screen applications with software before a recruiter opens
            one. Cursio builds you a resume for the specific job you want, so
            you get past the filter and into the room.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="brand" size="lg" className="w-full sm:w-auto">
              <Link href="/sign-up">
                Get started <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="w-full border border-white/20 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 sm:w-auto"
            >
              <Link href="/sign-in">I have an account</Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-white/55">
            Built for the 800+ job seekers already using Cursio
          </p>
        </div>
      </section>

      {/* Where users landed */}
      <section className="border-b border-line py-14">
        <div className="mx-auto max-w-4xl px-6">
          <CompanyMarquee label="Cursio users have landed roles at" />
        </div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-[#05070f]">
        <Image
          src="/landing/the-void.jpg"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none absolute inset-0 -z-10 object-cover opacity-60"
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#05070f] via-[#05070f]/85 to-[#05070f]/40" />

        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
              Sound familiar
            </p>
            <h2 className="mt-3 text-balance text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Two hundred applications. Four replies.
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-white/70">
              <p>
                It was never that you weren&apos;t good enough. A keyword filter
                decided you weren&apos;t a match before a single person read a
                word you wrote.
              </p>
              <p>
                So you spent your evenings rewriting the same resume twelve
                different ways, guessing at what each company wanted to hear,
                and sending it into the dark.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The outcome ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
              What changes
            </p>
            <h2 className="mt-3 text-balance text-4xl font-bold leading-tight tracking-tight text-fg sm:text-5xl">
              Then one morning, it&apos;s a different email.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted">
              The version of you on paper finally matches the one who shows up
              in the room. Same experience, same person — just finally legible
              to the system standing between you and the interview.
            </p>
            <div className="mt-8 space-y-3">
              {[
                "Your resume reaches a human being",
                "You interview for jobs you actually want",
                "You stop rewriting and start preparing",
              ].map((line) => (
                <p key={line} className="flex items-center gap-3 text-fg">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {line}
                </p>
              ))}
            </div>
            <Button asChild variant="brand" size="lg" className="mt-9">
              <Link href="/sign-up">
                Get started <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-line shadow-2xl">
            <Image
              src="/landing/the-offer.jpg"
              alt="Walking into a new office on the first morning"
              width={1024}
              height={576}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Proof: the product itself ─────────────────────────────────── */}
      <section className="border-y border-line bg-surface/50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
              Here&apos;s what that looks like
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted">
              Real openings, scored against your resume. Pick one, and a
              tailored version is ready before you finish your coffee.
            </p>
          </div>

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

          {/* What you get — deliberately compact, not the pitch */}
          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {GETS.map(({ icon: Icon, title, desc }) => (
              <div key={title}>
                <Icon weight="duotone" className="h-8 w-8 text-brand-500" />
                <h3 className="mb-1.5 mt-3 font-semibold text-fg">{title}</h3>
                <p className="text-sm leading-relaxed text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Steps ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-fg">
            Set up in two minutes
          </h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, n, title, desc }) => (
            <div
              key={n}
              className="rounded-2xl border border-line bg-surface p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/15 to-accent-500/10 ring-1 ring-brand-500/20">
                  <Icon weight="duotone" className="h-5 w-5 text-brand-500" />
                </span>
                <span className="font-mono text-xs font-bold text-subtle">{n}</span>
              </div>
              <h3 className="mt-4 font-semibold text-fg">{title}</h3>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Reviews ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
            Results
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            The job search, minus the grind
          </h2>
        </div>
        <TestimonialsMarquee />
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-[#05070f]">
        <Image
          src="/landing/cta-glow.jpg"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none absolute inset-0 -z-10 object-cover opacity-70"
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#05070f]/80 via-transparent to-[#05070f]/90" />

        <div className="mx-auto max-w-2xl px-6 py-28 text-center">
          <LogoMark className="mx-auto mb-6 h-12 w-12" id="cta" />
          <h2 className="text-balance text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            The job you want is already posted.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-white/70">
            Go be the candidate they can&apos;t filter out.
          </p>
          <Button asChild variant="brand" size="lg" className="mt-9">
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

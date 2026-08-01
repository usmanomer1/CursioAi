import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  Briefcase,
  FileText,
  MessageSquare,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Target,
    title: "Smart job matching",
    desc: "Live roles pulled in and scored against your resume in real time — ranked, with reasons.",
  },
  {
    icon: FileText,
    title: "Resume optimizer",
    desc: "Analyze fit on a 100-point ATS rubric, then generate a tailored, ATS-clean PDF in one pass.",
  },
  {
    icon: MessageSquare,
    title: "Per-job AI coach",
    desc: "Chat about any role with your resume and the full job context already loaded. Prep, fit, gaps.",
  },
];

const steps = [
  {
    n: "1",
    title: "Upload your resume",
    desc: "We extract the text and keep it ready for matching.",
  },
  {
    n: "2",
    title: "Search & match",
    desc: "Find live jobs scored against your experience.",
  },
  {
    n: "3",
    title: "Tailor & apply",
    desc: "Optimize your resume per role and track every application.",
  },
];

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="brand" size="sm">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-16 text-center sm:pt-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm text-muted">
            <Sparkles className="h-4 w-4 text-brand-500" />
            AI job search, resume tailoring & coaching
          </div>
          <h1 className="text-balance text-5xl font-bold tracking-tight text-fg sm:text-6xl">
            Find jobs that actually{" "}
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent dark:from-brand-400 dark:to-brand-600">
              match your resume
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
            Stop guessing. Jobotic scores every role against your experience,
            tailors your resume for the ones worth chasing, and coaches you
            through each application.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Button asChild variant="brand" size="lg">
              <Link href="/sign-up">
                Start free <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/sign-in">I have an account</Link>
            </Button>
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-subtle">
            <Zap className="h-3.5 w-3.5 text-emerald-500" /> Cancel anytime
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-6 pb-8 md:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-line-strong"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mb-2 font-semibold text-fg">{title}</h3>
            <p className="text-sm leading-relaxed text-muted">{desc}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-6 rounded-3xl border border-line bg-surface p-8 sm:grid-cols-3 sm:p-10">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-brand-500/40 bg-brand-500/10 text-sm font-bold text-brand-600 dark:text-brand-300">
                {s.n}
              </div>
              <h3 className="font-semibold text-fg">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-line px-6 py-8 text-sm text-subtle sm:flex-row">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" /> Jobotic — AI job search platform
        </div>
        <div className="flex gap-5">
          <Link href="/sign-in" className="hover:text-fg">
            Sign in
          </Link>
          <Link href="/sign-up" className="hover:text-fg">
            Get started
          </Link>
        </div>
      </footer>
    </div>
  );
}

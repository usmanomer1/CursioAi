"use client";

import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const POINTS = [
  "Live jobs scored against your resume",
  "A tailored one-page resume per role",
  "An AI coach that read the job posting",
];

/**
 * Shared frame for sign-in / sign-up: brand story on the left (lg+),
 * the Clerk widget on the right.
 */
export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden border-r border-line bg-surface p-10 lg:flex">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_30%_20%,black,transparent_70%)]" />
        <div
          className="pointer-events-none absolute -left-24 top-10 h-[26rem] w-[26rem] rounded-full opacity-30 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, var(--color-brand-500), transparent 62%)",
          }}
        />

        <Link href="/" className="relative">
          <Logo id="auth" />
        </Link>

        <div className="relative">
          <h2 className="max-w-sm text-3xl font-bold leading-tight tracking-tight text-fg">
            Stop rewriting your resume for every job.
          </h2>
          <ul className="mt-7 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-muted">
                <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-brand-500/15 ring-1 ring-brand-500/25">
                  <Check className="h-3 w-3 text-brand-500" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-subtle">
          © {new Date().getFullYear()} Cursio
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="absolute right-5 top-5 flex items-center gap-2">
          <ThemeToggle />
        </div>
        <Link
          href="/"
          className="absolute left-5 top-5 flex items-center gap-1.5 text-sm text-subtle transition-colors hover:text-fg lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="w-full max-w-[26rem]">
          <div className="mb-7 text-center lg:text-left">
            <LogoMark className="mx-auto mb-4 h-10 w-10 lg:hidden" id="auth-sm" />
            <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
            <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          </div>
          <div className="flex justify-center lg:justify-start">{children}</div>
        </div>
      </div>
    </div>
  );
}

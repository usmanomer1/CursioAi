"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Briefcase,
  Bookmark,
  CheckCircle2,
  Circle,
  FileText,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card hover className="group p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted">{label}</span>
          <Icon className="h-4 w-4 text-subtle transition-colors group-hover:text-brand-500" />
        </div>
        <p className="text-3xl font-bold text-fg">{value}</p>
      </Card>
    </Link>
  );
}

const sessionTone: Record<string, "success" | "danger" | "warning"> = {
  completed: "success",
  error: "danger",
};

export default function DashboardPage() {
  const me = useQuery(api.users.getMe);
  const appStats = useQuery(api.applications.getStats);
  const likedJobs = useQuery(api.jobs.getLikedJobs);
  const sessions = useQuery(api.jobs.getRecentSessions);

  const loading = me === undefined;
  const firstName = me?.user?.name?.split(" ")[0];

  const hasResume = !!me?.primaryResume;
  const hasProfile = !!me?.profile?.headline;
  const hasSearched = (sessions?.length ?? 0) > 0;
  const onboardingDone = hasResume && hasProfile && hasSearched;

  const checklist = [
    {
      done: hasResume,
      title: "Upload your resume",
      desc: "Enables AI matching and tailoring.",
      href: "/resume",
    },
    {
      done: hasProfile,
      title: "Complete your profile",
      desc: "Add a headline and location.",
      href: "/profile",
    },
    {
      done: hasSearched,
      title: "Run your first search",
      desc: "Find jobs matched to your resume.",
      href: "/jobs",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl p-5 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted">Your AI-powered job search command center</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          {!onboardingDone && (
            <Card className="mb-8 overflow-hidden">
              <div className="border-b border-line bg-gradient-to-r from-brand-500/10 to-transparent px-6 py-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-500" />
                  <h2 className="font-semibold text-fg">Get set up</h2>
                  <Badge variant="brand" className="ml-auto">
                    {checklist.filter((c) => c.done).length}/{checklist.length}
                  </Badge>
                </div>
              </div>
              <div className="divide-y divide-line">
                {checklist.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-raised/60"
                  >
                    {item.done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-subtle" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          item.done ? "text-subtle line-through" : "text-fg"
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="text-xs text-subtle">{item.desc}</p>
                    </div>
                    {!item.done && (
                      <ArrowRight className="h-4 w-4 shrink-0 text-subtle" />
                    )}
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Applications"
              value={appStats?.total ?? 0}
              icon={Briefcase}
              href="/applications"
            />
            <StatCard
              label="Saved Jobs"
              value={likedJobs?.length ?? 0}
              icon={Bookmark}
              href="/saved"
            />
            <StatCard
              label="Searches"
              value={sessions?.length ?? 0}
              icon={TrendingUp}
              href="/jobs"
            />
            <StatCard
              label="Resume"
              value={hasResume ? "Ready" : "Upload"}
              icon={FileText}
              href="/resume"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <h2 className="font-semibold text-fg">Recent searches</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/jobs">
                    New search <Search className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="p-3">
                {sessions && sessions.length > 0 ? (
                  <div className="space-y-1">
                    {sessions.slice(0, 6).map((session) => (
                      <div
                        key={session._id}
                        className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-raised/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">
                            {session.query}
                          </p>
                          <p className="text-sm text-subtle">
                            {session.location || "Any location"} ·{" "}
                            {session.totalFound} jobs
                          </p>
                        </div>
                        <Badge variant={sessionTone[session.status] ?? "warning"}>
                          {session.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-10 text-center">
                    <p className="text-sm text-subtle">No searches yet.</p>
                    <Button asChild variant="brand" size="sm" className="mt-3">
                      <Link href="/jobs">Search jobs</Link>
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 font-semibold text-fg">Quick actions</h2>
              <div className="space-y-2.5">
                <Button asChild variant="secondary" className="w-full justify-start">
                  <Link href="/jobs">
                    <Search className="h-4 w-4 text-brand-500" /> Search jobs
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="w-full justify-start">
                  <Link href="/resume">
                    <FileText className="h-4 w-4 text-brand-500" /> Optimize resume
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="w-full justify-start">
                  <Link href="/saved">
                    <Bookmark className="h-4 w-4 text-brand-500" /> Saved jobs
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="w-full justify-start">
                  <Link href="/applications">
                    <Briefcase className="h-4 w-4 text-brand-500" /> Track
                    applications
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

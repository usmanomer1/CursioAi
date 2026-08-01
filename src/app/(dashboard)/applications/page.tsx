"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { Briefcase, Plus, Trash2, ExternalLink, X, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/input";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type Status =
  | "saved"
  | "applied"
  | "interviewing"
  | "offered"
  | "rejected"
  | "withdrawn";

const STATUSES: Status[] = [
  "saved",
  "applied",
  "interviewing",
  "offered",
  "rejected",
  "withdrawn",
];

const statusVariant: Record<Status, BadgeProps["variant"]> = {
  saved: "neutral",
  applied: "info",
  interviewing: "warning",
  offered: "success",
  rejected: "danger",
  withdrawn: "neutral",
};

export default function ApplicationsPage() {
  const applications = useQuery(api.applications.list);
  const stats = useQuery(api.applications.getStats);
  const create = useMutation(api.applications.create);
  const updateStatus = useMutation(api.applications.updateStatus);
  const remove = useMutation(api.applications.remove);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    jobTitle: "",
    companyName: "",
    jobUrl: "",
    status: "applied" as Status,
  });

  const loading = applications === undefined;

  const handleCreate = async () => {
    if (!form.jobTitle.trim() || !form.companyName.trim()) {
      toast.error("Job title and company are required");
      return;
    }
    try {
      await create({
        jobId: `manual_${Date.now()}`,
        jobTitle: form.jobTitle.trim(),
        companyName: form.companyName.trim(),
        jobUrl: form.jobUrl.trim() || undefined,
        status: form.status,
      });
      toast.success("Application added");
      setForm({ jobTitle: "", companyName: "", jobUrl: "", status: "applied" });
      setAdding(false);
    } catch {
      toast.error("Failed to add application");
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-5 sm:p-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">Applications</h1>
          <p className="text-muted">Track every role from saved to offer.</p>
        </div>
        <Button variant="brand" size="sm" onClick={() => setAdding((a) => !a)}>
          {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {adding ? "Cancel" : "Add"}
        </Button>
      </div>

      {/* Status summary */}
      {!loading && (stats?.total ?? 0) > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge variant="brand">{stats?.total} total</Badge>
          {STATUSES.map((s) =>
            stats?.byStatus[s] ? (
              <Badge key={s} variant={statusVariant[s]} className="capitalize">
                {stats.byStatus[s]} {s}
              </Badge>
            ) : null
          )}
        </div>
      )}

      {adding && (
        <Card className="mb-6 p-5 [animation:var(--animate-slide-up)]">
          <h2 className="mb-4 font-semibold text-fg">New application</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Job title</Label>
              <Input
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                placeholder="Senior Frontend Engineer"
              />
            </div>
            <div>
              <Label>Company</Label>
              <Input
                value={form.companyName}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value })
                }
                placeholder="Acme Inc."
              />
            </div>
            <div>
              <Label>Job URL (optional)</Label>
              <Input
                value={form.jobUrl}
                onChange={(e) => setForm({ ...form, jobUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as Status })
                }
                className="capitalize"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="brand" onClick={() => void handleCreate()}>
              Add application
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !applications.length ? (
        <EmptyState
          icon={Briefcase}
          title="No applications yet"
          description="Add one manually, or hit Apply on a job in search to track it automatically."
          action={
            <Button asChild variant="brand">
              <Link href="/jobs">
                <Search className="h-4 w-4" /> Find jobs
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {applications.map((app) => (
            <Card
              key={app._id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{app.jobTitle}</p>
                <p className="truncate text-sm text-muted">
                  {app.companyName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={app.status}
                  onChange={(e) =>
                    void updateStatus({
                      applicationId: app._id as Id<"applications">,
                      status: e.target.value as Status,
                    }).then(() => toast.success("Status updated"))
                  }
                  className="h-9 w-auto capitalize"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s}
                    </option>
                  ))}
                </Select>
                {app.jobUrl && (
                  <a
                    href={app.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-muted hover:bg-raised hover:text-fg"
                    aria-label="Open job posting"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() =>
                    void remove({
                      applicationId: app._id as Id<"applications">,
                    }).then(() => toast.success("Removed"))
                  }
                  className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-400"
                  aria-label="Delete application"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

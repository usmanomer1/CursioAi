"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Bell, CheckCheck, FileCheck2, ListChecks, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const kindIcon = {
  tailor_ready_for_review: ListChecks,
  tailor_done: FileCheck2,
  tailor_error: TriangleAlert,
} as const;

const kindTone = {
  tailor_ready_for_review: "text-brand-500 bg-brand-500/10",
  tailor_done: "text-emerald-500 bg-emerald-500/10",
  tailor_error: "text-red-500 bg-red-500/10",
} as const;

// The bell is mounted twice (desktop sidebar + mobile top bar), so the toast
// baseline/dedupe must be shared across instances — module scope, not a ref.
let lastToastedId: string | null | undefined = undefined;

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NotificationsBell({ direction = "down" }: { direction?: "up" | "down" }) {
  const router = useRouter();
  const notifications = useQuery(api.notifications.list);
  const unread = useQuery(api.notifications.unreadCount) ?? 0;
  const markAllRead = useMutation(api.notifications.markAllRead);
  const markRead = useMutation(api.notifications.markRead);

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Live toast for notifications that arrive while the app is open. toast()
  // is an external system, so an effect is the right tool (no setState).
  useEffect(() => {
    if (!notifications) return;
    const newest = notifications[0];
    if (lastToastedId === undefined) {
      lastToastedId = newest?._id ?? null; // baseline on first load
      return;
    }
    if (newest && newest._id !== lastToastedId) {
      lastToastedId = newest._id;
      if (!newest.read) {
        const show =
          newest.kind === "tailor_error" ? toast.error : toast.success;
        show(newest.title, {
          description: newest.body,
          action: newest.jobId
            ? {
                label: "Open",
                onClick: () => router.push(`/jobs?tailor=${encodeURIComponent(newest.jobId!)}`),
              }
            : undefined,
        });
      }
    }
  }, [notifications, router]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const openItem = async (n: {
    _id: Id<"notifications">;
    jobId?: string;
    read: boolean;
  }) => {
    if (!n.read) void markRead({ notificationId: n._id });
    setOpen(false);
    if (n.jobId) router.push(`/jobs?tailor=${encodeURIComponent(n.jobId)}`);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "z-[60] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl [animation:var(--animate-fade-in)]",
            // "up" = sidebar footer: the bell sits at the bottom-left of the
            // viewport, so anchoring to the bell pushes the panel off-screen.
            // Pin it to the viewport corner instead, floating over content.
            // "down" on phones has the same problem in mirror image (bell near
            // the right edge, panel wider than the space left of it), so pin
            // to the viewport below the top bar until sm.
            direction === "up"
              ? "fixed bottom-20 left-4"
              : "fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-11"
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            {unread > 0 && (
              <button
                onClick={() => void markAllRead({})}
                className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-400"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!notifications?.length ? (
              <p className="px-4 py-8 text-center text-sm text-subtle">
                Nothing yet. Tailoring updates land here.
              </p>
            ) : (
              notifications.map((n) => {
                const Icon = kindIcon[n.kind];
                return (
                  <button
                    key={n._id}
                    onClick={() => void openItem(n)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-raised/60",
                      !n.read && "bg-brand-500/[0.04]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        kindTone[n.kind]
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            n.read ? "text-muted" : "font-medium text-fg"
                          )}
                        >
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                        )}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-subtle">
                        {n.body}
                      </span>
                      <span className="mt-1 block text-[11px] text-subtle/80">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

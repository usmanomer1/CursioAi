"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Bookmark,
  Briefcase,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  Search,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications-bell";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Job Search", icon: Search },
  { href: "/saved", label: "Saved Jobs", icon: Bookmark },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-raised text-fg"
                : "text-muted hover:bg-raised/60 hover:text-fg"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active ? "text-brand-500" : "text-subtle group-hover:text-muted"
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserCard() {
  const { user } = useUser();
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
      <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">
          {user?.fullName ?? "Your account"}
        </p>
        <p className="truncate text-xs text-subtle">
          {user?.primaryEmailAddress?.emailAddress}
        </p>
      </div>
      <NotificationsBell direction="up" />
      <ThemeToggle className="shrink-0" />
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-canvas p-4 md:flex">
        <Link href="/dashboard" className="mb-8 block px-2">
          <Logo />
          <p className="mt-1 pl-8 text-xs text-subtle">AI job search platform</p>
        </Link>
        <NavLinks />
        <UserCard />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur-md md:hidden">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-1.5">
          <NotificationsBell />
          <ThemeToggle />
          <UserButton />
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-muted hover:bg-raised"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-canvas p-4 [animation:var(--animate-slide-in-right)]">
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-muted hover:bg-raised"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <UserCard />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { UserSync } from "@/components/user-sync";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <DashboardShell>
      <UserSync />
      <SubscriptionGuard>{children}</SubscriptionGuard>
    </DashboardShell>
  );
}

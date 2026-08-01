import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-subtle", className)} />;
}

export function CenteredSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-[40vh] items-center justify-center", className)}>
      <Spinner className="h-8 w-8" />
    </div>
  );
}

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-600/30">
        <Sparkles className="h-4 w-4 text-white" />
      </span>
      {showText && (
        <span className="text-lg font-bold tracking-tight text-fg">
          Cursio
        </span>
      )}
    </span>
  );
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "border-line bg-raised text-muted",
        brand: "border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-300",
        success:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        info: "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400",
        warning:
          "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        danger: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

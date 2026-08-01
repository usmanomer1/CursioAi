"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function AppToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster theme={resolved} position="top-right" richColors closeButton />
  );
}

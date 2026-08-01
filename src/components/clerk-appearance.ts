"use client";

import { useTheme } from "@/components/theme-provider";

/**
 * Clerk appearance that follows the app's light/dark theme.
 * Used by <SignIn>, <SignUp> and <PricingTable>.
 */
export function useClerkAppearance() {
  const { resolved } = useTheme();
  const dark = resolved === "dark";

  return {
    variables: {
      colorPrimary: "#6366f1",
      colorBackground: dark ? "#131316" : "#ffffff",
      colorInputBackground: dark ? "#202024" : "#ffffff",
      colorText: dark ? "#fafafa" : "#18181b",
      colorTextSecondary: dark ? "#a1a1aa" : "#52525b",
      colorInputText: dark ? "#fafafa" : "#18181b",
      borderRadius: "0.625rem",
    },
    elements: {
      card: dark
        ? "bg-[#131316] border border-[#27272a] shadow-2xl"
        : "bg-white border border-[#e4e4e7] shadow-xl",
      headerSubtitle: dark ? "text-[#a1a1aa]" : "text-[#52525b]",
      socialButtonsBlockButton: dark
        ? "border-[#3f3f46]"
        : "border-[#d4d4d8]",
      footerActionLink: "text-brand-500 hover:text-brand-400",
    },
  };
}

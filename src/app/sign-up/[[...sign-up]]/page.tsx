"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useClerkAppearance } from "@/components/clerk-appearance";

export default function SignUpPage() {
  const appearance = useClerkAppearance();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <Link href="/">
        <Logo />
      </Link>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={appearance}
      />
    </div>
  );
}

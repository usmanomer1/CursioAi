"use client";

import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";
import { useClerkAppearance } from "@/components/clerk-appearance";

export default function SignInPage() {
  const appearance = useClerkAppearance();

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up your job search where you left off."
    >
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        appearance={appearance}
      />
    </AuthShell>
  );
}

"use client";

import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";
import { useClerkAppearance } from "@/components/clerk-appearance";

export default function SignUpPage() {
  const appearance = useClerkAppearance();

  return (
    <AuthShell
      title="Create your account"
      subtitle="Upload a resume and start matching in under two minutes."
    >
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={appearance}
      />
    </AuthShell>
  );
}

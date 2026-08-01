"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AtSign, Globe, Link2, Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileFormValues {
  headline: string;
  location: string;
  phone: string;
  bio: string;
  linkedinUrl: string;
  githubUrl: string;
  websiteUrl: string;
}

function ProfileForm({
  email,
  initial,
  needsOnboarding,
}: {
  email: string;
  initial: ProfileFormValues;
  needsOnboarding: boolean;
}) {
  const upsertProfile = useMutation(api.users.upsertProfile);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const [form, setForm] = useState<ProfileFormValues>(initial);
  const [saving, setSaving] = useState(false);

  const set =
    (k: keyof ProfileFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertProfile(form);
      if (needsOnboarding) await completeOnboarding({});
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="mb-6 p-6">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Mail className="h-4 w-4" />
          {email || "—"}
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <div>
          <Label>Headline</Label>
          <Input
            value={form.headline}
            onChange={set("headline")}
            placeholder="Software Engineer · Open to opportunities"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={set("location")}
              placeholder="San Francisco, CA"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={set("phone")}
              placeholder="+1 555 000 1234"
            />
          </div>
        </div>
        <div>
          <Label>Bio</Label>
          <Textarea
            value={form.bio}
            onChange={set("bio")}
            rows={4}
            placeholder="A short summary of your experience and goals…"
          />
        </div>

        <div className="border-t border-line pt-4">
          <p className="mb-3 text-sm font-medium text-muted">Links</p>
          <div className="space-y-3">
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input
                value={form.linkedinUrl}
                onChange={set("linkedinUrl")}
                placeholder="linkedin.com/in/you"
                className="pl-10"
              />
            </div>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input
                value={form.githubUrl}
                onChange={set("githubUrl")}
                placeholder="github.com/you"
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <Input
                value={form.websiteUrl}
                onChange={set("websiteUrl")}
                placeholder="yoursite.com"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="brand" loading={saving} onClick={() => void handleSave()}>
            Save profile
          </Button>
        </div>
      </Card>
    </>
  );
}

export default function ProfilePage() {
  const me = useQuery(api.users.getMe);

  return (
    <div className="mx-auto max-w-2xl p-5 sm:p-8">
      <h1 className="mb-1.5 text-2xl font-bold text-fg">Profile</h1>
      <p className="mb-8 text-muted">Manage your account and details.</p>

      {me === undefined ? (
        <div className="space-y-4">
          <Skeleton className="h-14" />
          <Skeleton className="h-80" />
        </div>
      ) : (
        <ProfileForm
          // Re-initialize the form when the underlying profile identity changes.
          key={me.profile?._id ?? "new"}
          email={me.user?.email ?? ""}
          needsOnboarding={!me.user?.onboardingComplete}
          initial={{
            headline: me.profile?.headline ?? "",
            location: me.profile?.location ?? "",
            phone: me.profile?.phone ?? "",
            bio: me.profile?.bio ?? "",
            linkedinUrl: me.profile?.linkedinUrl ?? "",
            githubUrl: me.profile?.githubUrl ?? "",
            websiteUrl: me.profile?.websiteUrl ?? "",
          }}
        />
      )}
    </div>
  );
}

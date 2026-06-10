import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import OnboardingForm from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const user = await requireUser();

  // Already has a workspace? Skip onboarding.
  const membership = await db.membership.findFirst({
    where: { userId: user.id },
  });
  if (membership) redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <OnboardingForm />
    </main>
  );
}

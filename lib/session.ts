import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./db";

export type SessionUser = { id: string; email: string; name?: string | null };

/** Returns the logged-in user or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) redirect("/login");
  return user;
}

/**
 * Returns the user's primary workspace (first membership). Redirects to
 * /onboarding when the user has no workspace yet.
 */
export async function requireWorkspace() {
  const user = await requireUser();
  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: { workspace: { include: { brands: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) redirect("/onboarding");
  return { user, membership, workspace: membership.workspace };
}

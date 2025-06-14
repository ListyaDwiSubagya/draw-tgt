import { clerkClient } from "@clerk/clerk-sdk-node";
import { prisma } from "@/lib/db";

export async function ensureUserExists(clerkId: string) {
  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  const clerkUser = await clerkClient.users.getUser(clerkId);
  return await prisma.user.create({
    data: {
      clerkId,
      email: clerkUser.emailAddresses[0].emailAddress,
    },
  });
}

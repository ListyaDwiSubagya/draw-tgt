import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

interface Params {
  params: { orgId: string };
}

export async function POST(req: Request, { params }: Params) {
  const { userId } = await auth();
  const { inviteeClerkId, role = "MEMBER" } = await req.json();
  const { orgId } = params;

  if (!userId || !inviteeClerkId || !orgId) {
    return new NextResponse("Missing parameters", { status: 400 });
  }

  const owner = await prisma.user.findUnique({ where: { clerkId: userId } });
  const invitee = await prisma.user.findUnique({ where: { clerkId: inviteeClerkId } });

  if (!owner || !invitee) return new NextResponse("User(s) not found", { status: 404 });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org || org.ownerId !== owner.id) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  const invited = await prisma.organizationMember.create({
    data: {
      organizationId: orgId,
      userId: invitee.id,
      role,
    },
  });

  return NextResponse.json(invited);
}

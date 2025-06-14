// app/api/organization/[orgId]/invite/route.ts
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

interface Params {
  params: { orgId: string };
}

export async function POST(req: Request, { params }: Params) {
  const { userId } = auth();
  const { orgId } = params;
  const { inviteeId, role = "MEMBER" } = await req.json();

  if (!userId || !inviteeId || !orgId) {
    return new NextResponse("Missing parameters", { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { members: true },
  });

  if (!org || org.ownerId !== userId) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  const invited = await prisma.organizationMember.create({
    data: {
      organizationId: orgId,
      userId: inviteeId,
      role,
    },
  });

  return NextResponse.json(invited);
}

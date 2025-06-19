import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const resolvedParams = await params;
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!email)
    return NextResponse.json({ message: "Email is required" }, { status: 400 });

  const invitedUser = await prisma.user.findUnique({ where: { email } });
  if (!invitedUser)
    return NextResponse.json({ message: "User not found" }, { status: 404 });

  const org = await prisma.organization.findUnique({
    where: { id: resolvedParams.orgId },
  });
  if (!org)
    return NextResponse.json(
      { message: "No organization found" },
      { status: 404 }
    );

  const isAlreadyMember = await prisma.organizationMember.findFirst({
    where: {
      userId: invitedUser.id,
      organizationId: org.id,
    },
  });
  if (isAlreadyMember)
    return NextResponse.json(
      { message: "User already in organization" },
      { status: 400 }
    );

  await prisma.organizationMember.create({
    data: {
      userId: invitedUser.id,
      organizationId: org.id,
      role: "MEMBER",
    },
  });

  return NextResponse.json({ message: "User invited" });
}

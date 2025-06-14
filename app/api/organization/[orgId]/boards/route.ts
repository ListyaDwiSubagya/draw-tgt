import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

interface Params {
  params: { orgId: string };
}

export async function POST(req: Request, { params }: Params) {
  const { userId } = await auth();
  const { title, imageUrl } = await req.json();
  const { orgId } = params;

  if (!userId || !title || !orgId) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  const isMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId,
    },
  });

  if (!isMember) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  const board = await prisma.board.create({
    data: {
      title,
      imageUrl,
      organizationId: orgId,
      createdBy: userId,
    },
  });

  return NextResponse.json(board);
}

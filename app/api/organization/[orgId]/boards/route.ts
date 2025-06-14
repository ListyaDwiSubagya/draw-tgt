import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

interface Params {
  params: { orgId: string };
}

export async function POST(req: Request, { params }: Params) {
  const { userId } = await auth();
  const { orgId } = params;
  const { title, imageUrl } = await req.json();

  if (!userId || !title || !orgId) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const board = await prisma.board.create({
    data: {
      title,
      imageUrl,
      organizationId: orgId,
      createdById: user.id,
      users: {
        connect: { id: user.id },
      },
    },
  });

  return NextResponse.json(board);
}

import { auth } from "@clerk/nextjs/server";
import { ensureUserExists } from "@/lib/ensure-user";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { orgId: string } }) {
  const { userId } = await auth();
  const { orgId } = params;
  const { title, imageUrl } = await req.json();

  if (!userId || !title || !orgId) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  const user = await ensureUserExists(userId); 

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

export async function GET(req: Request, { params }: { params: { orgId: string } }) {
  const { userId } = await auth();
  const { orgId } = params;

  if (!userId || !orgId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const boards = await prisma.board.findMany({
    where: {
      organizationId: orgId,
    }
  });

  return NextResponse.json(boards);
}
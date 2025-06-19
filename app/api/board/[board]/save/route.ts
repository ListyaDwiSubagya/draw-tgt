import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ board: string }> }
) {
  const resolvedParams = await params;
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const board = await prisma.board.findUnique({
    where: { id: resolvedParams.board },
    select: { drawingData: true },
  });

  return NextResponse.json({ drawing: board?.drawingData || null });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ board: string }> }
) {
  const resolvedParams = await params;
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const { drawing } = body;

  if (!drawing)
    return new NextResponse("Missing drawing data", { status: 400 });

  await prisma.board.update({
    where: { id: resolvedParams.board },
    data: { drawingData: drawing },
  });

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// API endpoint (/api/board/[board]/save)
export async function POST(
  req: Request,
  { params }: { params: { board: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const { drawing, vectorElements } = body;

  await prisma.board.update({
    where: { id: params.board },
    data: {
      drawingData: drawing,
      vectorShapes: vectorElements, // Data struktur asli
    },
  });

  return NextResponse.json({ success: true });
}

export async function GET(
  req: Request,
  { params }: { params: { board: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const board = await prisma.board.findUnique({
    where: { id: params.board },
    select: { 
      drawingData: true, 
      vectorShapes: true 
    },
  });

  return NextResponse.json({
    drawing: board?.drawingData || null,
    vectorShapes: board?.vectorShapes || [],
  });
}
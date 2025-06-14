// app/api/favorites/route.ts
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = auth();
  const { boardId } = await req.json();

  if (!userId || !boardId) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  const exists = await prisma.favoriteBoard.findFirst({
    where: {
      userId,
      boardId,
    },
  });

  if (exists) {
    // Unfavorite
    await prisma.favoriteBoard.delete({
      where: { id: exists.id },
    });
    return NextResponse.json({ status: "unfavorited" });
  } else {
    await prisma.favoriteBoard.create({
      data: {
        userId,
        boardId,
      },
    });
    return NextResponse.json({ status: "favorited" });
  }
}

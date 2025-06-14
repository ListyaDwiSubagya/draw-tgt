import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  const { boardId } = await req.json();

  if (!userId || !boardId) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const exists = await prisma.favorite.findFirst({
    where: { userId: user.id, boardId },
  });

  if (exists) {
    await prisma.favorite.delete({ where: { id: exists.id } });
    return NextResponse.json({ status: "unfavorited" });
  } else {
    await prisma.favorite.create({
      data: {
        userId: user.id,
        boardId,
      },
    });
    return NextResponse.json({ status: "favorited" });
  }
}

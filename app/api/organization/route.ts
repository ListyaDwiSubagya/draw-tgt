import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = auth();
  const body = await req.json();
  const { name } = body;

  if (!userId || !name) {
    return new NextResponse("Unauthorized or missing fields", { status: 400 });
  }

  const organization = await prisma.organization.create({
    data: {
      name,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  });

  return NextResponse.json(organization);
}

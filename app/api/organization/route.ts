import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  const { name } = await req.json();

  if (!userId || !name) {
    return new NextResponse("Unauthorized or missing fields", { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  const organization = await prisma.organization.create({
    data: {
      name,
      ownerId: user.id,
      members: {
        create: {
          user: { connect: { id: user.id } },
          role: "OWNER",
        },
      },
    },
  });  

  return NextResponse.json(organization);
}

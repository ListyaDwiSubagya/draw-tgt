import { auth } from "@clerk/nextjs/server";
import { ensureUserExists } from "@/lib/ensure-user";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  const { name } = await req.json();

  if (!userId || !name) {
    return new NextResponse("Unauthorized or missing fields", { status: 400 });
  }

  const user = await ensureUserExists(userId); 

  console.log("🧪 userId from Clerk:", userId);

  const organization = await prisma.organization.create({
    data: {
      name,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  return NextResponse.json(organization);
}

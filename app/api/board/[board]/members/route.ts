/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { board: string } }
) {
  const { board } = params;

  console.log("Fetching members for board:", board);

  try {
    const boardMember = await prisma.board.findUnique({
      where: { id: board },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!boardMember) {
      console.error("Board not found.");
      return new NextResponse("Board not found", { status: 404 });
    }

    if (!boardMember.organization) {
      console.error("Board has no organization.");
      return new NextResponse("Board has no organization", { status: 400 });
    }

    const members = boardMember.organization.members.map((m) => m.user);

    return NextResponse.json(members);
  } catch (error: any) {
    console.error("❌ API ERROR:", error.message, error.stack);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

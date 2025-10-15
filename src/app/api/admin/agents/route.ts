import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";

// GET /api/admin/agents - List all agents
export async function GET() {
  try {
    await requireAdmin();

    const agents = await prisma.agent.findMany({
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        userPermissions: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch agents" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

// PATCH /api/admin/agents - Update agent (isPublic)
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { agentId, isPublic } = body;

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: { isPublic },
      select: {
        id: true,
        name: true,
        isPublic: true,
      },
    });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update agent" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

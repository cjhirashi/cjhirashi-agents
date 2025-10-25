import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/auth-utils";
import logger from "@/lib/logging/logger";

// POST /api/admin/permissions - Grant agent access to user
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const currentUser = await getCurrentUser();

    const body = await request.json();
    const { userId, agentId } = body;

    if (!userId || !agentId) {
      return NextResponse.json(
        { error: "userId and agentId are required" },
        { status: 400 }
      );
    }

    // Check if permission already exists
    const existing = await prisma.userAgentPermission.findUnique({
      where: {
        userId_agentId: {
          userId,
          agentId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Permission already exists" },
        { status: 400 }
      );
    }

    const permission = await prisma.userAgentPermission.create({
      data: {
        userId,
        agentId,
        grantedBy: currentUser?.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json({ permission });
  } catch (error) {
    logger.error("Error granting permission", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to grant permission" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}

// DELETE /api/admin/permissions - Revoke agent access from user
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const agentId = searchParams.get("agentId");

    if (!userId || !agentId) {
      return NextResponse.json(
        { error: "userId and agentId are required" },
        { status: 400 }
      );
    }

    await prisma.userAgentPermission.delete({
      where: {
        userId_agentId: {
          userId,
          agentId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error revoking permission", {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke permission" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 500 }
    );
  }
}
